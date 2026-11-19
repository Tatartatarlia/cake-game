// ============================================================
// 烤蛋糕小店 - 游戏核心逻辑
// 状态：时间推进(TICK) + 玩家操作(点击)
// 所有核心参数（概率 / 加分 / 时限）都集中在下方常量区，方便自行调整
// ============================================================

// ---------- 基础时长 ----------
export const GAME_DURATION = 60        // 一局秒数
export const BAKE_TIME = 5             // 蛋糕胚烘烤秒数
export const READY_WINDOW = 8          // 烤好后取出窗口秒数（超时变糊）
export const ICE_CREAM_TIME = 4        // 冰激凌制作秒数
export const TICK_SEC = 0.1            // 逻辑 tick 步长（秒）
export const NEW_ORDER_INTERVAL = 7    // 新订单生成间隔（秒）
export const CUSTOMER_DURATION = 3.2   // 顾客探头时长（秒）

// ---------- 订单上限 ----------
export const EARLY_PHASE = 20          // “前20秒”的时长（秒）
export const MAX_ORDERS_EARLY = 2      // 前20秒内同时最多订单数
export const MAX_ORDERS_LATE = 3       // 20秒后同时最多订单数

// ---------- 订单时限 ----------
export const ORDER_TIME_MIN = 15       // 订单最短时限（秒）
export const ORDER_TIME_MAX = 40       // 订单最长时限（秒）

// ---------- 得分规则 ----------
export const SCORE_NORMAL = 10         // 常规订单得分
export const SCORE_FAST = 15           // 时限过半前完成（快速）得分
export const FAST_RATIO = 0.5          // “半程”判定比例：完成时剩余时限 > total * FAST_RATIO 视为快速
export const SCORE_URGENT = 25         // 急单得分
export const SCORE_TIMEOUT_PENALTY = 5 // 常规订单超时扣分（急单超时不扣分）
export const BLIND_CHANCE = 0.15        // 盲盒订单出现概率
export const BLIND_SCORE_MIN = 5       // 盲盒订单最低得分
export const BLIND_SCORE_MAX = 20      // 盲盒订单最高得分

// ---------- 随机事件概率 ----------
export const FAST_BAKE_CHANCE = 0.15   // 烤箱触发“加速烘烤”的概率
export const URGENT_BASE_CHANCE = 0.1  // 急单基础概率（生成新订单时判定，不转化已有订单）
export const URGENT_LATE_BONUS = 0.2   // 后期概率加成：最终概率 = 基础 + 游戏进度 × 加成
export const ICM_STUCK_CHANCE = 0.1    // 冰激凌机卡壳概率（制作完成时判定）
export const CAT_CHANCE = 0.3         // 猫出现概率（每次检查时判定）
export const CAT_CHANCE_MIN = 0.05    // 猫出现概率下限，必须大于 0
export const CAT_CHECK_INTERVAL = 3    // 猫出现检查间隔（秒）
export const CAT_DURATION = 3          // 猫徘徊时长（秒），到点偷走蛋糕
export const ICE_CREAM_NEED_CHANCE = 0.2 // 订单中单个需求是冰激凌的概率

// ---------- 连击小费 ----------
// 交付时连击达到 2 起加分：2连+3、3连+6、4连+9、5连及以上 +12
// 只有订单超时会把连击清零
export const COMBO_TIP_STEP = 3
export const COMBO_TIP_CAP = 12
export const COMBO_TIP_STEP_UPGRADED = 5
export const COMBO_TIP_CAP_UPGRADED = 20

// ---------- 经营模式租金 ----------
// 无升级时大约撑过前几晚；会攒小费、会买装备的能再往下走
export const RENT_BASE = 50
export const RENT_STEP = 30

export const RECORD_KEY = 'cake-shop-records'
export const BUSINESS_SAVE_KEY = 'cake-shop-business-save'

// 无限供应的材料
export const INGREDIENTS = [
  { id: 'batter', name: '蛋糕胚', hint: '放进烘烤机烘烤' },
  { id: 'cream', name: '奶油', hint: '围出底部花边' },
  { id: 'chocolate', name: '巧克力酱', hint: '覆盖蛋糕顶部' },
  { id: 'strawberry', name: '草莓', hint: '放蛋糕顶部中央' },
  { id: 'mango', name: '芒果', hint: '放蛋糕顶部中央' },
]

// 所有可能的蛋糕样式（订单需求从其中随机）
export const CAKE_STYLES = [
  { name: '原味蛋糕', toppings: {} },
  { name: '奶油蛋糕', toppings: { cream: true } },
  { name: '巧克力蛋糕', toppings: { chocolate: true } },
  { name: '巧克力奶油蛋糕', toppings: { chocolate: true, cream: true } },
  { name: '草莓蛋糕', toppings: { strawberry: true } },
  { name: '芒果蛋糕', toppings: { mango: true } },
  { name: '草莓芒果蛋糕', toppings: { strawberry: true, mango: true } },
  { name: '奶油草莓蛋糕', toppings: { cream: true, strawberry: true } },
  { name: '奶油芒果蛋糕', toppings: { cream: true, mango: true } },
  { name: '奶油草莓芒果蛋糕', toppings: { cream: true, strawberry: true, mango: true } },
]

export function styleName(toppings = {}) {
  const parts = []
  if (toppings.strawberry && toppings.mango) parts.push('草莓芒果')
  else if (toppings.strawberry) parts.push('草莓')
  else if (toppings.mango) parts.push('芒果')
  if (toppings.chocolate) parts.push('巧克力')
  if (toppings.cream) parts.push('奶油')
  return parts.length ? parts.join('') + '蛋糕' : '原味蛋糕'
}

export function needName(need) {
  if (need.type === 'any') return '❓ 盲盒'
  return need.type === 'icecream' ? '冰激凌' : styleName(need.toppings)
}

