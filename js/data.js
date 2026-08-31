/* =====================================================================
 * 僵尸房车公园 ～美娘大作战 2.0～
 * data.js — 数值与文案配置
 * 2.0 新增：FGO 英灵（妖精圆桌领域 & 其他美少女英灵）＋更多萌娘百科美少女
 *          七大职业克制（剑/弓/枪/骑/术/杀/狂）＋全员独立被动
 *          战前编队（6 人，第 6 位为助战：部署费用 -40%）
 * 角色图片素材：Mooncell FGO中文Wiki (fgo.wiki) ＆ 萌娘百科 (zh.moegirl.org.cn)
 * 仅供本地同人复刻使用
 * ===================================================================== */
window.ZTP = window.ZTP || {};

ZTP.DATA = (function () {
  'use strict';

  /* ================= 七大职业（FGO 经典） =================
   * 克制关系：剑>枪>弓>剑；骑>术>杀>骑；狂阶对所有常规职业 1.5 倍（受到也是 1.5 倍）
   * beats: 该职业克制谁 */
  const CLASSES = {
    saber:     { name: '剑士',   ch: '剑', col: '#e8b25a', beats: 'lancer' },
    archer:    { name: '弓兵',   ch: '弓', col: '#7ecb63', beats: 'saber' },
    lancer:    { name: '枪兵',   ch: '枪', col: '#5ab0e8', beats: 'archer' },
    rider:     { name: '骑兵',   ch: '骑', col: '#c95eff', beats: 'caster' },
    caster:    { name: '术师',   ch: '术', col: '#ff8ab5', beats: 'assassin' },
    assassin:  { name: '暗匿者', ch: '杀', col: '#a8a8bd', beats: 'rider' },
    berserker: { name: '狂战士', ch: '狂', col: '#e05a5a', beats: null },
  };
  const CLASS_ORDER = ['saber', 'archer', 'lancer', 'rider', 'caster', 'assassin', 'berserker'];

  /* ================= 我方花名册 =================
   * from: 'FGO2.6' = 妖精圆桌领域 | 'FGO' = 其他FGO英灵 | '萌娘百科'
   * style: 'sprite' = 立绘行走；'card' = 浮游灵基卡
   * passive.key 由 game.js 引擎实现 */
  const ROSTER = {
    /* ---------- 原班人马（1.0） ---------- */
    taiga: {
      id: 'taiga', style: 'sprite', from: '萌娘百科', src: '龙与虎',
      name: '逢坂大河', cls: 'saber',
      cost: 50, pop: 1,
      hp: 95, dmg: 17, atkCd: 0.78, range: 34, speed: 46,
      atkType: 'melee',
      rarity: 1,
      passive: { name: '掌中猛虎', key: 'knock', desc: '攻击有 35% 概率将敌人击退一大段距离' },
      quote: '用铁锹把僵尸娘拍飞哦！',
      desc: '便宜耐用的近战前卫，用人海淹没僵尸娘。',
      killTexts: ['拍飞！', '掌中猛虎！', '妙啊！'],
    },
    mikoto: {
      id: 'mikoto', style: 'sprite', from: '萌娘百科', src: '某科学的超电磁炮',
      name: '御坂美琴', cls: 'archer',
      cost: 200, pop: 1,
      hp: 115, dmg: 13, atkCd: 0.5, range: 190, speed: 40,
      atkType: 'gun', proj: { kind: 'coin', speed: 560 },
      rarity: 2,
      passive: { name: '超电磁炮', key: 'thunder', desc: '攻击有 40% 概率引发雷击，溅射周围敌人' },
      quote: '硬币，上膛。',
      desc: '弹指射出带电硬币，中远程稳定输出。',
      killTexts: ['超电磁炮！', '啪叽♪', '贯穿！'],
    },
    suika: {
      id: 'suika', style: 'card', from: '萌娘百科', src: '东方Project',
      name: '伊吹萃香', cls: 'berserker',
      cost: 350, pop: 1,
      hp: 135, dmg: 30, atkCd: 1.45, range: 215, speed: 34,
      atkType: 'throw', proj: { kind: 'bottle', speed: 300, aoe: 58, burn: { dps: 9, time: 3 } },
      rarity: 2,
      passive: { name: '鬼之豪饮', key: 'brew', desc: '燃烧弹的火海范围与持续时间 +50%' },
      quote: '来干杯呀——嗝。',
      desc: '灵基卡浮游，抛掷点燃的酒葫芦，留下火海。',
      killTexts: ['干杯！', '鬼族之宴！', '烧起来咯！'],
    },
    brs: {
      id: 'brs', style: 'sprite', from: '萌娘百科', src: '黑岩射手',
      name: '黑岩射手', cls: 'rider',
      cost: 900, pop: 2,
      hp: 560, dmg: 18, atkCd: 0.45, range: 235, speed: 92,
      atkType: 'gun', proj: { kind: 'cannon', speed: 640 },
      ramDmg: 46, ramCd: 0.9,
      rarity: 3,
      passive: { name: 'black★rock', key: 'ram', desc: '冲撞伤害 +60%，被撞的敌人减速 0.6 秒' },
      quote: '……（蓝火摇曳）',
      desc: '高速突进的★岩炮手，撞击造成额外伤害。',
      killTexts: ['碾过去！', '★rock！', 'black★out！'],
    },
    marisa: {
      id: 'marisa', style: 'card', from: '萌娘百科', src: '东方Project',
      name: '雾雨魔理沙', cls: 'caster',
      cost: 1500, pop: 2,
      hp: 250, dmg: 24, atkCd: 0.95, range: 205, speed: 30,
      atkType: 'cast', proj: { kind: 'spark', speed: 480 },
      rarity: 3,
      passive: { name: '恋符·极限火花', key: 'convert', desc: '每 3 次攻击释放策反光线，把僵尸娘变成我方（上限3）' },
      quote: '本大小姐登场，无关者闪开！',
      desc: '八卦炉激光攻击，还能把僵尸娘策反成我方！',
      killTexts: ['恋符·极限火花！', '本小姐收下了！', '究极魔法♪'],
    },

    /* ---------- FGO 2.6 妖精圆桌领域 ---------- */
    morgan: {
      id: 'morgan', style: 'card', from: 'FGO2.6', src: '妖精王摩根',
      name: '摩根', cls: 'berserker',
      cost: 1500, pop: 2,
      hp: 620, dmg: 42, atkCd: 1.5, range: 46, speed: 26, knock: 30,
      atkType: 'melee',
      rarity: 5,
      passive: { name: '支配不列颠者', key: 'aura', desc: '王之光环：周围我方攻击力 +15%', aura: { allyAtk: 0.15, range: 150 } },
      quote: '吾之国度，不容僵尸踏足。',
      desc: '妖精王亲自挥剑，重击带击退，还能强化周围的友军。',
      killTexts: ['归于尘土。', '王的敕令。', '不列颠万岁。'],
    },
    artcaster: {
      id: 'artcaster', style: 'card', from: 'FGO2.6', src: '术阶阿尔托莉雅（希望之杖）',
      name: '阿尔托莉雅·卡斯特', cls: 'caster',
      cost: 1200, pop: 1,
      hp: 220, dmg: 26, atkCd: 1.05, range: 210, speed: 32,
      atkType: 'cast', proj: { kind: 'spark', speed: 500 },
      rarity: 5,
      passive: { name: '妖精乡的加护', key: 'aura', desc: '持续治疗周围我方（每秒 8 点）', aura: { allyHeal: 8, range: 140 } },
      quote: '这一次，由我来守护大家！',
      desc: '希望之杖的光炮，同时以妖精乡的加护治疗友军。',
      killTexts: ['成功了呢！', '加护同在！', '妖精乡之光！'],
    },
    melusine: {
      id: 'melusine', style: 'card', from: 'FGO2.6', src: '妖精骑士兰斯洛特',
      name: '梅柳齐娜', cls: 'lancer',
      cost: 1100, pop: 1,
      hp: 260, dmg: 24, atkCd: 0.6, range: 42, speed: 70,
      atkType: 'melee',
      rarity: 5,
      passive: { name: '龙之变形', key: 'dragonform', desc: 'HP 低于 40% 时攻速 +50%、移速 +40%' },
      quote: '嘿嘿，要跟上来哦？',
      desc: '空战的妖精骑士，高速突刺；濒死时解放龙之力。',
      killTexts: ['太慢了～', '龙之翼！', ' shine out！'],
    },
    barghest: {
      id: 'barghest', style: 'card', from: 'FGO2.6', src: '妖精骑士高文',
      name: '巴格斯特', cls: 'saber',
      cost: 700, pop: 1,
      hp: 380, dmg: 26, atkCd: 0.9, range: 38, speed: 40,
      atkType: 'melee',
      rarity: 4,
      passive: { name: '饥渴的戒律', key: 'lifesteal', desc: '攻击吸血：造成伤害的 30% 转化为自身 HP' },
      quote: '吾之剑，即是正义。',
      desc: '重装的妖精骑士，攻击吸血，越战越勇。',
      killTexts: ['正义执行。', '饱腹了。', '吾名高文。'],
    },
    baobhan: {
      id: 'baobhan', style: 'card', from: 'FGO2.6', src: '妖精骑士崔斯坦',
      name: '芭班希', cls: 'archer',
      cost: 800, pop: 1,
      hp: 200, dmg: 20, atkCd: 0.75, range: 205, speed: 38,
      atkType: 'gun', proj: { kind: 'spark', speed: 540 },
      rarity: 4,
      passive: { name: '血溅的诅咒', key: 'bleed', desc: '攻击附加流血：3 秒内持续掉血' },
      quote: '呜呜…会疼哦？',
      desc: '妖精骑士崔斯坦，诅咒之箭让敌人血流不止。',
      killTexts: ['对不起嘛～', '血之咒。', '呜哇啊！'],
    },
    oberon: {
      id: 'oberon', style: 'card', from: 'FGO2.6', src: '白日梦之蛾',
      name: '奥伯龙', cls: 'caster',
      cost: 1300, pop: 1,
      hp: 240, dmg: 22, atkCd: 1.2, range: 215, speed: 34,
      atkType: 'cast', proj: { kind: 'spark', speed: 520 },
      rarity: 5,
      passive: { name: '午夜的蛾', key: 'aura', desc: '梦之领域：周围敌人的伤害 -20%', aura: { enemyDmg: 0.2, range: 150 } },
      quote: '做个美梦吧，僵尸小姐。',
      desc: '不列颠的救世主（自称），削弱周围一切敌人。',
      killTexts: ['晚安。', '梦里见。', '结束了吗？'],
    },
    habetrot: {
      id: 'habetrot', style: 'card', from: 'FGO2.6', src: '纺车的妖精',
      name: '哈贝特洛特', cls: 'caster',
      cost: 600, pop: 1,
      hp: 180, dmg: 14, atkCd: 1.3, range: 190, speed: 28,
      atkType: 'cast', proj: { kind: 'spark', speed: 460 },
      rarity: 4,
      passive: { name: '纺线的祝福', key: 'aura', desc: '祝福之线：周围我方攻速 +18%', aura: { allySpd: 0.18, range: 140 } },
      quote: '线儿线儿快快纺～',
      desc: '小小的纺车妖精，用祝福之线加速周围的伙伴。',
      killTexts: ['纺好了！', '赠给你的。', '祝福之线！'],
    },

    /* ---------- 其他 FGO 美少女英灵 ---------- */
    artoria: {
      id: 'artoria', style: 'card', from: 'FGO', src: '阿尔托莉雅·潘德拉贡',
      name: '阿尔托莉雅', cls: 'saber',
      cost: 1400, pop: 2,
      hp: 520, dmg: 34, atkCd: 1.0, range: 40, speed: 34,
      atkType: 'melee',
      rarity: 5,
      passive: { name: '誓约胜利之剑', key: 'beam5', desc: '每第 5 次攻击释放光之炮：范围伤害 ×2.2' },
      quote: '问答无用——上吧，Excalibur！',
      desc: '骑士王驾到，每五剑一发光炮清场。',
      killTexts: ['Excalibur！', '问答无用！', '骑士王之威！'],
    },
    nero: {
      id: 'nero', style: 'card', from: 'FGO', src: '尼禄·克劳狄乌斯',
      name: '尼禄', cls: 'saber',
      cost: 750, pop: 1,
      hp: 330, dmg: 24, atkCd: 0.85, range: 38, speed: 40,
      atkType: 'melee',
      rarity: 4,
      passive: { name: '皇帝特权', key: 'revive', desc: '濒死时原地复活一次（恢复 50% HP）' },
      quote: '余的登场，献上掌声吧！',
      desc: '原初之炎的皇帝，即使倒下也会再度谢幕返场。',
      killTexts: [' too naive！', '蔷薇的皇帝！', '安可安可！'],
    },
    mashu: {
      id: 'mashu', style: 'card', from: 'FGO', src: '玛修·基列莱特',
      name: '玛修', cls: 'saber',
      cost: 500, pop: 1,
      hp: 650, dmg: 16, atkCd: 1.1, range: 36, speed: 30,
      atkType: 'melee',
      rarity: 4,
      passive: { name: '疑似灵基·Lord Camelot', key: 'aura', desc: '巨大的盾：周围我方受到伤害 -15%', aura: { allyDef: 0.15, range: 140 } },
      quote: '前辈，这里由我来守住！',
      desc: '举着巨大盾牌的后辈，站在哪里，哪里就是防线。',
      killTexts: ['顶住了！', '这里交给我！', '前辈先撤！'],
    },
    tamamo: {
      id: 'tamamo', style: 'card', from: 'FGO', src: '玉藻前',
      name: '玉藻前', cls: 'caster',
      cost: 900, pop: 1,
      hp: 210, dmg: 20, atkCd: 1.0, range: 200, speed: 34,
      atkType: 'cast', proj: { kind: 'spark', speed: 480 },
      rarity: 5,
      passive: { name: '狐嫁女', key: 'income', desc: '在场上时，金币收入 +30%' },
      quote: '旺旺～为了御主人加油♪',
      desc: '贤妻良母的狐狸，在阵地上也能搞活经济。',
      killTexts: ['旺旺！', '家务万能！', '为了御主人家！'],
    },
    skadi: {
      id: 'skadi', style: 'card', from: 'FGO', src: '斯卡哈·斯卡蒂',
      name: '斯卡蒂', cls: 'caster',
      cost: 1000, pop: 1,
      hp: 220, dmg: 22, atkCd: 0.95, range: 205, speed: 32,
      atkType: 'cast', proj: { kind: 'spark', speed: 500 },
      rarity: 5,
      passive: { name: '绝对魔权·永冻', key: 'aura', desc: '冰之领土：周围敌人移速 -22%', aura: { enemySlow: 0.22, range: 150 } },
      quote: '御寒准备，可做好了？',
      desc: '统御冻土的大女王，让周围的僵尸娘举步维艰。',
      killTexts: ['冻住啦。', '冰原律令。', '慢慢来吧。'],
    },
    ishtar: {
      id: 'ishtar', style: 'sprite', from: 'FGO', src: '伊什塔尔',
      name: '伊什塔尔', cls: 'archer',
      cost: 950, pop: 1,
      hp: 230, dmg: 24, atkCd: 0.8, range: 210, speed: 40,
      atkType: 'gun', proj: { kind: 'spark', speed: 560 },
      rarity: 5,
      passive: { name: '天之财富', key: 'splash', desc: '攻击溅射：命中点周围敌人受到 70% 伤害' },
      quote: '女神的账单，可要付清哦！',
      desc: '美索不达米亚的女神，每一箭都带着金星的钱包光辉。',
      killTexts: ['Sakott！', '安努之罚！', '女神的账单！'],
    },
    scathach: {
      id: 'scathach', style: 'sprite', from: 'FGO', src: '斯卡哈',
      name: '斯卡哈', cls: 'lancer',
      cost: 1000, pop: 1,
      hp: 300, dmg: 24, atkCd: 0.6, range: 42, speed: 55,
      atkType: 'melee',
      rarity: 5,
      passive: { name: '贯穿死棘之枪', key: 'crit', desc: '25% 概率造成 2 倍暴击' },
      quote: '做好了赴死的觉悟吗？',
      desc: '异境之魔女，枪枪皆可直取要害。',
      killTexts: ['死棘！', '太慢了。', '修行不足。'],
    },
    ereshkigal: {
      id: 'ereshkigal', style: 'card', from: 'FGO', src: '埃列什基伽勒',
      name: '埃列什基伽勒', cls: 'lancer',
      cost: 850, pop: 1,
      hp: 250, dmg: 22, atkCd: 0.9, range: 200, speed: 36,
      atkType: 'gun', proj: { kind: 'spark', speed: 520 },
      rarity: 5,
      passive: { name: '冥界女神的宠爱', key: 'energy', desc: '在场上时，我方击杀获得的能量 +20%' },
      quote: '才、才不是为了你才帮忙的！',
      desc: '害羞的冥界女王，把亡者的能量偷偷分给大家。',
      killTexts: ['去冥界吧！', 'Meli Melo！', '笨、笨蛋！'],
    },
    jeanne_alter: {
      id: 'jeanne_alter', style: 'card', from: 'FGO', src: '贞德〔Alter〕',
      name: '黑贞德', cls: 'berserker',
      cost: 1200, pop: 2,
      hp: 480, dmg: 34, atkCd: 1.15, range: 44, speed: 30, knock: 20,
      atkType: 'melee',
      rarity: 5,
      passive: { name: '复仇的焰火', key: 'killstack', desc: '每次击杀攻击力 +4%（最多 +60%）' },
      quote: '哼，复仇的火，越烧越旺。',
      desc: '复仇的魔女，杀得越多，火越旺。',
      killTexts: ['烧光你们！', '复仇！', 'La Grondement！'],
    },
    shuten: {
      id: 'shuten', style: 'card', from: 'FGO', src: '酒吞童子',
      name: '酒吞童子', cls: 'assassin',
      cost: 900, pop: 1,
      hp: 280, dmg: 26, atkCd: 0.7, range: 38, speed: 44,
      atkType: 'melee',
      rarity: 5,
      passive: { name: '鬼种之毒', key: 'poison', desc: '攻击附加毒素：持续掉血并减速 2 秒' },
      quote: '呵…有趣的孩子呢。',
      desc: '大江山的鬼王，指尖的毒让敌人慢慢烂掉。',
      killTexts: ['毒已入骨。', '醉了么？', '乖乖睡吧。'],
    },
    raikou: {
      id: 'raikou', style: 'card', from: 'FGO', src: '源赖光',
      name: '源赖光', cls: 'berserker',
      cost: 1150, pop: 2,
      hp: 470, dmg: 30, atkCd: 0.95, range: 44, speed: 32,
      atkType: 'melee',
      rarity: 5,
      passive: { name: '魔力放出·雷', key: 'chain', desc: '攻击沿闪电链跳至 2 名额外敌人（60% 伤害）' },
      quote: '妈妈来看你了哦☆',
      desc: '赖光四天王的雷，一人挨打，全家遭殃。',
      killTexts: ['雷鸣！', '不肖之徒！', '妈妈来了☆'],
    },
    kiyohime: {
      id: 'kiyohime', style: 'sprite', from: 'FGO', src: '清姬',
      name: '清姬', cls: 'berserker',
      cost: 400, pop: 1,
      hp: 260, dmg: 20, atkCd: 0.8, range: 36, speed: 38,
      atkType: 'melee',
      rarity: 3,
      passive: { name: '火炎执念', key: 'burn', desc: '攻击点燃目标，3 秒内持续掉血' },
      quote: '安珍先生～在哪里呢～？',
      desc: '为了爱可以烧掉一切，字面意义上的。',
      killTexts: ['烧尽！', '爱之炎！', '找到你了♪'],
    },
    mhx: {
      id: 'mhx', style: 'card', from: 'FGO', src: '谜之女主角X',
      name: '谜之女主角X', cls: 'assassin',
      cost: 800, pop: 1,
      hp: 220, dmg: 23, atkCd: 0.65, range: 195, speed: 46,
      atkType: 'gun', proj: { kind: 'spark', speed: 580 },
      rarity: 4,
      passive: { name: '对剑士特攻', key: 'saberslayer', desc: '对【剑士】职业的伤害 ×2.5' },
      quote: 'Saber 猎手，参上！',
      desc: '来自卫星的谜之剑士猎人，见了剑士就走不动路。',
      killTexts: ['Saber 呢！', '正义的伙伴！', '卫星信号良好！'],
    },
    ushiwakamaru: {
      id: 'ushiwakamaru', style: 'sprite', from: 'FGO', src: '牛若丸',
      name: '牛若丸', cls: 'rider',
      cost: 450, pop: 1,
      hp: 220, dmg: 17, atkCd: 0.5, range: 36, speed: 60,
      atkType: 'melee',
      rarity: 3,
      passive: { name: '八艘跳', key: 'flurry', desc: '自身攻速 +25%、移速 +20%' },
      quote: '八艘跳び，看好了！',
      desc: '源氏的武者，轻快地在僵尸娘之间跳跃斩击。',
      killTexts: ['一之太刀！', '八艘跳！', '武运昌隆！'],
    },

    /* ---------- 萌娘百科新成员 ---------- */
    reimu: {
      id: 'reimu', style: 'card', from: '萌娘百科', src: '东方Project',
      name: '博丽灵梦', cls: 'archer',
      cost: 550, pop: 1,
      hp: 200, dmg: 18, atkCd: 0.7, range: 200, speed: 42,
      atkType: 'gun', proj: { kind: 'spark', speed: 520 },
      rarity: 3,
      passive: { name: '梦想天生', key: 'dodge', desc: '30% 概率闪避一切攻击' },
      quote: '异端退散！赛钱先付～',
      desc: '博丽神社的巫女，看似懒散，实则谁也打不中她。',
      killTexts: ['梦想封印！', '赛钱赛钱！', '异变退散！'],
    },
    sakuya: {
      id: 'sakuya', style: 'card', from: '萌娘百科', src: '东方Project',
      name: '十六夜咲夜', cls: 'assassin',
      cost: 650, pop: 1,
      hp: 230, dmg: 13, atkCd: 0.45, range: 34, speed: 52,
      atkType: 'melee',
      rarity: 3,
      passive: { name: '时间停止', key: 'flurry2', desc: '时停补刀：自身攻击间隔 -30%' },
      quote: '时间，暂停哦。',
      desc: '完美潇洒的女仆，在静止的时间里插了满地的刀。',
      killTexts: ['时停！', '完美潇洒～', '刀雨。'],
    },
    shana: {
      id: 'shana', style: 'card', from: '萌娘百科', src: '灼眼的夏娜',
      name: '夏娜', cls: 'saber',
      cost: 700, pop: 1,
      hp: 280, dmg: 23, atkCd: 0.6, range: 38, speed: 48,
      atkType: 'melee',
      rarity: 3,
      passive: { name: '火雾战士', key: 'firesplash', desc: '攻击火焰溅射：周围敌人受 60% 伤害并短燃' },
      quote: '无路赛无路赛无路赛！',
      desc: '讨伐者的刀，斩击带着讨灭之火四散。',
      killTexts: ['讨灭！', '无路赛！', '零时迷子！'],
    },
    rem: {
      id: 'rem', style: 'sprite', from: '萌娘百科', src: 'Re:从零开始的异世界生活',
      name: '蕾姆', cls: 'berserker',
      cost: 600, pop: 1,
      hp: 300, dmg: 22, atkCd: 0.9, range: 38, speed: 40,
      atkType: 'melee',
      rarity: 3,
      passive: { name: '鬼族的角', key: 'lowhp', desc: 'HP 低于 50% 时攻击力 +60%' },
      quote: '蕾姆，从恶魔变成只忠于你的人。',
      desc: '蓝发的鬼族女仆，流星锤下不留活口。',
      killTexts: ['流星锤！', '为了重要的人。', '鬼族之力！'],
    },
    asuna: {
      id: 'asuna', style: 'card', from: '萌娘百科', src: '刀剑神域',
      name: '亚丝娜', cls: 'saber',
      cost: 550, pop: 1,
      hp: 240, dmg: 17, atkCd: 0.5, range: 36, speed: 50,
      atkType: 'melee',
      rarity: 3,
      passive: { name: '闪光', key: 'crit2', desc: '20% 概率造成 1.8 倍暴击' },
      quote: 'SAO 里练出来的剑，接好！',
      desc: '闪电般的细剑，快得只剩残光。',
      killTexts: ['闪光！', 'Linear！', '连击！'],
    },
    chtholly: {
      id: 'chtholly', style: 'sprite', from: '萌娘百科', src: '末日时在做什么',
      name: '珂朵莉', cls: 'lancer',
      cost: 650, pop: 1,
      hp: 260, dmg: 22, atkCd: 0.7, range: 38, speed: 44,
      atkType: 'melee',
      rarity: 3,
      passive: { name: '黄金妖精', key: 'sacrifice', desc: '阵亡时妖精化自爆：大范围圣光伤害' },
      quote: '至少…要成为对大家有用的妖精兵。',
      desc: '妖精兵的剑，以及最后一刻绽放的光。',
      killTexts: ['圣剑！', '还不行…！', '黄金妖精！'],
    },
    shiro: {
      id: 'shiro', style: 'sprite', from: '萌娘百科', src: 'NO GAME NO LIFE 游戏人生',
      name: '白', cls: 'caster',
      cost: 700, pop: 1,
      hp: 170, dmg: 16, atkCd: 0.9, range: 210, speed: 30,
      atkType: 'cast', proj: { kind: 'spark', speed: 500 },
      rarity: 3,
      passive: { name: '「　空白」', key: 'aura', desc: '所有计算完成：周围我方射程 +15%', aura: { allyRange: 0.15, range: 180 } },
      quote: '……哥哥说，赢。',
      desc: '不做任何计算之外的事，包括瞄准。',
      killTexts: ['【　】', '计算完毕。', '必胜。'],
    },
    kurumi: {
      id: 'kurumi', style: 'sprite', from: '萌娘百科', src: '约会大作战',
      name: '时崎狂三', cls: 'assassin',
      cost: 950, pop: 1,
      hp: 260, dmg: 21, atkCd: 0.55, range: 170, speed: 46,
      atkType: 'gun', proj: { kind: 'musket', speed: 560 },
      rarity: 4,
      passive: { name: '刻刻帝·分身', key: 'clone', desc: '每 8 秒召唤一个分身（40% 属性，至多 2 个）' },
      quote: '呵呵，我的「时间」可多得是哦。',
      desc: '梦魇的精灵，枪声响起时，四周都是她。',
      killTexts: ['呵呵♪', '时间到了。', '分身们，上！'],
    },
  };

  const ROSTER_ORDER = [
    'taiga', 'mikoto', 'suika', 'brs', 'marisa',
    'morgan', 'artcaster', 'melusine', 'barghest', 'baobhan', 'oberon', 'habetrot',
    'artoria', 'nero', 'mashu', 'tamamo', 'skadi', 'ishtar', 'scathach', 'ereshkigal',
    'jeanne_alter', 'shuten', 'raikou', 'kiyohime', 'mhx', 'ushiwakamaru',
    'reimu', 'sakuya', 'shana', 'rem', 'asuna', 'chtholly', 'shiro', 'kurumi',
  ];

  /* 默认编队（第 6 位为助战位） */
  const DEFAULT_TEAM = ['taiga', 'mikoto', 'suika', 'brs', 'marisa', 'artcaster'];
  const TEAM_SIZE = 6;

  /* ================= 建筑（回归原版：经济 + 解锁兵种） =================
   * unlockSlot: 建成后解锁编队第 N+1 号位成员（1号位开局直接可用） */
  const BUILDINGS = {
    trailer:  { id: 'trailer',  name: '加兵数', cost: 250, max: 4, costStep: 1.5, effect: '+5 出兵上限', about: '多一台房车，多五张嘴吃饭。' },
    yard:     { id: 'yard',     name: '加钱厂', cost: 500, max: 4, costStep: 1.55, effect: '每秒 +$10', about: '废品回收厂，经济的根基。' },
    tent:     { id: 'tent',     name: '兵营', cost: 600, max: 1, costStep: 1.0, unlockSlot: 1, effect: '解锁 2号位成员', about: 'canvas 一围就是家，先头部队的营地。' },
    workshop: { id: 'workshop', name: '工房', cost: 900, max: 1, costStep: 1.0, unlockSlot: 2, effect: '解锁 3号位成员', about: '叮叮当当，武装到牙齿。' },
    academy:  { id: 'academy',  name: '魔导院', cost: 1300, max: 1, costStep: 1.0, unlockSlot: 3, effect: '解锁 4号位成员', about: '术与魔药的讲堂，学费昂贵但值得。' },
    circle:   { id: 'circle',   name: '召唤阵', cost: 1800, max: 1, costStep: 1.0, unlockSlot: 4, effect: '解锁 5号位成员', about: '地上的魔法阵微微发光……' },
    altar:    { id: 'altar',    name: '圣杯祭坛', cost: 2400, max: 1, costStep: 1.0, unlockSlot: 5, effect: '解锁助战位(6号位·6折)', about: '愿望机座的残响，助战英灵由此降临。' },
  };
  const BUILDING_ORDER = ['trailer', 'yard', 'tent', 'workshop', 'academy', 'circle', 'altar'];

  /* ================= 超级召唤 / 宝具（能量点） ================= */
  const SUPERS = {
    airstrike: {
      id: 'airstrike', cost: 3000, name: '麻美学姐', sub: 'Tiro Volley · 空降支援',
      desc: '召唤巴麻美空降战场：燧发枪连射弹雨覆盖僵尸半场（麻美限时驻场 14 秒）。',
    },
    mob: {
      id: 'mob', cost: 4000, name: '应援团暴动', sub: 'Angry Mob',
      desc: '六位愤怒的应援团大河杀到（限时 25 秒特殊兵种），全队短暂狂热化！',
    },
    concert: {
      id: 'concert', cost: 5000, name: '初音演唱会', sub: 'Hoedown 39',
      desc: '393939！初音本人登台应援（限时 16 秒，歌声加速周围友军），彩虹激光扫过全场。',
    },
    excalibur: {
      id: 'excalibur', cost: 7000, name: '誓约胜利之剑', sub: 'EX—CALIBUR！！',
      desc: '集结编队的力量解放最强宝具：光柱反复灼烧敌方半场。',
    },
  };
  const SUPER_ORDER = ['airstrike', 'mob', 'concert', 'excalibur'];

  /* ================= 特殊兵种（超级召唤召唤物，不占编队/人口，限时存在） =================
   * lifeT: 存在秒数，到时自动退场 */
  const SPECIALS = {
    mami_super: {
      id: 'mami_super', name: '巴麻美', role: '空降火力支援', style: 'card', img: 'mami', cls: 'caster', pop: 0,
      hp: 200, dmg: 22, atkCd: 0.5, range: 240, speed: 18,
      atkType: 'gun', proj: { kind: 'musket', speed: 640 },
      lifeT: 14, rarity: 5,
      quote: '已经没有什么好怕的了',
      desc: '空降战场的魔法少女，燧发枪连射覆盖全场。',
    },
    mob_taiga: {
      id: 'mob_taiga', name: '应援团·大河', role: '愤怒应援团', style: 'sprite', img: 'taiga', cls: 'saber', pop: 0,
      hp: 150, dmg: 19, atkCd: 0.55, range: 34, speed: 62,
      atkType: 'melee', knock: 14,
      lifeT: 25, rarity: 1,
      quote: '大河应援团，全员突击！',
      desc: '举着应援棒的狂热团员，眼冒红光见谁敲谁。',
    },
    miku_super: {
      id: 'miku_super', name: '初音未来', role: '应援歌姬', style: 'sprite', img: 'miku', cls: 'caster', pop: 0,
      hp: 260, dmg: 18, atkCd: 0.45, range: 210, speed: 30,
      atkType: 'gun', proj: { kind: 'note', speed: 460 },
      aura: { allySpd: 0.2, range: 160 },
      lifeT: 16, rarity: 5,
      quote: '3939！一起上吧☆',
      desc: '随演唱会降临的歌姬，歌声加速周围友军，音符弹自动追踪。',
    },
  };
  const SPECIAL_ORDER = ['mami_super', 'mob_taiga', 'miku_super'];

  /* ================= 敌方僵尸娘 ================= */
  const ENEMIES = {
    shambler: {
      id: 'shambler', name: '宫古芳香', role: '摇摆僵尸', style: 'sprite', img: 'yoshika', cls: 'saber',
      hp: 85, dmg: 12, atkCd: 0.9, range: 30, speed: 26,
      energy: 140, bounty: 14,
    },
    runner: {
      id: 'runner', name: '散华礼弥', role: '疾走僵尸', style: 'sprite', img: 'rea', cls: 'rider',
      hp: 66, dmg: 10, atkCd: 0.55, range: 30, speed: 80,
      energy: 230, bounty: 22,
    },
    fatso: {
      id: 'fatso', name: '幽幽子', role: '大胃亡灵', style: 'card', img: 'yuyuko', cls: 'lancer',
      hp: 440, dmg: 36, atkCd: 1.3, range: 34, speed: 18, knock: 26,
      energy: 750, bounty: 60,
    },
    catapult: {
      id: 'catapult', name: '芙兰朵露', role: '破坏公主炮', style: 'sprite', img: 'flandre', cls: 'berserker',
      hp: 310, dmg: 32, atkCd: 2.6, range: 250, speed: 15,
      proj: { kind: 'gib', speed: 260, aoe: 62 },
      energy: 950, bounty: 80,
    },
    patchouli: {
      id: 'patchouli', name: '帕秋莉', role: '魔导书僵尸', style: 'card', img: 'patchouli', cls: 'caster',
      hp: 180, dmg: 15, atkCd: 1.7, range: 220, speed: 20,
      atkType: 'cast', proj: { kind: 'spark', speed: 380 },
      energy: 650, bounty: 50,
    },
    cirno: {
      id: 'cirno', name: '琪露诺', role: '冰精僵尸', style: 'card', img: 'cirno', cls: 'archer',
      hp: 130, dmg: 14, atkCd: 1.1, range: 200, speed: 30,
      atkType: 'gun', proj: { kind: 'spark', speed: 420, chill: true },
      energy: 420, bounty: 36,
    },
    queen: {
      id: 'queen', name: '噩梦新娘·狂三', role: 'BOSS', style: 'sprite', img: 'kurumi', cls: 'assassin',
      hp: 5400, dmg: 64, atkCd: 2.1, range: 46, speed: 16, knock: 40, aoe: 95,
      summon: { id: 'shambler', every: 6.5 },
      energy: 3000, bounty: 900, boss: true,
    },
    morgan_zombie: {
      id: 'morgan_zombie', name: '僵尸妖精王·摩根', role: 'BOSS', style: 'card', img: 'morgan', cls: 'berserker',
      hp: 8200, dmg: 58, atkCd: 1.6, range: 50, speed: 20, knock: 46, aoe: 70,
      summon: { id: 'runner', every: 7 },
      aura: { allyAtk: 0.2, range: 160 },
      energy: 4200, bounty: 1500, boss: true,
    },
    oberon_boss: {
      id: 'oberon_boss', name: '堕落妖精王·奥伯龙', role: 'FINAL BOSS', style: 'card', img: 'oberon_boss', cls: 'caster',
      hp: 12000, dmg: 50, atkCd: 2.4, range: 240, speed: 18,
      atkType: 'cast', proj: { kind: 'void', speed: 420, aoe: 80 },
      summon: { id: 'cirno', every: 8 },
      aura: { enemySlow: 0.18, range: 200 },
      energy: 6000, bounty: 2500, boss: true,
    },
  };
  const ENEMY_ORDER = ['shambler', 'runner', 'fatso', 'catapult', 'patchouli', 'cirno', 'queen', 'morgan_zombie', 'oberon_boss'];

  /* ================= 关卡 ================= */
  const LEVELS = [
    {
      id: 1, name: 'Early to Dead, Early to Rise', cn: '早起的芳香有脑吃',
      baseHP: 2600,
      spawn: { start: 5.0, interval: [3.4, 1.7], ramp: 150, budget: 6 },
      waves: [{ t: 40, types: { shambler: 5 } }, { t: 95, types: { shambler: 7 } }],
      types: [['shambler', 1]],
      intro: '芳香在坟场睡醒了，摇摇晃晃地从城市那边走来…',
    },
    {
      id: 2, name: 'A Kick in the Dead', cn: '死亡飞踢',
      baseHP: 3800,
      spawn: { start: 4.0, interval: [2.9, 1.45], ramp: 140, budget: 8 },
      waves: [{ t: 35, types: { runner: 4 } }, { t: 90, types: { shambler: 5, runner: 4 } }],
      types: [['shambler', 0.62], ['runner', 0.38]],
      intro: '礼弥睡过头了，所以她跑得特别快。注意她是【骑】阶！',
    },
    {
      id: 3, name: 'Nothing Ventured, Nothing Brained', cn: '不入虎穴，焉得脑子',
      baseHP: 5200,
      spawn: { start: 3.5, interval: [2.6, 1.25], ramp: 135, budget: 10 },
      waves: [{ t: 35, types: { fatso: 2 } }, { t: 80, types: { fatso: 2, runner: 5 } }, { t: 115, types: { patchouli: 2 } }],
      types: [['shambler', 0.4], ['runner', 0.28], ['fatso', 0.2], ['patchouli', 0.12]],
      intro: '幽幽子大人闻着饭菜香登场；帕秋莉在后排念咒，别硬扛。',
    },
    {
      id: 4, name: 'Trash Talks, Dead Walks', cn: '垃圾话与行尸走肉',
      baseHP: 7000,
      spawn: { start: 3.0, interval: [2.3, 1.1], ramp: 130, budget: 12 },
      waves: [{ t: 30, types: { catapult: 1 } }, { t: 70, types: { fatso: 2, runner: 6 } }, { t: 110, types: { catapult: 1, fatso: 2, cirno: 2 } }],
      types: [['shambler', 0.3], ['runner', 0.26], ['fatso', 0.2], ['catapult', 0.13], ['cirno', 0.11]],
      boss: { t: 150, id: 'queen' },
      intro: '传闻噩梦新娘踩着钟声压轴登场……琪露诺的冰箭会冻慢你们！',
    },
    {
      id: 5, name: 'Avalon le Fae', cn: '妖精圆桌领域',
      baseHP: 9000,
      tint: 'rgba(110,220,170,.10)',
      spawn: { start: 2.8, interval: [2.2, 1.0], ramp: 120, budget: 13 },
      waves: [
        { t: 35, types: { patchouli: 2, shambler: 6 } },
        { t: 80, types: { cirno: 2, runner: 5 } },
        { t: 120, types: { fatso: 2, catapult: 1, patchouli: 2 } },
      ],
      types: [['shambler', 0.24], ['runner', 0.2], ['fatso', 0.16], ['catapult', 0.12], ['patchouli', 0.15], ['cirno', 0.13]],
      boss: { t: 155, id: 'morgan_zombie' },
      intro: '僵尸化的妖精王坐上了圆桌——她的光环会强化所有僵尸娘！',
    },
    {
      id: 6, name: 'The Dead Fairy Kingdom', cn: '堕落妖精乡',
      baseHP: 11800,
      tint: 'rgba(150,110,230,.13)',
      spawn: { start: 2.4, interval: [2.0, 0.9], ramp: 110, budget: 15 },
      waves: [
        { t: 30, types: { patchouli: 2, cirno: 2 } },
        { t: 70, types: { catapult: 1, fatso: 2, runner: 6 } },
        { t: 110, types: { patchouli: 2, cirno: 2, fatso: 2 } },
        { t: 145, types: { catapult: 2, patchouli: 2 } },
      ],
      types: [['shambler', 0.2], ['runner', 0.2], ['fatso', 0.16], ['catapult', 0.14], ['patchouli', 0.16], ['cirno', 0.14]],
      boss: { t: 170, id: 'oberon_boss' },
      intro: '白日梦的尽头，堕落的妖精王在等着。这是最后的战斗——编好队，上！',
    },
  ];

  /* ================= 全局常量 ================= */
  const CONST = {
    W: 960, H: 540,
    GROUND_TOP: 398, GROUND_BOT: 470,
    PLAYER_BASE_X: 92, ZOMBIE_BASE_X: 868,
    SPAWN_PLAYER_X: 70, SPAWN_ZOMBIE_X: 890,
    START_MONEY: 550,
    BASE_INCOME: 8,
    YARD_INCOME: 10,
    PLAYER_BASE_HP: 3000,
    CONVERT_LIMIT: 3,
    TEAM_SIZE: 6,
    SUPPORT_COST: 0.6,      // 助战位（第6位）部署费用倍率
    AURA_DY: 90,            // 光环纵向判定
  };

  const HINTS = [
    '提示：先看职业！【剑】克【枪】，【枪】克【弓】，【弓】克【剑】；【狂】阶输出高但挨打也疼。',
    '提示：编队第 6 位是助战位，部署费用只要 6 折。',
    '提示：开局只有 1号位成员能部署——造「兵营/工房/魔导院/召唤阵/圣杯祭坛」依次解锁 2~6 号位！',
    '提示：尽早多造「加钱厂」滚雪球，「加兵数」把出兵上限从 5 一路抬到 25。',
    '提示：摩根/玛修/哈贝特洛特/奥伯龙/斯卡蒂/白都有团队光环，站位聚拢收益更大。',
    '提示：能量点靠击杀积累，3000 放麻美空降、7000 放「誓约胜利之剑」清场！',
    '提示：初音演唱会会召唤初音本人登台——她的歌声能加速周围友军。',
    '提示：尼禄阵亡后会复活一次，大胆让她去顶线。',
  ];

  return {
    CLASSES, CLASS_ORDER,
    ROSTER, ROSTER_ORDER, DEFAULT_TEAM, TEAM_SIZE,
    BUILDINGS, BUILDING_ORDER, SUPERS, SUPER_ORDER, SPECIALS, SPECIAL_ORDER,
    ENEMIES, ENEMY_ORDER, LEVELS, CONST, HINTS,
  };
})();
