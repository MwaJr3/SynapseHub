import { useEffect, useState } from 'react';

type Row = { id: string; title: string; score: number };

/**
 * Fixture: a dashboard that implements the happy path and the loading state,
 * and nothing else. The empty, error and partial states are missing.
 */
export default function Dashboard() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    fetch('/api/rows')
      .then((response) => response.json())
      .then((data) => setRows(data.rows))
      .catch(() => {});
  }, []);

  if (rows === null) return <p className="text-sm text-slate-400">Loading...</p>;

  return (
    <table className="w-full">
      <thead>
        <tr>
          <th className="th">Title</th>
          <th className="th">Score</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td className="td">{row.title}</td>
            <td className="td">{row.score.toFixed(1)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
