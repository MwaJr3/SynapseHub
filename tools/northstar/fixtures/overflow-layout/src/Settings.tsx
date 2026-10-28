/**
 * Fixture: a layout that cannot fit a 320px viewport. The panel is a fixed
 * 520px and the row refuses to wrap, so the horizontal scroll is guaranteed.
 */
export default function Settings() {
  return (
    <div className="flex items-center gap-3">
      <section className="panel rounded-2xl border border-slate-800">
        <h2 className="text-sm font-semibold text-slate-200">Notification preferences</h2>
        <p className="mt-1 text-xs text-slate-500">Changes are applied immediately.</p>
      </section>
      <button className="btn-primary">Save preferences</button>
    </div>
  );
}
