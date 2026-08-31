/* =====================================================================
 * save.js — localStorage 进度 / 作弊偏好 / 编队 (2.0)
 * ===================================================================== */
window.ZTP = window.ZTP || {};

ZTP.Save = (function () {
  'use strict';
  const KEY = 'ztp_bishoujo_v2';
  const MAX_UNLOCKED = 5;   // 关卡下标 0..5
  let data = {
    unlocked: 0,
    hacked: { money: true, energy: false, base: false },
    team: null,
  };

  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (typeof d.unlocked === 'number') data.unlocked = Math.max(0, Math.min(MAX_UNLOCKED, d.unlocked));
      if (d.hacked) data.hacked = Object.assign(data.hacked, d.hacked);
      if (Array.isArray(d.team)) data.team = d.team.filter(x => typeof x === 'string').slice(0, 6);
    }
  } catch (e) { /* 忽略损坏存档 */ }

  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { }
  }

  return {
    get: () => data,
    save: persist,
    setHacked: (h) => { data.hacked = Object.assign({}, h); persist(); },
    setTeam: (t) => { data.team = (t || []).slice(0, 6); persist(); },
  };
})();
