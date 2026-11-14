import type { ReactNode } from 'react';
import { api, go, useAsync, Switch, WhyTip, type Home, type Strategy, type Struggle } from './ui';

type Struggles = Home['struggles'];

// One small icon per group, so related struggles read as a set without headings.
const GROUPS: { key: Struggle['group']; label: string; icon: ReactNode }[] = [
  { key: 'lectures', label: 'Lectures', icon: <><rect x="3" y="4" width="14" height="10" rx="3" /><path d="M7 14l-1 4 4-4z" /></> },
  { key: 'words', label: 'Reading and writing', icon: <><path d="M2 5c3-1 5-1 8 1v10c-3-2-5-2-8-1z" /><path d="M18 5c-3-1-5-1-8 1v10c3-2 5-2 8-1z" opacity=".7" /></> },
  { key: 'numbers', label: 'Numbers', icon: <><rect x="4" y="2" width="12" height="16" rx="3" /><rect x="6.5" y="4.5" width="7" height="3.5" rx="1" fill="#fff" opacity=".8" /><circle cx="7.5" cy="11" r="1.1" fill="#fff" /><circle cx="12.5" cy="11" r="1.1" fill="#fff" /><circle cx="7.5" cy="14.5" r="1.1" fill="#fff" /><circle cx="12.5" cy="14.5" r="1.1" fill="#fff" /></> },
  { key: 'planning', label: 'Planning', icon: <><rect x="3" y="4" width="14" height="13" rx="3" /><rect x="3" y="4" width="14" height="4" rx="2" opacity=".6" /><path d="M7 2v4M13 2v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></> },
];

/** The struggle chips, visually grouped by kind (lectures, reading and writing, numbers, planning). */
export function StrugglePicker({ struggles, picked, onToggle, center }: { struggles: Struggles; picked: string[]; onToggle: (key: string) => void; center?: boolean }) {
  return (
    <div className={`sgroups ${center ? 'center' : ''}`}>
      {GROUPS.map((g) => {
        const items = struggles.filter((s) => s.group === g.key);
        if (!items.length) return null;
        return (
          <div key={g.key} className={`sgroup ${g.key}`} role="group" aria-label={g.label}>
            <svg className="sgicon" viewBox="0 0 20 20" width="22" height="22" aria-hidden fill="currentColor">{g.icon}</svg>
            {items.map((s) => {
              const on = picked.includes(s.key);
              return <button key={s.key} className={on ? 'pick on' : 'pick'} aria-pressed={on} onClick={() => onToggle(s.key)}>{s.label}</button>;
            })}
          </div>
        );
      })}
    </div>
  );
}
const useStrategies = () => useAsync<{ strategies: Strategy[]; min_group: number }>(() => api('/strategies'), []);

/** The "?" text for a strategy: why Norbu surfaced it, and how to use it. Short on purpose. */
function Why({ s, struggles }: { s: Strategy; struggles: Struggles }) {
  const said = struggles.find((x) => x.key === s.struggle)?.label;
  const clear = s.stat && s.stat.with - s.stat.without >= 5;
  return (
    <WhyTip label={`Why Norbu suggests "${s.title}"`}>
      <span className="line"><b>Why:</b> you said "{said}".{clear && s.stat ? ` Students who said the same and used this got ${s.stat.with}% of week-later riddles right (${s.stat.without}% without).` : ''}</span>
      <span className="line"><b>How:</b> {s.how}</span>
      {s.active && s.setting && <span className="line fine">Norbu switched this on for you.</span>}
    </WhyTip>
  );
}

/** Bridge (inside Today): the strategies that are on, as small chips with a "?" each. */
export function StrategyChips({ home }: { home: Home }) {
  const { data } = useStrategies();
  if (home.user.settings.recs === false || !home.user.struggles.length) return null;
  const on = data?.strategies.filter((s) => s.active && home.user.struggles.includes(s.struggle)) || [];
  if (!on.length) return null;
  return (
    <div className="stratchips">
      <span className="fine">Using</span>
      {on.map((s) => <span key={s.id} className="stratchip">{s.title}<Why s={s} struggles={home.struggles} /></span>)}
      <button className="link fine" onClick={() => go('/settings/profile')}>Change</button>
    </div>
  );
}

export type StrategyData = ReturnType<typeof useStrategies>;
export { useStrategies };

/** Settings → Profile: what gets in the way, and every strategy surfaced for it as a checkbox. */
export function ProfileSection({ home, strategies, reload }: { home: Home; strategies: StrategyData; reload: () => void }) {
  const { data, reload: refresh } = strategies;
  const mine = home.user.struggles;
  const off = home.user.settings.recs === false;
  const pick = async (key: string) => {
    await api('/me', 'PATCH', { struggles: mine.includes(key) ? mine.filter((k) => k !== key) : [...mine, key] });
    refresh(); reload();
  };
  const set = async (s: Strategy, active: boolean) => {
    await api(`/strategies/${s.id}`, 'POST', { active, helpful: s.helpful == null ? null : !!s.helpful });
    refresh(); reload();
  };
  const shown = data?.strategies.filter((s) => mine.includes(s.struggle)) || [];
  const initials = home.user.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <section className="card stack" id="profile" aria-labelledby="profile-h">
      <div className="profilehead">
        <span className="avatar big" aria-hidden>{initials}</span>
        <div><h2 id="profile-h">Profile</h2><p className="muted">{home.user.name} · Student</p></div>
      </div>
      <div>
        <h3>What gets in the way?</h3>
        <p className="fine">Pick any. No diagnosis needed. Only you see this.</p>
        <StrugglePicker struggles={home.struggles} picked={mine} onToggle={pick} />
      </div>
      <fieldset className="checks" disabled={off}>
        <legend>My learning strategies</legend>
        {!shown.length && <p className="fine">Pick something above and matching strategies appear here.</p>}
        {shown.map((s) => (
          <div key={s.id} className="check">
            <label><input type="checkbox" checked={s.active} onChange={(e) => set(s, e.target.checked)} /> {s.title}</label>
            <Why s={s} struggles={home.struggles} />
          </div>
        ))}
      </fieldset>
      <Switch checked={!off} onChange={async (v) => { await api('/me', 'PATCH', { settings: { recs: v } }); reload(); }}>Suggest strategies</Switch>
    </section>
  );
}

