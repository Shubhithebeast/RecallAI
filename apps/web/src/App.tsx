import { useEffect, useState } from 'react';

export default function App() {
  const [health, setHealth] = useState('checking…');

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => setHealth(`${d.status} (${d.service})`))
      .catch(() => setHealth('server not reachable'));
  }, []);

  return (
    <main
      style={{
        fontFamily: 'system-ui, sans-serif',
        maxWidth: 640,
        margin: '0 auto',
        padding: '2rem',
        lineHeight: 1.5,
      }}
    >
      <h1>RecallAI — DevBrain</h1>
      <p>Your local developer second brain. Phase 1 scaffold is running. 🎉</p>
      <p>
        Server health: <strong>{health}</strong>
      </p>
    </main>
  );
}
