import { useEffect, useReducer, useRef, useState } from 'react'
import {
  reducer,
  createInitialState,
  INGREDIENTS,
  styleName,
  needName,
  rating,
  comboTip,
  modifierById,
  upgradeSummary,
  rentForDay,
  rentStepFor,
  spanName,
  loadRecords,
  saveRecords,
  considerRecord,
  loadBusinessSave,
  saveBusinessRun,
  clearBusinessSave,
  saveSummary,
  bestFor,
  sortedBests,
  formatBest,
  formatHistory,
  RENT_BASE,
  FINITE_GOAL,
  DIFFICULTY_MIN,
  DIFFICULTY_MAX,
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
  const business = state.mode === 'business' && state.screen !== 'start'
  const rules = state.rules
  const duration = rules?.gameDuration || 60
  const nextTip = state.combo >= 1 ? comboTip(state.combo + 1, rules) : 0
  const safe = business && state.wallet + state.score >= state.rent
  const mod = business ? modifierById(state.modifier) : null
  return (
    <header className="game-header">
      <div className="logo">
        🍰 烤蛋糕小店
        {state.screen !== 'start' && (
          <span className="logo-mode">{business ? spanName(state.span) : '练习'}</span>
        )}
      </div>
      <div className="hud">
        {business && (
          <div className="hud-chip day" title={mod ? mod.desc : '开业日，没有额外状况'}>
            {state.span === 'finite' ? `有限 ${state.day}/${FINITE_GOAL}` : `无限 第 ${state.day} 天`}
            {' · '}
            {mod ? mod.name : '开业'}
          </div>
        )}
        {business && <div className="hud-chip">难度 {state.difficulty}</div>}
        <div className="hud-score">{business ? '今日' : '⭐'} {state.score}</div>
        {business && <div className="hud-chip">手头 {state.wallet}</div>}
        {business && (
          <div className={`hud-chip rent ${safe ? 'safe' : ''}`}>
            租金 {state.rent}{safe ? ' ✓' : ''}
          </div>
        )}
        <div className={`hud-combo ${state.combo >= 2 ? 'hot' : ''}`}>
          🔥 x{state.combo}{nextTip > 0 ? ` · 下一单 +${nextTip}` : ''}
        </div>
        <div className="hud-time">
          <Bar value={state.timeLeft} max={duration} color="#F5A623" />
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
function OrderCard({ order, urgentScore = 25 }) {
  const urgent = order.timeLeft < 8
  return (
    <div className={`order-card ${order.urgent ? 'rush' : ''} ${order.blind ? 'blind' : ''} ${urgent ? 'urgent' : ''}`}>
      <div className="order-head">
        {order.urgent ? `⚡ 急单 · 完成 +${urgentScore} 分 · 超时不扣分` : order.blind ? '🎁 盲盒 · 随机 5~20 分 · 超时不扣分' : '📋 顾客订单'}
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
          <OrderCard key={o.id} order={o} urgentScore={state.rules?.scoreUrgent ?? 25} />
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
function StartScreen({ dispatch, records, businessSave, menuHint, onBusiness }) {
  return (
    <div className="overlay">
      <div className="panel start-panel wide">
        <h1>🍰 烤蛋糕小店</h1>
        <p className="subtitle">练习和每种经营难度分开记最高，并留下最近 10 局。</p>
        {menuHint && <p className="menu-hint">{menuHint}</p>}
        <div className="mode-grid">
          <section className="mode-card">
            <h3>练习模式</h3>
            <p>一局 60 秒，冲击单局最高分。连击从第 2 单开始给小费。</p>
            <p className="mode-record">最高纪录：{records.practiceScore} 分</p>
            <button className="btn" onClick={() => dispatch({ type: 'START_PRACTICE' })}>
              开始练习
            </button>
          </section>
          <section className="mode-card">
            <h3>经营模式</h3>
            <p>每天 60 秒。可选有限或无限，并自选难度。进行中会存档，关张或通关后存档清除。</p>
            <p className="mode-record">
              {records.bests.length > 0 ? `已记下 ${records.bests.length} 个难度的最高纪录` : '最高纪录：还没有'}
            </p>
            {businessSave && <p className="save-note">存档：{saveSummary(businessSave)}</p>}
            <button className="btn" onClick={onBusiness}>
              {businessSave ? '进入经营' : '开始经营'}
            </button>
          </section>
        </div>
        <ul className="rules">
          <li>🔥 连击小费：2 连 <b>+3</b>，3 连 <b>+6</b>，4 连 <b>+9</b>，5 连及以上 <b>+12</b>。<b>只有订单超时</b>会断连击</li>
          <li>📋 订单时限 15-40 秒；常规超时 <b>-5</b>，急单和盲盒超时不扣分。常规 <b>+10</b>，半程前完成 <b>+15</b>，急单 <b>+25</b>，盲盒随机 <b>5~20</b></li>
          <li>🧁 蛋糕胚烤 5 秒，8 秒内取出；超时会糊，双击清理。奶油百搭，巧克力不能和草莓、芒果同时放</li>
          <li>🐱 猫会靠近蛋糕，3 秒内点走。烤糊和被偷都不断连击</li>
          <li>🏪 经营模式第 1 天租金 50。难度 1 之后每晚 +5，难度每高 1 级再多 +5。有限模式满 10 天通关。订单间隔从第 2 天起每天缩短 0.5 秒，最短 4 秒。常规升级变少后可买「口碑」</li>
        </ul>
        <div className="history-block">
          <h3>历史最高</h3>
          <ul className="history-list">
            <li>练习 · {records.practiceScore} 分</li>
            {sortedBests(records).map((best) => (
              <li key={`${best.span}-${best.difficulty}`}>{formatBest(best)}</li>
            ))}
            {records.bests.length === 0 && <li>经营模式还没有纪录</li>}
          </ul>
          <h3>最近对局</h3>
          {records.history.length === 0 ? (
            <p className="subtitle">还没有对局。</p>
          ) : (
            <ol className="history-list">
              {records.history.map((item, index) => (
                <li key={index}>{formatHistory(item)}</li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  )
}

function PauseOverlay({ state, dispatch }) {
  const business = state.mode === 'business'
  return (
    <div className="overlay">
      <div className="panel">
        <h2>⏸ 已暂停</h2>
        <div className="btn-row">
          <button className="btn big" onClick={() => dispatch({ type: 'RESUME' })}>
            继续游戏
          </button>
          <button className="btn big ghost" onClick={() => dispatch({ type: 'SETTLE' })}>
            {business ? '提前打烊' : '直接结算'}
          </button>
        </div>
      </div>
    </div>
  )
}

function GameOverScreen({ state, dispatch, records, justRecord, onMenu, onNewBusiness }) {
  if (state.mode === 'business') {
    const owned = upgradeSummary(state.upgrades)
    const best = bestFor(records, state.span, state.difficulty)
    return (
      <div className="overlay">
        <div className="panel">
          <h2>{state.won ? '通关！' : '店铺关张'}</h2>
          {justRecord && <div className="new-record">新纪录！</div>}
          <div className="final-score">
            {state.won ? FINITE_GOAL : (state.daysCleared ?? state.day)} <span>天</span>
          </div>
          <div className="stat-line">
            {spanName(state.span)} · 难度 {state.difficulty} · 每晚 +{rentStepFor(state.difficulty)}
          </div>
          {state.lostReason && <div className="stat-line">{state.lostReason}</div>}
          <div className="stat-line">
            累计报酬 {state.totalEarned} · 完成订单 {state.runCompleted} 单 · 最高连击 x{state.runMaxCombo}
          </div>
          {owned && <div className="owned-line">设备：{owned}</div>}
          <div className="stat-line">历史最高：{best ? formatBest(best) : '还没有'}</div>
          <div className="btn-row">
            <button className="btn big ghost" onClick={onMenu}>返回主界面</button>
            <button className="btn big" onClick={onNewBusiness}>再开一轮</button>
          </div>
        </div>
      </div>
    )
  }
  const r = rating(state.score)
  return (
    <div className="overlay">
      <div className="panel">
        <h2>🎉 营业结束！</h2>
        {justRecord && <div className="new-record">新纪录！</div>}
        <div className="final-score">
          {state.score} <span>分</span>
        </div>
        <div className="grade">
          {r.grade} · {r.text}
        </div>
        <div className="stat-line">
          完成订单：{state.completedOrders} 单 · 最高连击：x{state.maxCombo}
        </div>
        <div className="stat-line">历史最高：{records.practiceScore} 分</div>
        <div className="btn-row">
          <button className="btn big ghost" onClick={() => dispatch({ type: 'MENU' })}>返回主界面</button>
          <button className="btn big" onClick={() => dispatch({ type: 'START_PRACTICE' })}>再来一局 🔄</button>
        </div>
      </div>
    </div>
  )
}

function ShopScreen({ state, dispatch, onMenu }) {
  const owned = upgradeSummary(state.upgrades)
  return (
    <div className="overlay">
      <div className="panel wide">
        <h2>第 {state.day} 天打烊</h2>
        <p className="pay-line">今日得分 {state.score} · 已付租金 {state.rent} · 余额 {state.wallet}</p>
        <p className="subtitle">挑一件升级，或者直接去选明天的状况。返回主界面会把这一局存下来。</p>
        {owned && <p className="owned-line">已有：{owned}</p>}
        <div className="shop-list">
          {state.shopOffers.map((offer) => (
            <div key={offer.id} className="shop-card">
              <div>
                <b>{offer.name} · 升到 {offer.level + 1} 级</b>
                <p>{offer.desc}</p>
              </div>
              <button
                className="btn"
                disabled={state.wallet < offer.cost}
                onClick={() => dispatch({ type: 'BUY_UPGRADE', id: offer.id })}
              >
                {offer.cost} 购入
              </button>
            </div>
          ))}
          {state.shopOffers.length === 0 && <p className="subtitle">今晚没有更多可买的升级。</p>}
        </div>
        <div className="btn-row">
          <button className="btn big ghost" onClick={onMenu}>返回主界面</button>
          <button className="btn big" onClick={() => dispatch({ type: 'LEAVE_SHOP' })}>选择明日状况</button>
        </div>
      </div>
    </div>
  )
}

function ModifierScreen({ state, dispatch, onMenu }) {
  const owned = upgradeSummary(state.upgrades)
  const nextDay = state.day + 1
  const nextRent = rentForDay(nextDay, state.difficulty)
  const lastDay = state.span === 'finite' && nextDay >= FINITE_GOAL
  return (
    <div className="overlay">
      <div className="panel wide">
        <h2>明天怎么营业？</h2>
        <p className="pay-line">第 {nextDay} 天租金 {nextRent} · 手头 {state.wallet}</p>
        {lastDay && <p className="subtitle">明天付清租金就通关。</p>}
        {owned && <p className="owned-line">已有：{owned}</p>}
        <p className="subtitle">选一个状况就开业。返回主界面会把这一局存下来，下次仍从这里接着选。</p>
        <div className="mod-grid">
          {state.modifierChoices.map((m) => (
            <button
              key={m.id}
              className="mod-card"
              onClick={() => dispatch({ type: 'PICK_MODIFIER', id: m.id })}
            >
              <b>{m.name}</b>
              <p>{m.desc}</p>
            </button>
          ))}
        </div>
        <div className="btn-row">
          <button className="btn big ghost" onClick={onMenu}>返回主界面</button>
        </div>
      </div>
    </div>
  )
}

function SaveGate({ save, onContinue, onSetup, onBack }) {
  return (
    <div className="overlay front">
      <div className="panel">
        <h2>经营模式</h2>
        <p className="save-note">存档：{saveSummary(save)}</p>
        <p className="subtitle">可以接着这一局，也可以另选有限或无限、再选难度。新开会换掉这份存档。</p>
        <div className="btn-row">
          <button className="btn big ghost" onClick={onBack}>返回</button>
          <button className="btn big ghost" onClick={onSetup}>新开一局</button>
          <button className="btn big" onClick={onContinue}>接着存档</button>
        </div>
      </div>
    </div>
  )
}

function BusinessSetup({ save, draft, setDraft, onStart, onBack, onContinue }) {
  const step = rentStepFor(draft.difficulty)
  const finite = draft.span === 'finite'
  return (
    <div className="overlay front">
      <div className="panel wide">
        <h2>{save ? '新开一局' : '经营模式'}</h2>
        {save && (
          <>
            <p className="save-note">当前存档：{saveSummary(save)}</p>
            <p className="subtitle">确定后，存档会换成这新开的一局。</p>
          </>
        )}
        <div className="mode-grid">
          <button
            className={`mod-card ${finite ? 'picked' : ''}`}
            onClick={() => setDraft((d) => ({ ...d, span: 'finite' }))}
          >
            <b>有限模式</b>
            <p>付清第 {FINITE_GOAL} 天的租金即胜利。</p>
          </button>
          <button
            className={`mod-card ${finite ? '' : 'picked'}`}
            onClick={() => setDraft((d) => ({ ...d, span: 'infinite' }))}
          >
            <b>无限模式</b>
            <p>一直经营，直到付不起当天租金。</p>
          </button>
        </div>
        <div className="diff-row">
          <button
            className="btn"
            disabled={draft.difficulty <= DIFFICULTY_MIN}
            onClick={() => setDraft((d) => ({ ...d, difficulty: d.difficulty - 1 }))}
          >
            －
          </button>
          <div>
            <b>难度 {draft.difficulty}</b>
            <p>第 1 天租金 {RENT_BASE}，之后每晚 +{step}</p>
          </div>
          <button
            className="btn"
            disabled={draft.difficulty >= DIFFICULTY_MAX}
            onClick={() => setDraft((d) => ({ ...d, difficulty: d.difficulty + 1 }))}
          >
            ＋
          </button>
        </div>
        <div className="btn-row">
          <button className="btn big ghost" onClick={onBack}>返回</button>
          {save && <button className="btn big ghost" onClick={onContinue}>接着存档</button>}
          <button className="btn big" onClick={onStart}>{save ? '确定新开' : '开始经营'}</button>
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
  const [records, setRecords] = useState(() => loadRecords())
  const [justRecord, setJustRecord] = useState(false)
  const [businessSave, setBusinessSave] = useState(() => loadBusinessSave())
  const [gate, setGate] = useState(null)
  const [draft, setDraft] = useState({ span: 'finite', difficulty: DIFFICULTY_MIN })
  const [menuHint, setMenuHint] = useState('')
  const savedRun = useRef(null)
  const writeSave = useRef(false)

  useEffect(() => {
    if (state.screen !== 'playing') return
    const timer = setInterval(() => dispatch({ type: 'TICK' }), 100)
    return () => clearInterval(timer)
  }, [state.screen])

  useEffect(() => {
    if (state.screen !== 'over') {
      savedRun.current = null
      setJustRecord(false)
      return
    }
    if (savedRun.current === state.runId) return
    savedRun.current = state.runId
    const next = considerRecord(records, state)
    if (next !== records) {
      const stored = {
        practiceScore: next.practiceScore,
        bests: next.bests,
        history: next.history,
      }
      saveRecords(stored)
      setRecords(stored)
      setJustRecord(!!next.improved)
    } else {
      setJustRecord(false)
    }
  }, [state.screen, state.runId])

  useEffect(() => {
    if (state.mode !== 'business' || state.screen !== 'over') return
    clearBusinessSave()
    setBusinessSave(null)
  }, [state.mode, state.screen, state.runId])

  useEffect(() => {
    if (!writeSave.current) return
    if (state.mode !== 'business' || state.screen !== 'playing') return
    saveBusinessRun(state)
    setBusinessSave(loadBusinessSave())
    writeSave.current = false
  }, [state])

  function beginBusiness(notice, setup) {
    const picked = setup || draft
    writeSave.current = true
    setGate(null)
    setMenuHint('')
    dispatch({
      type: 'START_BUSINESS',
      notice,
      span: picked.span,
      difficulty: picked.difficulty,
    })
  }

  function openBusiness() {
    const save = loadBusinessSave()
    setBusinessSave(save)
    setMenuHint('')
    setGate(save ? 'choose' : 'setup')
  }

  function continueBusiness() {
    const save = loadBusinessSave()
    setGate(null)
    setMenuHint('')
    if (!save) return
    dispatch({ type: 'CONTINUE_BUSINESS', save })
  }

  function leaveToMenu() {
    if (state.mode === 'business' && (state.screen === 'shop' || state.screen === 'modifier')) {
      saveBusinessRun(state)
      setBusinessSave(loadBusinessSave())
      setMenuHint('本局已存档。下次进入经营模式可以接着玩。')
    }
    if (state.mode === 'business' && state.screen === 'over') {
      setMenuHint('')
    }
    setGate(null)
    dispatch({ type: 'MENU' })
  }

  return (
    <div className="game-shell">
      <Header state={state} dispatch={dispatch} />
      <OrdersRow state={state} />
      <PlayArea state={state} dispatch={dispatch} />
      <IngredientBar dispatch={dispatch} />
      <Toast message={state.message} msgKey={state.msgKey} />
      {state.screen === 'start' && (
        <StartScreen
          dispatch={dispatch}
          records={records}
          businessSave={businessSave}
          menuHint={menuHint}
          onBusiness={openBusiness}
        />
      )}
      {gate === 'choose' && businessSave && (
        <SaveGate
          save={businessSave}
          onContinue={continueBusiness}
          onSetup={() => setGate('setup')}
          onBack={() => setGate(null)}
        />
      )}
      {gate === 'setup' && (
        <BusinessSetup
          save={businessSave}
          draft={draft}
          setDraft={setDraft}
          onContinue={continueBusiness}
          onBack={() => setGate(businessSave && state.screen === 'start' ? 'choose' : null)}
          onStart={() => beginBusiness(businessSave ? 'overwrite' : 'fresh', draft)}
        />
      )}
      {state.screen === 'paused' && <PauseOverlay state={state} dispatch={dispatch} />}
      {state.screen === 'shop' && <ShopScreen state={state} dispatch={dispatch} onMenu={leaveToMenu} />}
      {state.screen === 'modifier' && <ModifierScreen state={state} dispatch={dispatch} onMenu={leaveToMenu} />}
      {state.screen === 'over' && (
        <GameOverScreen
          state={state}
          dispatch={dispatch}
          records={records}
          justRecord={justRecord}
          onMenu={leaveToMenu}
          onNewBusiness={() => {
            const save = loadBusinessSave()
            setBusinessSave(save)
            const again = { span: state.span === 'finite' ? 'finite' : 'infinite', difficulty: state.difficulty || DIFFICULTY_MIN }
            setDraft(again)
            if (save) setGate('setup')
            else beginBusiness('fresh', again)
          }}
        />
      )}
    </div>
  )
}
