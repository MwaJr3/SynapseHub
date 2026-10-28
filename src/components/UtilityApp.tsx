import { useMemo, useState } from 'react';
import type { ChallengeRecord } from '../manifest';

export function CalculatorApp({ project }: { project: ChallengeRecord }) {
  if (project.slug === 'password-generator-app') return <PasswordGenerator />;
  return <BmiCalculator />;
}

function BmiCalculator() {
  const [unit, setUnit] = useState<'metric' | 'imperial'>('metric');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const h = Number(height); const w = Number(weight);
  const bmi = unit === 'metric' ? w / ((h / 100) ** 2) : (w * 703) / (h ** 2);
  const valid = Number.isFinite(bmi) && bmi > 0 && h > 0 && w > 0;
  const category = bmi < 18.5 ? 'Below the reference range' : bmi < 25 ? 'Within the reference range' : bmi < 30 ? 'Above the reference range' : 'Higher reference range';
  return <div className="app-tool-card"><div className="app-toggle-row" role="group" aria-label="Measurement units">{(['metric', 'imperial'] as const).map((value) => <button key={value} className={unit === value ? 'is-selected' : ''} onClick={() => setUnit(value)}>{value === 'metric' ? 'Metric · cm/kg' : 'Imperial · in/lb'}</button>)}</div><div className="app-two-columns"><label>Height ({unit === 'metric' ? 'cm' : 'in'})<input type="number" min="1" step="any" value={height} onChange={(e) => setHeight(e.target.value)} placeholder={unit === 'metric' ? '170' : '67'} /></label><label>Weight ({unit === 'metric' ? 'kg' : 'lb'})<input type="number" min="1" step="any" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder={unit === 'metric' ? '65' : '145'} /></label></div>{valid ? <div className="app-result-panel"><p className="app-kicker">Estimated BMI</p><strong>{bmi.toFixed(1)}</strong><span>{category}</span></div> : <p className="app-small-note" role="status">Enter positive height and weight to calculate.</p>}<p className="app-privacy-note">BMI is a limited screening measure and does not diagnose health. Consult a qualified clinician for individual guidance.</p></div>;
}

const sets = {
  lowercase: 'abcdefghijklmnopqrstuvwxyz', uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', numbers: '0123456789', symbols: '!@#$%^&*()-_=+[]{};:,.?',
};
type SetName = keyof typeof sets;

function secureRandomIndex(max: number) {
  const limit = Math.floor(0x1_0000_0000 / max) * max;
  const value = new Uint32Array(1);
  do { crypto.getRandomValues(value); } while (value[0]! >= limit);
  return value[0]! % max;
}

export function generateSecurePassword(length: number, enabled: SetName[]) {
  const alphabet = enabled.map((name) => sets[name]).join('');
  if (!alphabet || length < 4 || length > 64) return '';
  const chars = Array.from({ length }, () => alphabet[secureRandomIndex(alphabet.length)]!);
  // Ensure at least one character from each selected set, then shuffle securely.
  enabled.forEach((name, index) => { chars[index] = sets[name][secureRandomIndex(sets[name].length)]!; });
  for (let i = chars.length - 1; i > 0; i--) { const j = secureRandomIndex(i + 1); [chars[i], chars[j]] = [chars[j]!, chars[i]!]; }
  return chars.join('');
}

function PasswordGenerator() {
  const [length, setLength] = useState(16);
  const [enabled, setEnabled] = useState<SetName[]>(['lowercase', 'uppercase', 'numbers']);
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const toggle = (name: SetName) => setEnabled((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name]);
  const generate = () => { if (!enabled.length) { setMessage('Select at least one character set.'); setPassword(''); return; } setPassword(generateSecurePassword(length, enabled)); setMessage('Generated locally with the browser crypto API.'); };
  const copy = async () => { try { await navigator.clipboard.writeText(password); setMessage('Password copied to the clipboard.'); } catch { setMessage('Clipboard access is unavailable; select and copy the password manually.'); } };
  return <div className="app-tool-card"><label>Password length · {length}<input type="range" min="4" max="64" value={length} onChange={(e) => setLength(Number(e.target.value))} /></label><div className="app-check-grid">{(Object.keys(sets) as SetName[]).map((name) => <label key={name}><input type="checkbox" checked={enabled.includes(name)} onChange={() => toggle(name)} />{name[0]?.toUpperCase()}{name.slice(1)}</label>)}</div><div className="app-inline-actions"><button className="app-button" onClick={generate}>Generate password</button><button className="app-button app-button--quiet" aria-describedby="copy-hint" disabled={!password} onClick={copy}>Copy</button><span className="app-small-note" id="copy-hint">{password ? 'Copies the password above.' : 'Generate a password first.'}</span></div>{password && <output className="password-output" aria-label="Generated password">{password}</output>}{message && <p className="app-feedback" role="status">{message}</p>}<p className="app-privacy-note">The generated password is not saved or transmitted. Use a password manager and do not reuse passwords.</p></div>;
}

