import { ImageResponse } from 'next/og';

export const alt = 'Velaqori Systems & Tamuzi Learning';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 80, background: '#0f172a', color: '#f8fafc' }}>
        <div style={{ fontSize: 28, color: '#93c5fd' }}>Shared discovery platform</div>
        <div style={{ fontSize: 76, fontWeight: 700, marginTop: 16, lineHeight: 1.1 }}>Velaqori Systems &amp; Tamuzi Learning</div>
        <div style={{ fontSize: 32, marginTop: 28, color: '#cbd5e1' }}>Software and cybersecurity. Education technology.</div>
      </div>
    ),
    size,
  );
}