function sameToppings(a = {}, b = {}) {
  return !!a.strawberry === !!b.strawberry &&
         !!a.mango === !!b.mango &&
         !!a.chocolate === !!b.chocolate &&
         !!a.cream === !!b.cream
}

let orderIdSeq = 1
let runSeq = 1

export function clampCatChance(p) {
  const n = Number.isFinite(p) ? p : CAT_CHANCE
  return Math.max(CAT_CHANCE_MIN, Math.min(0.95, n))
}

export function rentForDay(day) {
  return RENT_BASE + Math.max(0, day - 1) * RENT_STEP
}

export function comboTip(combo, rules = baseRules()) {
  if (combo < 2) return 0
  const step = rules.comboTipStep ?? COMBO_TIP_STEP
  const cap = rules.comboTipCap ?? COMBO_TIP_CAP
  return Math.min(cap, (combo - 1) * step)
}

export function baseRules() {
  return {
    gameDuration: GAME_DURATION,
    bakeTime: BAKE_TIME,
    readyWindow: READY_WINDOW,
    iceCreamTime: ICE_CREAM_TIME,
    newOrderInterval: NEW_ORDER_INTERVAL,
    orderTimeMin: ORDER_TIME_MIN,
    orderTimeMax: ORDER_TIME_MAX,
    orderTimeScale: 1,
    scoreNormal: SCORE_NORMAL,
    scoreFast: SCORE_FAST,
    fastRatio: FAST_RATIO,
    scoreUrgent: SCORE_URGENT,
    scoreTimeoutPenalty: SCORE_TIMEOUT_PENALTY,
    blindChance: BLIND_CHANCE,
    blindScoreMin: BLIND_SCORE_MIN,
    blindScoreMax: BLIND_SCORE_MAX,
    fastBakeChance: FAST_BAKE_CHANCE,
    urgentBaseChance: URGENT_BASE_CHANCE,
    urgentLateBonus: URGENT_LATE_BONUS,
    icmStuckChance: ICM_STUCK_CHANCE,
    catChance: CAT_CHANCE,
    catCheckInterval: CAT_CHECK_INTERVAL,
    catDuration: CAT_DURATION,
    iceCreamNeedChance: ICE_CREAM_NEED_CHANCE,
    comboTipStep: COMBO_TIP_STEP,
    comboTipCap: COMBO_TIP_CAP,
    earlyPhase: EARLY_PHASE,
    maxOrdersEarly: MAX_ORDERS_EARLY,
    maxOrdersLate: MAX_ORDERS_LATE,
    prefab: false,
  }
}

function shuffle(list) {
  const arr = [...list]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }
  return arr
}

// 升级只改现有设备参数，不增加烤箱 / 盘子 / 冰箱
// fromDay：第几晚的商店才可能抽到。小费罐和急单赏金从第 3 晚起出现
export const UPGRADES = [
  {
    id: 'fire',
    name: '火力',
    maxLevel: 2,
    costs: [60, 90],
    fromDay: 1,
    describe(level) {
      const from = Math.max(3, BAKE_TIME - level)
      const to = Math.max(3, BAKE_TIME - level - 1)
      return `烘烤时间 ${from} 秒 → ${to} 秒`
    },
  },
  {
    id: 'window',
    name: '出炉铃',
    maxLevel: 2,
    costs: [50, 80],
    fromDay: 1,
    describe(level) {
      return `烤好后的取出时间 ${READY_WINDOW + level * 3} 秒 → ${READY_WINDOW + (level + 1) * 3} 秒`
    },
  },
  {
    id: 'lucky',
    name: '好运烤炉',
    maxLevel: 2,
    costs: [70, 100],
    fromDay: 1,
    describe(level) {
      const from = Math.round((FAST_BAKE_CHANCE + level * 0.1) * 100)
      const to = Math.round((FAST_BAKE_CHANCE + (level + 1) * 0.1) * 100)
      return `加速烘烤概率 ${from}% → ${to}%`
    },
  },
  {
    id: 'bell',
    name: '防猫铃铛',
    maxLevel: 2,
    costs: [55, 85],
    fromDay: 1,
    describe(level) {
      const fromP = Math.round(clampCatChance(CAT_CHANCE - level * 0.1) * 100)
      const toP = Math.round(clampCatChance(CAT_CHANCE - (level + 1) * 0.1) * 100)
      const fromD = CAT_DURATION + level * 2
      const toD = CAT_DURATION + (level + 1) * 2
      return `猫的出现概率 ${fromP}% → ${toP}%，徘徊 ${fromD} 秒 → ${toD} 秒`
    },
  },
  {
    id: 'icm',
    name: '机器保养',
    maxLevel: 2,
    costs: [65, 95],
    fromDay: 1,
    describe(level) {
      const from = Math.max(2, ICE_CREAM_TIME - level)
      const to = Math.max(2, ICE_CREAM_TIME - level - 1)
      const extra = level + 1 >= 2 ? '，并且不再卡壳' : ''
      return `冰激凌制作 ${from} 秒 → ${to} 秒${extra}`
    },
  },
  {
    id: 'prefab',
    name: '开业预制',
    maxLevel: 1,
    costs: [40],
    fromDay: 1,
    describe() {
      return '之后每天开业，冰箱里已有一个原味蛋糕'
    },
  },
  {
    id: 'tip',
    name: '小费罐',
    maxLevel: 1,
    costs: [80],
    fromDay: 3,
    describe() {
      return `连击小费每档 +${COMBO_TIP_STEP} 变为 +${COMBO_TIP_STEP_UPGRADED}，上限从 +${COMBO_TIP_CAP} 变为 +${COMBO_TIP_CAP_UPGRADED}`
    },
  },
  {
    id: 'urgent',
    name: '急单赏金',
    maxLevel: 2,
    costs: [75, 110],
    fromDay: 3,
    describe(level) {
      const from = SCORE_URGENT + level * 8
      const to = SCORE_URGENT + (level + 1) * 8
      return `急单得分 ${from} → ${to}`
    },
  },
]

