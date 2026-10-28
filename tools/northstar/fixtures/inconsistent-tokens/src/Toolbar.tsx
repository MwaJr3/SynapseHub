/**
 * Fixture: colours chosen per component instead of from the token layer.
 */
export default function Toolbar() {
  return (
    <div className="flex gap-2">
      <button className="rounded-md bg-[#2b6cb0] px-3 py-1 text-white">Export</button>
      <button className="rounded-xl bg-[#3182ce] px-3 py-1 text-white">Import</button>
    </div>
  );
}
