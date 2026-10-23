import { useEffect, useState } from 'react';

export function TimerApp() {
  const [mode, setMode] = useState<'Focus' | 'Short break' | 'Long break'>('Focus');
  const [minutes, setMinutes] = useState(25);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  useEffect(() => {
    if (!running) return undefined;
    const timer = window.setInterval(() => setRemaining((value) => {
      if (value <= 1) { window.clearInterval(timer); setRunning(false); if (mode === 'Focus') setSessions((count) => count + 1); return 0; }
      return value - 1;
    }), 1000);
    return () => window.clearInterval(timer);
  }, [running, mode]);
  const selectMode = (next: typeof mode) => { setMode(next); setRunning(false); setRemaining((next === 'Focus' ? minutes : next === 'Short break' ? 5 : 15) * 60); };
  const max = (mode === 'Focus' ? minutes : mode === 'Short break' ? 5 : 15) * 60;
  const progress = max ? (max - remaining) / max * 100 : 0;
  return <div className="app-tool-card timer-tool"><div className="app-toggle-row" role="group" aria-label="Timer mode">{(['Focus', 'Short break', 'Long break'] as const).map((item) => <button key={item} className={mode === item ? 'is-selected' : ''} onClick={() => selectMode(item)}>{item}</button>)}</div><div className="timer-face" aria-live="off"><svg viewBox="0 0 220 220" aria-hidden="true"><circle cx="110" cy="110" r="98" /><circle className="timer-progress" cx="110" cy="110" r="98" style={{ strokeDashoffset: `${615 - progress / 100 * 615}` }} /></svg><strong aria-label={`${Math.floor(remaining / 60)} minutes ${remaining % 60} seconds`}>{String(Math.floor(remaining / 60)).padStart(2, '0')}:{String(remaining % 60).padStart(2, '0')}</strong><span>{mode}</span></div><div className="timer-actions"><button className="app-button" disabled={remaining === 0 && !running} onClick={() => setRunning((value) => !value)}>{running ? 'Pause' : remaining === 0 ? 'Finished' : 'Start'}</button><button className="app-button app-button--quiet" onClick={() => { setRunning(false); setRemaining(max); }}>Reset</button></div><label>Focus length · {minutes} minutes<input type="range" min="5" max="90" step="5" value={minutes} disabled={running} onChange={(e) => { const value = Number(e.target.value); setMinutes(value); if (mode === 'Focus') setRemaining(value * 60); }} /></label><p className="app-small-note">Completed focus sessions: {sessions}. Timer stays active only while this page is open.</p></div>;
}

export function ClockApp() {
  const [now, setNow] = useState(() => new Date());
  const [zone, setZone] = useState('local');
  const [twentyFour, setTwentyFour] = useState(false);
  useEffect(() => { const id = window.setInterval(() => setNow(new Date()), 1000); return () => window.clearInterval(id); }, []);
  const zones = ['local', 'Africa/Lusaka', 'Africa/Johannesburg', 'Europe/London', 'Europe/Paris', 'America/New_York', 'America/Los_Angeles', 'Asia/Tokyo', 'Australia/Sydney'];
  const effectiveZone = zone === 'local' ? Intl.DateTimeFormat().resolvedOptions().timeZone : zone;
  return <div className="app-tool-card clock-tool"><p className="app-kicker">Current time</p><time className="clock-time">{new Intl.DateTimeFormat(undefined, { timeZone: effectiveZone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: !twentyFour }).format(now)}</time><p>{new Intl.DateTimeFormat(undefined, { timeZone: effectiveZone, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(now)}</p><div className="app-two-columns"><label>Time zone<select value={zone} onChange={(e) => setZone(e.target.value)}>{zones.map((item) => <option key={item} value={item}>{item === 'local' ? `Local · ${Intl.DateTimeFormat().resolvedOptions().timeZone}` : item}</option>)}</select></label><label>Time format<select value={twentyFour ? '24' : '12'} onChange={(e) => setTwentyFour(e.target.value === '24')}><option value="12">12-hour</option><option value="24">24-hour</option></select></label></div><p className="app-privacy-note">Time is read from your device clock; no location lookup or time-zone service is used.</p></div>;
}
