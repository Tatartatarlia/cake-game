import { useEffect, useReducer, useRef, useState } from 'react'
import {
  reducer,
  createInitialState,
  INGREDIENTS,
  styleName,
  needName,
  rating,
  GAME_DURATION,
} from './game.js'
import { FoodCanvas, CustomerCanvas, CatCanvas, drawIngredientIcon } from './draw.jsx'

// ------------------------------------------------------------
// 通用小组件
// ------------------------------------------------------------
function Bar({ value, max, color }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className="bar">
      <div className="bar-fill" style={{ width: pct + '%', background: color }} />
    </div>
  )
}

function Toast({ message, msgKey }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!msgKey) return
    setVisible(true)
    const t = setTimeout(() => setVisible(false), 1800)
    return () => clearTimeout(t)
  }, [msgKey])
  if (!visible || !message) return null
  return <div className="toast">{message}</div>
}

function IngredientIcon({ id, size = 48 }) {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    drawIngredientIcon(canvas.getContext('2d'), size, id)
  }, [id, size])
  return <canvas ref={ref} width={size} height={size} style={{ width: size, height: size }} />
}

// ------------------------------------------------------------
// 顶部栏
// ------------------------------------------------------------
function Header({ state, dispatch }) {
  return (
    <header className="game-header">
      <div className="logo">🍰 烤蛋糕小店</div>
      <div className="hud">
        <div className="hud-score">⭐ {state.score}</div>
        <div className={`hud-combo ${state.combo >= 2 ? 'hot' : ''}`}>
          🔥 连击 x{state.combo}
        </div>
        <div className="hud-time">
          <Bar value={state.timeLeft} max={GAME_DURATION} color="#F5A623" />
          <span>⏱ {Math.ceil(state.timeLeft)}s</span>
        </div>
        {state.screen === 'playing' && (
          <button className="btn pause-btn" onClick={() => dispatch({ type: 'PAUSE' })}>
            ⏸ 暂停
          </button>
        )}
      </div>
    </header>
  )
}

// ------------------------------------------------------------
// 订单区 + 顾客窗口
// ------------------------------------------------------------
function OrderCard({ order }) {
  const urgent = order.timeLeft < 8
  return (
    <div className={`order-card ${order.urgent ? 'rush' : ''} ${order.blind ? 'blind' : ''} ${urgent ? 'urgent' : ''}`}>
      <div className="order-head">
        {order.urgent ? '⚡ 急单 · 完成 +25 分 · 超时不扣分' : order.blind ? '🎁 盲盒 · 随机 5~20 分 · 超时不扣分' : '📋 顾客订单'}
      </div>
      <div className="order-needs">
        {order.remaining.map((n, i) => (
          <div key={i} className="order-need">
            <FoodCanvas
              kind={n.type === 'any' ? 'blind' : n.type === 'icecream' ? 'icecream' : 'cake'}
              toppings={n.toppings}
              size={60}
            />
            <span>{needName(n)}</span>
          </div>
        ))}
      </div>
      <div className="order-time">
        <Bar
          value={order.timeLeft}
          max={order.total}
          color={order.urgent ? '#9B59B6' : urgent ? '#E8484E' : '#5DBB63'}
        />
        <span>{Math.ceil(order.timeLeft)}s</span>
      </div>
    </div>
  )
}

function OrdersRow({ state }) {
  const customerOrder = state.customer
    ? state.orders.find((o) => o.id === state.customer.orderId)
    : null
  const needIcons = customerOrder
    ? customerOrder.remaining.map((n) => ({
        kind: n.type === 'icecream' ? 'icecream' : 'cake',
        toppings: n.toppings,
      }))
    : []
  return (
    <div className="orders-row">
      <div className="orders-list">
        {state.orders.map((o) => (
          <OrderCard key={o.id} order={o} />
        ))}
        {state.orders.length === 0 && (
          <div className="orders-empty">暂时没有订单，稍等顾客上门…</div>
        )}
      </div>
      <div className="customer-window">
        <CustomerCanvas order={customerOrder} needIcons={needIcons} width={300} height={170} />
      </div>
    </div>
  )
}