export function TextEditorApp({ project }: { project: ChallengeRecord }) {
  const [text, setText] = useState(() => { if (project.slug !== 'inbrowser-markdown-editor') return ''; try { return localStorage.getItem(`mwangala.markdown.${project.slug}`) ?? ''; } catch { return ''; } });
  const [limit, setLimit] = useState('280');
  const [withoutSpaces, setWithoutSpaces] = useState(false);
  const [saved, setSaved] = useState(false);
  const stats = useMemo(() => {
    const counted = withoutSpaces ? text.replace(/\s/g, '') : text;
    const words = text.trim() ? text.trim().split(/\s+/u).length : 0;
    const sentences = text.trim() ? (text.match(/[^.!?]+[.!?]+|[^.!?]+$/gu) ?? []).filter((part) => part.trim()).length : 0;
    return { chars: counted.length, words, sentences };
  }, [text, withoutSpaces]);
  const isMarkdown = project.slug === 'inbrowser-markdown-editor';
  const max = Number(limit) || 0;
  return <div className="app-tool-card">{!isMarkdown && <div className="app-character-options"><label><input type="checkbox" checked={withoutSpaces} onChange={(e) => setWithoutSpaces(e.target.checked)} /> Ignore spaces for character count</label><label>Character limit<input type="number" min="0" value={limit} onChange={(e) => setLimit(e.target.value)} /></label></div>}<div className={isMarkdown ? 'markdown-split' : ''}><label className="app-editor-label">{isMarkdown ? 'Markdown document' : 'Your text'}<textarea value={text} onChange={(e) => { setText(e.target.value); setSaved(false); }} rows={isMarkdown ? 16 : 9} placeholder={isMarkdown ? '# A note\n\nWrite Markdown here. Preview updates as you type.' : 'Start typing or paste text here…'} /></label>{isMarkdown && <section className="markdown-preview"><p className="app-kicker">Live preview · safe text rendering</p><MarkdownPreview source={text || '*Your preview will appear here.*'} /></section>}</div>{!isMarkdown && <div className="app-stats-grid"><div><strong>{stats.chars}</strong><span>Characters{withoutSpaces ? ' · no spaces' : ''}</span></div><div><strong>{stats.words}</strong><span>Words</span></div><div><strong>{stats.sentences}</strong><span>Sentences</span></div></div>}{!isMarkdown && max > 0 && <div className={`app-limit-meter ${stats.chars > max ? 'is-over' : ''}`}><span style={{ width: `${Math.min(100, stats.chars / max * 100)}%` }} /><small>{stats.chars} / {max}{stats.chars > max ? ` · ${stats.chars - max} over limit` : ''}</small></div>}{isMarkdown && <button className="app-button app-button--small" onClick={() => { try { localStorage.setItem(`mwangala.markdown.${project.slug}`, text); setSaved(true); } catch { setSaved(false); } }}>{saved ? 'Saved locally' : 'Save document locally'}</button>}</div>;
}

function MarkdownPreview({ source }: { source: string }) {
  const escaped = source.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html = escaped.split('\n').map((line) => {
    if (line.startsWith('### ')) return `<h3>${line.slice(4)}</h3>`;
    if (line.startsWith('## ')) return `<h2>${line.slice(3)}</h2>`;
    if (line.startsWith('# ')) return `<h1>${line.slice(2)}</h1>`;
    if (line.startsWith('- ')) return `<p>• ${line.slice(2)}</p>`;
    const bold = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/`([^`]+)`/g, '<code>$1</code>');
    return line.trim() ? `<p>${bold}</p>` : '<br />';
  }).join('');
  return <div className="markdown-content" dangerouslySetInnerHTML={{ __html: html }} />;
}
