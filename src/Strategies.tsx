import { api, go, useAsync, Toggle, type Home } from './ui';

interface Strategy { id: string; struggle: string; title: string; how: string; active: boolean; helpful: number | null; stat: { used: number; with: number; without: number; demo: boolean } | null }

/** "What helps": recommendations by what the student finds hard, never by diagnosis. */
export function Strategies({ home, reload }: { home: Home; reload: () => void }) {
  const { data, reload: refresh } = useAsync<{ strategies: Strategy[]; min_group: number }>(() => api('/strategies'), []);
  const mine = home.user.struggles;
  const off = home.user.settings.recs === false;
  const pick = async (key: string) => {
    await api('/me', 'PATCH', { struggles: mine.includes(key) ? mine.filter((k) => k !== key) : [...mine, key] });
    reload();
  };
  const set = async (s: Strategy, patch: { active?: boolean; helpful?: boolean }) => {
    await api(`/strategies/${s.id}`, 'POST', { active: patch.active ?? s.active, helpful: patch.helpful ?? (s.helpful == null ? null : !!s.helpful) });
    refresh(); reload();
  };
  const shown = data?.strategies.filter((s) => mine.includes(s.struggle)) || [];
  return (
    <main className="page narrow">
      <h1>What helps</h1>
      <p className="lede">Tell Noor what feels hard. You don't need a diagnosis or the right word for it, and you can change this any time.</p>
      <section className="card">
        <h2>Right now, what gets in the way?</h2>
        <div className="chips">
          {home.struggles.map((s) => (
            <button key={s.key} className={mine.includes(s.key) ? 'pick on' : 'pick'} aria-pressed={mine.includes(s.key)} onClick={() => pick(s.key)}>{s.label}</button>
          ))}
        </div>
      </section>

      {off ? <p className="muted">Recommendations are switched off. <button className="link" onClick={() => go('/settings')}>Turn them on in Settings.</button></p> : (
        <>
          {!mine.length && <p className="muted">Pick one or more above and Noor will suggest things that worked for other students who said the same.</p>}
          {shown.map((s) => {
            const clear = s.stat && s.stat.with - s.stat.without >= 5;
            return (
              <section key={s.id} className={`card strategy ${s.active ? 'active' : ''}`}>
                <div className="between wrap">
                  <h3>{s.title}</h3>
                  <Toggle checked={s.active} onChange={(v) => set(s, { active: v })}>{s.active ? 'Using this' : 'Try this'}</Toggle>
                </div>
                <p>{s.how}</p>
                {s.stat ? (
                  clear ? (
                    <div className="evidence">
                      <div className="bars" aria-hidden>
                        <div><span style={{ width: `${s.stat.with}%` }} className="with" /><b>{s.stat.with}%</b></div>
                        <div><span style={{ width: `${s.stat.without}%` }} /><b>{s.stat.without}%</b></div>
                      </div>
                      <p>Students who said the same thing as you and used this got <strong>{s.stat.with}%</strong> of their week-later riddles right, against <strong>{s.stat.without}%</strong> for those who didn't. Based on {s.stat.used} students.</p>
                    </div>
                  ) : <p className="muted">No clear difference in week-later results for this one so far ({s.stat.used} students tried it). It may still suit you.</p>
                ) : <p className="muted">Not enough students have tried this yet to show results (Noor never shows numbers for fewer than {data!.min_group}).</p>}
                {s.stat?.demo && <p className="fine">Demo data: these figures come from a generated sample class, not real students.</p>}
                {s.active && (
                  <p className="helpful">Is it helping?
                    <button className={s.helpful === 1 ? 'pick on' : 'pick'} onClick={() => set(s, { helpful: true })}>Yes</button>
                    <button className={s.helpful === 0 ? 'pick on' : 'pick'} onClick={() => set(s, { helpful: false })}>Not really</button>
                  </p>
                )}
                <details><summary>Why am I seeing this?</summary>
                  <p className="fine">Because you chose "{home.struggles.find((x) => x.key === s.struggle)?.label}". Noor compares anonymous, grouped results only. Nobody sees what you picked, and nothing here is a diagnosis. If things feel bigger than study strategies, Accessibility Services can talk through formal accommodations.</p>
                </details>
              </section>
            );
          })}
        </>
      )}
    </main>
  );
}
