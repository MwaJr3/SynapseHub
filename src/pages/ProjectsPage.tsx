import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { ChallengeCard } from '@/components/projects/ChallengeCard';
import { Button } from '@/components/ui/Button';
import { usePageMeta } from '@/hooks/usePageMeta';
import { challengeManifest } from '@/data/challengeManifest';

const pageSize = 12;
const categories = [...new Set(challengeManifest.map((project) => project.category))].sort();

type SortMode = 'featured' | 'name' | 'collection' | 'difficulty';

export default function ProjectsPage() {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const category = params.get('category') ?? '';
  const challengeType = params.get('type') ?? '';
  const difficulty = params.get('difficulty') ?? '';
  const sort = (params.get('sort') as SortMode) || 'featured';
  const requestedPage = Number(params.get('page') || 1);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? Math.floor(requestedPage) : 1;
  const [draft, setDraft] = useState(query);

  useEffect(() => setDraft(query), [query]);
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (draft !== query) setParams((current) => { const next = new URLSearchParams(current); if (draft) next.set('q', draft); else next.delete('q'); next.delete('page'); return next; }, { replace: true });
    }, 180);
    return () => window.clearTimeout(timeout);
  }, [draft, query, setParams]);

  const filtered = useMemo(() => {
    const needle = draft.trim().toLocaleLowerCase();
    const results = challengeManifest.filter((project) => {
      const categoryMatch = !category || project.category === category;
      const typeMatch = !challengeType || project.challengeType === challengeType;
      const difficultyMatch = !difficulty || project.difficulty === difficulty;
      const searchFields = [project.title, project.description, project.category, project.originalChallengeUrl, project.challengeType, project.accessTier, project.difficulty ?? '', ...project.categories, ...project.features, ...project.technologies].join(' ').toLocaleLowerCase();
      return categoryMatch && typeMatch && difficultyMatch && (!needle || searchFields.includes(needle));
    });
    if (sort === 'name') results.sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === 'collection') results.sort((a, b) => a.displayOrder - b.displayOrder);
    else if (sort === 'difficulty') {
      const ranks: Record<string, number> = { newbie: 0, junior: 1, intermediate: 2, advanced: 3, guru: 4 };
      results.sort((a, b) => (ranks[a.difficulty ?? ''] ?? 99) - (ranks[b.difficulty ?? ''] ?? 99) || a.displayOrder - b.displayOrder);
    } else results.sort((a, b) => Number(b.featured) - Number(a.featured) || a.displayOrder - b.displayOrder);
    return results;
  }, [category, challengeType, difficulty, draft, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  useEffect(() => {
    if (safePage !== page) setParams((current) => { const next = new URLSearchParams(current); next.set('page', String(safePage)); return next; }, { replace: true });
  }, [page, safePage, setParams]);

  usePageMeta({ title: 'Project collection — 60 frontend challenges', description: 'Browse 60 Frontend Mentor challenge records with links to their local-first prototypes and clear verification status.', path: '/projects' });

  const update = (key: string, value: string) => setParams((current) => { const next = new URLSearchParams(current); if (value) next.set(key, value); else next.delete(key); next.delete('page'); return next; });
  const clear = () => { setDraft(''); setParams({}); };

  return <>
    <PageHeader eyebrow="The collection · 01—60" title="Sixty briefs. Sixty ways to think through the interface." summary="A searchable catalogue of 60 Frontend Mentor challenge briefs. Every record links to a local-first prototype; none is marked complete against the full challenge brief." />
    <section className="shell pb-20" aria-labelledby="collection-heading">
      <div className="collection-toolbar">
        <div className="collection-search"><label htmlFor="project-search">Search the collection</label><input id="project-search" type="search" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Try “dashboard”, “game” or “portfolio”…" /></div>
        <div className="collection-filter"><label htmlFor="category-filter">Category</label><select id="category-filter" value={category} onChange={(event) => update('category', event.target.value)}><option value="">All categories</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
        <div className="collection-filter"><label htmlFor="type-filter">Challenge type</label><select id="type-filter" value={challengeType} onChange={(event) => update('type', event.target.value)}><option value="">All types</option><option value="design">Design</option><option value="product">Product</option></select></div>
        <div className="collection-filter"><label htmlFor="difficulty-filter">Difficulty</label><select id="difficulty-filter" value={difficulty} onChange={(event) => update('difficulty', event.target.value)}><option value="">All levels</option>{['newbie', 'junior', 'intermediate', 'advanced', 'guru'].map((level) => <option key={level} value={level}>{level[0]?.toUpperCase()}{level.slice(1)}</option>)}</select></div>
        <div className="collection-filter"><label htmlFor="sort-projects">Sort by</label><select id="sort-projects" value={sort} onChange={(event) => update('sort', event.target.value)}><option value="featured">Featured first</option><option value="name">Project name</option><option value="difficulty">Difficulty</option><option value="collection">Collection order</option></select></div>
      </div>
      <div className="collection-status" role="status" aria-live="polite"><p><strong>{filtered.length}</strong> {filtered.length === 1 ? 'project' : 'projects'}{draft || category || challengeType || difficulty ? ' match your selection' : ' in the collection'}</p>{(draft || category || challengeType || difficulty || sort !== 'featured') && <button className="text-button" onClick={clear}>Reset search and filters</button>}</div>
      {(draft || category || challengeType || difficulty) && <ul className="active-filters" aria-label="Active filters"><li><span className="eyebrow">Active filters</span></li>{draft && <li><span className="chip">Search: {draft}</span></li>}{category && <li><span className="chip">{category}</span></li>}{challengeType && <li><span className="chip">{challengeType} challenge</span></li>}{difficulty && <li><span className="chip">{difficulty}</span></li>}</ul>}
      <h2 id="collection-heading" className="sr-only">Project collection</h2>
      {visible.length ? <div className="challenge-grid">{visible.map((project) => <ChallengeCard key={project.slug} project={project} />)}</div> : <div className="empty-card"><p className="eyebrow">No results</p><h2 className="mt-2 text-xl font-semibold">Nothing matches that combination.</h2><p className="prose-body mt-2">Try a broader term or clear the current filters to return to all {challengeManifest.length} projects.</p><Button variant="primary" className="mt-5" onClick={clear}>Clear filters</Button></div>}
      {filtered.length > pageSize && <nav className="pagination" aria-label="Project pages"><button className="btn btn-secondary" disabled={safePage <= 1} onClick={() => setParams((current) => { const next = new URLSearchParams(current); next.set('page', String(safePage - 1)); return next; })}>← Previous</button><p className="mono-meta">Page {safePage} of {pageCount}</p><button className="btn btn-secondary" disabled={safePage >= pageCount} onClick={() => setParams((current) => { const next = new URLSearchParams(current); next.set('page', String(safePage + 1)); return next; })}>Next →</button></nav>}
      <p className="collection-note">Challenge titles and source links are from the supplied catalogue. This is an independent portfolio; Frontend Mentor does not endorse it. Challenge difficulty, tiers, exact stacks, screenshots and project deployment URLs are not recorded until verified.</p>
    </section>
  </>;
}
