import { useState } from 'react';
import { api, go, type Home } from './ui';
import { PlankIcon, Troll, type Mood } from './Troll';

const TOUR: { title: string; body: string; mood: Mood; plank: 'plain' | 'gap' | 'mended' | 'proven'; key?: string }[] = [
  { title: 'This is your bridge', body: 'Every idea in your course is one plank. Your bridge leads to the next exam, and it starts out whole.', mood: 'idle', plank: 'plain' },
  { title: 'Lost in a lecture? Press F', body: 'Norbu marks the exact moment and you keep listening. That idea becomes a missing plank. You can also type a quick question, with no need to explain the context.', mood: 'think', plank: 'gap', key: 'F' },
  { title: 'Later, mend the plank', body: 'Norbu shows what was said, explains it as a hint, a worked example or a full walkthrough, then asks you a riddle. Answer it in your own words.', mood: 'idle', plank: 'mended' },
  { title: 'A week later, prove it', body: 'Norbu asks once more after seven days. Still right? The plank turns green for good. That is what counts here, not how often you log in.', mood: 'happy', plank: 'proven' },
];

/** First visit: ask what gets in the way, then a four-step tour of the core loop. */
export function Welcome({ home, reload }: { home: Home; reload: () => void }) {
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<string[]>(home.user.struggles);
  const [busy, setBusy] = useState(false);
  const demo = home.lectures.find((l) => l.live_demo);

  const saveStruggles = async () => {
    setBusy(true);
    try { await api('/me', 'PATCH', { struggles: picked }); } finally { setBusy(false); }
    setStep(1);
  };
  const finish = async (to: string) => {
    setBusy(true);
    try { await api('/me', 'PATCH', { settings: { onboarded: true } }); } finally { setBusy(false); }
    go(to);
    reload();
  };

  if (step === 0) {
    return (
      <main className="welcome">
        <Troll size={110} />
        <h1>Nice to meet you, {home.user.name}. I'm Norbu, your Bridgeway buddy.</h1>
        <p className="lede">First, what gets in the way when you study? Pick any that fit. You don't need a diagnosis or the right word for it, and you can change this later.</p>
        <div className="chips center">
          {home.struggles.map((s) => {
            const on = picked.includes(s.key);
            return <button key={s.key} className={on ? 'pick on' : 'pick'} aria-pressed={on} onClick={() => setPicked(on ? picked.filter((k) => k !== s.key) : [...picked, s.key])}>{s.label}</button>;
          })}
        </div>
        <p className="fine">Only you see this. For each one, I'll switch on the strategy that helped students who said the same. Change them any time in Settings.</p>
        <div className="actions center">
          <button className="primary" disabled={busy} onClick={saveStruggles}>{picked.length ? 'Continue' : 'None of these, continue'}</button>
        </div>
      </main>
    );
  }

  const t = TOUR[step - 1];
  const last = step === TOUR.length;
  return (
    <main className="welcome">
      <p className="eyebrow">How it works · {step} of {TOUR.length}</p>
      <div className="tourart">
        <Troll size={120} mood={t.mood} />
        <div className="miniplanks" aria-hidden>
          {[0, 1, 2, 3, 4].map((i) => <PlankIcon key={i} state={i === 2 ? t.plank : 'plain'} size={60} />)}
        </div>
      </div>
      <h1>{t.title} {t.key && <kbd>{t.key}</kbd>}</h1>
      <p className="lede">{t.body}</p>
      <div className="dots" aria-hidden>{TOUR.map((_, i) => <i key={i} className={i === step - 1 ? 'on' : ''} />)}</div>
      <div className="actions center">
        <button className="ghost" onClick={() => setStep(step - 1)}>Back</button>
        {!last && <button className="primary" onClick={() => setStep(step + 1)}>Next</button>}
        {last && demo && <button className="primary" disabled={busy} onClick={() => finish(`/lecture/${demo.id}`)}>Try it in a lecture</button>}
        {last && <button className={demo ? 'ghost' : 'primary'} disabled={busy} onClick={() => finish('/')}>Go to my bridge</button>}
      </div>
      {!last && <button className="link skiptour" disabled={busy} onClick={() => finish('/')}>Skip the tour</button>}
    </main>
  );
}
