import { api, go, useAsync, Toggle, WhyTip, type Home, type Strategy } from './ui';

type Struggles = Home['struggles'];
const useStrategies = () => useAsync<{ strategies: Strategy[]; min_group: number }>(() => api('/strategies'), []);

/** The "?" text for a strategy: why Noor surfaced it, and how to use it. Short on purpose. */
function Why({ s, struggles }: { s: Strategy; struggles: Struggles }) {
  const said = struggles.find((x) => x.key === s.struggle)?.label;
  const clear = s.stat && s.stat.with - s.stat.without >= 5;
  return (
    <WhyTip label={`Why Noor suggests "${s.title}"`}>
      <span className="line"><b>Why:</b> you said "{said}".{clear && s.stat ? ` Students who said the same and used this got ${s.stat.with}% of week-later riddles right (${s.stat.without}% without).` : ''}</span>
      <span className="line"><b>How:</b> {s.how}</span>
      {s.active && s.setting && <span className="line fine">Noor has switched this on for you.</span>}
    </WhyTip>
  );
}

/** Home: the strategies that are on for this student, picked from what they said during onboarding. */
export function ForYou({ home }: { home: Home }) {
  const { data } = useStrategies();
  if (home.user.settings.recs === false || !home.user.struggles.length) return null;
  const on = data?.strategies.filter((s) => s.active && home.user.struggles.includes(s.struggle)) || [];
  if (!on.length) return null;
  return (
    <section className="card">
      <div className="between"><h2>Strategies for you</h2><button className="link" onClick={() => go('/settings/help')}>Change</button></div>
      <ul className="foryou">
        {on.map((s) => <li key={s.id}><span>{s.title}</span><Why s={s} struggles={home.struggles} /></li>)}
      </ul>
    </section>
  );
}

/** Settings → "What helps": what the student finds hard (never a diagnosis) and the matching strategies. */
export function WhatHelps({ home, reload }: { home: Home; reload: () => void }) {
  const { data, reload: refresh } = useStrategies();
  const mine = home.user.struggles;
  const off = home.user.settings.recs === false;
  const pick = async (key: string) => {
    await api('/me', 'PATCH', { struggles: mine.includes(key) ? mine.filter((k) => k !== key) : [...mine, key] });
    refresh(); reload();
  };
  const set = async (s: Strategy, patch: { active?: boolean; helpful?: boolean }) => {
    await api(`/strategies/${s.id}`, 'POST', { active: patch.active ?? s.active, helpful: patch.helpful ?? (s.helpful == null ? null : !!s.helpful) });
    refresh(); reload();
  };
  const shown = data?.strategies.filter((s) => mine.includes(s.struggle)) || [];
  return (
    <section className="card stack" id="what-helps" aria-labelledby="what-helps-h">
      <div className="between wrap">
        <h2 id="what-helps-h">What helps</h2>
        <Toggle checked={!off} onChange={async (v) => { await api('/me', 'PATCH', { settings: { recs: v } }); reload(); }}>Suggest strategies</Toggle>
      </div>
      <p className="muted">What gets in the way? Pick any. No diagnosis needed.</p>
      <div className="chips">
        {home.struggles.map((s) => (
          <button key={s.key} className={mine.includes(s.key) ? 'pick on' : 'pick'} aria-pressed={mine.includes(s.key)} onClick={() => pick(s.key)}>{s.label}</button>
        ))}
      </div>
      {!off && shown.map((s) => (
        <article key={s.id} className={`strategy ${s.active ? 'active' : ''}`}>
          <div className="between wrap">
            <span className="titled"><h3>{s.title}</h3><Why s={s} struggles={home.struggles} /></span>
            <Toggle checked={s.active} onChange={(v) => set(s, { active: v })}>{s.active ? 'On' : 'Off'}</Toggle>
          </div>
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
          ) : <p className="fine">Too few students have tried this to show results (Noor needs {data?.min_group ?? 5}).</p>}
          {s.stat?.demo && <p className="fine">Demo data: figures come from a generated sample class.</p>}
          {s.active && (
            <p className="helpful">Helping?
              <button className={s.helpful === 1 ? 'pick on' : 'pick'} onClick={() => set(s, { helpful: true })}>Yes</button>
              <button className={s.helpful === 0 ? 'pick on' : 'pick'} onClick={() => set(s, { helpful: false })}>Not really</button>
            </p>
          )}
        </article>
      ))}
      {!off && mine.length > 0 && <p className="fine">Only you see what you pick. If things feel bigger than study strategies, Accessibility Services can talk through formal accommodations.</p>}
    </section>
  );
}