export const MODIFIERS = [
  { id: 'cats', name: '猫咪巡店', desc: '猫来得更勤，出现概率提高' },
  { id: 'rush', name: '午市高峰', desc: '新订单间隔变为 5 秒，订单时限变为九折' },
  { id: 'dessert', name: '甜品热卖', desc: '订单里更常出现冰激凌' },
  { id: 'strict', name: '严格考核', desc: '常规订单超时扣 8 分' },
  { id: 'blind', name: '盲盒专场', desc: '盲盒订单大幅变多，当天收入更看运气' },
  { id: 'oven', name: '烤箱老化', desc: '这一天烘烤时间 +1 秒' },
]

export function modifierById(id) {
  return MODIFIERS.find((m) => m.id === id) || null
}

export function upgradeSummary(upgrades = {}) {
  return UPGRADES
    .filter((u) => (upgrades[u.id] || 0) > 0)
    .map((u) => (u.maxLevel > 1 ? `${u.name} Lv${upgrades[u.id]}` : u.name))
    .join('、')
}

export function rulesFromUpgrades(upgrades = {}) {
  const r = baseRules()
  const fire = upgrades.fire || 0
  r.bakeTime = Math.max(3, BAKE_TIME - fire)
  r.readyWindow = READY_WINDOW + (upgrades.window || 0) * 3
  r.fastBakeChance = Math.min(0.95, FAST_BAKE_CHANCE + (upgrades.lucky || 0) * 0.1)
  const bell = upgrades.bell || 0
  r.catDuration = CAT_DURATION + bell * 2
  // 每级降低 10 个百分点；满级后仍是 10%。再低也不会到 0
  r.catChance = clampCatChance(CAT_CHANCE - bell * 0.1)
  const icm = upgrades.icm || 0
  r.iceCreamTime = Math.max(2, ICE_CREAM_TIME - icm)
  r.icmStuckChance = icm >= 2 ? 0 : ICM_STUCK_CHANCE
  if ((upgrades.tip || 0) >= 1) {
    r.comboTipStep = COMBO_TIP_STEP_UPGRADED
    r.comboTipCap = COMBO_TIP_CAP_UPGRADED
  }
  r.scoreUrgent = SCORE_URGENT + (upgrades.urgent || 0) * 8
  r.prefab = (upgrades.prefab || 0) >= 1
  return r
}

export function applyModifier(rules, modifierId) {
  const r = { ...rules }
  switch (modifierId) {
    case 'cats':
      r.catCheckInterval = Math.max(1, r.catCheckInterval - 1)
      r.catChance = r.catChance + 0.2
      break
    case 'rush':
      r.newOrderInterval = 5
      r.orderTimeScale = 0.9
      break
    case 'dessert':
      r.iceCreamNeedChance = 0.45
      break
    case 'strict':
      r.scoreTimeoutPenalty = 8
      break
    case 'blind':
      r.blindChance = 0.4
      break
    case 'oven':
      r.bakeTime = r.bakeTime + 1
      break
    default:
      break
  }
  r.catChance = clampCatChance(r.catChance)
  return r
}

export function rollShopOffers(upgrades = {}, day = 1) {
  const pool = UPGRADES.filter((u) => (upgrades[u.id] || 0) < u.maxLevel && day >= u.fromDay)
  return shuffle(pool).slice(0, 3).map((u) => {
    const level = upgrades[u.id] || 0
    return {
      id: u.id,
      name: u.name,
      level,
      cost: u.costs[level],
      desc: u.describe(level),
    }
  })
}

export function rollModifiers(count = 2) {
  return shuffle(MODIFIERS).slice(0, count).map((m) => ({ ...m }))
}

// 生成订单：isUrgent 急单（时间减半、+25分）；isBlind 盲盒（只显示问号，任意食物可交付、随机得分）
// 盲盒完全独立：不受常规/急单影响，永远不带 urgent 标记、时间不减半、得分固定随机 5~20
export function generateOrder(isUrgent = false, isBlind = false, rules = baseRules()) {
  let total = rules.orderTimeMin + Math.floor(Math.random() * (rules.orderTimeMax - rules.orderTimeMin + 1))
  if (rules.orderTimeScale && rules.orderTimeScale !== 1) {
    total = Math.max(10, Math.round(total * rules.orderTimeScale))
  }
  const timeLeft = isUrgent && !isBlind ? Math.max(8, Math.ceil(total / 2)) : total
  if (isBlind) {
    return {
      id: orderIdSeq++,
      blind: true,
      needs: [{ type: 'any' }],
      remaining: [{ type: 'any' }],
      total,
      timeLeft,
      urgent: false,
    }
  }
  const count = 1 + Math.floor(Math.random() * 3) // 1-3 个需求
  const needs = []
  const iceChance = rules.iceCreamNeedChance ?? ICE_CREAM_NEED_CHANCE
  for (let i = 0; i < count; i++) {
    if (Math.random() < iceChance) {
      needs.push({ type: 'icecream' })
    } else {
      const style = CAKE_STYLES[Math.floor(Math.random() * CAKE_STYLES.length)]
      needs.push({ type: 'cake', toppings: { ...style.toppings } })
    }
  }
  return {
    id: orderIdSeq++,
    blind: false,
    needs,
    remaining: needs.map((n) => ({ type: n.type, toppings: n.toppings ? { ...n.toppings } : undefined })),
    total,
    timeLeft,
    urgent: isUrgent,
  }
}

