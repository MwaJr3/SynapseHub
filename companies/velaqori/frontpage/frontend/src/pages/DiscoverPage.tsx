import { LookupBox, PacksGrid } from '../components/Discover';

export function DiscoverPage() {
  return (
    <div className="page">
      <header className="page-head">
        <h1>Discover feeds</h1>
        <p className="muted">Follow a starter pack, or paste any site address and we’ll look for its feed.</p>
      </header>
      <h2 className="section-title">Find a site</h2>
      <LookupBox />
      <h2 className="section-title">Starter packs</h2>
      <PacksGrid />
    </div>
  );
}
