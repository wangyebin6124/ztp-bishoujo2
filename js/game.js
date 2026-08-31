/* =====================================================================
 * game.js — 核心引擎 (2.0)
 * 实体系统 / 战斗 / 经济 / 僵尸AI导演 / 超级召唤 / 战场渲染
 * 2.0 新增：
 *   - 七职业克制（剑弓枪骑术杀狂，狂阶1.5倍）
 *   - 被动引擎：每名角色独立被动（光环 / 吸血 / 点燃 / 暴击 / 复活…）
 *   - 编队系统：S.team 决定可部署角色，第6位为助战（费用6折）
 *   - 新敌人（帕秋莉/琪露诺）与新Boss（僵尸摩根 / 堕落奥伯龙）
 *   - 誓约胜利之剑（7000能量全屏宝具）
 * ===================================================================== */
window.ZTP = window.ZTP || {};

ZTP.Game = (function () {
  'use strict';
  const D = ZTP.DATA, FX = ZTP.FX;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const S = {
    mode: 'menu',          // menu | playing | paused | over
    level: null, levelIdx: 0,
    team: D.DEFAULT_TEAM.slice(),
    money: 0, energy: 0, time: 0, speed: 1,
    popCap: 5, popUsed: 0,
    hacked: { money: true, energy: false, base: false },
    buildings: {},
    unlockedSlots: { 0: true },
    units: [],
    playerBase: { hp: 3000, max: 3000 },
    zombieBase: { hp: 2600, max: 2600 },
    stats: { kills: 0, lost: 0, spent: 0, supers: 0 },
    spawnT: 0, elapsed: 0, waveIdx: 0, bossSpawned: false,
    converts: 0,
    concert: 0, concertT: 0, mamiT: 0,
    excalT: 0, excalTick: 0,
    runToken: 0,            // 每关自增，防止超级召唤定时器跨关泄漏
    aliveCounts: { tamamo: 0, ereshkigal: 0 },
    banner: null,
    onEvent: null,
    hint: '',
  };

  /* ================= 职业克制 ================= */
  function classMult(ac, dc) {
    if (!ac || !dc) return 1;
    const A = D.CLASSES[ac], B = D.CLASSES[dc];
    if (!A || !B) return 1;
    if (ac === 'berserker' || dc === 'berserker') return ac === dc ? 1 : 1.5;
    if (A.beats === dc) return 2;
    if (B.beats === ac) return 0.5;
    return 1;
  }

  /* ================= 生命周期 ================= */
  function startLevel(idx) {
    const L = D.LEVELS[idx];
    // 编队校验：无效角色回退默认
    S.team = (S.team || []).filter(id => D.ROSTER[id]);
    if (!S.team.length) S.team = D.DEFAULT_TEAM.slice();
    S.mode = 'playing';
    S.level = L; S.levelIdx = idx;
    S.money = D.CONST.START_MONEY;
    S.energy = 0; S.time = 0; S.elapsed = 0;
    S.popCap = 5; S.popUsed = 0;
    S.buildings = { trailer: 0, yard: 0, tent: 0, workshop: 0, academy: 0, circle: 0, altar: 0 };
    S.unlockedSlots = { 0: true };   // 1号位开局可用，其余靠建筑解锁
    S.units = [];
    S.converts = 0;
    S.playerBase = { hp: D.CONST.PLAYER_BASE_HP, max: D.CONST.PLAYER_BASE_HP };
    S.zombieBase = { hp: L.baseHP, max: L.baseHP };
    S.stats = { kills: 0, lost: 0, spent: 0, supers: 0 };
    S.spawnT = L.spawn.start; S.waveIdx = 0; S.bossSpawned = false;
    S.concert = 0; S.mamiT = 0; S.excalT = 0; S.banner = null;
    S.aliveCounts = { tamamo: 0, ereshkigal: 0 };
    S.runToken++;
    if (S.hacked.money) { S.money = 15100; }
    FX.clearAll();
    banner('STAGE ' + (idx + 1), L.cn, 2.6);
    emit('levelStart', { idx });
  }

  function setTeam(team) {
    S.team = (team || []).slice(0, D.CONST.TEAM_SIZE);
  }

  function banner(a, b, dur) {
    S.banner = { a, b, t: 0, dur: dur || 2.2 };
  }
  function emit(type, payload) {
    if (S.onEvent) S.onEvent(type, payload || {});
  }

  /* ================= 费用（助战位6折） ================= */
  function unitCost(id) {
    const def = D.ROSTER[id];
    if (!def) return 0;
    const slot = S.team.indexOf(id);
    const discount = slot === D.CONST.TEAM_SIZE - 1 ? D.CONST.SUPPORT_COST : 1;
    return Math.round(def.cost * discount);
  }

  /* ================= 购买 ================= */
  function slotUnlocked(id) {
    const slot = S.team.indexOf(id);
    if (slot < 0) return false;
    return !!(S.unlockedSlots && S.unlockedSlots[slot]);
  }
  function slotUnlockBuilding(slot) {
    for (const bid of D.BUILDING_ORDER) {
      if (D.BUILDINGS[bid].unlockSlot === slot) return D.BUILDINGS[bid];
    }
    return null;
  }

  function buyUnit(id) {
    const def = D.ROSTER[id];
    if (!def || S.mode !== 'playing') return { ok: false, msg: '' };
    if (!slotUnlocked(id)) {
      const b = slotUnlockBuilding(S.team.indexOf(id));
      return { ok: false, msg: '需要建造「' + (b ? b.name : '???') + '」解锁该成员' };
    }
    if (S.popUsed + def.pop > S.popCap) return { ok: false, msg: '出兵上限不足！造「加兵数」' };
    const cost = unitCost(id);
    if (S.money < cost) return { ok: false, msg: '金币不足' };
    spend(cost);
    S.popUsed += def.pop;
    spawnUnit(id, 1);
    return { ok: true };
  }

  function buyBuilding(id) {
    const b = D.BUILDINGS[id];
    if (!b || S.mode !== 'playing') return { ok: false, msg: '' };
    const n = S.buildings[id] || 0;
    if (n >= b.max) return { ok: false, msg: '已达建造上限' };
    const cost = buildingCost(id);
    if (S.money < cost) return { ok: false, msg: '金币不足' };
    spend(cost);
    S.buildings[id] = n + 1;
    if (id === 'trailer') S.popCap += 5;
    if (b.unlockSlot != null) {
      S.unlockedSlots[b.unlockSlot] = true;
      const member = S.team[b.unlockSlot];
      FX.beam(200, 300, 320, 360, '#ffe07a', 6, 0.4);
      FX.floatText(240, 330, '解锁 ' + (member ? D.ROSTER[member].name : '编队位') + '！', { col: '#ffe07a', sz: 16, life: 1.6 });
      FX.ring(160, 400, 90, '#ffe07a');
      if (member) emit('cutin', { who: member, text: D.ROSTER[member].name + ' 参战！' });
    } else {
      FX.floatText(240, 330, b.name + ' 建成！', { col: '#a8ff9c', sz: 16 });
    }
    FX.spark(150, 350, 10, { col: '#fff2b0' });
    emit('build', { id });
    return { ok: true };
  }

  function buildingCost(id) {
    const b = D.BUILDINGS[id];
    return Math.round(b.cost * Math.pow(b.costStep, S.buildings[id] || 0));
  }

  function spend(v) {
    S.money -= v;
    S.stats.spent += v;
    if (S.hacked.money) S.money += v * 1.5;
  }

  /* ================= 超级召唤 / 宝具 ================= */
  function castSuper(id) {
    const sp = D.SUPERS[id];
    if (!sp || S.mode !== 'playing') return { ok: false, msg: '' };
    if (S.energy < sp.cost) return { ok: false, msg: '能量点不足' };
    S.energy -= sp.cost;
    S.stats.supers++;
    if (id === 'airstrike') {
      // 原版 Airstrike 参考：空降火力覆盖僵尸半场 —— 麻美本人驻场 + 三段弹幕
      S.mamiT = 4.5;
      emit('cutin', { who: 'mami', text: 'Tiro Volley♪ 已经没有什么好怕的了！' });
      FX.flash('#ffe9b0', 0.4, 0.35);
      FX.shake(8);
      banner('', '麻美学姐 空降支援！', 1.8);
      const mami = spawnSpecial('mami_super');
      const myToken = S.runToken;
      let wave = 0;
      const timer = setInterval(() => {
        if (S.mode !== 'playing' || S.runToken !== myToken || wave++ >= 12) { clearInterval(timer); return; }
        const big = wave % 4 === 0;
        if (big) { FX.flash('#fff3c9', 0.3, 0.25); FX.shake(6); FX.ring(rnd(600, 860), 400, 150, '#ffe9b0'); }
        // 金色缎带光束横扫
        FX.beam(rnd(80, 300), rnd(180, 260), rnd(620, 940), rnd(330, 420), '#ff9ad5', big ? 4 : 2.5, 0.3);
        const volleys = big ? 16 : 10;
        for (let i = 0; i < volleys; i++) {
          const x = rnd(560, 930), y = rnd(300, 430);
          FX.beam(x, rnd(60, 140), x, y, '#ffe9b0', 2.5, 0.12);
          FX.muzzle(x, y, '#fff3c9');
          for (let j = 0; j < 6; j++) {
            FX.projectile({
              kind: 'musket', x: x + rnd(-8, 8), y, tx: x + rnd(-26, 26), ty: y + rnd(24, 80),
              speed: 700,
              onHit: (hx, hy) => {
                aoeDamage(hx, hy, 48, 30 + (big ? 18 : 0), -1, null, true);
                FX.spark(hx, hy, 4, { col: '#ffe9b0', sp: 90 });
              },
            });
          }
        }
      }, 320);
    } else if (id === 'mob') {
      // 原版 Angry Mob 参考：一群特殊民兵冲出来 —— 应援团大河 ×6（限时特殊兵种）
      emit('cutin', { who: 'taiga', text: '应援团，全员突击——！！' });
      FX.flash('#ff9ab5', 0.35, 0.3);
      FX.shake(7);
      for (let i = 0; i < 6; i++) {
        const u = spawnSpecial('mob_taiga');
        if (u) {
          u.x = D.CONST.SPAWN_PLAYER_X + rnd(-16, 30);
          u.y = clamp(D.CONST.GROUND_TOP + (D.CONST.GROUND_BOT - D.CONST.GROUND_TOP) * (i / 6) + rnd(-10, 10), D.CONST.GROUND_TOP, D.CONST.GROUND_BOT);
          u.rage = 25;   // 红光狂热环
        }
      }
      FX.ring(160, 420, 130, '#ff9ab5');
      FX.petals(160, 400, 18, '#ff9ab5');
      for (const u of S.units) if (u.side === 1) u.rage = Math.max(u.rage || 0, 14);
      FX.floatText(480, 300, '全队狂热！', { col: '#ff9ab5', sz: 20, life: 1.4 });
    } else if (id === 'concert') {
      // 原版 Hoedown 参考：全队狂热起舞 —— 初音本人登台（限时特殊兵种 + 光环）+ 彩虹激光
      S.concert = 10; S.concertT = 0;
      emit('cutin', { who: 'miku', text: '393939！Live Start！' });
      FX.flash('#39c5bb', 0.35, 0.35);
      FX.shake(6);
      const miku = spawnSpecial('miku_super');
      if (miku) {
        miku.x = 200; miku.y = 430;
        FX.ring(miku.x, miku.y - 50, 120, '#39c5bb');
        for (let i = 0; i < 12; i++) notes(miku.x + rnd(-60, 60), miku.y - 100 + rnd(-30, 30), 1);
      }
      for (const u of S.units) if (u.side === 1) u.rage = Math.max(u.rage || 0, 9);
    } else if (id === 'excalibur') {
      S.excalT = 1.1; S.excalTick = 0;
      emit('cutin', { who: 'artoria', text: 'EX—CALIBUR——！！' });
      FX.flash('#fff6cc', 0.65, 0.45);
      FX.shake(10);
      banner('', '誓约胜利之剑！！', 1.8);
    }
    return { ok: true };
  }

  /* ================= 单位 ================= */
  function spawnUnit(defId, side, free) {
    const def = side === 1 ? (D.ROSTER[defId] || D.SPECIALS[defId]) : D.ENEMIES[defId];
    if (!def) return null;
    const y = rnd(D.CONST.GROUND_TOP, D.CONST.GROUND_BOT);
    const sx = side === 1
      ? D.CONST.SPAWN_PLAYER_X + rnd(-14, 18)
      : D.CONST.SPAWN_ZOMBIE_X + rnd(-18, 14);
    const u = {
      def, side, defId,
      x: sx, y,
      hp: def.hp, max: def.hp,
      cd: rnd(0, 0.4), atkT: 0, walkPhase: rnd(0, 6.28),
      hurtT: 0, deadT: 0, moving: true,
      dots: null, slowT: 0, rage: 0, ramCd: 0, atkCount: 0,
      stackAtk: 0, revived: false, clone: false, cloneT: 8,
      lifeT: def.lifeT || null,      // 特殊兵种限时
      summonT: def.summon ? def.summon.every * 0.6 : 0,
      free: !!free || !!def.lifeT,   // 特殊兵种不占人口
      converted: false,
      mod: { atk: 1, cd: 1, taken: 1, move: 1, range: 1, heal: 0, dmgOut: 1 },
      scale: def.boss ? 1.55 : (defId === 'fatso' ? 1.18 : 1),
    };
    if (def.boss) {
      FX.flash('#ff6d8a', 0.5, 0.5);
      FX.shake(12);
      FX.ring(u.x, u.y, 220, '#ff9ab5');
      banner('', def.name + ' 登场！', 2.4);
    }
    S.units.push(u);
    return u;
  }

  /* 特殊兵种（超级召唤召唤物）：带登场特效 */
  function spawnSpecial(defId) {
    const u = spawnUnit(defId, 1, true);
    if (!u) return null;
    FX.ring(u.x, u.y - 50, 80, '#ffe07a');
    FX.spark(u.x, u.y - 60, 12, { col: '#fff2b0', sp: 160, life: 0.5 });
    FX.floatText(u.x, u.y - 150, u.def.name + ' 参战！', { col: '#ffe07a', sz: 15, life: 1.4 });
    return u;
  }

  function spawnClone(owner) {
    const base = owner.def;
    const def = S._cloneDef || (S._cloneDef = Object.assign({}, base, {
      id: 'kurumi_clone', name: '狂三分身', role: '分身',
      hp: Math.max(40, Math.round(base.hp * 0.35)),
      dmg: Math.max(4, Math.round(base.dmg * 0.4)),
      pop: 0, passive: null, rarity: 1,
    }));
    const u = spawnUnit(base.id, 1, true);
    // 用分身属性覆盖
    u.def = def;
    u.hp = u.max = def.hp;
    u.clone = true;
    u.scale = 0.82;
    u.x = owner.x - rnd(10, 40);
    u.y = clamp(owner.y + rnd(-30, 30), D.CONST.GROUND_TOP, D.CONST.GROUND_BOT);
    FX.ring(u.x, u.y - 40, 44, '#d9b3ff');
    FX.floatText(u.x, u.y - 110, '分身♪', { col: '#d9b3ff', sz: 12, life: 0.9 });
    return u;
  }

  function footY(u) { return u.y; }

  /* ---------------- 伤害入口 ---------------- */
  function applyDamage(u, dmg, dir, attacker, noProc) {
    if (u.deadT > 0 || dmg <= 0) return;
    // 闪避（灵梦）
    if (u.side === 1 && u.def.passive && u.def.passive.key === 'dodge' && Math.random() < 0.3) {
      FX.floatText(u.x, footY(u) - 96, '闪避！', { col: '#9fe8ff', sz: 12, life: 0.7 });
      return;
    }
    let m = 1, adv = false, dis = false;
    if (attacker && attacker.def && !attacker.clone) {
      const p = attacker.def.passive;
      if (p && p.key === 'saberslayer' && u.def.cls === 'saber') {
        m = 2.5; adv = true;
      } else {
        m = classMult(attacker.def.cls, u.def.cls);
        adv = m >= 2; dis = m <= 0.5;
      }
    }
    dmg *= m * (u.mod.taken || 1);
    u.hp -= dmg;
    u.hurtT = 0.18;
    const col = adv ? '#ffd75e' : (dis ? '#9aa0a8' : (u.side === 1 ? '#ff8a8a' : '#ffe08a'));
    FX.dmgNum(u.x, footY(u) - 92 * u.scale, dmg, col);
    // 吸血（巴格斯特）
    if (!noProc && attacker && attacker.side === 1 && attacker.def.passive && attacker.def.passive.key === 'lifesteal' && attacker.hp > 0) {
      attacker.hp = Math.min(attacker.max, attacker.hp + dmg * 0.3);
    }
    // 命中附带被动
    if (!noProc && attacker && attacker.side !== u.side && u.hp > 0) {
      procOnHit(attacker, u, dmg);
    }
    if (u.hp <= 0) {
      // 尼禄复活
      if (u.side === 1 && u.def.passive && u.def.passive.key === 'revive' && !u.revived) {
        u.revived = true;
        u.hp = u.max * 0.5;
        FX.ring(u.x, u.y - 50, 70, '#ffb45e');
        FX.flash('#ffd9a0', 0.3, 0.3);
        FX.floatText(u.x, u.y - 130, '皇帝特权！', { col: '#ffb45e', sz: 16, life: 1.2 });
        return;
      }
      killUnit(u, dir, attacker);
    }
  }

  /* 命中触发型被动 */
  function procOnHit(attacker, target, baseDmg) {
    const p = attacker.def.passive;
    if (!p) return;
    const tx = target.x, ty = target.y - 36 * target.scale;
    switch (p.key) {
      case 'knock':
        if (Math.random() < 0.35) {
          target.x = clamp(target.x + attacker.side * 34, 30, 930);
          FX.ring(tx, ty, 30, '#ffd1de');
        }
        break;
      case 'thunder':
        if (Math.random() < 0.4) {
          FX.lightning(tx, ty - 60, tx + rnd(-20, 20), ty, '#8fe3ff', 2.4, 0.15);
          FX.spark(tx, ty, 6, { col: '#ffe14d', sp: 120, life: 0.3 });
          aoeDamage(tx, ty, 34, baseDmg * 0.6, -attacker.side, attacker, true);
        }
        break;
      case 'splash':
        FX.spark(tx, ty, 6, { col: '#ffd75e', sp: 130, life: 0.3 });
        aoeDamage(tx, ty, 34, baseDmg * 0.7, -1, attacker, true);
        break;
      case 'firesplash':
        FX.spark(tx, ty, 5, { col: '#ff9b40', sp: 110, life: 0.3 });
        aoeDamage(tx, ty, 26, baseDmg * 0.6, -1, attacker, true);
        addDot(target, 'burn', 6, 1.5);
        break;
      case 'burn':
        addDot(target, 'burn', 7, 3);
        FX.spark(tx, ty, 3, { col: '#ff7a2e', sp: 60, life: 0.3, sz: 2.6 });
        break;
      case 'bleed':
        addDot(target, 'bleed', 7, 3);
        FX.blood(tx, ty, 3, 0.6);
        break;
      case 'poison':
        addDot(target, 'poison', 6, 3);
        target.slowT = Math.max(target.slowT || 0, 2);
        FX.spark(tx, ty, 3, { col: '#9be84e', sp: 60, life: 0.35, sz: 2.4 });
        break;
      case 'chain': {
        let hits = 0;
        for (const e of S.units) {
          if (hits >= 2) break;
          if (e === target || e.deadT > 0 || e.side !== target.side) continue;
          if (Math.abs(e.x - target.x) < 100 && Math.abs(e.y - target.y) < 60) {
            FX.lightning(tx, ty, e.x, e.y - 36 * e.scale, '#c9a2ff', 2, 0.14);
            applyDamage(e, baseDmg * 0.6, attacker.side, attacker, true);
            hits++;
          }
        }
        break;
      }
    }
  }

  function addDot(u, kind, dps, time) {
    if (u.deadT > 0) return;
    u.dots = u.dots || {};
    u.dots[kind] = { dps, t: time };
  }

  function killUnit(u, dir, killer) {
    u.deadT = 0.0001;
    const def = u.def;
    if (u.side === -1) {
      S.stats.kills++;
      S.energy += Math.round(def.energy * (1 + 0.2 * (S.aliveCounts.ereshkigal || 0)));
      S.money += def.bounty;
      FX.floatText(u.x, u.y - 100 * u.scale, '+$' + def.bounty, { col: '#9dff8f', sz: 12, life: 0.8 });
      if (!def.boss && Math.random() < 0.35) {
        FX.floatText(u.x + rnd(-14, 14), u.y - 120 * u.scale, pick(u.converted ? ['回到我们这边~'] : (D.ROSTER.taiga.killTexts)), { col: '#ffd1de', sz: 15 });
      }
      FX.petals(u.x, u.y - 40, def.boss ? 40 : 10);
      FX.blood(u.x, u.y, def.boss ? 26 : 7);
      FX.spark(u.x, u.y - 40, 8, { col: '#b7ff9c', sp: 130 });
      if (def.boss) { FX.explosion(u.x, u.y - 60, 130, '#ffb0c8'); FX.shake(14); FX.flash('#fff', 0.5, 0.4); }
      if (u.converted) S.converts = Math.max(0, S.converts - 1);
    } else {
      S.stats.lost++;
      // 珂朵莉：黄金妖精自爆
      if (def.passive && def.passive.key === 'sacrifice' && !u.clone) {
        FX.beam(u.x, u.y - 300, u.x, u.y, '#fff3b0', 26, 0.5);
        FX.ring(u.x, u.y - 40, 110, '#ffe9a0');
        FX.explosion(u.x, u.y - 40, 90, '#ffe9a0');
        FX.floatText(u.x, u.y - 150, '黄金妖精…！', { col: '#ffe9a0', sz: 18, life: 1.4 });
        aoeDamage(u.x, u.y - 40, 95, 120, -1, u, true);
        FX.shake(8);
      }
      if (!u.free) {
        const popBack = u.converted ? 1 : (def.pop || 0);
        S.popUsed = Math.max(0, S.popUsed - popBack);
      }
      FX.petals(u.x, u.y - 40, 8, '#c9d4ff');
      FX.smoke(u.x, u.y - 30, 4);
    }
    // 黑贞德击杀叠层
    if (killer && killer.side === 1 && !killer.deadT && killer.def.passive && killer.def.passive.key === 'killstack') {
      killer.stackAtk = Math.min(0.6, (killer.stackAtk || 0) + 0.04);
      if (Math.random() < 0.4) FX.floatText(killer.x, killer.y - 130, '复仇 ×' + Math.round(killer.stackAtk / 0.04), { col: '#ff8a5e', sz: 11, life: 0.8 });
    }
    emit('kill', { side: u.side, boss: !!def.boss });
  }

  function convertUnit(u) {
    if (u.converted || u.def.boss) return false;
    if (S.converts >= D.CONST.CONVERT_LIMIT) return false;
    u.converted = true;
    u.side = 1;
    u.hp = u.max * 0.6;
    S.converts++;
    S.popUsed += 1;
    FX.beam(u.x, u.y - 260, u.x, u.y - 10, '#ff8ce0', 10, 0.3);
    FX.ring(u.x, u.y - 50, 60, '#ff8ce0');
    hearts(u.x, u.y - 70, 10);
    FX.floatText(u.x, u.y - 110, '策反♪ ' + u.def.name, { col: '#ff9ad5', sz: 14, life: 1.2 });
    return true;
  }

  function hearts(x, y, n) {
    for (let i = 0; i < n; i++) heartParticle(x + rnd(-30, 30), y + rnd(-14, 14));
  }
  function heartParticle(x, y) {
    FX.floatText(x, y, '♥', { col: pick(['#ff6d9d', '#ff9ad5', '#ff8cb3']), sz: rnd(11, 17), life: rnd(0.5, 0.9), vy: -70 });
  }

  function aoeDamage(x, y, r, dmg, side, attacker, noProc) {
    for (const u of S.units) {
      if (u.deadT > 0 || u.side !== side) continue;
      const uy = u.y - 36 * u.scale;
      if (Math.hypot(u.x - x, uy - y) <= r + 16 * u.scale) {
        applyDamage(u, dmg, attacker ? attacker.side : undefined, attacker, noProc);
      }
    }
  }

  function nearestEnemy(u, maxRange) {
    let best = null, bestD = 1e9;
    const rng = maxRange * (u.mod.range || 1);
    for (const e of S.units) {
      if (e.deadT > 0 || e.side === u.side) continue;
      const ahead = (e.x - u.x) * u.side;
      if (ahead < -26) continue;
      const d = Math.abs(e.x - u.x);
      if (d < bestD && d <= rng) { bestD = d; best = e; }
    }
    return best;
  }

  /* ================= 每帧：光环 & 被动修饰符 ================= */
  function computeMods() {
    S.aliveCounts.tamamo = 0; S.aliveCounts.ereshkigal = 0;
    for (const u of S.units) {
      if (u.deadT > 0) continue;
      u.mod = { atk: 1, cd: 1, taken: 1, move: 1, range: 1, heal: 0, dmgOut: 1 };
      if (u.side === 1 && !u.clone) {
        if (u.defId === 'tamamo') S.aliveCounts.tamamo++;
        if (u.defId === 'ereshkigal') S.aliveCounts.ereshkigal++;
      }
    }
    // 光环
    for (const src of S.units) {
      if (src.deadT > 0) continue;
      const au = src.def.aura || (src.def.passive && src.def.passive.aura);
      if (!au) continue;
      const R = au.range || 140;
      for (const t of S.units) {
        if (t === src || t.deadT > 0) continue;
        if (Math.abs(t.x - src.x) > R || Math.abs(t.y - src.y) > D.CONST.AURA_DY) continue;
        if (t.side === src.side) {
          if (au.allyAtk) t.mod.atk *= 1 + au.allyAtk;
          if (au.allyDef) t.mod.taken *= 1 - au.allyDef;
          if (au.allySpd) t.mod.cd *= 1 / (1 + au.allySpd);
          if (au.allyRange) t.mod.range *= 1 + au.allyRange;
          if (au.allyHeal) t.mod.heal += au.allyHeal;
        } else {
          if (au.enemyDmg) t.mod.dmgOut *= 1 - au.enemyDmg;
          if (au.enemySlow) t.mod.move *= 1 - au.enemySlow;
        }
      }
    }
    // 自身被动
    for (const u of S.units) {
      if (u.deadT > 0) continue;
      const p = u.def.passive;
      if (u.side === 1 && p) {
        if (p.key === 'flurry') { u.mod.cd *= 0.8; u.mod.move *= 1.2; }
        else if (p.key === 'flurry2') { u.mod.cd *= 0.7; }
        else if (p.key === 'dragonform' && u.hp < u.max * 0.4) { u.mod.cd *= 1 / 1.5; u.mod.move *= 1.4; }
        else if (p.key === 'lowhp' && u.hp < u.max * 0.5) { u.mod.atk *= 1.6; }
      }
    }
  }

  function atkMul(u) {
    let m = u.mod.atk * (u.mod.dmgOut || 1);
    if (u.rage > 0) m *= 1.6;
    if (S.concert > 0 && u.side === 1) m *= 1.25;
    if (u.stackAtk) m *= 1 + u.stackAtk;
    return m;
  }
  function moveMul(u) {
    let m = u.mod.move;
    if (u.rage > 0) m *= 1.35;
    if (S.concert > 0 && u.side === 1) m *= 1.35;
    if (u.slowT > 0) m *= 0.62;
    return m;
  }
  function effCd(u) {
    return Math.max(0.12, u.def.atkCd * u.mod.cd);
  }

  /* ================= 单位更新 ================= */
  function unitUpdate(u, dt) {
    if (u.deadT > 0) { u.deadT += dt; return; }
    if (!isFinite(u.x) || !isFinite(u.y)) {
      window.__ztpNaN = (window.__ztpNaN || 0) + 1;
      u.x = u.side === 1 ? 120 : 840;
      u.y = (D.CONST.GROUND_TOP + D.CONST.GROUND_BOT) / 2;
    }
    const def = u.def;
    if (u.hurtT > 0) u.hurtT -= dt;
    if (u.rage > 0) u.rage -= dt;
    if (u.ramCd > 0) u.ramCd -= dt;
    if (u.cd > 0) u.cd -= dt;
    if (u.atkT > 0) u.atkT -= dt;
    if (u.slowT > 0) u.slowT -= dt;
    // 特殊兵种限时退场
    if (u.lifeT != null) {
      u.lifeT -= dt;
      if (u.lifeT <= 0) {
        FX.spark(u.x, u.y - 50, 10, { col: '#ffe07a', sp: 120, life: 0.4 });
        FX.floatText(u.x, u.y - 130, u.def.name + ' 返场谢幕♪', { col: '#ffe07a', sz: 13, life: 1 });
        killUnit(u, undefined, null);
        return;
      }
    }

    // 持续伤害（点燃/流血/毒素）
    if (u.dots) {
      let dotDps = 0;
      for (const k in u.dots) {
        const d = u.dots[k];
        d.t -= dt;
        dotDps += d.dps;
        if (d.t <= 0) delete u.dots[k];
      }
      if (dotDps > 0) {
        u.hp -= dotDps * dt;
        const col = u.dots.burn ? '#ff9b40' : (u.dots.poison ? '#9be84e' : '#ff5e7a');
        if (Math.random() < 0.25) FX.spark(u.x + rnd(-8, 8), u.y - rnd(20, 70) * u.scale, 1, { col, sp: 26, life: 0.3, sz: 2.4 });
        if (u.hp <= 0) { killUnit(u, undefined, null); return; }
      }
    }
    // 治疗（光环 / 急救所）
    if (u.mod.heal > 0 && u.hp > 0 && u.hp < u.max) {
      u.hp = Math.min(u.max, u.hp + u.mod.heal * dt);
    }

    // Boss / 召唤
    if (def.summon) {
      u.summonT -= dt;
      if (u.summonT <= 0) {
        u.summonT = def.summon.every;
        const m = spawnUnit(def.summon.id, u.side);
        if (m) {
          m.x = u.x + u.side * rnd(-40, -10);
          FX.ring(u.x, u.y - 40, 60, '#d9b3ff');
          FX.floatText(u.x, u.y - 130 * u.scale, '召唤！', { col: '#d9b3ff', sz: 13 });
        }
      }
    }
    // 狂三分身
    if (u.side === 1 && def.passive && def.passive.key === 'clone') {
      u.cloneT -= dt;
      if (u.cloneT <= 0) {
        u.cloneT = 8;
        const clones = S.units.filter(x => x.clone && !x.deadT).length;
        if (clones < 2) spawnClone(u);
      }
    }

    const target = nearestEnemy(u, def.range);
    const baseX = u.side === 1 ? D.CONST.ZOMBIE_BASE_X : D.CONST.PLAYER_BASE_X;
    const distBase = Math.abs(baseX - u.x);

    if (target) {
      const d = Math.abs(target.x - u.x);
      if (d <= def.range * (u.mod.range || 1)) {
        u.moving = false;
        if (u.cd <= 0) attack(u, target);
      } else {
        moveUnit(u, dt);
      }
    } else if (distBase <= def.range * (u.mod.range || 1) + 24) {
      u.moving = false;
      if (u.cd <= 0) attackBase(u);
    } else {
      moveUnit(u, dt);
    }
  }

  function moveUnit(u, dt) {
    const def = u.def;
    let push = 0;
    for (const o of S.units) {
      if (o === u || o.deadT > 0 || o.side !== u.side) continue;
      const dx = u.x - o.x;
      if (Math.abs(dx) < 15 && Math.abs(u.y - o.y) < 26) push += (dx >= 0 ? 1 : -1) * 22 * dt;
    }
    const spd = def.speed * moveMul(u);
    u.x += u.side * spd * dt + push;
    u.y += rnd(-14, 14) * dt * 8;
    u.y = clamp(u.y, D.CONST.GROUND_TOP, D.CONST.GROUND_BOT);
    u.x = clamp(u.x, 30, 930);
    u.walkPhase += dt * spd * 0.16;
    u.moving = true;

    // 冲撞（黑岩）
    if (def.ramDmg && u.ramCd <= 0) {
      for (const e of S.units) {
        if (e.deadT > 0 || e.side === u.side) continue;
        if (Math.abs(e.x - u.x) < 40 && Math.abs(e.y - u.y) < 30) {
          const boosted = def.passive && def.passive.key === 'ram';
          applyDamage(e, def.ramDmg * (boosted ? 1.6 : 1) * (u.rage > 0 ? 1.5 : 1), u.side, u);
          e.x += u.side * 24;
          if (boosted) e.slowT = Math.max(e.slowT || 0, 0.6);
          u.ramCd = def.ramCd;
          FX.spark(e.x, e.y - 40, 8, { col: '#9fdcff', sp: 150 });
          FX.ring(e.x, e.y - 30, 34, '#9fdcff');
          FX.shake(3);
          break;
        }
      }
    }
  }

  function attack(u, target) {
    const def = u.def;
    u.cd = effCd(u);
    u.atkT = 0.28;
    u.atkCount++;
    const p = def.passive;
    let dmg = def.dmg * atkMul(u);
    const ty = target.y - 40 * target.scale;

    // 誓约胜利之剑（阿尔托莉雅 每5击光炮）
    if (p && p.key === 'beam5' && u.atkCount % 5 === 0) {
      FX.beam(u.x + 20, u.y - 200, target.x + 40, ty, '#fff3a0', 22, 0.35);
      FX.flash('#fff6c0', 0.25, 0.2);
      FX.shake(4);
      FX.floatText(u.x, u.y - 150, 'EX—CALIBUR！', { col: '#fff3a0', sz: 15, life: 1.1 });
      aoeDamage(target.x + 30, ty, 60, dmg * 2.2, -1, u, true);
      return;
    }

    if (def.atkType === 'melee') {
      // 暴击
      let crit = 1, critTxt = null;
      if (p && p.key === 'crit' && Math.random() < 0.25) { crit = 2; critTxt = '贯穿死棘！'; }
      if (p && p.key === 'crit2' && Math.random() < 0.2) { crit = 1.8; critTxt = '闪光！'; }
      const hx = target.x - u.side * 8;
      slashFx(hx, ty, u.side);
      applyDamage(target, dmg * crit, u.side, u);
      if (critTxt) FX.floatText(hx, ty - 26, critTxt, { col: '#ffd75e', sz: 13, life: 0.9 });
      if (def.knock) target.x = clamp(target.x + Math.sign(target.x - u.x) * def.knock, 30, 930);
    } else if (def.atkType === 'throw') {
      const proj = Object.assign({}, def.proj);
      if (p && p.key === 'brew') {
        proj.aoe = Math.round(proj.aoe * 1.5);
        proj.burn = { dps: proj.burn.dps, time: proj.burn.time * 1.5 };
      }
      const dx = target.x - u.x;
      const t = Math.max(0.35, Math.abs(dx) / proj.speed);
      FX.projectile({
        kind: 'bottle', x: u.x + u.side * 10, y: u.y - 74,
        vx: dx / t, vy: (ty - (u.y - 74)) / t - 0.5 * 420 * t, grav: 420, ty,
        onHit: (hx, hy) => {
          FX.explosion(hx, hy, proj.aoe, '#ffb03a');
          aoeDamage(hx, hy, proj.aoe, dmg, -1, u, true);
          const b = proj.burn;
          FX.burnZone(hx, proj.aoe * 0.8, b.time, (bx, br) => aoeDamage(bx, hy, br, b.dps * 0.5, -1, null, true));
        },
      });
    } else if (def.atkType === 'gun') {
      const proj = def.proj;
      const mx = u.x + u.side * 26, my = u.y - 56 * u.scale;
      FX.muzzle(mx, my, proj.kind === 'cannon' ? '#9fdcff' : '#fff3c9');
      FX.projectile({
        kind: proj.kind, x: mx, y: my, tx: target.x, ty,
        speed: proj.speed, trail: true,
        onHit: (hx, hy) => {
          applyDamage(target, dmg, u.side, u);
          if (proj.kind === 'coin') {
            FX.lightning(hx, hy - 20, hx + rnd(-24, 24), hy + rnd(-6, 20), '#8fe3ff', 2, 0.14);
            FX.spark(hx, hy, 5, { col: '#ffe14d', sp: 110, life: 0.3 });
          } else if (proj.chill) {
            FX.spark(hx, hy, 5, { col: '#9fdcff', sp: 100, life: 0.35 });
            if (u.side === -1 && target.hp > 0) target.slowT = Math.max(target.slowT || 0, 1.6);
          } else {
            FX.spark(hx, hy, 6, { col: '#59c8ff', sp: 140, life: 0.35 });
          }
        },
      });
    } else if (def.atkType === 'cast') {
      // 魔理沙：每3次一发策反光线
      if (p && p.key === 'convert' && u.atkCount % 3 === 0) {
        const victims = S.units.filter(e => e.side === -1 && e.deadT <= 0 && !e.converted && !e.def.boss && e.hp < e.max * 0.7 && Math.abs(e.x - u.x) < def.range + 40);
        const v = victims.length ? pick(victims) : target;
        FX.beam(u.x + 6, u.y - 66, v.x, v.y - 40 * v.scale, '#ff8ce0', 7, 0.3);
        if (!convertUnit(v)) {
          applyDamage(v, dmg * 1.4, u.side, u, true);
          FX.spark(v.x, v.y - 40, 6, { col: '#ff8ce0', sp: 120 });
        }
      } else {
        const col = u.side === -1 ? '#b08cff' : '#ffe95e';
        FX.beam(u.x + 6, u.y - 66, target.x, ty, col, 5, 0.16);
        applyDamage(target, dmg, u.side, u);
        FX.spark(target.x, ty, 6, { col: '#ffe95e', sp: 120 });
      }
    } else {
      applyDamage(target, dmg, u.side, u);
    }
  }

  function slashFx(x, y, side) {
    FX.beam(x - side * 16, y - 16, x + side * 14, y + 12, '#ffffff', 3, 0.12, false);
    FX.spark(x, y, 5, { col: '#fff', sp: 90, life: 0.22, sz: 2.4 });
  }

  function attackBase(u) {
    const def = u.def;
    u.cd = effCd(u);
    u.atkT = 0.28;
    const dmg = def.dmg * atkMul(u);
    if (u.side === 1) {
      S.zombieBase.hp -= dmg;
      FX.spark(D.CONST.ZOMBIE_BASE_X - 20, u.y - 40, 5, { col: '#ffd28a', sp: 90 });
    } else {
      if (S.hacked.base) return;
      S.playerBase.hp -= dmg;
      FX.spark(D.CONST.PLAYER_BASE_X + 30, u.y - 40, 5, { col: '#ff8a8a', sp: 90 });
    }
  }

  /* ================= 僵尸AI导演 ================= */
  function director(dt) {
    const L = S.level;
    while (S.waveIdx < L.waves.length && S.elapsed >= L.waves[S.waveIdx].t) {
      const w = L.waves[S.waveIdx++];
      for (const tid in w.types) {
        for (let i = 0; i < w.types[tid]; i++) {
          setTimeoutSpawn(tid, i * 0.42);
        }
      }
      banner('', '僵尸娘增援来袭！', 1.6);
    }
    if (L.boss && !S.bossSpawned && S.elapsed >= L.boss.t) {
      S.bossSpawned = true;
      spawnUnit(L.boss.id || 'queen', -1);
    }
    S.spawnT -= dt;
    if (S.spawnT <= 0) {
      const [i0, i1] = L.spawn.interval;
      const k = clamp(S.elapsed / L.spawn.ramp, 0, 1);
      let iv = i0 + (i1 - i0) * k;
      const threat = S.units.some(u => u.side === 1 && u.x > 690);
      if (threat) iv *= 0.55;
      S.spawnT = iv * rnd(0.85, 1.15);
      const roll = Math.random();
      let acc = 0, tid = L.types[0][0];
      for (const [t, wgt] of L.types) {
        acc += wgt;
        if (roll <= acc) { tid = t; break; }
      }
      spawnUnit(tid, -1);
    }
  }

  const pendingSpawns = [];
  function setTimeoutSpawn(tid, delay) {
    pendingSpawns.push({ tid, t: delay });
  }

  /* ================= 经济 ================= */
  function economy(dt) {
    let inc = D.CONST.BASE_INCOME + (S.buildings.yard || 0) * D.CONST.YARD_INCOME;
    inc *= 1 + 0.3 * (S.aliveCounts.tamamo || 0);   // 玉藻前
    if (S.hacked.money) {
      S.money += (200 + S.money * 0.02) * dt;
    } else {
      S.money += inc * dt;
    }
    if (S.hacked.energy) S.energy += 120 * dt;
    S.energy = Math.min(S.energy, 99999);
  }

  /* ================= 超级召唤持续效果 ================= */
  function supersUpdate(dt) {
    if (S.mamiT > 0) S.mamiT -= dt;
    if (S.excalT > 0) {
      S.excalT -= dt;
      S.excalTick -= dt;
      if (S.excalTick <= 0) {
        S.excalTick = 0.12;
        const x = rnd(480, 930), y = rnd(340, 460);
        FX.beam(x, -20, x, y + 40, '#fff3a0', rnd(14, 30), 0.3);
        FX.spark(x, y, 8, { col: '#fff3a0', sp: 200, life: 0.5 });
        aoeDamage(x, y, 100, 95, -1, null, true);
        FX.shake(4);
      }
    }
    if (S.concert > 0) {
      S.concert -= dt;
      S.concertT -= dt;
      if (S.concertT <= 0) {
        S.concertT = 0.3;
        for (let i = 0; i < 3; i++) {
          const zs = S.units.filter(u => u.side === -1 && u.deadT <= 0);
          if (!zs.length) break;
          const v = pick(zs);
          const col = pick(['#ff5e8a', '#ffd75e', '#5eff9c', '#5ec8ff', '#c95eff']);
          FX.beam(rnd(200, 800), -10, v.x, v.y - 40, col, 8, 0.25);
          aoeDamage(v.x, v.y - 40, 52, 62, -1, null, true);
          notes(v.x, v.y - 60, 3);
        }
      }
    }
  }
  function notes(x, y, n) {
    for (let i = 0; i < n; i++) {
      FX.floatText(x + rnd(-30, 30), y + rnd(-16, 10), pick(['♪', '♫', '★']), { col: pick(['#39c5bb', '#ffd75e', '#ff8ab5']), sz: rnd(13, 20), life: rnd(0.6, 1.1), vy: -80 });
    }
  }

  /* ================= 主更新 ================= */
  function update(dtRaw) {
    if (S.mode !== 'playing') return;
    const dt = Math.min(dtRaw, 0.05) * S.speed;
    S.time += dt;
    S.elapsed += dt;

    computeMods();
    economy(dt);
    director(dt);
    supersUpdate(dt);

    for (let i = pendingSpawns.length - 1; i >= 0; i--) {
      pendingSpawns[i].t -= dt;
      if (pendingSpawns[i].t <= 0) {
        spawnUnit(pendingSpawns[i].tid, -1);
        pendingSpawns.splice(i, 1);
      }
    }

    for (const u of S.units) unitUpdate(u, dt);
    for (let i = S.units.length - 1; i >= 0; i--) {
      if (S.units[i].deadT > 0.9) S.units.splice(i, 1);
    }

    if (S.banner) {
      S.banner.t += dtRaw;
      if (S.banner.t > S.banner.dur) S.banner = null;
    }

    if (S.zombieBase.hp <= 0) {
      S.zombieBase.hp = 0;
      S.mode = 'over';
      emit('end', { win: true });
      FX.flash('#fff', 0.6, 0.6);
    } else if (S.playerBase.hp <= 0) {
      S.playerBase.hp = 0;
      S.mode = 'over';
      emit('end', { win: false });
    }
  }

  /* ================= 渲染 ================= */
  const IMG = {};
  let SPRITE_CACHE = {};
  function setImages(map) {
    Object.assign(IMG, map);
    SPRITE_CACHE = {};
  }

  function spriteFor(key) {
    if (SPRITE_CACHE[key] !== undefined) return SPRITE_CACHE[key];
    const img = IMG[key];
    if (!img || !img.width || !img.height) return null;
    const h = 130;
    const w = Math.max(2, Math.round(img.width / img.height * h));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').drawImage(img, 0, 0, w, h);
    SPRITE_CACHE[key] = c;
    return c;
  }

  function drawBackground(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, 540);
    g.addColorStop(0, '#2c2336');
    g.addColorStop(0.45, '#6e4a56');
    g.addColorStop(0.62, '#c98a6b');
    g.addColorStop(1, '#e8b98a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 960, 540);
    ctx.fillStyle = 'rgba(255,220,150,.9)';
    ctx.beginPath();
    ctx.arc(680, 208, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(58,40,58,.85)';
    ctx.beginPath();
    ctx.moveTo(0, 330);
    ctx.lineTo(180, 268); ctx.lineTo(320, 322); ctx.lineTo(520, 258);
    ctx.lineTo(760, 322); ctx.lineTo(960, 280);
    ctx.lineTo(960, 540); ctx.lineTo(0, 540);
    ctx.fill();
    drawCity(ctx);
    const gg = ctx.createLinearGradient(0, 372, 0, 540);
    gg.addColorStop(0, '#7f9c5e');
    gg.addColorStop(0.24, '#6c8a50');
    gg.addColorStop(0.26, '#5c5c62');
    gg.addColorStop(1, '#43434a');
    ctx.fillStyle = gg;
    ctx.fillRect(0, 372, 960, 168);
    ctx.fillStyle = 'rgba(255,255,255,.06)';
    for (let i = 0; i < 40; i++) {
      const x = (i * 137) % 960, y = 376 + (i * 53) % 16;
      ctx.fillRect(x, y, 3, 2);
    }
    ctx.fillStyle = 'rgba(230,230,220,.5)';
    for (let x = 10; x < 960; x += 64) ctx.fillRect(x, 452, 30, 4);
    ctx.fillStyle = 'rgba(20,20,24,.35)';
    ctx.fillRect(0, 386, 960, 4);
    // 关卡色调（妖精乡等）
    if (S.level && S.level.tint) {
      ctx.fillStyle = S.level.tint;
      ctx.fillRect(0, 0, 960, 540);
    }
  }

  let cityWindows = null;
  function buildCityWindows() {
    cityWindows = [];
    const blocks = [
      [690, 120, 60, 210], [758, 90, 74, 240], [840, 130, 56, 200], [902, 70, 64, 260],
    ];
    for (const [x, y, w, h] of blocks) {
      for (let yy = y + 14; yy < y + h - 10; yy += 22) {
        for (let xx = x + 8; xx < x + w - 12; xx += 18) {
          if (Math.random() < 0.1) continue;
          cityWindows.push({ x: xx, y: yy, lit: Math.random() < 0.1, ph: Math.random() * 6.28 });
        }
      }
    }
  }

  function drawCity(ctx) {
    ctx.save();
    const blocks = [
      [690, 120, 60, 210], [758, 90, 74, 240], [840, 130, 56, 200], [902, 70, 64, 260],
    ];
    for (const [x, y, w, h] of blocks) {
      ctx.fillStyle = '#3a2f3c';
      ctx.fillRect(x, y, w, h);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + w * 0.3, y + 8);
      ctx.lineTo(x + w * 0.55, y - 4);
      ctx.lineTo(x + w, y + 10);
      ctx.lineTo(x + w, y);
      ctx.fill();
    }
    if (!cityWindows) buildCityWindows();
    for (const wd of cityWindows) {
      ctx.fillStyle = wd.lit
        ? 'rgba(255,180,80,' + (0.3 + 0.25 * Math.sin(S.elapsed * 2 + wd.ph)) + ')'
        : 'rgba(20,16,24,.9)';
      ctx.fillRect(wd.x, wd.y, 9, 12);
    }
    ctx.restore();
  }

  function drawBases(ctx) {
    // ---- 我方房车基地 ----
    ctx.save();
    const px = D.CONST.PLAYER_BASE_X;
    trailer(ctx, px - 52, 358, 1.0, '#e8e4d8');
    if ((S.buildings.trailer || 0) > 0) trailer(ctx, px - 84, 396, 0.72, '#d8cdb6');
    if ((S.buildings.trailer || 0) > 1) trailer(ctx, px - 30, 402, 0.66, '#cfd8cf');
    if ((S.buildings.trailer || 0) > 2) trailer(ctx, px - 96, 368, 0.6, '#d6c2c2');
    if ((S.buildings.trailer || 0) > 3) trailer(ctx, px - 20, 372, 0.55, '#c2ced6');
    const yards = S.buildings.yard || 0;
    for (let i = 0; i < yards; i++) {
      sign(ctx, px - 66 + i * 8, 340 - i * 4, 0.8 + i * 0.04);
    }
    if (S.buildings.tent) hut(ctx, px - 12, 322, '#a5552f', '#7a3c20', 'Camp');
    if (S.buildings.workshop) hut(ctx, px - 8, 300, '#6b4f8a', '#4c3766', 'Shop');
    if (S.buildings.academy) hut(ctx, px - 4, 280, '#3f6b8a', '#2c4c66', 'Acad');
    if (S.buildings.circle) hut(ctx, px - 2, 262, '#8a2f6b', '#5c1f4a', 'Magic');
    if (S.buildings.altar) hut(ctx, px - 1, 244, '#b08a2f', '#7c5c1f', 'Altar');
    ctx.fillStyle = '#b03a3a';
    ctx.fillRect(px - 76, 306, 3, 26);
    ctx.fillStyle = '#d8d4c8';
    ctx.fillRect(px - 73, 306, 16, 9);
    ctx.fillStyle = '#3a4f8a';
    ctx.fillRect(px - 73, 306, 6, 5);
    ctx.restore();

    // ---- 僵尸基地 ----
    const zx = D.CONST.ZOMBIE_BASE_X;
    ctx.save();
    const pulse = 0.5 + 0.5 * Math.sin(S.elapsed * 3);
    const gr = ctx.createRadialGradient(zx - 40, 420, 4, zx - 40, 420, 60 + pulse * 12);
    gr.addColorStop(0, 'rgba(200,40,60,.55)');
    gr.addColorStop(1, 'rgba(120,0,20,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(zx - 120, 340, 130, 140);
    ctx.fillStyle = '#241a26';
    ctx.fillRect(zx - 74, 380, 56, 90);
    ctx.fillStyle = '#3a2530';
    ctx.fillRect(zx - 66, 388, 40, 82);
    ctx.fillStyle = 'rgba(160,30,40,' + (0.4 + pulse * 0.3) + ')';
    ctx.fillRect(zx - 58, 398, 24, 72);
    ctx.restore();

    // ---- 基地血条 ----
    healthBar(ctx, 30, 512, 240, 'My Base', S.playerBase.hp / S.playerBase.max, '#7ecb63');
    healthBar(ctx, 690, 512, 240, '僵尸城', S.zombieBase.hp / S.zombieBase.max, '#e05a5a', true);
  }

  function trailer(ctx, x, y, s, col) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = col;
    ctx.strokeStyle = 'rgba(40,30,30,.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(0, -52, 96, 52, [10, 10, 4, 4]);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(90,120,150,.85)';
    ctx.fillRect(10, -40, 20, 14);
    ctx.fillRect(38, -40, 20, 14);
    ctx.fillStyle = 'rgba(60,50,50,.8)';
    ctx.fillRect(66, -34, 18, 22);
    ctx.fillStyle = '#4a4a52';
    ctx.beginPath(); ctx.arc(22, 4, 8, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(70, 4, 8, 0, 7); ctx.fill();
    ctx.fillStyle = '#8a8a92';
    ctx.beginPath(); ctx.arc(22, 4, 3.4, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(70, 4, 3.4, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(120,40,40,.85)';
    ctx.fillRect(4, -58, 60, 7);
    ctx.restore();
  }

  function sign(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = '#6b4f35';
    ctx.fillRect(6, 0, 5, 34);
    ctx.fillStyle = '#e8dfc8';
    ctx.strokeStyle = '#6b4f35';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-14, -26, 46, 28, 4);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#a04434';
    ctx.font = 'bold 11px Georgia';
    ctx.fillText('SALVAGE', -11, -8);
    ctx.restore();
  }

  function hut(ctx, x, y, col, roof, label) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = col;
    ctx.fillRect(0, -44, 56, 44);
    ctx.fillStyle = roof;
    ctx.beginPath();
    ctx.moveTo(-6, -44); ctx.lineTo(28, -66); ctx.lineTo(62, -44);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,230,150,.9)';
    ctx.fillRect(10, -34, 12, 12);
    ctx.fillStyle = '#3a2f26';
    ctx.fillRect(34, -26, 14, 26);
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.font = '9px Georgia';
    ctx.fillText(label, 8, -48);
    ctx.restore();
  }

  function healthBar(ctx, x, y, w, label, k, col, right) {
    ctx.save();
    ctx.font = 'bold 15px "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    ctx.strokeStyle = 'rgba(0,0,0,.7)';
    ctx.lineWidth = 3;
    if (right) { ctx.textAlign = 'right'; }
    ctx.strokeText(label, right ? x + w : x, y - 6);
    ctx.fillText(label, right ? x + w : x, y - 6);
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.fillRect(x, y, w, 12);
    ctx.fillStyle = col;
    ctx.fillRect(x + 1, y + 1, (w - 2) * clamp(k, 0, 1), 10);
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, 12);
    ctx.restore();
  }

  function drawUnit(ctx, u) {
    const def = u.def;
    const key = def.img || def.id;
    const img = spriteFor(key);
    const dying = u.deadT > 0;
    const k = dying ? clamp(u.deadT / 0.9, 0, 1) : 1;

    ctx.save();
    ctx.translate(u.x, u.y);

    ctx.fillStyle = 'rgba(0,0,0,.28)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 20 * u.scale, 5.5 * u.scale, 0, 0, Math.PI * 2);
    ctx.fill();

    if (u.side === -1 && !dying) {
      const gg = ctx.createRadialGradient(0, -30 * u.scale, 4, 0, -30 * u.scale, 34 * u.scale);
      gg.addColorStop(0, 'rgba(110,200,90,.16)');
      gg.addColorStop(1, 'rgba(110,200,90,0)');
      ctx.fillStyle = gg;
      ctx.beginPath();
      ctx.arc(0, -30 * u.scale, 34 * u.scale, 0, Math.PI * 2);
      ctx.fill();
    }
    if (u.rage > 0) {
      ctx.strokeStyle = 'rgba(255,110,140,' + (0.4 + 0.3 * Math.sin(S.elapsed * 12)) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, -46 * u.scale, 26 * u.scale, 52 * u.scale, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    const isCard = def.style === 'card';
    const h = (isCard ? 74 : 82) * u.scale;
    const w = img ? img.width / img.height * h : h;
    const bob = u.moving && !dying ? Math.sin(u.walkPhase * 2) * 2.6 : Math.sin(S.elapsed * 2 + u.walkPhase) * 1.2;
    const lunge = u.atkT > 0 ? Math.sin((0.28 - u.atkT) / 0.28 * Math.PI) * 10 : 0;
    const face = u.side === 1 ? 1 : -1;

    ctx.translate(face * lunge, 0);

    if (dying) {
      ctx.globalAlpha = 1 - k;
      ctx.translate(0, k * 8);
      ctx.rotate(face * k * 1.35);
    }

    if (isCard) {
      ctx.translate(0, -h / 2 - 10 + bob);
      ctx.rotate(Math.sin(S.elapsed * 2 + u.walkPhase) * 0.05 - face * 0.03);
      ctx.save();
      ctx.shadowColor = u.side === 1 ? 'rgba(120,200,255,.8)' : 'rgba(160,255,120,.7)';
      ctx.shadowBlur = 12;
      ctx.fillStyle = 'rgba(250,248,255,.95)';
      ctx.beginPath();
      ctx.roundRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8, 9);
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, 7);
      ctx.clip();
      if (img) drawImgFlashed(ctx, img, u, -w / 2, -h / 2, w, h);
      ctx.restore();
      ctx.strokeStyle = u.side === 1 ? 'rgba(90,150,255,.9)' : 'rgba(120,220,90,.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8, 9);
      ctx.stroke();
    } else {
      ctx.translate(0, bob);
      if (img) {
        ctx.save();
        if (face === -1) ctx.scale(-1, 1);
        drawImgFlashed(ctx, img, u, -w / 2, -h, w, h);
        ctx.restore();
      } else {
        ctx.fillStyle = u.side === 1 ? '#7fa8d8' : '#8fbf7a';
        ctx.fillRect(-10, -h, 20, h);
      }
    }
    ctx.globalAlpha = dying ? 1 - k : 1;

    if (u.atkT > 0.16 && !dying) {
      ctx.strokeStyle = u.side === 1 ? 'rgba(255,255,255,.5)' : 'rgba(190,255,170,.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(face * 14, -46 * u.scale);
      ctx.lineTo(face * 34, -46 * u.scale);
      ctx.stroke();
    }
    ctx.restore();

    // 血条 & 职业 & 状态
    if (!dying) {
      const bw = 30 * u.scale;
      const bx = u.x - bw / 2;
      const by = u.y - (def.style === 'card' ? 92 : 96) * u.scale;
      ctx.fillStyle = 'rgba(0,0,0,.5)';
      ctx.fillRect(bx, by, bw, 4);
      ctx.fillStyle = u.side === 1 ? '#7ecb63' : '#e05a5a';
      const ratio = clamp(u.hp / u.max, 0, 1);
      ctx.fillRect(bx, by, bw * ratio, 4);
      // 职业徽章
      const cls = D.CLASSES[u.def.cls];
      if (cls) {
        const cxx = bx - 15;
        ctx.fillStyle = cls.col;
        ctx.beginPath();
        ctx.roundRect(cxx, by - 3, 13, 13, 3);
        ctx.fill();
        ctx.fillStyle = '#241a20';
        ctx.font = 'bold 10px "Microsoft YaHei"';
        ctx.textAlign = 'center';
        ctx.fillText(cls.ch, cxx + 6.5, by + 7);
      }
      if (u.converted) {
        ctx.fillStyle = '#ff8cb3';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('♥', u.x, by - 6);
      }
      if (def.boss) {
        ctx.fillStyle = '#ffb0c8';
        ctx.font = 'bold 12px "Microsoft YaHei"';
        ctx.textAlign = 'center';
        ctx.fillText(def.name, u.x, by - 7);
      }
    }
  }

  function drawImgFlashed(ctx, img, u, dx, dy, dw, dh) {
    if (u.hurtT > 0) {
      ctx.save();
      ctx.filter = 'brightness(2.2) saturate(0.2)';
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.restore();
    } else {
      ctx.drawImage(img, dx, dy, dw, dh);
    }
  }

  function draw(ctx) {
    const off = FX.shakeOffset();
    ctx.save();
    ctx.translate(off.x, off.y);
    drawBackground(ctx);
    drawBases(ctx);

    if (S.concert > 0) {
      ctx.fillStyle = 'rgba(20,10,40,.45)';
      ctx.fillRect(0, 0, 960, 540);
      const miku = IMG['miku'];
      if (miku) {
        const h = 300;
        const w = miku.width / miku.height * h;
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.translate(480, 96);
        const sc = 1 + Math.sin(S.elapsed * 6) * 0.02;
        ctx.scale(sc, sc);
        ctx.drawImage(miku, -w / 2, 0, w, h);
        ctx.restore();
      }
    }

    const list = S.units.slice().sort((a, b) => a.y - b.y);
    for (const u of list) drawUnit(ctx, u);

    FX.draw(ctx);
    ctx.restore();
    FX.drawFlash(ctx);

    if (S.banner) {
      const b = S.banner;
      const k = Math.min(1, b.t * 4) * Math.min(1, (b.dur - b.t) * 2.5);
      ctx.save();
      ctx.globalAlpha = clamp(k, 0, 1);
      ctx.fillStyle = 'rgba(0,0,0,.45)';
      ctx.fillRect(0, 208, 960, 96);
      ctx.textAlign = 'center';
      if (b.a) {
        ctx.font = 'bold 44px Georgia';
        ctx.fillStyle = '#ffe9b0';
        ctx.strokeStyle = 'rgba(0,0,0,.8)';
        ctx.lineWidth = 6;
        ctx.strokeText(b.a, 480, 252);
        ctx.fillText(b.a, 480, 252);
      }
      if (b.b) {
        ctx.font = 'bold 30px "Microsoft YaHei"';
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = 'rgba(0,0,0,.8)';
        ctx.lineWidth = 5;
        ctx.strokeText(b.b, 480, b.a ? 292 : 268);
        ctx.fillText(b.b, 480, b.a ? 292 : 268);
      }
      ctx.restore();
    }
  }

  function init() {
    S.onEvent = null;
  }

  return {
    S, startLevel, setTeam, update, draw, setImages,
    buyUnit, buyBuilding, castSuper, buildingCost, unitCost,
    slotUnlocked, slotUnlockBuilding,
    spawnUnit, spawnSpecial, convertUnit, classMult,
    init,
  };
})();
