/**
 * Fixture: correct accessible markup with exactly one defect — a muted
 * label at 3.93:1 on the page background. The engine must report that one
 * thing and nothing else, which is what proves it is not simply noisy.
 */
export default function Reports() {
  return (
    <main>
      <h1 className="text-lg font-semibold text-slate-100">Reports</h1>
      <nav aria-label="Sections" className="mt-2 flex gap-3 text-sm">
        <a href="/reports/weekly" aria-current="page" className="font-semibold text-sky-300">
          Weekly
        </a>
        <a href="/reports/monthly" className="text-slate-300">
          Monthly
        </a>
      </nav>
      <table className="mt-4 w-full">
        <caption className="text-left text-sm text-slate-400">Scans run this week</caption>
        <thead>
          <tr>
            <th scope="col" className="th">
              Scanner
            </th>
            <th scope="col" className="th text-right">
              Findings
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="td">Dependency audit</td>
            <td className="td text-right tabular-nums">12</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-3 text-xs text-slate-500">Last run: 24 October 2026, 09:12.</p>
    </main>
  );
}
