export function App() {
  return (
    <div>
      <button className="btn"><svg viewBox="0 0 8 8"><path d="M0 0L8 8" /></svg></button>
      <div className="toast-stack">Saved</div>
      <li draggable>Item</li>
    </div>
  );
}

export function Fine() {
  return (
    <div>
      <button aria-label="Close"><svg viewBox="0 0 8 8"><path d="M0 0L8 8" /></svg></button>
      <div className="toast-stack" role="status">Saved</div>
    </div>
  );
}
