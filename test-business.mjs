// 经营模式 + 连击小费
import {
  reducer, createInitialState, generateOrder,
  comboTip, rulesFromUpgrades, applyModifier, rollShopOffers,
  orderIntervalForDay, rulesForDay, baseRules,
  CAT_CHANCE, CAT_CHANCE_MIN, BAKE_TIME, RENT_BASE,
  rentForDay, FINITE_GOAL, LEGACY_DIFFICULTY, HISTORY_LIMIT, loadRecords, RECORD_KEY,
  RENOWN_COST_BASE, RENOWN_COST_STEP, SCORE_URGENT, COMBO_TIP_CAP, COMBO_TIP_CAP_UPGRADED,
  COMBO_TIP_STEP, TICK_SEC, considerRecord, emptyRecords,
  saveBusinessRun, loadBusinessSave, clearBusinessSave, saveSummary, BUSINESS_SAVE_KEY,
} from './src/game.js'

let pass = 0
let fail = 0
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✅', name) }
  else { fail++; console.log('  ❌', name) }
}

console.log('1. 连击小费')
{
  ok(comboTip(1) === 0, '1 连不加分')
  ok(comboTip(2) === 3, '2 连 +3')
  ok(comboTip(3) === 6, '3 连 +6')
  ok(comboTip(4) === 9, '4 连 +9')
  ok(comboTip(5) === COMBO_TIP_CAP, '5 连封顶')
  ok(comboTip(8) === COMBO_TIP_CAP, '更高连击仍封顶')
  const upgraded = rulesFromUpgrades({ tip: 1 })
  ok(comboTip(2, upgraded) === 5, '小费罐后 2 连 +5')
  ok(comboTip(5, upgraded) === 20, '小费罐后上限 +20')
}

console.log('2. 完成订单时连击小费入账')
{
  let s = reducer(createInitialState(), { type: 'START' })
  const order = generateOrder(false, false)
  order.remaining = [{ type: 'cake', toppings: {} }]
  order.timeLeft = order.total * 0.4
  s = {
    ...s,
    orders: [order],
    combo: 1,
    score: 0,
    plates: [
      { id: 0, cake: { base: 'baked', toppings: {} } },
      { id: 1, cake: null },
      { id: 2, cake: null },
    ],
  }
  s = reducer(s, { type: 'CLICK_PLATE', id: 0 })
  ok(s.completed === true, '订单完成')
  ok(s.combo === 2, `连击变为 2 (combo=${s.combo})`)
  ok(s.gained === 10 + COMBO_TIP_STEP, `常规分 + 小费 = ${s.gained}`)
}

console.log('3. 只有订单超时断连击')
{
  let s = reducer(createInitialState(), { type: 'START' })
  s = {
    ...s,
    combo: 4,
    maxCombo: 4,
    cat: { plateId: 0, timeLeft: TICK_SEC * 0.5 },
    plates: [
      { id: 0, cake: { base: 'baked', toppings: {} } },
      { id: 1, cake: null },
      { id: 2, cake: null },
    ],
  }
  s = reducer(s, { type: 'TICK' })
  ok(s.plates[0].cake === null, '猫偷走了蛋糕')
  ok(s.combo === 4, '被偷不断连击')

  s = reducer(createInitialState(), { type: 'START' })
  s = {
    ...s,
    combo: 4,
    ovens: [
      { id: 0, state: 'ready', progress: 1, window: TICK_SEC * 0.5, fast: false },
      { id: 1, state: 'empty', progress: 0, window: 0, fast: false },
      { id: 2, state: 'empty', progress: 0, window: 0, fast: false },
    ],
  }
  s = reducer(s, { type: 'TICK' })
  ok(s.ovens[0].state === 'burned', '蛋糕烤糊')
  ok(s.combo === 4, '烤糊不断连击')
}

