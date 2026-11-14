import { useState } from 'react';
import { api, useAsync, Switch, type Area, type Home } from './ui';

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
  const set = async (s: Picked, active: boolean) => {
    await api(`/strategies/${s.key}`, 'POST', { active, helpful: s.helpful == null ? null : !!s.helpful });
    refresh(); reload();
  };
  if (!data) return null;
  if (!data.picked.length) return <p className="muted">Pick something above and Norbu will suggest what to try.</p>;
  return (
    <div className="suggestions">
      {data.picked.map((s) => (
        <label key={s.key} className={`suggestion ${s.active ? 'active' : ''}`}>
          <input type="checkbox" checked={s.active} onChange={(e) => set(s, e.target.checked)} aria-label={`Use "${s.strategy.title}"`} />
          <span className="sbody">
            <strong>{s.strategy.title}</strong>
            <span className="muted">{s.strategy.how}</span>
          </span>
          {s.stat && <span className="sstat">Helped {s.stat.helped}% of {s.stat.tried}{s.stat.demo ? ' · demo' : ''}</span>}
        </label>
      ))}
    </div>
  );
}

/** Settings section: change what gets in the way and see why each strategy is suggested. */
export function StrugglesSection({ home, reload }: { home: Home; reload: () => void }) {
  const picked = home.user.struggles;
  const save = async (keys: string[]) => { await api('/me', 'PATCH', { struggles: keys }); reload(); };
  return (
    <section className="card stack" id="profile">
      <h2>What gets in the way</h2>
      <AreaPicker areas={home.areas} picked={picked} onChange={save} />
      {home.user.settings.recs !== false && (
        <div id="what-helps" className="stack">
          <h2>Suggested for you</h2>
          <Suggestions reload={reload} watch={picked.join()} />
        </div>
      )}
      <Switch checked={home.user.settings.recs !== false} onChange={async (v) => { await api('/me', 'PATCH', { settings: { recs: v } }); reload(); }}>Suggest strategies</Switch>
    </section>
  );
}
