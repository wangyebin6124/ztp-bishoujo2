/* =====================================================================
 * main.js — 启动、资源加载、主循环、事件接线 (2.0)
 * 资源清单由 ZTP.DATA 自动生成（ROSTER + ENEMIES + 超级召唤立绘）
 * ===================================================================== */
window.ZTP = window.ZTP || {};

(function () {
  'use strict';
  const D = ZTP.DATA, G = ZTP.Game, UI = ZTP.UI, FX = ZTP.FX, AU = ZTP.Audio2;
  const $ = (sel) => document.querySelector(sel);

  /* roundRect 兜底 */
  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      if (typeof r === 'number') r = [r, r, r, r];
      if (!Array.isArray(r)) r = [8, 8, 8, 8];
      const [a, b, c, d] = r;
      this.moveTo(x + a, y);
      this.lineTo(x + w - b, y); this.arcTo(x + w, y, x + w, y + b, b);
      this.lineTo(x + w, y + h - c); this.arcTo(x + w, y + h, x + w - c, y + h, c);
      this.lineTo(x + d, y + h); this.arcTo(x, y + h, x, y + h - d, d);
      this.lineTo(x, y + a); this.arcTo(x, y, x + a, y, a);
      return this;
    };
  }

  /* ---------- 资源清单（数据驱动） ---------- */
  /* 部署在 github.io 时，大图走 jsDelivr CDN 加速，失败自动回退本站 */
  const ASSET_CDN = location.hostname.indexOf('github.io') >= 0
    ? 'https://cdn.jsdelivr.net/gh/wangyebin6124/ztp-bishoujo2@main/'
    : '';
  const MANIFEST = {};
  for (const id of D.ROSTER_ORDER) {
    const u = D.ROSTER[id];
    MANIFEST[id] = (u.style === 'sprite' ? 'assets/sprites/' : 'assets/cards/') + id + '.png';
  }
  for (const id of D.ENEMY_ORDER) {
    const e = D.ENEMIES[id];
    MANIFEST[e.img] = (e.style === 'sprite' ? 'assets/sprites/' : 'assets/cards/') + e.img + '.png';
  }
  MANIFEST.mami = 'assets/cards/mami.png';     // 宝具切绘
  MANIFEST.miku = 'assets/sprites/miku.png';   // 演唱会

  const images = {};
  function loadImages(cb) {
    const names = Object.keys(MANIFEST);
    let done = 0;
    const bar = $('#loadbar'), label = $('#loadtext');
    const mark = () => {
      done++;
      if (bar) bar.style.width = Math.round(done / names.length * 100) + '%';
      if (label) label.textContent = '加载 WIKI 立绘 ' + done + '/' + names.length;
      if (done === names.length) cb();
    };
    names.forEach((n) => {
      const im = new Image();
      im.onload = () => { images[n] = im; mark(); };
      im.onerror = () => {
        // CDN 失败 → 回退本站相对路径
        const local = MANIFEST[n];
        if (ASSET_CDN && im.src.indexOf(ASSET_CDN) === 0) {
          im.src = local;
        } else {
          images[n] = im;
          mark();
        }
      };
      im.src = ASSET_CDN ? ASSET_CDN + MANIFEST[n] : MANIFEST[n];
    });
  }

  /* ---------- 启动 ---------- */
  window.addEventListener('DOMContentLoaded', () => {
    const canvas = $('#game');
    const ctx = canvas.getContext('2d');

    fetch('assets/wiki/credits.json')
      .then(r => r.json())
      .then(j => { window.__ZTP_CREDITS__ = j; })
      .catch(() => { });

    const save = ZTP.Save.get();
    G.S.hacked = Object.assign(G.S.hacked, save.hacked);
    if (save.team && save.team.length) {
      G.setTeam(save.team.filter(id => D.ROSTER[id]));
    }

    UI.init($('#ui'), handleAction);
    G.S.onEvent = handleEvent;

    showScreenName('menu');
    loadImages(() => {
      G.setImages(images);
      const l = $('#loading');
      if (l) l.remove();
    });
    G.setImages(images);

    let last = performance.now();
    let uiT = 0;
    let lastFrameAt = performance.now();
    function frame(now) {
      const dtRaw = Math.min((now - last) / 1000, 0.1);
      last = now;
      lastFrameAt = performance.now();
      if (G.S.mode === 'playing') {
        G.update(dtRaw);
        FX.update(dtRaw * G.S.speed);
      }
      uiT -= dtRaw;
      if (uiT <= 0) { UI.refresh(); uiT = 0.12; }
      if (G.S.mode === 'playing' || G.S.mode === 'paused' || G.S.mode === 'over') {
        G.draw(ctx);
      } else {
        drawMenuBg(ctx);
      }
    }
    function loop(now) {
      frame(now);
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
    setInterval(() => {
      if (performance.now() - lastFrameAt < 300) return;
      frame(performance.now());
    }, 120);
    // 测试钩子
    window.ZTP.__step = function (dt) {
      if (G.S.mode === 'playing') { G.update(dt); FX.update(dt * G.S.speed); }
      if (G.S.mode === 'playing' || G.S.mode === 'paused' || G.S.mode === 'over') G.draw(ctx);
      else drawMenuBg(ctx);
      UI.refresh();
    };

    /* ---------- 舞台自适应缩放 ---------- */
    const stageEl = $('#stage');
    function fitStage() {
      const sw = 960, sh = 540 + 118 + 34;
      const k = Math.min(window.innerWidth / (sw + 24), window.innerHeight / (sh + 24), 1.25);
      stageEl.style.transform = 'scale(' + k.toFixed(4) + ')';
    }
    window.addEventListener('resize', fitStage);
    fitStage();

    /* ---------- 菜单背景 ---------- */
    function drawMenuBg(c) {
      const g = c.createLinearGradient(0, 0, 0, 540);
      g.addColorStop(0, '#2c2336');
      g.addColorStop(0.5, '#6e4a56');
      g.addColorStop(1, '#e8b98a');
      c.fillStyle = g;
      c.fillRect(0, 0, 960, 540);
      c.fillStyle = 'rgba(255,220,150,.9)';
      c.beginPath();
      c.arc(700, 200, 52, 0, Math.PI * 2);
      c.fill();
    }

    /* ---------- UI 事件 ---------- */
    function handleAction(type, payload) {
      switch (type) {
        case 'buyUnit': {
          const r = G.buyUnit(payload);
          if (!r.ok && r.msg) { UI.message(r.msg, true); AU.deny(); }
          else if (r.ok) { AU.buy(); const u = D.ROSTER[payload]; if (u) FX.floatText(140, 360, u.name + ' 出击！', { col: '#bfe3ff', sz: 14 }); }
          break;
        }
        case 'buyBuilding': {
          const r = G.buyBuilding(payload);
          if (!r.ok && r.msg) { UI.message(r.msg, true); AU.deny(); }
          else if (r.ok) AU.buy();
          break;
        }
        case 'super': {
          const r = G.castSuper(payload);
          if (!r.ok && r.msg) { UI.message(r.msg, true); AU.deny(); }
          else if (r.ok) AU.fanfare();
          break;
        }
        case 'screen': showScreenName(payload); break;
        case 'formation': UI.openFormation(payload); break;
        case 'launch': {
          const idx = payload | 0;
          showScreenName(null);
          G.startLevel(idx);
          break;
        }
        case 'pause':
          if (G.S.mode === 'playing') { G.S.mode = 'paused'; showScreenName('pause'); }
          else if (G.S.mode === 'paused') { G.S.mode = 'playing'; showScreenName(null); }
          break;
        case 'resume': G.S.mode = 'playing'; showScreenName(null); break;
        case 'restart': showScreenName(null); G.startLevel(G.S.levelIdx); break;
        case 'quit': G.S.mode = 'menu'; showScreenName('menu'); break;
        case 'speed': G.S.speed = G.S.speed === 1 ? 2 : 1; break;
        case 'mute': AU.toggle(); break;
      }
    }

    function handleEvent(type, p) {
      if (type === 'end') {
        const endedLevel = G.S.levelIdx;
        setTimeout(() => {
          // 结算只在仍未离开该局时弹出（避免盖住已重开的新对局）
          if (G.S.mode !== 'over' || G.S.levelIdx !== endedLevel) return;
          UI.showScreen('end', p);
          if (p.win) AU.win(); else AU.lose();
        }, 900);
        if (p.win) { FX.ring(868, 420, 260, '#ffe9b0'); } else { FX.flash('#400', 0.5, 0.8); }
      } else if (type === 'cutin') {
        UI.cutin(p.who, p.text);
      } else if (type === 'kill') {
        if (Math.random() < 0.4) AU.groan();
      }
    }

    function showScreenName(name) {
      UI.showScreen(name);
    }

    /* ---------- 键盘 ---------- */
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      if (k === 'p' || k === 'escape') handleAction('pause');
      else if (k === 's') handleAction('speed');
      else if (k === 'm') handleAction('mute');
      else if (k === 'h') {
        const H = G.S.hacked;
        H.money = !H.money; H.energy = !H.energy; H.base = !H.base;
        ZTP.Save.setHacked(H);
        UI.message('无敌版：' + (H.money ? 'ON' : 'OFF') + '（金钱/能量/基地）', !H.money);
      }
      else if (G.S.mode === 'playing') {
        const idx = '123456'.indexOf(k);
        if (idx >= 0 && G.S.team[idx]) handleAction('buyUnit', G.S.team[idx]);
        const si = 'qwer'.indexOf(k);
        if (si >= 0) handleAction('super', D.SUPER_ORDER[si]);
      }
    });
  });
})();