console.log('4. 防猫铃铛概率始终大于 0')
{
  const lv2 = rulesFromUpgrades({ bell: 2 })
  ok(lv2.catChance > 0, `满级概率 ${lv2.catChance} > 0`)
  ok(Math.abs(lv2.catChance - (CAT_CHANCE - 0.2)) < 1e-9, '两级后是 10%')
  ok(lv2.catDuration === 7, '徘徊加到 7 秒')
  const extreme = rulesFromUpgrades({ bell: 50 })
  ok(extreme.catChance === CAT_CHANCE_MIN && extreme.catChance > 0, '再降也停在保底且大于 0')
  const withCats = applyModifier(lv2, 'cats')
  ok(withCats.catChance > 0, `猫咪巡店叠铃铛后仍 > 0 (${withCats.catChance})`)
}

console.log('5. 经营模式租金与商店')
{
  let s = reducer(createInitialState(), { type: 'START_BUSINESS' })
  ok(s.mode === 'business' && s.screen === 'playing', '经营模式开局')
  ok(s.day === 1 && s.rent === RENT_BASE && s.wallet === 0, `第 1 天租金 ${s.rent}`)
  ok(s.modifier === null, '第 1 天没有状况')

  let broke = reducer({ ...s, score: RENT_BASE - 1 }, { type: 'SETTLE' })
  ok(broke.screen === 'over', '差一点付不起租金')
  ok(broke.daysCleared === 1, '这一天算打完了')

  let fresh = reducer(s, { type: 'SETTLE' })
  ok(fresh.screen === 'over' && fresh.daysCleared === 0, '完全没做的第 1 天不记成完成')

  let paid = reducer({ ...s, score: RENT_BASE }, { type: 'SETTLE' })
  ok(paid.screen === 'shop', '刚好付清进入商店')
  ok(paid.wallet === 0, '付租后余额为 0')
  ok(paid.shopOffers.length >= 1 && paid.shopOffers.length <= 3, `商店 ${paid.shopOffers.length} 件`)
  ok(paid.shopOffers.every((o) => o.id !== 'tip' && o.id !== 'urgent'), '第 1 晚没有经济升级')

  let earlyIds = new Set()
  for (let i = 0; i < 80; i++) rollShopOffers({}, 1).forEach((o) => earlyIds.add(o.id))
  ok(!earlyIds.has('tip') && !earlyIds.has('urgent'), '第 1 晚牌池不含小费罐和急单赏金')
  let lateIds = new Set()
  for (let i = 0; i < 80; i++) rollShopOffers({}, 3).forEach((o) => lateIds.add(o.id))
  ok(lateIds.has('tip') && lateIds.has('urgent'), '第 3 晚开始出现经济升级')

  paid = { ...paid, wallet: 200 }
  const offer = paid.shopOffers[0]
  const bought = reducer(paid, { type: 'BUY_UPGRADE', id: offer.id })
  ok(bought.wallet === 200 - offer.cost, '扣款')
  ok(bought.upgrades[offer.id] === 1, '升级等级 +1')
  ok(!bought.shopOffers.some((o) => o.id === offer.id), '买走的牌消失')
  const brokeBuy = reducer({ ...bought, wallet: 0 }, { type: 'BUY_UPGRADE', id: bought.shopOffers[0]?.id })
  ok(brokeBuy.wallet === 0, '余额不够不能买')

  let pick = reducer(bought, { type: 'LEAVE_SHOP' })
  ok(pick.screen === 'modifier' && pick.modifierChoices.length === 2, '二选一状况')
  pick = {
    ...pick,
    upgrades: { bell: 2, prefab: 1 },
    modifierChoices: [
      { id: 'oven', name: '烤箱老化', desc: '这一天烘烤时间 +1 秒' },
      pick.modifierChoices[1],
    ],
  }
  const day2 = reducer(pick, { type: 'PICK_MODIFIER', id: 'oven' })
  ok(day2.screen === 'playing' && day2.day === 2, '进入第 2 天')
  ok(day2.rent === rentForDay(2, day2.difficulty), `第 2 天租金 ${day2.rent}`)
  ok(day2.modifier === 'oven', '状况生效')
  ok(day2.score === 0 && day2.combo === 0, '当天分数和连击重新计')
  ok(day2.rules.catChance > 0, `第 2 天猫概率 ${day2.rules.catChance} > 0`)
  ok(day2.freezers[0] && !day2.freezers[0].cream, '开业预制放进冰箱')
  ok(day2.rules.bakeTime === BAKE_TIME + 1, `烤箱老化后烘烤 ${day2.rules.bakeTime} 秒`)
  ok(day2.rules.newOrderInterval === 6.5, `第 2 天订单间隔 ${day2.rules.newOrderInterval} 秒`)
}