export function rating(score) {
  if (score >= 130) return { grade: 'S', text: '烘焙大师！' }
  if (score >= 100) return { grade: 'A', text: '专业甜点师！' }
  if (score >= 60) return { grade: 'B', text: '不错的尝试！' }
  return { grade: 'C', text: '继续加油！' }
}

// 当前时刻允许的最大订单数：前 20 秒最多 2 个，之后最多 3 个
export function maxOrdersAt(timeLeft, rules = baseRules()) {
  const duration = rules.gameDuration ?? GAME_DURATION
  const early = rules.earlyPhase ?? EARLY_PHASE
  const earlyMax = rules.maxOrdersEarly ?? MAX_ORDERS_EARLY
  const lateMax = rules.maxOrdersLate ?? MAX_ORDERS_LATE
  return timeLeft > duration - early ? earlyMax : lateMax
}

// 急单出现概率：基础概率 + 游戏进度 × 后期加成（进度越靠后概率越高）
export function urgentChance(timeLeft, rules = baseRules()) {
  const duration = rules.gameDuration ?? GAME_DURATION
  const base = rules.urgentBaseChance ?? URGENT_BASE_CHANCE
  const bonus = rules.urgentLateBonus ?? URGENT_LATE_BONUS
  const progress = Math.max(0, Math.min(1, 1 - timeLeft / duration))
  return base + progress * bonus
}

// ------------------------------------------------------------
// 初始状态
// ------------------------------------------------------------
function emptyOvens() {
  return [0, 1, 2].map((id) => ({ id, state: 'empty', progress: 0, window: 0, fast: false }))
}
function emptyPlates() {
  return [0, 1, 2].map((id) => ({ id, cake: null }))
}
function emptyIceCreams() {
  return [0, 1, 2].map((id) => ({ id, state: 'empty', progress: 0 }))
}

export function createInitialState() {
  return {
    screen: 'start',           // start | playing | paused | shop | modifier | over
    mode: 'practice',          // practice | business
    runId: 0,
    rules: baseRules(),
    timeLeft: GAME_DURATION,
    score: 0,
    completedOrders: 0,
    combo: 0,                  // 连续成功交单。只有订单超时归零；从 2 连起该单加小费
    maxCombo: 0,               // 当天最高连击
    orders: [],
    orderTimer: 0,             // 距下一个新订单的累计秒
    catTimer: 0,               // 猫出现检查计时
    cat: null,                 // { plateId, timeLeft } 徘徊中的猫
    ovens: emptyOvens(),
    plates: emptyPlates(),
    freezers: [null, null, null], // 每个冰箱容量 1，存蛋糕 toppings
    iceCreams: emptyIceCreams(), // empty|making|stuck|ready
    customer: null,            // { orderId, timeLeft } 探头中的顾客
    message: null,
    msgKey: 0,
    day: 1,
    wallet: 0,
    totalEarned: 0,
    rent: 0,
    upgrades: {},
    modifier: null,
    shopOffers: [],
    modifierChoices: [],
    runMaxCombo: 0,
    runCompleted: 0,
    lostReason: '',
  }
}

function openOrder(rules) {
  const blind = Math.random() < rules.blindChance
  const urgent = !blind && Math.random() < urgentChance(rules.gameDuration, rules)
  const order = generateOrder(urgent, blind, rules)
  return { order, urgent, blind }
}

function startPractice() {
  const rules = baseRules()
  const s = createInitialState()
  const { order, urgent, blind } = openOrder(rules)
  return {
    ...s,
    screen: 'playing',
    mode: 'practice',
    runId: runSeq++,
    rules,
    orders: [order],
    customer: { orderId: order.id, timeLeft: CUSTOMER_DURATION },
    message: urgent
      ? '⚡ 开门就是急单！时间减半，完成后 +25 分'
      : blind
        ? '🎁 第一个就是盲盒订单！随便交付一个食物就行'
        : '第一位顾客来啦！看看订单吧',
    msgKey: 1,
  }
}

function beginDay(prev, { day, rules, modifier, rent }) {
  const { order, urgent, blind } = openOrder(rules)
  const mod = modifier ? modifierById(modifier) : null
  let message = mod
    ? `第 ${day} 天 · ${mod.name}：${mod.desc}`
    : `第 ${day} 天开业！今晚租金 ${rent}`
  if (urgent) message += '。开门就是急单！'
  else if (blind) message += '。第一单是盲盒！'
  return {
    ...prev,
    screen: 'playing',
    mode: 'business',
    rules,
    day,
    rent,
    modifier: modifier || null,
    timeLeft: rules.gameDuration,
    score: 0,
    completedOrders: 0,
    combo: 0,
    maxCombo: 0,
    orders: [order],
    orderTimer: 0,
    catTimer: 0,
    cat: null,
    ovens: emptyOvens(),
    plates: emptyPlates(),
    freezers: rules.prefab ? [{}, null, null] : [null, null, null],
    iceCreams: emptyIceCreams(),
    customer: { orderId: order.id, timeLeft: CUSTOMER_DURATION },
    shopOffers: [],
    modifierChoices: [],
    lostReason: '',
    message,
    msgKey: (prev.msgKey || 0) + 1,
  }
}

function startBusiness(notice) {
  const fresh = createInitialState()
  const run = beginDay({
    ...fresh,
    runId: runSeq++,
    mode: 'business',
    wallet: 0,
    totalEarned: 0,
    upgrades: {},
    runMaxCombo: 0,
    runCompleted: 0,
    msgKey: 0,
  }, {
    day: 1,
    rules: baseRules(),
    modifier: null,
    rent: rentForDay(1),
  })
  if (notice === 'overwrite') {
    return { ...run, message: `${run.message.replace(/[。！]+$/, '')}。原存档已换成这一局` }
  }
  if (notice === 'fresh') {
    return { ...run, message: `${run.message.replace(/[。！]+$/, '')}。这一局已写入存档` }
  }
  return run
}

