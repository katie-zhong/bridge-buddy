import { useState } from 'react';
import { api, useAsync, Toggle, type Area, type Home } from './ui';

interface Picked {
  key: string; label: string; area: string; strategy: { title: string; how: string; why: string };
  active: boolean; helpful: number | null; stat: { tried: number; helped: number; demo: boolean } | null;
}

/** Areas first, then the specific things inside each area. Never a diagnosis. */
export function AreaPicker({ areas, picked, onChange }: { areas: Area[]; picked: string[]; onChange: (keys: string[]) => void }) {
  const [open, setOpen] = useState<string[]>(() => areas.filter((a) => a.details.some((d) => picked.includes(d.key))).map((a) => a.key));
  return (
    <div className="areas">
      {areas.map((a) => {
        const isOpen = open.includes(a.key), count = a.details.filter((d) => picked.includes(d.key)).length;
        return (
          <div key={a.key} className={`area ${isOpen ? 'open' : ''} ${count ? 'has' : ''}`}>
            <button className="areahead" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? open.filter((k) => k !== a.key) : [...open, a.key])}>
              <span>{a.label}</span>{count > 0 && <span className="tag proven">{count}</span>}<span className="chev" aria-hidden>{isOpen ? '−' : '+'}</span>
            </button>
            {isOpen && (
              <div className="chips">
                {a.details.map((d) => {
                  const on = picked.includes(d.key);
                  return <button key={d.key} className={on ? 'pick on' : 'pick'} aria-pressed={on} onClick={() => onChange(on ? picked.filter((k) => k !== d.key) : [...picked, d.key])}>{d.label}</button>;
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** One suggested strategy per thing the student picked, with the reason for it. */
export function Suggestions({ reload, watch }: { reload: () => void; watch: string }) {
  const { data, reload: refresh } = useAsync<{ picked: Picked[]; min_group: number }>(() => api('/strategies'), [watch]);
  const set = async (s: Picked, patch: { active?: boolean; helpful?: boolean }) => {
    await api(`/strategies/${s.key}`, 'POST', { active: patch.active ?? s.active, helpful: patch.helpful ?? (s.helpful == null ? null : !!s.helpful) });
    refresh(); reload();
  };
  if (!data) return null;
  if (!data.picked.length) return <p className="muted">Pick something above and Noor will suggest what to try.</p>;
  return (
    <div className="suggestions">
      {data.picked.map((s) => (
        <div key={s.key} className={`suggestion ${s.active ? 'active' : ''}`}>
          <p className="for">{s.label}</p>
          <div className="between wrap">
            <h3>{s.strategy.title}</h3>
            <Toggle checked={s.active} onChange={(v) => set(s, { active: v })}>{s.active ? 'Using' : 'Use this'}</Toggle>
          </div>
          <p>{s.strategy.how}</p>
          <p className="why"><strong>Why:</strong> {s.strategy.why}</p>
          {s.stat && <p className="fine">Helped {s.stat.helped}% of {s.stat.tried} students who tried it.{s.stat.demo ? ' (Demo data.)' : ''}</p>}
          {s.active && (
            <p className="helpful">Helping?
              <button className={s.helpful === 1 ? 'pick on' : 'pick'} onClick={() => set(s, { helpful: true })}>Yes</button>
              <button className={s.helpful === 0 ? 'pick on' : 'pick'} onClick={() => set(s, { helpful: false })}>Not really</button>
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

/** Settings section: change what gets in the way and see why each strategy is suggested. */
export function StrugglesSection({ home, reload }: { home: Home; reload: () => void }) {
  const picked = home.user.struggles;
  const save = async (keys: string[]) => { await api('/me', 'PATCH', { struggles: keys }); reload(); };
  return (
    <section className="card stack">
      <h2>What gets in the way</h2>
      <AreaPicker areas={home.areas} picked={picked} onChange={save} />
      <h2>Suggested for you</h2>
      <Suggestions reload={reload} watch={picked.join()} />
    </section>
  );
}