console.log('6. 练习模式仍是单局结算')
{
  let s = reducer(createInitialState(), { type: 'START_PRACTICE' })
  ok(s.mode === 'practice' && s.screen === 'playing', '练习开局')
  s = reducer(s, { type: 'SETTLE' })
  ok(s.screen === 'over', '练习直接结束')
}

console.log('7. 纪录比较')
{
  const prev = emptyRecords()
  const practice = considerRecord(prev, { screen: 'over', mode: 'practice', score: 80 })
  ok(practice.practiceScore === 80 && practice.improved, '练习纪录写入分数')
  ok(practice.history[0].mode === 'practice' && practice.history[0].score === 80, '练习记入最近对局')
  const stored = { practiceScore: practice.practiceScore, bests: practice.bests, history: practice.history }
  const same = considerRecord(stored, { screen: 'over', mode: 'practice', score: 80 })
  ok(same.practiceScore === 80 && !same.improved && same.history.length === 2, '相同分数不刷新最高，但仍记一局')
  const business = considerRecord(stored, {
    screen: 'over', mode: 'business', span: 'infinite', difficulty: 2,
    daysCleared: 3, totalEarned: 400, day: 3, won: false,
  })
  ok(business.bests.length === 1 && business.bests[0].days === 3 && business.bests[0].difficulty === 2 && business.improved, '经营纪录按难度记下天数')
  const kept = { practiceScore: business.practiceScore, bests: business.bests, history: business.history }
  const fewer = considerRecord(kept, {
    screen: 'over', mode: 'business', span: 'infinite', difficulty: 2,
    daysCleared: 2, totalEarned: 9999, day: 2,
  })
  ok(!fewer.improved && fewer.bests[0].days === 3 && fewer.history.length === 3, '同一难度天数更少不覆盖')
  const other = considerRecord(
    { practiceScore: fewer.practiceScore, bests: fewer.bests, history: fewer.history },
    { screen: 'over', mode: 'business', span: 'finite', difficulty: 2, daysCleared: 10, totalEarned: 100, day: 10, won: true },
  )
  ok(other.bests.length === 2 && other.improved, '有限和无限分开记')
}

console.log('8. 经营存档')
{
  const mem = new Map()
  globalThis.localStorage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
    removeItem: (k) => mem.delete(k),
  }
  let s = reducer(createInitialState(), { type: 'START_BUSINESS', notice: 'fresh' })
  ok(String(s.message).includes('这一局已写入存档'), '新开一局有提示')
  s = { ...s, screen: 'shop', day: 2, wallet: 40, score: 90, rent: 80, shopOffers: [{ id: 'fire', name: '火力', level: 0, cost: 60, desc: '更快' }] }
  ok(saveBusinessRun(s), '打烊状态可以存档')
  ok(saveSummary(loadBusinessSave()).includes('第 2 天已打烊'), `摘要：${saveSummary(loadBusinessSave())}`)
  const back = reducer(createInitialState(), { type: 'CONTINUE_BUSINESS', save: loadBusinessSave() })
  ok(back.screen === 'shop' && back.day === 2 && back.wallet === 40, '接着存档回到打烊')
  ok(back.message === '继续上次的经营', '继续时有提示')
  ok(back.shopOffers[0].id === 'fire', '升级牌还在')
  const replaced = reducer(back, { type: 'START_BUSINESS', notice: 'overwrite' })
  ok(String(replaced.message).includes('原存档已换成这一局'), '覆盖存档有提示')
  ok(saveBusinessRun(replaced), '新一局写入存档')
  const again = loadBusinessSave()
  ok(again.day === 1 && again.screen === 'playing' && again.wallet === 0, '存档已是新的一局')
  ok(!saveBusinessRun({ ...replaced, screen: 'over' }), '关张状态不写入存档')
  clearBusinessSave()
  ok(loadBusinessSave() === null, '可以清掉存档')
  ok(!mem.has(BUSINESS_SAVE_KEY), '存档键已删除')
}

