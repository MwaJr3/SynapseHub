import { BarChart, Bar, YAxis } from 'recharts';
import { useForm } from 'react-hook-form';

export function Controls({ on, pct, err }) {
  const form = useForm({ mode: 'onChange' });
  const good = useForm({ mode: 'onTouched' });
  return (
    <div>
      <button role="switch" onClick={flip}>Notifications</button>
      <button role="switch" aria-checked={on} onClick={flip}>Sync</button>
      <div role="progressbar" style={{ width: `${pct}%` }} />
      <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} />
      <input type="file" />
      <input type="file" accept="image/png" />
      <input id="a" aria-label="A" aria-invalid="true" />
      <input id="b" aria-label="B" aria-invalid="true" aria-describedby="b-err" />
      <BarChart data={d}><YAxis domain={[40, 100]} /><Bar dataKey="v" /></BarChart>
      <BarChart data={d}><YAxis domain={[0, 100]} /><Bar dataKey="v" /></BarChart>
      <div className="dark:bg-black dark:text-white">x</div>
      <div className="dark:bg-zinc-900">y</div>
    </div>
  );
}
