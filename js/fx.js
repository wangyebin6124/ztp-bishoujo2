/* =====================================================================
 * fx.js — 战斗特效系统（全部代码生成，无AI生图）
 * 粒子 / 弹道 / 电弧 / 冲击波 / 火海 / 花瓣 / 飘字 / 屏幕震动 / 闪白
 * ===================================================================== */
window.ZTP = window.ZTP || {};

ZTP.FX = (function () {
  'use strict';

  const parts = [];      // 粒子
  const projs = [];      // 弹道
  const arcs = [];       // 电弧
  const rings = [];      // 冲击波
  const texts = [];      // 飘字
  const burns = [];      // 地面火海
  const beams = [];      // 激光/射线（瞬时）
  let shakeT = 0, shakeAmp = 0;
  let flashT = 0, flashDur = 0, flashColor = '#fff', flashA = 0;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];

  /* ---------------- 通用 ---------------- */
  function update(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.t += dt;
      if (p.t >= p.life) { parts.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += (p.g || 0) * dt;
      p.vx *= (1 - (p.drag || 0) * dt);
      if (p.sway) p.x += Math.sin(p.t * p.sway + p.ph) * p.swayAmp * dt;
    }
    for (let i = projs.length - 1; i >= 0; i--) {
      const p = projs[i];
      p.t += dt;
      if (p.kind === 'bottle' || p.kind === 'gib') {
        // 抛物线
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += p.grav * dt;
        if (p.trail) trailFx(p);
        if (p.y >= p.ty && p.vy > 0) {
          projs.splice(i, 1);
          if (p.onHit) p.onHit(p.x, p.ty);
          continue;
        }
      } else {
        const dx = p.tx - p.x, dy = p.ty - p.y;
        const d = Math.hypot(dx, dy);
        const step = p.speed * dt;
        if (d <= step || d < 6) {
          projs.splice(i, 1);
          if (p.onHit) p.onHit(p.tx, p.ty);
          continue;
        }
        p.x += dx / d * step;
        p.y += dy / d * step;
        if (p.trail) trailFx(p);
      }
      if (p.t > 6) projs.splice(i, 1);
    }
    for (let i = arcs.length - 1; i >= 0; i--) {
      arcs[i].t += dt;
      if (arcs[i].t >= arcs[i].life) arcs.splice(i, 1);
    }
    for (let i = rings.length - 1; i >= 0; i--) {
      rings[i].t += dt;
      if (rings[i].t >= rings[i].life) rings.splice(i, 1);
    }
    for (let i = texts.length - 1; i >= 0; i--) {
      const t = texts[i];
      t.t += dt;
      t.y += t.vy * dt;
      if (t.t >= t.life) texts.splice(i, 1);
    }
    for (let i = burns.length - 1; i >= 0; i--) {
      const b = burns[i];
      b.t += dt;
      b.tick -= dt;
      if (b.tick <= 0) {
        b.tick = 0.5;
        if (b.onTick) b.onTick(b.x, b.r);
      }
      if (b.t >= b.life) burns.splice(i, 1);
    }
    for (let i = beams.length - 1; i >= 0; i--) {
      beams[i].t += dt;
      if (beams[i].t >= beams[i].life) beams.splice(i, 1);
    }
    if (shakeT > 0) shakeT -= dt;
    if (flashT > 0) flashT -= dt;
  }

  function trailFx(p) {
    if (p.kind === 'coin') {
      spark(p.x, p.y, 1, { col: pick(['#ffe14d', '#7ee3ff', '#fff']), sp: 40, life: 0.22, sz: 2 });
    } else if (p.kind === 'bottle') {
      smoke(p.x, p.y, 1, { col: '#ffb03a', life: 0.3, sz: 4 });
    } else if (p.kind === 'cannon') {
      spark(p.x, p.y, 1, { col: '#59c8ff', sp: 30, life: 0.25, sz: 3 });
    } else if (p.kind === 'gib') {
      blood(p.x, p.y, 1, 0.4);
    }
  }

  function draw(ctx) {
    // 火海（地面层）
    for (const b of burns) {
      if (!isFinite(b.x) || !isFinite(b.y) || !isFinite(b.r)) continue;
      const k = 1 - b.t / b.life;
      const gr = ctx.createRadialGradient(b.x, b.y, 2, b.x, b.y, b.r);
      gr.addColorStop(0, 'rgba(255,190,60,' + (0.55 * k).toFixed(3) + ')');
      gr.addColorStop(0.55, 'rgba(255,100,30,' + (0.38 * k).toFixed(3) + ')');
      gr.addColorStop(1, 'rgba(120,30,0,0)');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, b.r, b.r * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      if (Math.random() < 0.6) {
        parts.push({ kind: 'fire', x: b.x + rnd(-b.r * 0.8, b.r * 0.8), y: b.y + rnd(-6, 6), vx: rnd(-8, 8), vy: rnd(-70, -30), g: 0, t: 0, life: rnd(0.3, 0.6), sz: rnd(3, 7), col: pick(['#ffcf5a', '#ff8c2e', '#ff5722']), drag: 1 });
      }
    }
    // 弹道
    for (const p of projs) {
      if (!isFinite(p.x) || !isFinite(p.y)) continue;
      ctx.save();
      if (p.kind === 'coin') {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.t * 22);
        ctx.fillStyle = '#ffe14d';
        ctx.beginPath();
        ctx.ellipse(0, 0, 7, 3.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff7c9';
        ctx.lineWidth = 1.4;
        ctx.stroke();
      } else if (p.kind === 'bottle') {
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.atan2(p.vy, p.vx) + Math.PI / 2);
        ctx.fillStyle = '#3e8f4e';
        ctx.fillRect(-3, -8, 6, 13);
        ctx.fillStyle = '#ffdd55';
        ctx.fillRect(-2, -12, 4, 5);
        ctx.fillStyle = 'rgba(255,120,30,.9)';
        ctx.beginPath();
        ctx.arc(0, -14, 3.5 + Math.random(), 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === 'cannon') {
        const gr = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, 9);
        gr.addColorStop(0, '#eaffff');
        gr.addColorStop(0.4, '#59c8ff');
        gr.addColorStop(1, 'rgba(40,120,255,0)');
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === 'gib') {
        ctx.fillStyle = '#7fae66';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#c94f4f';
        ctx.beginPath();
        ctx.arc(p.x - 2, p.y + 2, 2.2, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === 'spark') {
        ctx.strokeStyle = '#ff8ce0';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03);
        ctx.stroke();
      } else if (p.kind === 'musket') {
        ctx.strokeStyle = 'rgba(255,240,200,.95)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.02, p.y - p.vy * 0.02);
        ctx.stroke();
      } else if (p.kind === 'note') {
        ctx.fillStyle = p.col || '#39c5bb';
        ctx.font = 'bold 16px serif';
        ctx.fillText(p.ch || '♪', p.x, p.y);
      }
      ctx.restore();
    }
    // 射线
    for (const b of beams) {
      const k = 1 - b.t / b.life;
      ctx.save();
      ctx.globalAlpha = k;
      ctx.strokeStyle = b.col;
      ctx.lineWidth = b.w * k;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(b.x1, b.y1);
      ctx.lineTo(b.x2, b.y2);
      ctx.stroke();
      if (b.glow) {
        ctx.globalAlpha = k * 0.5;
        ctx.lineWidth = b.w * 2.4 * k;
        ctx.stroke();
      }
      ctx.restore();
    }
    // 电弧
    for (const a of arcs) {
      const k = 1 - a.t / a.life;
      ctx.save();
      ctx.globalAlpha = k;
      ctx.strokeStyle = a.col;
      ctx.lineWidth = a.w;
      ctx.beginPath();
      const seg = a.pts;
      ctx.moveTo(seg[0].x, seg[0].y);
      for (let i = 1; i < seg.length; i++) ctx.lineTo(seg[i].x, seg[i].y);
      ctx.stroke();
      ctx.globalAlpha = k * 0.45;
      ctx.lineWidth = a.w * 3;
      ctx.stroke();
      ctx.restore();
    }
    // 粒子
    for (const p of parts) {
      const k = 1 - p.t / p.life;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, k * (p.a || 1)));
      if (p.kind === 'petal') {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot + p.t * p.rv);
        ctx.fillStyle = p.col;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.sz, p.sz * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === 'heart') {
        ctx.fillStyle = p.col;
        ctx.font = 'bold ' + p.sz + 'px sans-serif';
        ctx.fillText('♥', p.x - p.sz / 2, p.y);
      } else if (p.kind === 'fire' || p.kind === 'smoke') {
        ctx.fillStyle = p.col;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.sz * (p.kind === 'smoke' ? (2 - k) : k), 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = p.col;
        ctx.fillRect(p.x - p.sz / 2, p.y - p.sz / 2, p.sz, p.sz);
      }
      ctx.restore();
    }
    // 冲击波
    for (const r of rings) {
      const k = r.t / r.life;
      ctx.save();
      ctx.globalAlpha = (1 - k) * 0.9;
      ctx.strokeStyle = r.col;
      ctx.lineWidth = r.w * (1 - k) + 1;
      ctx.beginPath();
      ctx.ellipse(r.x, r.y, r.r * k + 4, (r.r * k + 4) * (r.flat ? 0.4 : 1), 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    // 飘字
    for (const t of texts) {
      const k = 1 - t.t / t.life;
      ctx.save();
      ctx.globalAlpha = Math.min(1, k * 2);
      ctx.font = 'bold ' + (t.sz || 15) + 'px "Segoe UI", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,.75)';
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.col;
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    }
  }

  function drawFlash(ctx) {
    if (flashT > 0) {
      ctx.save();
      ctx.globalAlpha = flashA * (flashT / flashDur);
      ctx.fillStyle = flashColor;
      ctx.fillRect(0, 0, 3000, 2000);
      ctx.restore();
    }
  }

  /* ---------------- 生成器 ---------------- */
  function spark(x, y, n, o) {
    o = o || {};
    for (let i = 0; i < n; i++) {
      const a = rnd(0, Math.PI * 2), sp = rnd(0.3, 1) * (o.sp || 120);
      parts.push({ kind: 'dot', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, g: o.g != null ? o.g : 260, t: 0, life: rnd(0.5, 1) * (o.life || 0.4), sz: o.sz || rnd(2, 3.6), col: o.col || '#ffd75e', drag: 2 });
    }
  }
  function petals(x, y, n, col) {
    for (let i = 0; i < n; i++) {
      parts.push({ kind: 'petal', x: x + rnd(-10, 10), y: y + rnd(-16, 6), vx: rnd(-60, 60), vy: rnd(-130, -30), g: 150, t: 0, life: rnd(0.7, 1.5), sz: rnd(3.5, 6.5), col: col || pick(['#ff9ab5', '#ffb7cd', '#ff7fa8', '#ffd1de']), rot: rnd(0, 6.28), rv: rnd(-6, 6), sway: 6, swayAmp: 26, ph: rnd(0, 6.28) });
    }
  }
  function blood(x, y, n, scale) {
    const s = scale || 1;
    for (let i = 0; i < n; i++) {
      parts.push({ kind: 'dot', x: x + rnd(-6, 6), y: y + rnd(-18, 0), vx: rnd(-90, 90) * s, vy: rnd(-160, -20) * s, g: 420, t: 0, life: rnd(0.35, 0.8), sz: rnd(2, 4.6), col: pick(['#8fdc6e', '#6fbf55', '#b5e398', '#d3f2c0']), drag: 1.4 });
    }
  }
  function smoke(x, y, n, o) {
    o = o || {};
    for (let i = 0; i < n; i++) {
      parts.push({ kind: 'smoke', x: x + rnd(-4, 4), y: y + rnd(-4, 4), vx: rnd(-16, 16), vy: rnd(-40, -12), g: -14, t: 0, life: o.life || rnd(0.5, 1.1), sz: o.sz || rnd(4, 9), col: o.col || 'rgba(120,120,128,.5)', drag: 1 });
    }
  }
  function explosion(x, y, r, col) {
    rings.push({ x, y, r: r * 1.15, t: 0, life: 0.4, col: col || '#ffd28a', w: 5, flat: true });
    spark(x, y, 16, { col: pick(['#ffcf5a', '#ff9b40', '#ff6d2e']), sp: 200, life: 0.5 });
    smoke(x, y - 6, 7, { col: 'rgba(70,66,64,.55)', sz: 10, life: 1.2 });
    flash(colorSafe(col || '#ffcf7a'), 0.12, 0.12);
    shake(5);
  }
  function colorSafe(c) { return c; }
  function muzzle(x, y, col) {
    for (let i = 0; i < 5; i++) {
      parts.push({ kind: 'dot', x, y, vx: rnd(60, 220), vy: rnd(-40, 40), g: 0, t: 0, life: rnd(0.08, 0.18), sz: rnd(2, 4), col: col || '#ffe9a8', drag: 4 });
    }
  }
  function lightning(x1, y1, x2, y2, col, w, life) {
    const pts = [];
    const n = 7;
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      pts.push({ x: x1 + (x2 - x1) * k + (i && i < n ? rnd(-9, 9) : 0), y: y1 + (y2 - y1) * k + (i && i < n ? rnd(-9, 9) : 0) });
    }
    arcs.push({ pts, t: 0, life: life || 0.16, col: col || '#8fe3ff', w: w || 2 });
  }
  function ring(x, y, r, col, flat) {
    rings.push({ x, y, r, t: 0, life: 0.45, col: col || '#fff', w: 4, flat: !!flat });
  }
  function floatText(x, y, text, o) {
    o = o || {};
    texts.push({ x, y, text, col: o.col || '#fff', sz: o.sz || 15, t: 0, life: o.life || 0.9, vy: o.vy != null ? o.vy : -46 });
  }
  function dmgNum(x, y, v, col) {
    texts.push({ x: x + rnd(-8, 8), y, text: '' + Math.round(v), col: col || '#ffe08a', sz: 13, t: 0, life: 0.55, vy: -60 });
  }
  function burnZone(x, r, dur, onTick) {
    burns.push({ x, r, t: 0, life: dur, tick: 0.01, onTick });
  }
  function beam(x1, y1, x2, y2, col, w, life, glow) {
    beams.push({ x1, y1, x2, y2, col, w, t: 0, life: life || 0.2, glow: glow !== false });
  }
  function projectile(o) { projs.push(Object.assign({ t: 0 }, o)); }
  function shake(a) { shakeAmp = Math.max(shakeAmp, a); shakeT = Math.max(shakeT, 0.3); }
  function flash(col, a, dur) { flashColor = col; flashA = a; flashDur = dur; flashT = dur; }

  function shakeOffset() {
    if (shakeT <= 0) return { x: 0, y: 0 };
    const k = shakeT / 0.3;
    return { x: rnd(-1, 1) * shakeAmp * k, y: rnd(-1, 1) * shakeAmp * k };
  }

  function clearAll() {
    parts.length = 0; projs.length = 0; arcs.length = 0; rings.length = 0;
    texts.length = 0; burns.length = 0; beams.length = 0;
    shakeT = 0; flashT = 0;
  }

  return { update, draw, drawFlash, spark, petals, blood, smoke, explosion, muzzle, lightning, ring, floatText, dmgNum, burnZone, beam, projectile, shake, flash, shakeOffset, clearAll };
})();