console.log('9. 订单间隔随天数缩短')
{
  ok(orderIntervalForDay(1) === 7, '第 1 天仍是 7 秒')
  ok(orderIntervalForDay(2) === 6.5, '第 2 天 6.5 秒')
  ok(orderIntervalForDay(7) === 4, '第 7 天到达 4 秒')
  ok(orderIntervalForDay(12) === 4, '之后保持 4 秒')
  const rushDay1 = rulesForDay(applyModifier(baseRules(), 'rush'), 1)
  ok(rushDay1.newOrderInterval === 5 && rushDay1.orderTimeScale === 0.9, '第 1 天午市高峰仍是 5 秒，时限九折')
  const rushDay5 = rulesForDay(applyModifier(baseRules(), 'rush'), 5)
  ok(rushDay5.newOrderInterval === 3, `第 5 天午市高峰 ${rushDay5.newOrderInterval} 秒`)
  const plain = rulesForDay(baseRules(), 1)
  ok(plain.newOrderInterval === 7, '没有状况时第 1 天不缩短')
}

console.log('10. 口碑可重复购买')
{
  const maxed = { fire: 2, window: 2, lucky: 2, bell: 2, icm: 2, prefab: 1, tip: 1, urgent: 2 }
  const soldOut = rollShopOffers(maxed, 8)
  ok(soldOut.length === 1 && soldOut[0].id === 'renown', '常规升级买完后商店只剩口碑')
  ok(soldOut[0].cost === RENOWN_COST_BASE, `第一次 ${soldOut[0].cost}`)
  ok(soldOut[0].desc.includes('小费上限 +2') && soldOut[0].desc.includes('急单得分 +2'), soldOut[0].desc)

  const again = rollShopOffers({ ...maxed, renown: 1 }, 8)
  ok(again[0].cost === RENOWN_COST_BASE + RENOWN_COST_STEP, `第二次 ${again[0].cost}`)
  ok(again[0].level === 1, '显示已有等级')

  const thin = rollShopOffers({ ...maxed, fire: 1 }, 8)
  ok(thin.some((o) => o.id === 'fire') && thin.some((o) => o.id === 'renown'), '常规升级不够 3 件时补上一件口碑')
  ok(!rollShopOffers({}, 1).some((o) => o.id === 'renown'), '开业牌池还满时不出现口碑')

  const once = rulesFromUpgrades({ renown: 1 })
  ok(once.comboTipCap === COMBO_TIP_CAP + 2, `口碑后小费上限 ${once.comboTipCap}`)
  ok(once.scoreUrgent === SCORE_URGENT + 2, `口碑后急单 ${once.scoreUrgent}`)
  ok(comboTip(6, once) === 14, '6 连吃到提高后的上限')

  const stacked = rulesFromUpgrades({ tip: 1, urgent: 2, renown: 3 })
  ok(stacked.comboTipCap === COMBO_TIP_CAP_UPGRADED + 6, `小费罐叠加后上限 ${stacked.comboTipCap}`)
  ok(stacked.scoreUrgent === SCORE_URGENT + 16 + 6, `急单赏金叠加后 ${stacked.scoreUrgent}`)

  let s = reducer(createInitialState(), { type: 'START_BUSINESS' })
  s = reducer({ ...s, score: 400, upgrades: maxed, wallet: 0 }, { type: 'SETTLE' })
  ok(s.screen === 'shop' && s.shopOffers.length === 1 && s.shopOffers[0].id === 'renown', '卖空后打烊仍进商店')
  const price = s.shopOffers[0].cost
  s = { ...s, wallet: price }
  s = reducer(s, { type: 'BUY_UPGRADE', id: 'renown' })
  ok(s.wallet === 0 && s.upgrades.renown === 1, '买入口碑并扣款')
  ok(s.shopOffers.length === 0, '同一晚不能连买第二次')
}

