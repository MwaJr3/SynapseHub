export function Hero() {
  return (
    <section>
      <h1>Supercharge your workflow with AI</h1>
      <h2>Close the month in one afternoon</h2>
      <input id="pw" aria-label="Password" type="password" autoComplete="current-password" onPaste={(e) => e.preventDefault()} />
      <input id="pw2" aria-label="Confirm" type="password" autoComplete="new-password" />
    </section>
  );
}