// ------------------------------------------------------------
// 游戏区：烘烤机 / 盘子 / 冰激凌机 / 冰箱
// ------------------------------------------------------------
function OvenBox({ oven, onClock, onClear }) {
  return (
    <div
      className={`slot oven ${oven.state}`}
      onClick={() => onClock(oven.id)}
      onDoubleClick={() => onClear(oven.id)}
      title={oven.state === 'burned' ? '双击清理糊掉的蛋糕' : '点击操作'}
    >
      <div className="oven-door">
        {oven.state === 'empty' && (
          <div className="slot-empty">
            <span className="slot-label">空</span>
          </div>
        )}
        {oven.state === 'baking' && (
          <>
            <FoodCanvas kind="batter" size={56} />
            <div className="mini-bar">
              <Bar value={oven.progress} max={1} color={oven.fast ? '#FF4D4D' : '#F5A623'} />
            </div>
            <div className={`slot-hint ${oven.fast ? 'fast' : ''}`}>
              {oven.fast ? '⚡ 加速烘烤中…' : '烘烤中…'}
            </div>
          </>
        )}
        {oven.state === 'ready' && (
          <div className="oven-ready">
            <FoodCanvas kind="cake" size={56} />
            <div className="slot-hint ready">
              取蛋糕！<br />
              {oven.window.toFixed(1)}s
            </div>
          </div>
        )}
        {oven.state === 'burned' && (
          <div className="oven-burned">
            <FoodCanvas kind="burned" size={56} />
            <div className="slot-hint">🔥 糊了！双击清理</div>
          </div>
        )}
      </div>
      <div className="oven-knob" />
    </div>
  )
}

function PlateBox({ plate, onClock }) {
  return (
    <div
      className={`slot plate ${plate.cake ? 'has-cake' : ''}`}
      onClick={() => onClock(plate.id)}
      title="点击交付或暂存"
    >
      {plate.cake ? (
        <>
          <FoodCanvas kind="cake" toppings={plate.cake.toppings} size={68} />
          <div className="slot-name">{styleName(plate.cake.toppings)}</div>
          <div className="slot-hint">点击交付 / 暂存</div>
        </>
      ) : (
        <div className="slot-empty">
          <span className="plate-icon">🍽️</span>
          <span className="slot-label">空盘子</span>
        </div>
      )}
    </div>
  )
}

function IceCreamBox({ icm, onClock }) {
  return (
    <div className={`slot icm ${icm.state}`} onClick={() => onClock(icm.id)} title="点击制作 / 交付">
      {icm.state === 'empty' && (
        <div className="slot-empty">
          <span className="icm-icon">🍦</span>
          <span className="slot-label">点击制作</span>
        </div>
      )}
      {icm.state === 'making' && (
        <>
          <FoodCanvas kind="icecream" size={56} />
          <div className="mini-bar">
            <Bar value={icm.progress} max={1} color="#FF9EC4" />
          </div>
          <div className="slot-hint">制作中…</div>
        </>
      )}
      {icm.state === 'stuck' && (
        <div className="icm-stuck">
          <FoodCanvas kind="icecream" size={56} />
          <div className="slot-hint stuck">⚠️ 卡壳！点击继续</div>
        </div>
      )}
      {icm.state === 'ready' && (
        <>
          <FoodCanvas kind="icecream" size={56} />
          <div className="slot-hint ready">点击交付</div>
        </>
      )}
    </div>
  )
}

function FreezerBox({ cake, index, onClock }) {
  return (
    <div
      className={`slot freezer ${cake ? 'has-cake' : ''}`}
      onClick={() => onClock(index)}
      title="点击交付冰箱里的蛋糕"
    >
      {cake ? (
        <>
          <FoodCanvas kind="cake" toppings={cake} size={56} />
          <div className="slot-name">{styleName(cake)}</div>
          <div className="slot-hint">点击交付</div>
        </>
      ) : (
        <div className="slot-empty">
          <span className="freezer-icon">🧊</span>
          <span className="slot-label">空</span>
        </div>
      )}
    </div>
  )
}

// 猫徽章：出现在目标盘子旁，点击赶走
function CatBadge({ timeLeft, onCatch }) {
  return (
    <button className="cat-badge" onClick={onCatch} title="点击赶走猫！">
      <CatCanvas size={64} />
      <span className="cat-timer">{timeLeft.toFixed(1)}s</span>
      <span className="cat-label">点击赶走！</span>
    </button>
  )
}

function PlayArea({ state, dispatch }) {
  return (
    <div className="play-area">
      <div className="col">
        <div className="col-title">🔥 烘烤机</div>
        {state.ovens.map((ov) => (
          <OvenBox
            key={ov.id}
            oven={ov}
            onClock={(id) => dispatch({ type: 'CLICK_OVEN', id })}
            onClear={(id) => dispatch({ type: 'CLEAR_OVEN', id })}
          />
        ))}
      </div>
      <div className="col">
        <div className="col-title">🍽️ 盘子</div>
        {state.plates.map((p) => (
          <div key={p.id} className="plate-slot-wrap">
            <PlateBox plate={p} onClock={(id) => dispatch({ type: 'CLICK_PLATE', id })} />
            {state.cat && state.cat.plateId === p.id && (
              <CatBadge timeLeft={state.cat.timeLeft} onCatch={() => dispatch({ type: 'CLICK_CAT' })} />
            )}
          </div>
        ))}
      </div>
      <div className="col">
        <div className="col-title">🍦 冰激凌机</div>
        {state.iceCreams.map((ic) => (
          <IceCreamBox key={ic.id} icm={ic} onClock={(id) => dispatch({ type: 'CLICK_ICM', id })} />
        ))}
      </div>
      <div className="col">
        <div className="col-title">🧊 冰箱</div>
        {state.freezers.map((f, i) => (
          <FreezerBox key={i} cake={f} index={i} onClock={(id) => dispatch({ type: 'CLICK_FREEZER', id })} />
        ))}
      </div>
    </div>
  )
}

