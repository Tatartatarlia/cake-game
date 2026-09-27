// 第7轮测试：急单独立生成（不转化已有订单）+ 超时扣分规则
import {
  reducer, createInitialState,
  GAME_DURATION, ORDER_TIME_MIN, ORDER_TIME_MAX,
  SCORE_TIMEOUT_PENALTY, URGENT_BASE_CHANCE, URGENT_LATE_BONUS,
  urgentChance, generateOrder, TICK_SEC,
} from './src/game.js'

let pass = 0
let fail = 0
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✅', name) }
  else { fail++; console.log('  ❌', name) }
}

// ---------- 1. urgentChance 边界 ----------
console.log('1. urgentChance 概率曲线')
{
  const atStart = urgentChance(GAME_DURATION)
  const atHalf = urgentChance(GAME_DURATION / 2)
  const atEnd = urgentChance(0)
  ok(Math.abs(atStart - URGENT_BASE_CHANCE) < 1e-9, `开局概率 = 基础概率 (${atStart})`)
  ok(Math.abs(atEnd - (URGENT_BASE_CHANCE + URGENT_LATE_BONUS)) < 1e-9, `结束概率 = 基础+加成 (${atEnd})`)
  ok(atHalf > atStart && atHalf < atEnd, `中期概率介于两者之间 (${atHalf})`)
  ok(atStart >= 0 && atEnd <= 1, '概率范围 [0,1]')
}

// ---------- 2. 常规订单超时扣分 ----------
console.log('2. 常规订单超时扣分')
{
  let s = reducer(createInitialState(), { type: 'START' })
  // 强制替换为两个订单：一个常规超时、一个常规还有时间
  const normalOrder = generateOrder(false, false)
  normalOrder.timeLeft = TICK_SEC * 0.5 // 即将超时
  const safeOrder = generateOrder(false, false)
  safeOrder.timeLeft = 999
  s = { ...s, orders: [normalOrder, safeOrder], score: 100, combo: 3 }
  s = reducer(s, { type: 'TICK' })
  ok(s.orders.length === 1, '超时订单被移除')
  ok(s.score === 100 - SCORE_TIMEOUT_PENALTY, `扣除 ${SCORE_TIMEOUT_PENALTY} 分 (score=${s.score})`)
  ok(s.combo === 0, '连击重置')
  ok(s.orders[0].id === safeOrder.id, '未超时订单保留')
}

// ---------- 3. 急单超时不扣分 ----------
console.log('3. 急单超时不扣分')
{
  let s = reducer(createInitialState(), { type: 'START' })
  const urgentOrder = generateOrder(true, false)
  urgentOrder.timeLeft = TICK_SEC * 0.5 // 即将超时
  s = { ...s, orders: [urgentOrder], score: 100, combo: 2 }
  s = reducer(s, { type: 'TICK' })
  ok(s.orders.length === 0, '急单超时被移除')
  ok(s.score === 100, '急单超时不扣分')
  ok(s.combo === 0, '连击仍重置')
}

// ---------- 4. 混合超时：只扣常规部分 ----------
console.log('4. 混合超时扣分')
{
  let s = reducer(createInitialState(), { type: 'START' })
  const urgentOrder = generateOrder(true, false)
  urgentOrder.timeLeft = TICK_SEC * 0.5
  const normalOrder = generateOrder(false, false)
  normalOrder.timeLeft = TICK_SEC * 0.5
  s = { ...s, orders: [urgentOrder, normalOrder], score: 100 }
  s = reducer(s, { type: 'TICK' })
  ok(s.orders.length === 0, '两个订单均超时移除')
  ok(s.score === 100 - SCORE_TIMEOUT_PENALTY, `只扣常规部分 (score=${s.score})`)
}

// ---------- 5. 已有订单不被转化为急单 ----------
console.log('5. 已有订单不被转化为急单')
{
  let s = reducer(createInitialState(), { type: 'START' })
  // 构造 3 个常规订单并持续 tick 50 秒（期间新订单可能带 urgent，但已有订单的 urgent 必须保持 false）
  const mk = () => {
    const o = generateOrder(false, false)
    o.timeLeft = 60 // 长时限避免超时干扰
    return o
  }
  const originals = [mk(), mk(), mk()]
  const originalIds = new Set(originals.map((o) => o.id))
  s = { ...s, orders: originals, score: 0 }
  let flipped = false
  for (let i = 0; i < 500; i++) {
    const before = s.orders
    s = reducer(s, { type: 'TICK' })
    const after = s.orders
    for (const b of before) {
      if (originalIds.has(b.id)) {
        const a = after.find((x) => x.id === b.id)
        if (a && a.urgent !== b.urgent) flipped = true
      }
    }
  }
  ok(!flipped, '任何已有订单的 urgent 状态都未被修改')
}

// ---------- 6. 新订单带急单标记 & 全流程模拟 ----------
console.log('6. 全流程模拟（急单生成/扣分/盲盒）')
{
  let urgentCount = 0
  let totalNew = 0
  for (let game = 0; game < 200; game++) {
    let s = reducer(createInitialState(), { type: 'START' })
    let prevIds = new Set(s.orders.map((o) => o.id))
    while (s.screen === 'playing') {
      s = reducer(s, { type: 'TICK' })
      const now = s.orders
      for (const o of now) {
        if (!prevIds.has(o.id)) {
          totalNew++
          if (o.urgent) urgentCount++
        }
      }
      prevIds = new Set(now.map((o) => o.id))
      // 自动完成订单，防止游戏提前结束导致的统计偏少
      if (s.orders.length > 0 && Math.random() < 0.01) {
        s = { ...s, orders: [] }
      }
    }
    ok(s.screen === 'over', `第 ${game + 1} 局正常结束`)
  }
  ok(totalNew > 0, `共生成新订单 ${totalNew} 个`)
  const rate = urgentCount / totalNew
  ok(rate > 0.05 && rate < 0.5, `急单实际占比 ${(rate * 100).toFixed(1)}% 在合理范围（含后期提升）`)
}

// ---------- 7. 得分不为负 ----------
console.log('7. 扣分不下探负数')
{
  let s = reducer(createInitialState(), { type: 'START' })
  const o = generateOrder(false, false)
  o.timeLeft = TICK_SEC * 0.5
  s = { ...s, orders: [o], score: 2 }
  s = reducer(s, { type: 'TICK' })
  ok(s.score === 0, `分数下限 0 (score=${s.score})`)
}

console.log(`\n结果: ${pass} 通过, ${fail} 失败`)
process.exit(fail > 0 ? 1 : 0)