/** Settings → "What helps": week-later results for the strategies surfaced to this student. */
export function WhatHelps({ home, strategies }: { home: Home; strategies: StrategyData }) {
  const { data, reload: refresh } = strategies;
  const mine = home.user.struggles;
  if (home.user.settings.recs === false || !mine.length) return null;
  const feedback = async (s: Strategy, helpful: boolean) => {
    await api(`/strategies/${s.id}`, 'POST', { active: s.active, helpful });
    refresh();
  };
  const shown = data?.strategies.filter((s) => mine.includes(s.struggle)) || [];
  return (
    <section className="card stack" id="what-helps" aria-labelledby="what-helps-h">
      <h2 id="what-helps-h">What helps</h2>
      {shown.map((s) => (
        <article key={s.id} className={`strategy ${s.active ? 'active' : ''}`}>
          <span className="titled"><h3>{s.title}</h3><Why s={s} struggles={home.struggles} />{s.active && <span className="tag proven">On</span>}</span>
          {s.stat ? (
            s.stat.with - s.stat.without >= 5 ? (
              <div className="evidence">
                <div className="bars" aria-hidden>
                  <div><span style={{ width: `${s.stat.with}%` }} className="with" /><b>{s.stat.with}%</b></div>
                  <div><span style={{ width: `${s.stat.without}%` }} /><b>{s.stat.without}%</b></div>
                </div>
                <p>With it: <strong>{s.stat.with}%</strong> of week-later riddles right. Without: <strong>{s.stat.without}%</strong>. {s.stat.used} students.</p>
              </div>
            ) : <p className="fine">No clear difference yet ({s.stat.used} students). It may still suit you.</p>
          ) : <p className="fine">Too few students have tried this to show results (Bridgeway needs {data?.min_group ?? 5}).</p>}
          {s.stat?.demo && <p className="fine">Demo data: figures come from a generated sample class.</p>}
          {s.active && (
            <p className="helpful">Helping?
              <button className={s.helpful === 1 ? 'pick on' : 'pick'} onClick={() => feedback(s, true)}>Yes</button>
              <button className={s.helpful === 0 ? 'pick on' : 'pick'} onClick={() => feedback(s, false)}>Not really</button>
            </p>
          )}
        </article>
      ))}
      <p className="fine">If things feel bigger than study strategies, Accessibility Services can talk through formal accommodations.</p>
    </section>
  );
}
