import { api, go, useAsync, Switch, WhyTip, type Home, type Strategy } from './ui';

type Struggles = Home['struggles'];
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
        <div className="chips">
          {home.struggles.map((s) => (
            <button key={s.key} className={mine.includes(s.key) ? 'pick on' : 'pick'} aria-pressed={mine.includes(s.key)} onClick={() => pick(s.key)}>{s.label}</button>
          ))}
        </div>
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
