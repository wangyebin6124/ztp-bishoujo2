/* =====================================================================
 * audio.js — WebAudio 合成音效（无外部音频文件）
 * ===================================================================== */
window.ZTP = window.ZTP || {};

ZTP.Audio2 = (function () {
  'use strict';
  let ctx = null, master = null;
  let muted = false;

  function ensure() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        master = ctx.createGain();
        master.gain.value = 0.32;
        master.connect(ctx.destination);
      } catch (e) { return null; }
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function env(g, t0, a, d, peak) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
  }

  function tone(freq, dur, type, vol, slide) {
    const c = ensure();
    if (!c || muted) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, c.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), c.currentTime + dur);
    env(g, c.currentTime, 0.008, dur, vol || 0.5);
    o.connect(g); g.connect(master);
    o.start(); o.stop(c.currentTime + dur + 0.05);
  }

  let noiseBuf = null;
  function noise(dur, vol, filterFreq, slideDown) {
    const c = ensure();
    if (!c || muted) return;
    if (!noiseBuf) {
      noiseBuf = c.createBuffer(1, c.sampleRate * 1.2, c.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const src = c.createBufferSource();
    src.buffer = noiseBuf;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(filterFreq || 1800, c.currentTime);
    if (slideDown) f.frequency.exponentialRampToValueAtTime(Math.max(60, slideDown), c.currentTime + dur);
    f.Q.value = 0.8;
    const g = c.createGain();
    env(g, c.currentTime, 0.005, dur, vol || 0.4);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(); src.stop(c.currentTime + dur + 0.05);
  }

  const api = {
    get muted() { return muted; },
    toggle() { muted = !muted; if (!muted) ensure(); return muted; },
    blip() { tone(660, 0.06, 'square', 0.18, 880); },
    coin() { tone(1400, 0.09, 'square', 0.2, 2100); noise(0.05, 0.12, 3200); },
    cannon() { tone(220, 0.16, 'sawtooth', 0.3, 90); noise(0.12, 0.28, 900); },
    swing() { noise(0.12, 0.22, 1200, 400); },
    boom() { noise(0.5, 0.5, 500, 80); tone(90, 0.4, 'sine', 0.5, 40); },
    groan() { tone(rnd(90, 130), 0.4, 'sawtooth', 0.14, rnd(60, 90)); },
    convert() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.12, 'triangle', 0.22), i * 70)); },
    fanfare() { [392, 523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.16, 'square', 0.26), i * 90)); },
    buy() { tone(880, 0.07, 'triangle', 0.25, 1174); },
    deny() { tone(180, 0.16, 'square', 0.22, 120); },
    win() { [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => tone(f, 0.2, 'triangle', 0.3), i * 130)); },
    lose() { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'sawtooth', 0.22), i * 200)); },
  };
  function rnd(a, b) { return a + Math.random() * (b - a); }
  return api;
})();