console.log('11. 难度、通关和结束清档')
{
  ok(rentForDay(1, 1) === RENT_BASE && rentForDay(1, 8) === RENT_BASE, '第 1 天租金不看难度')
  ok(rentForDay(2, 1) === RENT_BASE + 5, '难度 1 每晚 +5')
  ok(rentForDay(4, 3) === RENT_BASE + 3 * 15, '难度 3 每晚 +15')
  let finite = reducer(createInitialState(), { type: 'START_BUSINESS', span: 'finite', difficulty: 3, notice: 'fresh' })
  ok(finite.span === 'finite' && finite.difficulty === 3, '有限模式带上难度')
  ok(String(finite.message).includes(`满 ${FINITE_GOAL} 天通关`), '开业写明通关天数')
  const played = { ...finite, score: 500, wallet: 0, timeLeft: 20, completedOrders: 2 }
  const day9 = reducer({ ...played, day: 9, rent: rentForDay(9, 3) }, { type: 'SETTLE' })
  ok(day9.screen === 'shop' && !day9.won, '第 9 天付清后还没通关')
  const win = reducer({ ...played, day: 10, rent: rentForDay(10, 3) }, { type: 'SETTLE' })
  ok(win.screen === 'over' && win.won && win.daysCleared === FINITE_GOAL, '付清第 10 天即通关')
  ok(win.wallet === 500 - rentForDay(10, 3), '通关时租金已付')
  const lose = reducer({ ...played, day: 10, score: 0, wallet: 10, rent: rentForDay(10, 3) }, { type: 'SETTLE' })
  ok(lose.screen === 'over' && !lose.won, '第 10 天付不起则关张')
  let endless = reducer(createInitialState(), { type: 'START_BUSINESS', span: 'infinite', difficulty: 1 })
  endless = reducer({ ...endless, day: 10, score: 400, wallet: 0, rent: rentForDay(10, 1), timeLeft: 20, completedOrders: 1 }, { type: 'SETTLE' })
  ok(endless.screen === 'shop' && !endless.won, '无限模式第 10 天继续营业')
  const capped = reducer(createInitialState(), { type: 'START_BUSINESS', difficulty: 99 })
  ok(capped.difficulty === 10, '难度最高 10')

  let rec = emptyRecords()
  for (let i = 0; i < 12; i++) {
    const next = considerRecord(
      { practiceScore: rec.practiceScore, bests: rec.bests, history: rec.history },
      { screen: 'over', mode: 'practice', score: i },
    )
    rec = { practiceScore: next.practiceScore, bests: next.bests, history: next.history }
  }
  ok(rec.history.length === HISTORY_LIMIT && rec.history[0].score === 11 && rec.practiceScore === 11, '只留最近 10 局')

  const mem = globalThis.localStorage
  mem.setItem(RECORD_KEY, JSON.stringify({ practiceScore: 12, businessDays: 2, businessEarned: 73 }))
  const legacy = loadRecords()
  ok(legacy.practiceScore === 12, '旧练习分还在')
  ok(legacy.bests[0].span === 'infinite' && legacy.bests[0].difficulty === LEGACY_DIFFICULTY && legacy.bests[0].days === 2, '旧经营纪录视为无限难度 6')
  mem.setItem(BUSINESS_SAVE_KEY, JSON.stringify({
    mode: 'business', screen: 'over', won: true, orders: [{}], rules: { gameDuration: 60 },
  }))
  ok(loadBusinessSave() === null, '已经结束的存档不再读取')
  ok(mem.getItem(BUSINESS_SAVE_KEY) == null, '已经结束的存档被清掉')
}

console.log(`\n结果: ${pass} 通过, ${fail} 失败`)
process.exit(fail > 0 ? 1 : 0)