function bumpOrderSeq(orders) {
  let max = 0
  for (const order of orders || []) {
    if (order && order.id > max) max = order.id
  }
  if (max >= orderIdSeq) orderIdSeq = max + 1
}

function continueBusiness(save) {
  if (!save || save.mode !== 'business') return null
  if (save.screen !== 'playing' && save.screen !== 'shop' && save.screen !== 'modifier') return null
  bumpOrderSeq(save.orders)
  return {
    ...createInitialState(),
    ...save,
    mode: 'business',
    rules: { ...baseRules(), ...(save.rules || {}) },
    upgrades: save.upgrades || {},
    message: '继续上次的经营',
    msgKey: (save.msgKey || 0) + 1,
  }
}

// ------------------------------------------------------------
// 提示工具
// ------------------------------------------------------------
function say(state, text) {
  return { ...state, message: text, msgKey: state.msgKey + 1 }
}

const round1 = (v) => Math.round(v * 10) / 10

// ------------------------------------------------------------
// TICK：时间推进
// ------------------------------------------------------------
function tick(state) {
  if (state.screen !== 'playing') return state
  const rules = state.rules || baseRules()
  let s = { ...state, timeLeft: round1(state.timeLeft - TICK_SEC) }
  if (s.timeLeft <= 0) {
    return closeDay({ ...s, timeLeft: 0 })
  }

  // 烘烤机：烘烤 → 待取出 → 糊（加速烘烤时间减半）
  s.ovens = s.ovens.map((ov) => {
    if (ov.state === 'baking') {
      const rate = ov.fast ? 2 : 1
      const p = ov.progress + (TICK_SEC / rules.bakeTime) * rate
      return p >= 1 ? { ...ov, state: 'ready', progress: 1, window: rules.readyWindow } : { ...ov, progress: p }
    }
    if (ov.state === 'ready') {
      const w = round1(ov.window - TICK_SEC)
      return w <= 0 ? { ...ov, state: 'burned', window: 0 } : { ...ov, window: w }
    }
    return ov
  })

  // 冰激凌机：制作 → 完成；完成时有概率卡壳（需再点一次继续）
  s.iceCreams = s.iceCreams.map((ic) => {
    if (ic.state === 'making') {
      const p = ic.progress + TICK_SEC / rules.iceCreamTime
      if (p >= 1) {
        return Math.random() < rules.icmStuckChance
          ? { ...ic, state: 'stuck', progress: 1 }
          : { ...ic, state: 'ready', progress: 1 }
      }
      return { ...ic, progress: p }
    }
    return ic
  })

  // 订单倒计时；超时移除：常规订单扣分，急单/盲盒不扣分
  // 只有订单超时会打断连击。烤糊、猫偷蛋糕都不清连击
  s.orders = s.orders.map((o) => ({ ...o, timeLeft: round1(o.timeLeft - TICK_SEC) }))
  const timedOut = s.orders.filter((o) => o.timeLeft <= 0)
  s.orders = s.orders.filter((o) => o.timeLeft > 0)
  if (timedOut.length > 0) {
    const lostSpecial = timedOut.some((o) => o.urgent || o.blind)
    const penalty = timedOut.filter((o) => !o.urgent && !o.blind).length * rules.scoreTimeoutPenalty
    s.combo = 0
    s.score = Math.max(0, s.score - penalty)
    if (penalty > 0 && lostSpecial) {
      s = say(s, `常规订单超时 -${penalty} 分，急单/盲盒超时不扣分；连击重置！`)
    } else if (penalty > 0) {
      s = say(s, `订单超时 -${penalty} 分，连击重置！`)
    } else {
      s = say(s, '急单/盲盒超时不扣分，但连击重置了…')
    }
  }

  // 顾客探头计时
  if (s.customer) {
    const c = { ...s.customer, timeLeft: round1(s.customer.timeLeft - TICK_SEC) }
    s.customer = c.timeLeft > 0 ? c : null
  }

  // 生成新订单（前 20 秒最多 2 个，之后最多 3 个）
  // 急单独立生成：每次生成按 urgentChance 判定，不转化已有订单
  // 盲盒完全独立：命中盲盒则不再判定急单
  const maxNow = maxOrdersAt(s.timeLeft, rules)
  s.orderTimer = round1(s.orderTimer + TICK_SEC)
  if (s.orders.length < maxNow && s.orderTimer >= rules.newOrderInterval) {
    s.orderTimer = 0
    const blind = Math.random() < rules.blindChance
    const urgent = !blind && Math.random() < urgentChance(s.timeLeft, rules)
    const order = generateOrder(urgent, blind, rules)
    s.orders = [...s.orders, order]
    s.customer = { orderId: order.id, timeLeft: CUSTOMER_DURATION }
    if (urgent) s = say(s, `⚡ 急单来了！时间减半，完成后 +${rules.scoreUrgent} 分！`)
  }

  // 猫：周期性判定出现；出现后徘徊，到点偷走对应盘子的蛋糕。偷走不断连击
  s.catTimer = round1(s.catTimer + TICK_SEC)
  if (!s.cat && s.catTimer >= rules.catCheckInterval) {
    s.catTimer = 0
    const cakePlates = s.plates.map((p, i) => (p.cake ? i : -1)).filter((i) => i >= 0)
    if (cakePlates.length > 0 && Math.random() < rules.catChance) {
      const plateId = cakePlates[Math.floor(Math.random() * cakePlates.length)]
      s.cat = { plateId, timeLeft: rules.catDuration }
      s = say(s, '🐱 猫来了！快点击赶走它，否则它会偷走蛋糕！')
    }
  }
  if (s.cat) {
    const c = { ...s.cat, timeLeft: round1(s.cat.timeLeft - TICK_SEC) }
    if (c.timeLeft <= 0) {
      s.cat = null
      s.plates = s.plates.map((p, i) => (i === c.plateId ? { ...p, cake: null } : p))
      s = say(s, '🐱 猫偷走了蛋糕！')
    } else {
      s.cat = c
    }
  }
  return s
}

