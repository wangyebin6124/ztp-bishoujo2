/* =====================================================================
 * ui.js — HUD 与界面 (2.0)
 * 顶栏 / 编队兵种卡(仅编队成员) / 建筑卡 / 宝具卡
 * 2.0 新增：战前编队界面（34人花名册、职业筛选、助战位、推荐编成）
 * 主菜单 / 选关 / 帮助 / 名单 / 暂停 / 结算 / 无敌版 / 切绘
 * ===================================================================== */
window.ZTP = window.ZTP || {};

ZTP.UI = (function () {
  'use strict';
  const D = ZTP.DATA;
  const $ = (sel) => document.querySelector(sel);
  const el = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };
  let root, hud, screens, tipTimer = null;
  let onAction = null;
  let pendingLevel = null;    // 编队后要出征的关卡
  let fromFilter = 'all', clsFilter = 'all';
  let teamDirty = true;       // 兵种卡需要重建

  /* ================= HUD ================= */
  function buildHud() {
    hud = el('div', 'hud');

    const top = el('div', 'hud-top');
    top.innerHTML =
      '<div class="stat money"><span class="ic">💰</span><b id="hMoney">0</b></div>' +
      '<div class="stat pop"><span class="ic">👪</span><b id="hPop">0/5</b></div>' +
      '<div class="stat energy"><span class="ic">⚡</span><b id="hEnergy">0</b></div>' +
      '<div class="stat time"><span class="ic">⏱</span><b id="hTime">00:00</b></div>' +
      '<div class="stat hacked" id="hHacked" title="无敌版">HACKED</div>' +
      '<div class="hud-btns">' +
      '  <button class="hbtn" id="bSpeed" title="倍速 (S)">▶▶</button>' +
      '  <button class="hbtn" id="bMute" title="声音 (M)">🔊</button>' +
      '  <button class="hbtn" id="bPause" title="暂停 (P)">⏸</button>' +
      '  <button class="hbtn warn" id="bMenu">主菜单</button>' +
      '</div>';
    hud.appendChild(top);

    // 卡片区（编队成员动态重建）
    const cards = el('div', 'hud-cards');
    cards.appendChild(el('div', 'card-group units', '')).id = 'unitBox';
    const bldBox = el('div', 'card-group builds');
    for (const id of D.BUILDING_ORDER) {
      const b = D.BUILDINGS[id];
      const c = el('div', 'card build');
      c.dataset.id = id;
      c.innerHTML =
        '<div class="bicon">' + buildingIcon(id) + '</div>' +
        '<div class="cname">' + b.name + '</div>' +
        '<div class="ccost" id="cost_' + id + '">$' + b.cost + '</div>' +
        '<div class="cnt" id="cnt_' + id + '"></div>';
      c.addEventListener('click', () => act('buyBuilding', id));
      c.addEventListener('mouseenter', () => showTip(buildTip(b)));
      c.addEventListener('mouseleave', hideTip);
      bldBox.appendChild(c);
    }
    cards.appendChild(bldBox);

    const supBox = el('div', 'card-group supers');
    supBox.appendChild(el('div', 'sup-title', '超级召唤·宝具 <small>(能量点)</small>'));
    const supRow = el('div', 'sup-row');
    for (const id of D.SUPER_ORDER) {
      const s = D.SUPERS[id];
      const c = el('div', 'card super');
      c.dataset.id = id;
      c.innerHTML =
        '<img draggable="no" src="assets/cards/port_' + superPort(id) + '.png" alt="">' +
        '<div class="cname">' + s.name + '</div>' +
        '<div class="ccost">' + s.cost + '</div>';
      c.addEventListener('click', () => act('super', id));
      c.addEventListener('mouseenter', () => showTip('<b>' + s.name + '</b> <small>' + s.sub + '</small><p>' + s.desc + '</p>'));
      c.addEventListener('mouseleave', hideTip);
      supRow.appendChild(c);
    }
    supBox.appendChild(supRow);
    cards.appendChild(supBox);
    hud.appendChild(cards);

    const msg = el('div', 'hud-msg', '');
    msg.id = 'hMsg';
    hud.appendChild(msg);
    return hud;
  }

  /* 编队成员的兵种卡（队伍变化时重建） */
  function rebuildUnitCards() {
    const box = $('#unitBox');
    if (!box) return;
    box.innerHTML = '';
    const team = ZTP.Game.S.team || [];
    team.forEach((id, i) => {
      const u = D.ROSTER[id];
      if (!u) return;
      const isSupport = i === D.CONST.TEAM_SIZE - 1;
      const cost = ZTP.Game.unitCost(id);
      const cls = D.CLASSES[u.cls];
      const c = el('div', 'card unit');
      c.dataset.id = id;
      c.innerHTML =
        '<span class="key">' + (i + 1) + '</span>' +
        '<img draggable="no" src="assets/cards/port_' + id + '.png" alt="">' +
        '<span class="cls-chip" style="background:' + cls.col + '">' + cls.ch + '</span>' +
        '<div class="cname">' + u.name + (isSupport ? ' <small>助战</small>' : '') + '</div>' +
        '<div class="ccost">$' + cost + (isSupport ? '<small> 6折</small>' : '') + '</div>' +
        '<div class="lock" style="display:none">🔒<small id="lock_' + id + '"></small></div>';
      c.addEventListener('click', () => act('buyUnit', id));
      c.addEventListener('mouseenter', () => showTip(unitTip(u, isSupport)));
      c.addEventListener('mouseleave', hideTip);
      box.appendChild(c);
    });
    teamDirty = false;
  }

  function superPort(id) {
    return { airstrike: 'mami', mob: 'taiga', concert: 'miku', excalibur: 'artoria' }[id] || 'taiga';
  }
  function buildingIcon(id) {
    return { trailer: '🚚', yard: '🏭', tent: '🏕', workshop: '⚒️', academy: '📖', circle: '✨', altar: '🏆' }[id] || '🏠';
  }
  function classLine(cls) {
    const c = D.CLASSES[cls];
    let s = '<span class="cls-inline" style="background:' + c.col + '">' + c.ch + '</span> ' + c.name;
    if (c.beats) s += ' → 克制 <b>' + D.CLASSES[c.beats].name + '</b>';
    else s += ' → 对所有常规职业 ±50%（受创也加重）';
    return s;
  }
  function unitTip(u, isSupport) {
    const G = ZTP.Game.S;
    const inTeam = (G.team || []).indexOf(u.id) >= 0;
    const slot = (G.team || []).indexOf(u.id);
    let lockLine = '';
    if (G.mode === 'playing' || G.mode === 'paused') {
      if (inTeam && !ZTP.Game.slotUnlocked(u.id)) {
        const b = ZTP.Game.slotUnlockBuilding(slot);
        lockLine = '<p class="warn">🔒 需要建造「' + (b ? b.name + '（$' + b.cost + '）' : '???') + '」解锁</p>';
      }
    }
    return '<b>' + u.name + '</b> <small>' + u.src + ' · ' + (D.CLASSES[u.cls] ? D.CLASSES[u.cls].name : '') + (isSupport ? ' · 助战位(部署6折)' : '') + '</small>' +
      '<p>' + classLine(u.cls) + '</p>' +
      '<p class="passive">✦ 被动【' + u.passive.name + '】' + u.passive.desc + '</p>' +
      '<p class="stats">HP ' + u.hp + ' · 攻击 ' + u.dmg + ' · 射程 ' + (u.range > 60 ? u.range : '近战') + ' · 占位 ' + u.pop + ' · 基础费用 $' + u.cost + '</p>' +
      '<p class="quote">「' + u.quote + '」</p>' +
      lockLine +
      (inTeam ? '' : '<p class="warn">不在当前编队中</p>');
  }
  function buildTip(b) {
    const n = ZTP.Game.S.buildings[b.id] || 0;
    const cost = ZTP.Game.buildingCost(b.id);
    return '<b>' + b.name + '</b> <small>$' + cost + (b.max > 1 ? ' · 已建 ' + n + '/' + b.max : '') + '</small>' +
      '<p>' + b.about + '</p><p class="stats">' + b.effect + '</p>';
  }

  function showTip(html) {
    let tip = $('#tip');
    if (!tip) {
      tip = el('div', 'tip');
      tip.id = 'tip';
      root.appendChild(tip);
    }
    tip.innerHTML = html;
    tip.style.display = 'block';
  }
  function hideTip() {
    const tip = $('#tip');
    if (tip) tip.style.display = 'none';
  }

  let msgTimer = null;
  function message(text, bad) {
    const m = $('#hMsg');
    if (!m) return;
    m.textContent = text;
    m.className = 'hud-msg show' + (bad ? ' bad' : '');
    clearTimeout(msgTimer);
    msgTimer = setTimeout(() => { m.className = 'hud-msg'; }, 1800);
  }

  /* ================= 每帧刷新 ================= */
  let R = null;
  function buildRefs() {
    R = {
      money: $('#hMoney'), pop: $('#hPop'), energy: $('#hEnergy'), time: $('#hTime'),
      hacked: $('#hHacked'), speed: $('#bSpeed'), mute: $('#bMute'),
      units: {}, builds: {}, supers: {},
    };
    for (const id of D.BUILDING_ORDER) {
      const c = hud.querySelector('.card.build[data-id="' + id + '"]');
      R.builds[id] = c ? { c, cost: $('#cost_' + id), cnt: $('#cnt_' + id) } : null;
    }
    for (const id of D.SUPER_ORDER) {
      R.supers[id] = hud.querySelector('.card.super[data-id="' + id + '"]');
    }
  }

  function setTxt(node, v) {
    if (node && node.__v !== v) { node.__v = v; node.textContent = v; }
  }
  function setCls(node, cls, on) {
    if (node && node.__c0 !== cls + on) {
      node.__c0 = cls + on;
      node.classList.toggle(cls, on);
    }
  }

  function refresh() {
    const G = ZTP.Game.S;
    if (!hud) return;
    if (!R) buildRefs();
    if (teamDirty) rebuildUnitCards();
    setTxt(R.money, Math.floor(G.money).toLocaleString());
    setTxt(R.pop, G.popUsed + '/' + G.popCap);
    setTxt(R.energy, Math.floor(G.energy).toLocaleString());
    const t = Math.floor(G.time);
    setTxt(R.time, pad((t / 60) | 0) + ':' + pad(t % 60));
    const hackedOn = G.hacked.money || G.hacked.energy || G.hacked.base;
    if (R.hacked.__h !== hackedOn) { R.hacked.__h = hackedOn; R.hacked.style.display = hackedOn ? 'inline-block' : 'none'; }

    for (const c of hud.querySelectorAll('.card.unit')) {
      const id = c.dataset.id;
      const u = D.ROSTER[id];
      if (!u) continue;
      const cost = ZTP.Game.unitCost(id);
      const slot = (G.team || []).indexOf(id);
      const unlocked = slot >= 0 && ZTP.Game.slotUnlocked(id);
      const lockEl = c.querySelector('.lock');
      if (lockEl && lockEl.__v !== unlocked) {
        lockEl.__v = unlocked;
        lockEl.style.display = unlocked ? 'none' : 'flex';
        const lbl = c.querySelector('.lock small');
        if (lbl && !unlocked) {
          const b = ZTP.Game.slotUnlockBuilding(slot);
          lbl.textContent = b ? b.name : '';
        }
      }
      setCls(c, 'locked', !unlocked);
      setCls(c, 'poor', unlocked && G.money < cost);
      setCls(c, 'nopop', unlocked && G.popUsed + u.pop > G.popCap);
    }
    for (const id of D.BUILDING_ORDER) {
      const r = R.builds[id];
      if (!r) continue;
      const b = D.BUILDINGS[id];
      const cost = ZTP.Game.buildingCost(id);
      const n = G.buildings[id] || 0;
      const maxed = n >= b.max;
      setTxt(r.cost, maxed ? 'MAX' : '$' + cost);
      setTxt(r.cnt, (n > 0 && b.max > 1) ? ('×' + n) : '');
      setCls(r.c, 'maxed', maxed);
      setCls(r.c, 'poor', !maxed && G.money < cost);
    }
    for (const id of D.SUPER_ORDER) {
      setCls(R.supers[id], 'poor', G.energy < D.SUPERS[id].cost);
    }
    if (R.speed.__v !== G.speed) { R.speed.__v = G.speed; R.speed.textContent = G.speed > 1 ? '▶▶▶' : '▶▶'; }
    if (R.mute.__v !== ZTP.Audio2.muted) { R.mute.__v = ZTP.Audio2.muted; R.mute.textContent = ZTP.Audio2.muted ? '🔇' : '🔊'; }
  }
  const pad = (n) => (n < 10 ? '0' + n : '' + n);

  /* ================= 全屏界面 ================= */
  function showScreen(name, payload) {
    hideScreens();
    if (!name) { screens.style.display = 'none'; return; }
    screens.style.display = 'flex';
    const fn = SCREENS[name];
    if (fn) screens.appendChild(fn(payload || {}));
  }
  function hideScreens() {
    if (screens) {
      screens.innerHTML = '';
      screens.style.display = 'none';
    }
  }

  /* ---------------- 编队界面 ---------------- */
  function openFormation(levelIdx) {
    pendingLevel = (levelIdx != null && levelIdx >= 0) ? levelIdx : null;
    showScreen('formation');
  }

  const SCREENS = {
    menu() {
      const s = el('div', 'screen menu');
      s.appendChild(el('div', 'sign',
        '<div class="big">僵尸房车公园</div>' +
        '<div class="sub">～美娘大作战 2.0～</div>' +
        '<div class="tiny">FGO 英灵参战 · 职业克制 · 战前编队 · Mooncell &amp; 萌娘百科 WIKI 图片版</div>'));
      const box = el('div', 'menu-box');
      box.appendChild(mbtn('开始战役', () => act('screen', 'stages')));
      box.appendChild(mbtn('角色图鉴 & 编队', () => act('formation', -1)));
      box.appendChild(mbtn('无敌版设置', () => act('screen', 'hacks')));
      box.appendChild(mbtn('玩法说明', () => act('screen', 'help')));
      box.appendChild(mbtn('制作名单 & 图片来源', () => act('screen', 'credits')));
      s.appendChild(box);
      const z = el('div', 'walker');
      z.innerHTML = '<img src="assets/sprites/yoshika.png" alt=""><img src="assets/sprites/flandre.png" alt="">';
      s.appendChild(z);
      return s;
    },

    stages() {
      const s = el('div', 'screen');
      s.appendChild(el('h2', 'title', '选择关卡'));
      const G = ZTP.Game.S;
      const save = ZTP.Save.get();
      const list = el('div', 'stage-list');
      D.LEVELS.forEach((L, i) => {
        const unlocked = i === 0 || save.unlocked >= i;
        const b = el('div', 'stage' + (unlocked ? '' : ' locked'));
        b.innerHTML =
          '<div class="snum">STAGE ' + (i + 1) + '</div>' +
          '<div class="sname">' + L.name + '</div>' +
          '<div class="scn">' + L.cn + '</div>' +
          (unlocked ? '' : '<div class="slock">🔒</div>');
        if (unlocked) b.addEventListener('click', () => act('formation', i));
        list.appendChild(b);
      });
      s.appendChild(list);
      const tip = el('p', 'hack-note', '选择关卡后将进入「战前编队」——挑选 6 名角色出征（第 6 位为助战，部署费用 6 折）');
      s.appendChild(tip);
      s.appendChild(mbtn('返回', () => act('screen', 'menu'), 'back'));
      return s;
    },

    formation() {
      const s = el('div', 'screen formation');
      const team = ZTP.Game.S.team || [];
      const head = el('div', 'fm-head');
      const stageTxt = pendingLevel != null
        ? 'STAGE ' + (pendingLevel + 1) + ' · ' + D.LEVELS[pendingLevel].cn
        : '自由编队（保存后生效）';
      head.appendChild(el('h2', 'title', '战前编队 <small class="fm-stage">' + stageTxt + '</small>'));
      s.appendChild(head);

      // ---- 编队位 ----
      const slots = el('div', 'fm-slots');
      for (let i = 0; i < D.CONST.TEAM_SIZE; i++) {
        const id = team[i];
        const u = id ? D.ROSTER[id] : null;
        const isSupport = i === D.CONST.TEAM_SIZE - 1;
        const slot = el('div', 'fm-slot' + (isSupport ? ' support' : '') + (u ? ' filled' : ''));
        const bld = i === 0 ? null : D.BUILDINGS[Object.keys(D.BUILDINGS).find(k => D.BUILDINGS[k].unlockSlot === i)];
        if (u) {
          const cls = D.CLASSES[u.cls];
          slot.innerHTML =
            '<img src="assets/cards/port_' + id + '.png" alt="">' +
            '<span class="cls-chip" style="background:' + cls.col + '">' + cls.ch + '</span>' +
            '<div class="sn">' + u.name + '</div>' +
            (isSupport ? '<div class="stag">助战 · 6折</div>' : '<div class="stag">' + (i + 1) + '</div>') +
            (bld ? '<div class="sunlock">' + bld.name + '解锁</div>' : '<div class="sunlock">开局可用</div>');
          slot.addEventListener('click', () => { toggleMember(id); });
          slot.addEventListener('mouseenter', () => showTip(unitTip(u, isSupport)));
          slot.addEventListener('mouseleave', hideTip);
        } else {
          slot.innerHTML =
            '<div class="empty">＋</div>' +
            '<div class="sn">' + (isSupport ? '助战位' : '空位') + '</div>' +
            '<div class="stag">' + (isSupport ? '部署6折' : (i + 1)) + '</div>' +
            (bld ? '<div class="sunlock">' + bld.name + '解锁</div>' : '<div class="sunlock">开局可用</div>');
        }
        slots.appendChild(slot);
      }
      s.appendChild(slots);
      s.appendChild(el('p', 'hack-note', '战斗内：1号位开局即可部署，其余成员需依次建造 兵营→工房→魔导院→召唤阵→圣杯祭坛 解锁。建议把便宜的前卫放在 1号位。'));

      // ---- 筛选 ----
      const filters = el('div', 'fm-filters');
      const mkChip = (label, key, val, cur, fn) => {
        const c = el('div', 'fchip' + (cur === val ? ' on' : ''), label);
        c.addEventListener('click', () => { fn(val); showScreen('formation'); });
        return c;
      };
      filters.appendChild(el('span', 'flabel', '来源'));
      [['all', '全部'], ['FGO2.6', 'FGO2.6妖精圆桌'], ['FGO', 'FGO英灵'], ['萌娘百科', '萌娘百科']].forEach(([v, l]) => {
        filters.appendChild(mkChip(l, 'from', v, fromFilter, (x) => { fromFilter = x; }));
      });
      filters.appendChild(el('span', 'flabel', '职业'));
      [['all', '全部']].concat(D.CLASS_ORDER.map(c => [c, D.CLASSES[c].ch + '·' + D.CLASSES[c].name])).forEach(([v, l]) => {
        const chip = mkChip(l, 'cls', v, clsFilter, (x) => { clsFilter = x; });
        if (v !== 'all') chip.style.borderColor = D.CLASSES[v].col;
        filters.appendChild(chip);
      });
      s.appendChild(filters);

      // ---- 花名册 ----
      const grid = el('div', 'fm-grid');
      for (const id of D.ROSTER_ORDER) {
        const u = D.ROSTER[id];
        if (fromFilter !== 'all' && u.from !== fromFilter) continue;
        if (clsFilter !== 'all' && u.cls !== clsFilter) continue;
        const cls = D.CLASSES[u.cls];
        const inTeam = team.indexOf(id) >= 0;
        const card = el('div', 'fm-card' + (inTeam ? ' picked' : ''));
        card.innerHTML =
          '<div class="fp"><img draggable="no" src="assets/cards/port_' + id + '.png" alt=""></div>' +
          '<div class="fn">' + u.name + '</div>' +
          '<div class="fmeta"><span class="cls-chip" style="background:' + cls.col + '">' + cls.ch + '</span>' +
          '<span class="stars">' + '★'.repeat(u.rarity || 3) + '</span></div>' +
          '<div class="fcost">$' + u.cost + '</div>' +
          '<div class="fpassive">✦ ' + u.passive.name + '</div>';
        card.addEventListener('click', () => { toggleMember(id); showScreen('formation'); });
        card.addEventListener('mouseenter', () => showTip(unitTip(u, team.indexOf(id) === D.CONST.TEAM_SIZE - 1)));
        card.addEventListener('mouseleave', hideTip);
        grid.appendChild(card);
      }
      s.appendChild(grid);

      // ---- 按钮行 ----
      const btns = el('div', 'fm-btns');
      btns.appendChild(mbtn('推荐编成', () => { ZTP.Game.setTeam(D.DEFAULT_TEAM); saveTeam(); showScreen('formation'); }, 'back'));
      btns.appendChild(mbtn('清空', () => { ZTP.Game.setTeam([]); saveTeam(); showScreen('formation'); }, 'back'));
      if (pendingLevel != null) {
        const go = mbtn('出征 →', () => act('launch', pendingLevel));
        if (!team.length) go.disabled = true;
        btns.appendChild(go);
      }
      btns.appendChild(mbtn(pendingLevel != null ? '← 选关' : '返回', () => act('screen', pendingLevel != null ? 'stages' : 'menu'), 'back'));
      s.appendChild(btns);
      return s;
    },

    help() {
      const s = el('div', 'screen');
      s.appendChild(el('h2', 'title', '玩法说明'));
      s.appendChild(el('div', 'help-box',
        '<p>🏛 经典《Zombie Trailer Park》玩法 × FGO 职业/编队系统的同人复刻：</p>' +
        '<p>⚔️ <b>职业克制</b>：剑→枪→弓→剑（2倍伤害/半额承伤）；骑→术→杀→骑；【狂】对常规职业输出 1.5 倍、受伤也 1.5 倍。战场单位头上有职业徽章。</p>' +
        '<p>📋 <b>战前编队</b>：从 34 名角色中选 6 人出征；<b>第 6 位是助战位，部署费用 6 折</b>。编队位顺序就是出战顺序：1号位开局可用。</p>' +
        '<p>🏗 <b>建筑解锁（原版机制）</b>：战斗内造「兵营/工房/魔导院/召唤阵/圣杯祭坛」依次解锁 2~6 号位成员；「加兵数」每座 +5 出兵上限；「加钱厂」提升每秒收入。解锁时该成员会切绘登场！</p>' +
        '<p>✦ <b>独立被动</b>：每人都有专属被动——摩根的全队攻击光环、玛修的减伤光环、巴格斯特吸血、清姬点燃、尼禄复活、魔理沙策反、狂三分身…编队时看清楚！</p>' +
        '<p>⚡ <b>超级召唤·宝具</b>（还原原版三大招）：<b>麻美学姐</b>=空降支援（麻美本人驻场扫射）· <b>应援团暴动</b>=Angry Mob（6名特殊应援团冲锋）· <b>初音演唱会</b>=Hoedown（初音登台加速全队）· <b>誓约胜利之剑</b>=7000能量清场。特殊兵种限时存在，不占人口！</p>' +
        '<p>🏝 <b>胜负</b>：摧毁右侧僵尸城获胜；My Base 被啃光则失败。</p>' +
        '<p>😈 <b>无敌版(HACKED)</b>：金钱越花越多，可在设置中开关。</p>' +
        '<p>⌨️ 快捷键：1-6 部署对应编队成员 · Q/W/E/R 宝具 · P 暂停 · S 倍速 · M 静音</p>'));
      s.appendChild(mbtn('返回', () => act('screen', 'menu'), 'back'));
      return s;
    },

    credits() {
      const s = el('div', 'screen');
      s.appendChild(el('h2', 'title', '制作名单 & 图片来源'));
      let rows = '';
      const cr = window.__ZTP_CREDITS__ || {};
      for (const k in cr) {
        rows += '<p><b>' + (cr[k].title || k) + '</b> — <a href="' + cr[k].page + '" target="_blank">' + cr[k].page.replace('https://', '') + '</a></p>';
      }
      s.appendChild(el('div', 'help-box small',
        '<p>原作：Ninja Kiwi《Zombie Trailer Park》(2010) —— 本作为本地同人复刻练习。</p>' +
        '<p>FGO 英灵图片取自 <b>Mooncell（fgo.wiki，FGO中文Wiki）</b>与 <b>萌娘百科</b> 各从者词条卡面；萌娘百科角色图片取自各角色词条主图。版权归原作者与官方所有，仅供学习交流，禁止商用：</p>' +
        rows +
        '<p>程序 / 特效 / 界面：ZCode · 全部代码手写生成，未使用 AI 生图。</p>'));
      s.appendChild(mbtn('返回', () => act('screen', 'menu'), 'back'));
      return s;
    },

    hacks() {
      const s = el('div', 'screen');
      s.appendChild(el('h2', 'title', '无敌版设置 (Hacked)'));
      const G = ZTP.Game.S;
      const box = el('div', 'hack-box');
      const defs = [
        ['money', '💰 金钱暴涨', '初始 $15100，花钱返 150%，且每秒 +2% 复利'],
        ['energy', '⚡ 能量无限', '能量点每秒 +120，宝具随便放'],
        ['base', '🏝 基地无敌', 'My Base 不会掉血'],
      ];
      for (const [key, name, desc] of defs) {
        const row = el('div', 'hack-row' + (G.hacked[key] ? ' on' : ''));
        row.innerHTML = '<div class="hname">' + name + '</div><div class="hdesc">' + desc + '</div><div class="sw"></div>';
        row.addEventListener('click', () => {
          G.hacked[key] = !G.hacked[key];
          row.className = 'hack-row' + (G.hacked[key] ? ' on' : '');
          ZTP.Save.setHacked(G.hacked);
          ZTP.Audio2.blip();
        });
        box.appendChild(row);
      }
      s.appendChild(box);
      s.appendChild(el('p', 'hack-note', '※ 对局中按 H 也能随时开关。'));
      s.appendChild(mbtn('返回', () => act('screen', 'menu'), 'back'));
      return s;
    },

    pause() {
      const s = el('div', 'screen dim');
      s.appendChild(el('h2', 'title', '暂停'));
      const box = el('div', 'menu-box');
      box.appendChild(mbtn('继续战斗', () => act('resume')));
      box.appendChild(mbtn('重新开始本关', () => act('restart')));
      box.appendChild(mbtn('无敌版设置', () => act('screen', 'hacks')));
      box.appendChild(mbtn('放弃 · 回主菜单', () => act('quit')));
      s.appendChild(box);
      return s;
    },

    end(p) {
      const G = ZTP.Game.S;
      const save = ZTP.Save.get();
      const win = p.win;
      if (win) {
        const next = Math.min(G.levelIdx + 1, D.LEVELS.length - 1);
        if (save.unlocked < next) { save.unlocked = next; ZTP.Save.save(); }
      }
      const s = el('div', 'screen dim');
      s.appendChild(el('div', 'end-sign' + (win ? ' win' : ' lose'),
        '<div class="e1">' + (win ? 'STAGE CLEAR!' : 'Game Over…') + '</div>' +
        '<div class="e2">' + (win ? '僵尸娘们被拍飞啦，房车公园安然无恙！' : '房车被啃光了，Rover 对不起！') + '</div>'));
      const st = el('div', 'stats-box',
        '<p>🧟 僵尸娘击杀：<b>' + G.stats.kills + '</b></p>' +
        '<p>💔 我方阵亡：<b>' + G.stats.lost + '</b></p>' +
        '<p>💸 累计消费：<b>$' + Math.floor(G.stats.spent).toLocaleString() + '</b></p>' +
        '<p>🎆 宝具/超级召唤：<b>' + G.stats.supers + '</b> 次</p>' +
        '<p>⏱ 用时：<b>' + pad((G.time / 60) | 0) + ':' + pad(Math.floor(G.time % 60)) + '</b></p>');
      s.appendChild(st);
      if (!win) {
        s.appendChild(el('p', 'hint-line', D.HINTS[(Math.random() * D.HINTS.length) | 0]));
      }
      const box = el('div', 'menu-box');
      if (win && G.levelIdx < D.LEVELS.length - 1) box.appendChild(mbtn('下一关 →', () => act('formation', G.levelIdx + 1)));
      box.appendChild(mbtn('重新编队', () => act('formation', G.levelIdx)));
      box.appendChild(mbtn('再来一次', () => act('restart')));
      box.appendChild(mbtn('选关', () => act('screen', 'stages')));
      box.appendChild(mbtn('主菜单', () => act('quit')));
      s.appendChild(box);
      return s;
    },
  };

  /* 编队增删 */
  function toggleMember(id) {
    const team = ZTP.Game.S.team || [];
    const i = team.indexOf(id);
    if (i >= 0) {
      team.splice(i, 1);
    } else {
      if (team.length >= D.CONST.TEAM_SIZE) { ZTP.Audio2.deny(); return; }
      team.push(id);
    }
    ZTP.Game.setTeam(team);
    saveTeam();
    teamDirty = true;
    ZTP.Audio2.blip();
  }
  function saveTeam() { ZTP.Save.setTeam(ZTP.Game.S.team); }

  function mbtn(text, fn, cls) {
    const b = el('button', 'mbtn ' + (cls || ''), text);
    b.addEventListener('click', fn);
    return b;
  }

  /* ================= 切绘 ================= */
  const CUTIN_IMG = {
    mami: 'assets/cards/mami.png',
    taiga: 'assets/sprites/taiga.png',
    miku: 'assets/sprites/miku.png',
    artoria: 'assets/cards/artoria.png',
  };
  let cutinTimer = null;
  function cutin(who, text) {
    const old = $('#cutin');
    if (old) old.remove();
    const c = el('div', 'cutin ' + who,
      '<div class="ci-img"><img src="' + (CUTIN_IMG[who] || 'assets/cards/port_' + who + '.png') + '" alt=""></div>' +
      '<div class="ci-text">' + text + '</div>');
    root.appendChild(c);
    clearTimeout(cutinTimer);
    cutinTimer = setTimeout(() => c.classList.add('out'), 1300);
    setTimeout(() => c.remove(), 1900);
  }

  /* ================= 事件与初始化 ================= */
  function act(type, payload) {
    ZTP.Audio2.blip();
    if (onAction) onAction(type, payload);
  }

  function init(container, actionHandler) {
    root = container;
    onAction = actionHandler;
    hud = buildHud();
    root.appendChild(hud);
    screens = el('div', 'screens');
    root.appendChild(screens);

    $('#bSpeed').addEventListener('click', () => act('speed'));
    $('#bMute').addEventListener('click', () => act('mute'));
    $('#bPause').addEventListener('click', () => act('pause'));
    $('#bMenu').addEventListener('click', () => act('pause'));
  }

  return { init, refresh, showScreen, message, cutin, openFormation, markTeamDirty: () => { teamDirty = true; } };
})();
