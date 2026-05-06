import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Unlock AudioContext on first user gesture (required by browsers/WebView)
document.addEventListener('click', () => {
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (AC) { const ctx = new AC(); if (ctx.state === 'suspended') ctx.resume(); }
  } catch {}
}, { once: true });

// Keep WebView alive when app goes to background
(window as any).__onAppPause = () => {
  document.querySelectorAll('audio').forEach(a => {
    if (a.loop && a.paused) a.play().catch(() => {});
  });
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