// ------------------------------------------------------------
// 玩家操作
// ------------------------------------------------------------

// 材料：蛋糕胚 / 奶油 / 巧克力酱 / 草莓 / 芒果
function clickIngredient(state, ingredient) {
  if (ingredient === 'batter') {
    const idx = state.ovens.findIndex((ov) => ov.state === 'empty')
    if (idx === -1) return say(state, '没有空闲的烘烤机！')
    const rules = state.rules || baseRules()
    const fast = Math.random() < rules.fastBakeChance
    const ovens = state.ovens.map((ov, i) =>
      i === idx ? { ...ov, state: 'baking', progress: 0, fast } : ov
    )
    return say({ ...state, ovens }, fast ? '⚡ 触发「加速烘烤」！时间减半！' : '蛋糕胚已放入烘烤机')
  }

  // 其他材料：加到盘子上不冲突的蛋糕
  const canPlace = (cake) => {
    const t = cake.toppings || {}
    if (ingredient === 'chocolate') return !t.strawberry && !t.mango
    if (ingredient === 'strawberry' || ingredient === 'mango') return !t.chocolate
    return true // 奶油百搭
  }
  const firstIdx = state.plates.findIndex((p) => p.cake)
  if (firstIdx === -1) return say(state, '盘子上还没有蛋糕，先把烤好的蛋糕胚放上去！')
  let target = firstIdx
  if (!canPlace(state.plates[firstIdx].cake)) {
    target = state.plates.findIndex((p, i) => i !== firstIdx && p.cake && canPlace(p.cake))
  }
  if (target === -1) {
    if (ingredient === 'chocolate') return say(state, '蛋糕上有水果，不能加巧克力酱')
    return say(state, '蛋糕上有巧克力酱，不能加水果')
  }
  const plates = state.plates.map((p, i) => {
    if (i !== target) return p
    return { ...p, cake: { ...p.cake, toppings: { ...p.cake.toppings, [ingredient]: true } } }
  })
  const name = INGREDIENTS.find((x) => x.id === ingredient)?.name || ingredient
  return say({ ...state, plates }, `${name}已加到蛋糕上`)
}

// 点击烘烤机：空(提示) / 烘烤中(提示) / 待取出(放到空盘子) / 糊了(提示双击)
function clickOven(state, id) {
  const ov = state.ovens[id]
  if (ov.state === 'empty') return say(state, '先点击「蛋糕胚」放进烘烤机')
  if (ov.state === 'baking') return say(state, '蛋糕还在烘烤中…')
  if (ov.state === 'burned') return say(state, '蛋糕糊了！双击清理')
  // ready：放到第一个空盘子
  const plateIdx = state.plates.findIndex((p) => !p.cake)
  if (plateIdx === -1) return say(state, '没有空盘子，无法取出蛋糕！')
  const plates = state.plates.map((p, i) =>
    i === plateIdx ? { ...p, cake: { base: 'baked', toppings: {} } } : p
  )
  const ovens = state.ovens.map((o, i) =>
    i === id ? { ...o, state: 'empty', progress: 0, window: 0, fast: false } : o
  )
  return say({ ...state, plates, ovens }, '烤好的蛋糕胚放到盘子上啦')
}

// 双击清理糊掉的烘烤机
function clearOven(state, id) {
  const ov = state.ovens[id]
  if (ov.state !== 'burned') return state
  const ovens = state.ovens.map((o, i) =>
    i === id ? { ...o, state: 'empty', progress: 0, window: 0, fast: false } : o
  )
  return say({ ...state, ovens }, '糊掉的蛋糕已清理')
}

// 点击盘子（有蛋糕时提交）
function clickPlate(state, id) {
  const plate = state.plates[id]
  if (!plate.cake) return say(state, '盘子上还没有蛋糕')
  const toppings = plate.cake.toppings || {}

  // 尝试匹配订单（盲盒订单任意食物都可匹配）
  const hit = findOrderMatch(state.orders, 'cake', toppings)
  if (hit) {
    let next = completeOrderItem(state, hit.order.id, hit.itemIdx)
    next = { ...next, plates: next.plates.map((p, i) => (i === id ? { ...p, cake: null } : p)) }
    next = say(next, next.completed ? orderDoneMsg(next) : '满足了一项订单需求！')
    return next
  }

  // 不匹配：放入空冰箱
  const fIdx = state.freezers.findIndex((f) => !f)
  if (fIdx === -1) return say(state, '不符合订单，且冰箱已满，点击无效')
  const freezers = state.freezers.map((f, i) => (i === fIdx ? { ...toppings } : f))
  const plates = state.plates.map((p, i) => (i === id ? { ...p, cake: null } : p))
  return say({ ...state, plates, freezers }, '蛋糕暂存在冰箱里')
}

// 点击冰箱（有蛋糕时尝试交付）
function clickFreezer(state, id) {
  const cake = state.freezers[id]
  if (!cake) return say(state, '冰箱是空的')
  const hit = findOrderMatch(state.orders, 'cake', cake)
  if (hit) {
    let next = completeOrderItem(state, hit.order.id, hit.itemIdx)
    next = { ...next, freezers: next.freezers.map((f, i) => (i === id ? null : f)) }
    next = say(next, next.completed ? orderDoneMsg(next) : '冰箱里的蛋糕满足了订单！')
    return next
  }
  return say(state, '冰箱里的蛋糕不符合任何订单')
}

