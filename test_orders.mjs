import { reducer } from './src/game.js'

let totalMax = 0
let totalAvg = 0
let maxSeen = 0
for (let game = 0; game < 200; game++) {
  let s = reducer(undefined, { type: 'START' })
  let max = 0
  const mats = ['batter', 'cream', 'chocolate', 'strawberry', 'mango']
  for (let i = 0; i < 1000 && s.screen !== 'over'; i++) {
    if (Math.random() < 0.35) {
      const r = Math.random()
      if (r < 0.22) s = reducer(s, { type: 'CLICK_INGREDIENT', ingredient: mats[Math.floor(Math.random() * mats.length)] })
      else if (r < 0.42) s = reducer(s, { type: 'CLICK_OVEN', id: Math.floor(Math.random() * 3) })
      else if (r < 0.58) s = reducer(s, { type: 'CLICK_PLATE', id: Math.floor(Math.random() * 3) })
      else if (r < 0.72) s = reducer(s, { type: 'CLICK_FREEZER', id: Math.floor(Math.random() * 3) })
      else if (r < 0.9) s = reducer(s, { type: 'CLICK_ICM', id: Math.floor(Math.random() * 3) })
      else {
        const bi = s.ovens.findIndex((o) => o.state === 'burned')
        if (bi >= 0) s = reducer(s, { type: 'CLEAR_OVEN', id: bi })
      }
    } else {
      s = reducer(s, { type: 'TICK' })
    }
    if (s.orders.length > max) max = s.orders.length
  }
  if (max > maxSeen) maxSeen = max
  totalMax += max
  totalAvg += s.completedOrders
}
console.log('200局中 同时出现订单数最大值:', maxSeen)
console.log('平均每局最大同时订单数:', (totalMax / 200).toFixed(2))
console.log('平均完成订单数:', (totalAvg / 200).toFixed(2))
