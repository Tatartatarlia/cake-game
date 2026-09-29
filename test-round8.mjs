// 第8轮测试：盲盒订单完全独立（不受常规/急单影响，随机 5~20，超时不扣分）
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

// ---------- 1. 即使传入 isUrgent=true，盲盒订单也强制非急单、时间不减半 ----------
console.log('1. 盲盒订单独立于急单标记')
{
  let anyUrgent = false
  let halfTime = false
  for (let i = 0; i < 300; i++) {
    const o = generateOrder(true, true) // 故意同时传急单+盲盒
    if (o.urgent) anyUrgent = true
    if (o.timeLeft < o.total) halfTime = true
    if (!o.blind) { fail++; console.log('  ❌ 生成的不是盲盒'); break }
  }
  ok(!anyUrgent, '盲盒订单永远不带 urgent 标记')
  ok(!halfTime, '盲盒订单时限不减半')
}

// ---------- 2. 开局订单：盲盒优先于急单 ----------
console.log('2. 开局订单判定（盲盒优先，不产生急单盲盒）')
{
  let sawUrgent = 0
  let sawBlind = 0
  let sawUrgentBlind = 0
  for (let i = 0; i < 500; i++) {
    let s = reducer(createInitialState(), { type: 'START' })
    const o = s.orders[0]
    if (o.urgent) sawUrgent++
    if (o.blind) {
      sawBlind++
      if (o.urgent) sawUrgentBlind++
      ok(!o.urgent, `开局订单 #${i} 盲盒不带急单`)
    }
  }
  ok(sawBlind > 0, `开局出现盲盒 ${sawBlind} 次`)
  ok(sawUrgentBlind === 0, `急单盲盒出现 0 次 (got ${sawUrgentBlind})`)
}

// ---------- 3. 盲盒订单得分永远在 5~20（即使带急单参数） ----------
console.log('3. 盲盒完成得分 5~20')
{
  let s = reducer(createInitialState(), { type: 'START' })
  let min = 999
  let max = -1
  for (let i = 0; i < 200; i++) {
    const blind = generateOrder(true, true) // 故意带急单参数
    s = { ...s, orders: [blind], score: 0, combo: 0 }
    s = { ...s, orders: s.orders.map((o) => ({ ...o, timeLeft: 999 })) }
    const r = reducer(s, { type: 'CLICK_PLATE', id: 0 }) // 不匹配会失败，直接用 completeOrderItem 路径
    // CLICK_PLATE 需要盘子有蛋糕才匹配，这里直接测 orderGain 的等价效果：
    // 通过手动构造: 盲盒 remaining=[any]，交付任意食物即完成
  }
  // 直接验证 orderGain 等价逻辑：盲盒完成加分范围
  for (let i = 0; i < 500; i++) {
    const blind = generateOrder(true, true)
    // 模拟完成：通过 reducer CLICK_PLATE 需要蛋糕在盘子上，复杂；改为直接构造状态调 completeOrderItem 路径
    // 用 CLICK_ICM 交付冰激凌给盲盒更简单：盲盒 remaining=[any]，冰激凌机 ready 时点击即可交付
    let st = reducer(createInitialState(), { type: 'START' })
    st = { ...st, orders: [blind], score: 0, combo: 0, iceCreams: st.iceCreams.map((ic) => ic.state === 'ready' ? ic : { ...ic, state: 'ready', progress: 1 }) }
    // 点击 0 号冰激凌机交付
    const r = reducer(st, { type: 'CLICK_ICM', id: 0 })
    if (!r.completed) { fail++; console.log(`  ❌ 盲盒未完成 order=${JSON.stringify(blind)}`); break }
    if (r.gained < 5 || r.gained > 20) { fail++; console.log(`  ❌ 盲盒得分越界: ${r.gained}`); break }
    if (r.gained < min) min = r.gained
    if (r.gained > max) max = r.gained
  }
  ok(min >= 5 && max <= 20, `盲盒得分范围 [${min}, ${max}] 均在 5~20 内`)
}

// ---------- 4. 盲盒超时不扣分 ----------
console.log('4. 盲盒超时不扣分')
{
  let s = reducer(createInitialState(), { type: 'START' })
  const blind = generateOrder(false, true)
  blind.timeLeft = TICK_SEC * 0.5 // 即将超时
  s = { ...s, orders: [blind], score: 100, combo: 2 }
  s = reducer(s, { type: 'TICK' })
  ok(s.orders.length === 0, '盲盒超时被移除')
  ok(s.score === 100, '盲盒超时不扣分')
  ok(s.combo === 0, '连击仍重置')
}

// ---------- 5. 混合超时：常规扣分，急单/盲盒不扣 ----------
console.log('5. 混合超时扣分')
{
  let s = reducer(createInitialState(), { type: 'START' })
  const urgentOrder = generateOrder(true, false)
  urgentOrder.timeLeft = TICK_SEC * 0.5
  const blindOrder = generateOrder(false, true)
  blindOrder.timeLeft = TICK_SEC * 0.5
  const normalOrder = generateOrder(false, false)
  normalOrder.timeLeft = TICK_SEC * 0.5
  s = { ...s, orders: [urgentOrder, blindOrder, normalOrder], score: 100 }
  s = reducer(s, { type: 'TICK' })
  ok(s.orders.length === 0, '三个订单均超时移除')
  ok(s.score === 100 - SCORE_TIMEOUT_PENALTY, `只扣常规部分 (score=${s.score})`)
}

// ---------- 6. 全流程模拟：不出现急单盲盒 ----------
console.log('6. 全流程模拟（急单/盲盒独立）')
{
  let urgentBlind = 0
  let blindTotal = 0
  for (let game = 0; game < 150; game++) {
    let s = reducer(createInitialState(), { type: 'START' })
    let prevIds = new Set(s.orders.map((o) => o.id))
    while (s.screen === 'playing') {
      s = reducer(s, { type: 'TICK' })
      const now = s.orders
      for (const o of now) {
        if (!prevIds.has(o.id)) {
          if (o.blind) {
            blindTotal++
            if (o.urgent) urgentBlind++
          }
        }
      }
      prevIds = new Set(now.map((o) => o.id))
      if (s.orders.length > 0 && Math.random() < 0.01) {
        s = { ...s, orders: [] }
      }
    }
  }
  ok(urgentBlind === 0, `全流程中急单盲盒出现 0 次 (盲盒共 ${blindTotal} 个)`)
}

console.log(`\n结果: ${pass} 通过, ${fail} 失败`)
process.exit(fail > 0 ? 1 : 0)