// 点击冰激凌机
function clickIcm(state, id) {
  const ic = state.iceCreams[id]
  if (ic.state === 'empty') {
    const iceCreams = state.iceCreams.map((x, i) =>
      i === id ? { ...x, state: 'making', progress: 0 } : x
    )
    return say({ ...state, iceCreams }, '开始制作冰激凌…')
  }
  if (ic.state === 'making') return say(state, '冰激凌还在制作中…')
  if (ic.state === 'stuck') {
    const iceCreams = state.iceCreams.map((x, i) =>
      i === id ? { ...x, state: 'ready', progress: 1 } : x
    )
    return say({ ...state, iceCreams }, '咔！机器恢复正常，冰激凌做好了！')
  }
  // ready：交付给需要冰激凌的订单（盲盒订单也可）
  const hit = findOrderMatch(state.orders, 'icecream', null)
  if (!hit) return say(state, '目前没有订单需要冰激凌（做好不会坏）')
  let next = completeOrderItem(state, hit.order.id, hit.itemIdx)
  next = {
    ...next,
    iceCreams: next.iceCreams.map((x, i) => (i === id ? { ...x, state: 'empty', progress: 0 } : x)),
  }
  next = say(next, next.completed ? orderDoneMsg(next) : '冰激凌已交付！')
  return next
}

// 点击猫：赶走它，保住蛋糕
function clickCat(state) {
  if (!state.cat) return state
  return say({ ...state, cat: null }, '🐱 猫被赶走了！蛋糕保住了！')
}

// ------------------------------------------------------------
// 辅助函数
// ------------------------------------------------------------
// 在订单列表中寻找需要某类食物的订单项
// needType: 'cake'（需 toppings 匹配）、'icecream'；盲盒订单（any）任意食物都匹配
function findOrderMatch(orders, needType, toppings) {
  for (const order of orders) {
    const idx = order.remaining.findIndex((n) => {
      if (n.type === 'any') return true
      if (needType === 'icecream') return n.type === 'icecream'
      return n.type === 'cake' && sameToppings(n.toppings, toppings)
    })
    if (idx >= 0) return { order, itemIdx: idx }
  }
  return null
}

// 订单完成得分：盲盒随机 5-20；急单用当前赏金；半程内完成 15；常规 10。再加连击小费
function orderGain(order, combo, rules) {
  let base = rules.scoreNormal
  let reason = ''
  if (order.blind) {
    base = rules.blindScoreMin + Math.floor(Math.random() * (rules.blindScoreMax - rules.blindScoreMin + 1))
    reason = '盲盒'
  } else if (order.urgent) {
    base = rules.scoreUrgent
    reason = '急单'
  } else if (order.timeLeft > order.total * rules.fastRatio) {
    base = rules.scoreFast
    reason = '快速完成'
  }
  const tip = comboTip(combo, rules)
  if (tip > 0) reason = reason ? `${reason}，连击 +${tip}` : `连击 +${tip}`
  return { total: base + tip, reason }
}

// 订单完成后的提示文案
function orderDoneMsg(next) {
  const tag = next.reason ? `（${next.reason}）` : ''
  return `🎉 订单完成！连击 x${next.combo}，+${next.gained}分${tag}`
}

// 满足订单的一项；若订单所有需求都完成，则计分并移除订单
// 返回 gained（本次获得分数）、reason（加分原因）、completed（订单是否完成）
function completeOrderItem(state, orderId, itemIdx) {
  const order = state.orders.find((o) => o.id === orderId)
  if (!order) return state
  const rules = state.rules || baseRules()
  const remaining = order.remaining.filter((_, i) => i !== itemIdx)
  let score = state.score
  let completedOrders = state.completedOrders
  let combo = state.combo
  let maxCombo = state.maxCombo
  let orders
  let completed = false
  let gained = 0
  let reason = ''
  if (remaining.length === 0) {
    combo += 1
    if (combo > maxCombo) maxCombo = combo
    const gain = orderGain(order, combo, rules)
    gained = gain.total
    reason = gain.reason
    score += gained
    completedOrders += 1
    completed = true
    orders = state.orders.filter((o) => o.id !== orderId)
  } else {
    orders = state.orders.map((o) => (o.id === orderId ? { ...o, remaining } : o))
  }
  return { ...state, orders, score, completedOrders, combo, maxCombo, completed, gained, reason }
}

// 一局结束。练习模式直接结算；经营模式把今日得分计入手头并支付租金
function closeDay(state) {
  if (state.mode !== 'business') {
    return { ...state, screen: 'over', timeLeft: 0 }
  }
  const duration = state.rules?.gameDuration || GAME_DURATION
  const untouched = state.timeLeft >= duration - 0.05 && (state.score || 0) === 0 && (state.completedOrders || 0) === 0
  const daysCleared = untouched ? Math.max(0, state.day - 1) : state.day
  const earned = state.score || 0
  const wallet = (state.wallet || 0) + earned
  const totalEarned = (state.totalEarned || 0) + earned
  const runMaxCombo = Math.max(state.runMaxCombo || 0, state.maxCombo || 0)
  const runCompleted = (state.runCompleted || 0) + (state.completedOrders || 0)
  const shared = {
    ...state,
    timeLeft: 0,
    wallet,
    totalEarned,
    runMaxCombo,
    runCompleted,
    daysCleared,
  }
  if (wallet < state.rent) {
    return {
      ...shared,
      screen: 'over',
      lostReason: `第 ${state.day} 天打烊，手头 ${wallet}，租金 ${state.rent}`,
    }
  }
  const paid = wallet - state.rent
  const offers = rollShopOffers(state.upgrades, state.day)
  if (offers.length === 0) {
    return {
      ...shared,
      wallet: paid,
      screen: 'modifier',
      shopOffers: [],
      modifierChoices: rollModifiers(2),
    }
  }
  return {
    ...shared,
    wallet: paid,
    screen: 'shop',
    shopOffers: offers,
    modifierChoices: [],
  }
}