// ------------------------------------------------------------
// 底部材料栏（无限供应，固定可见）
// ------------------------------------------------------------
function IngredientBar({ dispatch }) {
  return (
    <div className="ingredient-bar">
      {INGREDIENTS.map((ing) => (
        <button
          key={ing.id}
          className="ingredient-btn"
          onClick={() => dispatch({ type: 'CLICK_INGREDIENT', ingredient: ing.id })}
          title={ing.hint}
        >
          <IngredientIcon id={ing.id} size={44} />
          <span className="ing-name">{ing.name}</span>
          <span className="ing-hint">{ing.hint}</span>
        </button>
      ))}
    </div>
  )
}

// ------------------------------------------------------------
// 覆盖层：开始 / 暂停 / 结算
// ------------------------------------------------------------
function StartScreen({ dispatch }) {
  return (
    <div className="overlay">
      <div className="panel start-panel">
        <h1>🍰 烤蛋糕小店</h1>
        <p className="subtitle">60 秒限时接单，前 20 秒最多 2 单，之后最多 3 单！</p>
        <ul className="rules">
          <li>📋 订单时限 <b>15-40 秒随机</b>；常规订单超时 <b>-5 分</b>、急单超时不扣分；得分：常规 <b>+10</b>、时限过半前完成 <b>+15</b>、急单 <b>+25</b></li>
          <li>🎁 <b>10% 盲盒订单</b>：只显示问号，随便交付一个蛋糕或冰激凌即可完成，随机得 5~20 分</li>
          <li>⚡ 烘烤 15% 概率「<b>加速烘烤</b>」（时间减半）；新订单 10% 概率直接是「<b>急单</b>」（时间减半、+25 分），越到后期概率越高，已有订单不会被转成急单</li>
          <li>🍦 冰激凌机 10% 概率<b>卡壳</b>，需再点一次继续制作</li>
          <li>🐱 <b>猫</b>会悄悄靠近蛋糕，3 秒内点击赶走它，否则蛋糕被偷走</li>
          <li>🧁 点「蛋糕胚」放进烘烤机，烤好后 <b>8 秒内</b>取出放空盘；超时会糊，<b>双击</b>清理</li>
          <li>🍓 奶油百搭；巧克力酱不能和草莓/芒果同时放；不符合订单的蛋糕可暂存冰箱</li>
          <li>⏸ 随时可暂停；结算页可再来一局或返回主界面</li>
        </ul>
        <button className="btn big" onClick={() => dispatch({ type: 'START' })}>
          开始营业 🎂
        </button>
      </div>
    </div>
  )
}

function PauseOverlay({ dispatch }) {
  return (
    <div className="overlay">
      <div className="panel">
        <h2>⏸ 已暂停</h2>
        <div className="btn-row">
          <button className="btn big" onClick={() => dispatch({ type: 'RESUME' })}>
            继续游戏
          </button>
          <button className="btn big ghost" onClick={() => dispatch({ type: 'SETTLE' })}>
            直接结算
          </button>
        </div>
      </div>
    </div>
  )
}

function GameOverScreen({ state, dispatch }) {
  const r = rating(state.score)
  return (
    <div className="overlay">
      <div className="panel">
        <h2>🎉 营业结束！</h2>
        <div className="final-score">
          {state.score} <span>分</span>
        </div>
        <div className="grade">
          {r.grade} · {r.text}
        </div>
        <div className="stat-line">
          完成订单：{state.completedOrders} 单 · 最高连击：x{state.maxCombo}
        </div>
        <div className="btn-row">
          <button className="btn big ghost" onClick={() => dispatch({ type: 'MENU' })}>返回主界面</button>
          <button className="btn big" onClick={() => dispatch({ type: 'START' })}>再来一局 🔄</button>
        </div>
      </div>
    </div>
  )
}

// ------------------------------------------------------------
// 主组件
// ------------------------------------------------------------
export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState)

  useEffect(() => {
    if (state.screen !== 'playing') return
    const timer = setInterval(() => dispatch({ type: 'TICK' }), 100)
    return () => clearInterval(timer)
  }, [state.screen])

  return (
    <div className="game-shell">
      <Header state={state} dispatch={dispatch} />
      <OrdersRow state={state} />
      <PlayArea state={state} dispatch={dispatch} />
      <IngredientBar dispatch={dispatch} />
      <Toast message={state.message} msgKey={state.msgKey} />
      {state.screen === 'start' && <StartScreen dispatch={dispatch} />}
      {state.screen === 'paused' && <PauseOverlay dispatch={dispatch} />}
      {state.screen === 'over' && <GameOverScreen state={state} dispatch={dispatch} />}
    </div>
  )
}
