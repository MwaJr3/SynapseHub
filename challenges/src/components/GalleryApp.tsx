import { useEffect, useState } from 'react';
import type { ChallengeRecord } from '../manifest';

interface Artwork { id: string; title: string; artist: string; preview: string }
export function GalleryApp({ project }: { project: ChallengeRecord }) {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [preview, setPreview] = useState('');
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => { if (!playing || artworks.length < 2) return undefined; const id = window.setInterval(() => setIndex((value) => (value + 1) % artworks.length), 3000); return () => window.clearInterval(id); }, [playing, artworks.length]);
  const readFile = (file?: File) => {
    if (!file) { setPreview(''); return; }
    if (!file.type.startsWith('image/')) { setMessage('Choose an image file.'); return; }
    if (file.size > 4_000_000) { setMessage('Choose an image under 4 MB for this local preview.'); return; }
    const reader = new FileReader(); reader.onload = () => setPreview(String(reader.result ?? '')); reader.onerror = () => setMessage('The selected image could not be read.'); reader.readAsDataURL(file);
  };
  const add = (event: React.FormEvent) => { event.preventDefault(); if (!title.trim() || !preview) { setMessage('Add a title and choose an image first.'); return; } const next = [...artworks, { id: crypto.randomUUID(), title: title.trim(), artist: artist.trim(), preview }]; setArtworks(next); setIndex(next.length - 1); setTitle(''); setArtist(''); setPreview(''); setMessage('Added to this tab’s local gallery. Image data is not uploaded or persisted.'); };
  const selected = artworks[index];
  const cleanup = () => { setArtworks((items) => { const next = items.filter((_, i) => i !== index); setIndex(Math.max(0, Math.min(index, next.length - 1))); return next; }); setPlaying(false); };
  return <div className="app-workspace"><form className="app-entry-form" onSubmit={add}><p className="app-kicker">{project.title} · your artwork stays in this tab</p><label>Artwork title<input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={100} /></label><label>Artist or caption<input value={artist} onChange={(e) => setArtist(e.target.value)} maxLength={100} /></label><label>Choose image<input type="file" accept="image/*" onChange={(e) => readFile(e.target.files?.[0])} /></label>{preview && <img className="gallery-upload-preview" src={preview} alt="Selected artwork preview" />}<button className="app-button">Add artwork</button></form>{message && <p className="app-feedback" role="status">{message}</p>}{selected ? <section className="gallery-stage"><img src={selected.preview} alt={selected.title} /><div className="gallery-caption"><div><p className="app-kicker">{selected.artist || 'Artist not specified'}</p><h3>{selected.title}</h3><span>{index + 1} / {artworks.length}</span></div><div className="app-inline-actions"><button className="app-button app-button--small" onClick={() => setIndex((value) => (value + artworks.length - 1) % artworks.length)}>Previous</button><button className="app-button app-button--small" onClick={() => setIndex((value) => (value + 1) % artworks.length)}>Next</button><button className="app-button app-button--small" onClick={() => setPlaying((value) => !value)}>{playing ? 'Pause' : 'Play'}</button><button className="app-button app-button--small app-button--quiet" onClick={cleanup}>Remove</button></div></div></section> : <div className="app-empty-state"><span>▧</span><h3>No artwork added yet</h3><p>Upload an image you have permission to use. It is previewed locally and never uploaded.</p></div>}<p className="app-privacy-note">Images remain in memory only for this tab. Reloading clears this gallery; no user artwork is sent to a server.</p></div>;
}