function buyUpgrade(state, id) {
  if (state.screen !== 'shop') return state
  const offer = (state.shopOffers || []).find((o) => o.id === id)
  if (!offer || state.wallet < offer.cost) return state
  const level = (state.upgrades[id] || 0) + 1
  return say({
    ...state,
    wallet: state.wallet - offer.cost,
    upgrades: { ...state.upgrades, [id]: level },
    shopOffers: state.shopOffers.filter((o) => o.id !== id),
  }, `购入「${offer.name}」`)
}

function leaveShop(state) {
  if (state.screen !== 'shop') return state
  return {
    ...state,
    screen: 'modifier',
    modifierChoices: rollModifiers(2),
  }
}

function pickModifier(state, id) {
  if (state.screen !== 'modifier') return state
  if (!(state.modifierChoices || []).some((m) => m.id === id)) return state
  const day = state.day + 1
  const rules = applyModifier(rulesFromUpgrades(state.upgrades), id)
  return beginDay(state, { day, rules, modifier: id, rent: rentForDay(day) })
}

export function emptyRecords() {
  return { practiceScore: 0, businessDays: 0, businessEarned: 0 }
}

export function loadRecords() {
  try {
    if (typeof localStorage === 'undefined') return emptyRecords()
    const raw = localStorage.getItem(RECORD_KEY)
    if (!raw) return emptyRecords()
    const p = JSON.parse(raw)
    return {
      practiceScore: Math.max(0, Number(p.practiceScore) || 0),
      businessDays: Math.max(0, Number(p.businessDays) || 0),
      businessEarned: Math.max(0, Number(p.businessEarned) || 0),
    }
  } catch {
    return emptyRecords()
  }
}

export function saveRecords(records) {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(RECORD_KEY, JSON.stringify(records))
  } catch {
    // 隐私模式或配额不足时忽略，不影响当局
  }
}

const RESUMABLE_SCREENS = new Set(['playing', 'shop', 'modifier'])

export function saveSummary(save) {
  if (!save) return ''
  const gear = upgradeSummary(save.upgrades)
  const tail = gear ? ` · ${gear}` : ''
  if (save.screen === 'shop') return `第 ${save.day} 天已打烊，待升级 · 手头 ${save.wallet}${tail}`
  if (save.screen === 'modifier') return `第 ${save.day} 天已打烊，待选明日状况 · 手头 ${save.wallet}${tail}`
  const mod = save.modifier ? modifierById(save.modifier) : null
  return `第 ${save.day} 天 · ${mod ? mod.name : '开业'} · 手头 ${save.wallet ?? 0} · 今日 ${save.score ?? 0}${tail}`
}

export function loadBusinessSave() {
  try {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem(BUSINESS_SAVE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data || data.mode !== 'business' || !RESUMABLE_SCREENS.has(data.screen)) return null
    if (!Array.isArray(data.orders) || !data.rules) return null
    return data
  } catch {
    return null
  }
}

export function saveBusinessRun(state) {
  try {
    if (typeof localStorage === 'undefined') return false
    if (!state || state.mode !== 'business' || !RESUMABLE_SCREENS.has(state.screen)) return false
    const snapshot = { ...state, message: null }
    localStorage.setItem(BUSINESS_SAVE_KEY, JSON.stringify(snapshot))
    return true
  } catch {
    return false
  }
}

export function clearBusinessSave() {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.removeItem(BUSINESS_SAVE_KEY)
  } catch {
    // 忽略无法写入本地存档的情况
  }
}

export function considerRecord(prev, state) {
  const base = prev || emptyRecords()
  if (!state || state.screen !== 'over') return base
  if (state.mode === 'business') {
    const days = state.daysCleared ?? state.day ?? 0
    const earned = state.totalEarned || 0
    if (days > base.businessDays || (days === base.businessDays && earned > base.businessEarned)) {
      return { ...base, businessDays: days, businessEarned: earned }
    }
    return base
  }
  if ((state.score || 0) > base.practiceScore) {
    return { ...base, practiceScore: state.score }
  }
  return base
}

// ------------------------------------------------------------
export function reducer(state, action) {
  switch (action.type) {
    case 'START':
    case 'START_PRACTICE': return startPractice()
    case 'START_BUSINESS': return startBusiness(action.notice)
    case 'CONTINUE_BUSINESS': return continueBusiness(action.save) || state
    case 'PAUSE': return state.screen === 'playing' ? { ...state, screen: 'paused' } : state
    case 'RESUME': return state.screen === 'paused' ? { ...state, screen: 'playing' } : state
    case 'SETTLE': return state.screen === 'playing' || state.screen === 'paused' ? closeDay(state) : state
    case 'TICK': return tick(state)
    case 'CLICK_INGREDIENT': return clickIngredient(state, action.ingredient)
    case 'CLICK_OVEN': return clickOven(state, action.id)
    case 'CLEAR_OVEN': return clearOven(state, action.id)
    case 'CLICK_PLATE': return clickPlate(state, action.id)
    case 'CLICK_FREEZER': return clickFreezer(state, action.id)
    case 'CLICK_ICM': return clickIcm(state, action.id)
    case 'CLICK_CAT': return clickCat(state)
    case 'BUY_UPGRADE': return buyUpgrade(state, action.id)
    case 'LEAVE_SHOP': return leaveShop(state)
    case 'PICK_MODIFIER': return pickModifier(state, action.id)
    case 'MENU': return { ...createInitialState(), screen: 'start' }
    default: return state
  }
}
