import { useState } from 'react';
import { api, go, MATERIALS, type Home } from './ui';
import { MaterialIcon, PlankIcon, Troll, type Mood } from './Troll';
import { AreaPicker, Suggestions } from './Strategies';

const TOUR: { title: string; body: string; mood: Mood; art: 'planks' | 'gap' | 'materials'; key?: string }[] = [
  { title: 'Every lecture is a plank', body: 'New lectures land on your bridges by themselves.', mood: 'idle', art: 'planks' },
  { title: 'Lost in a lecture? Press', body: 'Norbu marks the spot. Keep listening and mend it later.', mood: 'think', art: 'gap', key: 'F' },
  { title: 'Renovate to make it stronger', body: 'Practise a plank and it is rebuilt in a tougher material. Leave it too long and it rots.', mood: 'idle', art: 'materials' },
];

/** First visit: what gets in the way, what Norbu suggests for it, then a three-step tour. */
export function Welcome({ home, reload }: { home: Home; reload: () => void }) {
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<string[]>(home.user.struggles);
  const [busy, setBusy] = useState(false);
  const demo = home.courses.flatMap((c) => c.planks).find((p) => p.live_demo);

  const saveStruggles = async () => {
    setBusy(true);
    try { await api('/me', 'PATCH', { struggles: picked }); } finally { setBusy(false); }
    reload();
    setStep(picked.length ? 1 : 2);
  };
  const finish = async (to: string) => {
    setBusy(true);
    try { await api('/me', 'PATCH', { settings: { onboarded: true } }); } finally { setBusy(false); }
    go(to);
    reload();
  };

  if (step === 0) {
    return (
      <main className="welcome wide">
        <Troll size={96} />
        <h1>Hi {home.user.name}, I'm Norbu. What gets in the way?</h1>
        <AreaPicker areas={home.areas} picked={picked} onChange={setPicked} />
        <div className="actions center">
          <button className="primary" disabled={busy} onClick={saveStruggles}>{picked.length ? 'Continue' : 'Skip'}</button>
        </div>
      </main>
    );
  }
  if (step === 1) {
    return (
      <main className="welcome wide">
        <h1>Here's what I'd try</h1>
        <Suggestions reload={reload} watch={picked.join()} />
        <p className="fine">You can change these in Settings.</p>
        <div className="actions center">
          <button className="ghost" onClick={() => setStep(0)}>Back</button>
          <button className="primary" onClick={() => setStep(2)}>Continue</button>
        </div>
      </main>
    );
  }

  const i = step - 2, t = TOUR[i], last = i === TOUR.length - 1;
  return (
    <main className="welcome">
      <div className="tourart">
        <Troll size={120} mood={t.mood} />
        <div className="miniplanks" aria-hidden>
          {t.art === 'materials'
            ? MATERIALS.map((m, k) => <MaterialIcon key={m} level={k} size={60} />)
            : [0, 1, 2, 3, 4].map((k) => (t.art === 'gap' && k === 2 ? <PlankIcon key={k} state="gap" size={60} /> : <MaterialIcon key={k} level={0} size={60} />))}
        </div>
      </div>
      <h1>{t.title} {t.key && <kbd>{t.key}</kbd>}</h1>
      <p className="lede">{t.body}</p>
      <div className="dots" aria-hidden>{TOUR.map((_, k) => <i key={k} className={k === i ? 'on' : ''} />)}</div>
      <div className="actions center">
        <button className="ghost" onClick={() => setStep(step - 1)}>Back</button>
        {!last && <button className="primary" onClick={() => setStep(step + 1)}>Next</button>}
        {last && demo && <button className="primary" disabled={busy} onClick={() => finish(`/lecture/${demo.lecture_id}`)}>Try it in a lecture</button>}
        {last && <button className={demo ? 'ghost' : 'primary'} disabled={busy} onClick={() => finish('/')}>See my bridges</button>}
      </div>
      {!last && <button className="link skiptour" disabled={busy} onClick={() => finish('/')}>Skip</button>}
    </main>
  );
}
