import { useState } from 'react';
import type { ChallengeRecord } from '../manifest';

interface ApiResult { title: string; subtitle?: string; href?: string; image?: string }
interface GitHubUser { login: string; name: string | null; public_repos: number; followers: number; html_url: string; avatar_url: string; bio: string | null; location: string | null; blog: string }
interface DictionaryEntry { word?: string; phonetic?: string; phonetics?: Array<{ audio?: string }>; meanings?: Array<{ partOfSpeech?: string; definitions?: Array<{ definition: string; example?: string }> }> }
interface RecipeMeal { strMeal: string; strCategory: string | null; strArea: string | null; strSource: string | null; strYoutube: string | null; strMealThumb: string }
interface OpenLibraryDoc { title: string; author_name?: string[]; first_publish_year?: number; isbn?: string[]; key?: string; cover_i?: number }


export function ApiApp({ project }: { project: ChallengeRecord }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ApiResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [amount, setAmount] = useState('1');
  const [from, setFrom] = useState('USD');
  const [to, setTo] = useState('EUR');
  const [rate, setRate] = useState<{ result: number; date: string } | null>(null);

  const search = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setLoading(true); setMessage(''); setResults([]);
    const value = query.trim();
    try {
      let items: ApiResult[] = [];
      if (project.slug === 'github-user-search-app') {
        const response = await fetch(`https://api.github.com/users/${encodeURIComponent(value)}`, { headers: { Accept: 'application/vnd.github+json' } });
        if (!response.ok) throw new Error(response.status === 404 ? 'No GitHub user was found with that username.' : `GitHub returned ${response.status}. It may be rate-limiting unauthenticated requests.`);
        const user = await response.json() as GitHubUser;
        items = [{ title: user.name || user.login, subtitle: `@${user.login} · ${user.public_repos} public repositories · ${user.followers} followers`, href: user.html_url, image: user.avatar_url }, ...(user.bio ? [{ title: 'About', subtitle: user.bio }] : []), ...(user.location ? [{ title: 'Location', subtitle: user.location }] : []), ...(user.blog ? [{ title: 'Website', subtitle: user.blog, href: user.blog.startsWith('http') ? user.blog : `https://${user.blog}` }] : [])];
      } else if (project.slug === 'dictionary-web-app') {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(value)}`);
        if (!response.ok) throw new Error(response.status === 404 ? 'No definition was returned for that word.' : `Dictionary service returned ${response.status}.`);
        const data = await response.json() as DictionaryEntry[];
        items = data.flatMap((entry) => (entry.meanings ?? []).flatMap((meaning) => (meaning.definitions ?? []).slice(0, 3).map((definition) => ({ title: `${meaning.partOfSpeech || 'Definition'} · ${entry.word ?? value}`, subtitle: definition.definition }))));
        const audio = data.flatMap((entry) => entry.phonetics ?? []).find((item) => item.audio)?.audio;
        if (audio) items.unshift({ title: data[0]?.word ?? value, subtitle: data[0]?.phonetic ?? 'Pronunciation available', href: `audio:${audio}` });
      } else if (project.slug === 'recipe-finder-website') {
        const response = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(value)}`);
        if (!response.ok) throw new Error(`Recipe service returned ${response.status}.`);
        const data = await response.json() as { meals: RecipeMeal[] | null };
        items = (data.meals ?? []).map((meal) => ({ title: meal.strMeal, subtitle: [meal.strCategory, meal.strArea].filter(Boolean).join(' · '), href: meal.strSource || meal.strYoutube || undefined, image: meal.strMealThumb }));
      } else {
        const response = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(value)}&limit=8`);
        if (!response.ok) throw new Error(`Open Library returned ${response.status}.`);
        const data = await response.json() as { docs: OpenLibraryDoc[] };
        items = (data.docs ?? []).map((book) => ({ title: book.title, subtitle: [book.author_name?.slice(0, 2).join(', '), book.first_publish_year, book.isbn?.[0] ? `ISBN ${book.isbn[0]}` : ''].filter(Boolean).join(' · '), href: book.key ? `https://openlibrary.org${book.key}` : undefined, image: book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg` : undefined }));
      }
      setResults(items); setMessage(items.length ? `Showing ${items.length} result${items.length === 1 ? '' : 's'} returned by the connected public service.` : 'The connected service returned no matching results.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'The request failed. Check your connection and try again.'); }
    finally { setLoading(false); }
  };

  const convert = async () => {
    setLoading(true); setMessage(''); setRate(null);
    try {
      const value = Number(amount);
      if (!(value > 0)) throw new Error('Enter an amount greater than zero.');
      const response = await fetch(`https://api.frankfurter.app/latest?amount=${encodeURIComponent(String(value))}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
      if (!response.ok) throw new Error(`Exchange-rate service returned ${response.status}.`);
      const data = await response.json() as { rates?: Record<string, number>; date: string };
      const converted = Number(data.rates?.[to]);
      if (!Number.isFinite(converted)) throw new Error('That currency pair is not available from this service.');
      setRate({ result: converted, date: data.date }); setMessage('Rate returned by Frankfurter; this is informational, not a transaction quote.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not retrieve a rate.'); }
    finally { setLoading(false); }
  };

  if (project.slug === 'foreign-exchange-currency-converter') return <div className="app-tool-card"><div className="app-two-columns"><label>Amount<input type="number" min="0.01" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} /></label><label>From<select value={from} onChange={(e) => setFrom(e.target.value)}>{['USD','EUR','GBP','ZMW','JPY','CAD','AUD','CHF'].map((code) => <option key={code}>{code}</option>)}</select></label><label>To<select value={to} onChange={(e) => setTo(e.target.value)}>{['USD','EUR','GBP','ZMW','JPY','CAD','AUD','CHF'].map((code) => <option key={code}>{code}</option>)}</select></label><button className="app-button" onClick={() => { setFrom(to); setTo(from); }}>Swap currencies ↕</button></div><button className="app-button" disabled={loading} onClick={convert}>{loading ? 'Fetching rate…' : 'Get current rate'}</button>{rate && <div className="app-result-panel"><p className="app-kicker">Latest available rate · {rate.date}</p><strong>{Number(amount).toLocaleString()} {from} = {rate.result.toLocaleString(undefined, { maximumFractionDigits: 4 })} {to}</strong></div>}{message && <p className="app-feedback" role="status">{message}</p>}<p className="app-privacy-note">No exchange, payment, or historical-rate service is provided by this prototype. Rates may be delayed and are not financial advice.</p></div>;

  const inputLabel = project.slug === 'github-user-search-app' ? 'GitHub username' : project.slug === 'dictionary-web-app' ? 'English word' : project.slug === 'recipe-finder-website' ? 'Recipe name or ingredient' : 'Book title, author, or keyword';
  return <div className="app-tool-card"><form className="app-api-search" onSubmit={search}><label>{inputLabel}<input value={query} onChange={(e) => setQuery(e.target.value)} required placeholder={project.slug === 'github-user-search-app' ? 'octocat' : project.slug === 'dictionary-web-app' ? 'serendipity' : project.slug === 'recipe-finder-website' ? 'tomato' : 'The Left Hand of Darkness'} /></label><button className="app-button" disabled={loading}>{loading ? 'Searching…' : 'Search public data'}</button></form>{message && <p className="app-feedback" role="status">{message}</p>}{results.length > 0 && <div className="app-api-results">{results.map((item, index) => <article key={`${item.title}-${index}`} className="app-api-result">{item.image && <img src={item.image} alt="" width={320} height={240} style={{ height: 'auto', maxWidth: '100%' }} loading="lazy" />}{item.href?.startsWith('audio:') ? <button className="app-audio-button" onClick={() => { const audio = new Audio(item.href!.slice(6)); void audio.play().catch(() => setMessage('Audio playback is unavailable in this browser.')); }}>▶ Play pronunciation · {item.subtitle}</button> : <div><h4>{item.title}</h4>{item.subtitle && <p>{item.subtitle}</p>}{item.href && <a href={item.href} target="_blank" rel="noreferrer">Open source ↗</a>}</div>}</article>)}</div>}<p className="app-privacy-note">Search terms are sent to the named public service when you submit. No credentials are stored. External services may be unavailable or rate-limited.</p></div>;
}
