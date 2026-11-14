import { useEffect, useState } from 'react';
import { api, go, LevelDial, Toggle, WhyTip, type Home, type Settings } from './ui';
import { WhatHelps } from './Strategies';

export function SettingsPage({ home, section, reload, signOut }: { home: Home; section?: string; reload: () => void; signOut: () => void }) {
  const user = home.user;
  const s = user.settings;
  useEffect(() => { if (section === 'help') document.getElementById('what-helps')?.scrollIntoView({ block: 'start' }); }, [section]);
  const [confirm, setConfirm] = useState(false);
  const [perm, setPerm] = useState('Notification' in window ? Notification.permission : 'unsupported');
  const save = async (patch: Settings) => { await api('/me', 'PATCH', { settings: patch }); reload(); };
  const exportData = async () => {
    const data = await api('/export');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = 'norbu-my-data.json';
    a.click();
  };
  const student = user.role === 'student';
  return (
    <main className="page narrow">
      <h1>Settings</h1>

      <section className="card stack">
        <h2>Reading</h2>
        <label>Typeface
          <select value={s.font || 'atkinson'} onChange={(e) => save({ font: e.target.value as Settings['font'] })}>
            <option value="atkinson">Atkinson Hyperlegible (clear letter shapes)</option>
            <option value="lexend">Lexend (wider spacing)</option>
            <option value="system">My device's font</option>
          </select>
        </label>
        <label>Text size <output>{Math.round((s.size || 1) * 100)}%</output>
          <input type="range" min="0.9" max="1.4" step="0.05" value={s.size || 1} onChange={(e) => save({ size: Number(e.target.value) })} />
        </label>
        <label>Line spacing <output>{s.spacing || 1.6}</output>
          <input type="range" min="1.4" max="2.2" step="0.1" value={s.spacing || 1.6} onChange={(e) => save({ spacing: Number(e.target.value) })} />
        </label>
        <Toggle checked={!!s.calm} onChange={(v) => save({ calm: v })}>Calm mode: stop all movement (the troll bobbing, the water, sliding panels, smooth scrolling)</Toggle>
      </section>

      {student && (
        <>
          <section className="card stack">
            <h2>How Noor helps</h2>
            <div><p>Starting support level</p><LevelDial value={s.level || 'example'} onChange={(l) => save({ level: l })} /></div>
            <Toggle checked={!!s.focus} onChange={(v) => save({ focus: v })}>Focus view in lectures: hide the side panel and dim everything but the current passage</Toggle>
            <Toggle checked={!!s.checkpoints} onChange={(v) => save({ checkpoints: v })}>Checkpoint nudges during live lectures</Toggle>
            <button className="ghost" onClick={async () => { await save({ onboarded: false }); go('/'); }}>Show the welcome tour again</button>
          </section>

          <section className="card stack">
            <h2>Lecture transcript</h2>
            <Toggle checked={!!s.replaySpeed} onChange={(v) => save({ replaySpeed: v })}>Replay speed control (0.75× to 2×)</Toggle>
            <Toggle checked={!!s.wordHighlight} onChange={(v) => save({ wordHighlight: v })}>Highlight the current word during a replay</Toggle>
          </section>

          <WhatHelps home={home} reload={reload} />

          <section className="card stack">
            <h2>Daily reminder</h2>
            <p className="muted">One nudge a day at a time you choose. It mentions planks to mend, never a lost streak.</p>
            <label>Remind me at
              <input type="time" value={s.reminder || ''} onChange={(e) => save({ reminder: e.target.value })} />
            </label>
            {s.reminder && <button className="ghost" onClick={() => save({ reminder: '' })}>Turn reminder off</button>}
            {perm === 'default' && <button className="ghost" onClick={async () => setPerm(await Notification.requestPermission())}>Allow notifications on this device</button>}
            {perm === 'denied' && <p className="fine">Notifications are blocked in this browser, so the reminder will show inside Noor instead.</p>}
            <p className="fine">Reminders appear while Noor is open in a browser tab.</p>
          </section>
        </>
      )}

      <section className="card stack">
        <h2>Your data</h2>
        {student && (
          <>
            <Toggle checked={!!s.shareFlags} onChange={(v) => save({ shareFlags: v })}>
              Share my flags with my instructor <WhyTip label="What does my instructor see?"><strong>What:</strong> only where you flagged, counted with at least 4 others. <strong>Never:</strong> your name or what you typed.</WhyTip>
            </Toggle>
            <Toggle checked={s.shareAggregates !== false} onChange={(v) => save({ shareAggregates: v })}>Count me in anonymous class totals (which strategies help, groups of 5 or more)</Toggle>
          </>
        )}
        <p className="muted">Your notes, questions and what you find hard are visible only to you. Noor never records a diagnosis and does not track your location.</p>
        <div className="actions">
          <button className="ghost" onClick={exportData}>Download my data</button>
          <button className="ghost" onClick={signOut}>Sign out</button>
          {!confirm ? <button className="ghost danger" onClick={() => setConfirm(true)}>Delete my account</button>
            : <button className="danger" onClick={async () => { await api('/me', 'DELETE'); signOut(); }}>Yes, delete everything of mine</button>}
        </div>
      </section>
    </main>
  );
}
