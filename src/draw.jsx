// ============================================================
// Canvas 绘制：所有食物外观（可爱矢量风格）
// drawFood(ctx, size, kind, toppings)
//   kind: 'batter' | 'burned' | 'cake' | 'icecream'
//   toppings: { cream, chocolate, strawberry, mango }
// ============================================================
import { useEffect, useRef } from 'react'

// 颜色
const C_BATTER = '#F2D9A8'      // 未烤蛋糕胚（米黄）
const C_BATTER_TOP = '#FAEBC8'
const C_BAKED = '#FFAEC9'       // 烤好蛋糕胚（粉色）
const C_BAKED_TOP = '#FFC4DA'
const C_BURNED = '#6E4B36'      // 糊掉的蛋糕（深棕）
const C_BURNED_TOP = '#8A6248'
const C_CHOCO = '#6B3E26'       // 巧克力酱
const C_CREAM = '#FFD23F'       // 奶油花边
const C_STRAWBERRY = '#E8484E'  // 草莓红
const C_MANGO = '#F5A623'       // 芒果橙黄
const C_LEAF = '#5DBB63'        // 叶子绿

// 圆柱体蛋糕底座
function cakeBody(ctx, cx, baseY, w, h, sideColor, topColor) {
  const topY = baseY - h
  // 侧面
  ctx.fillStyle = sideColor
  roundRect(ctx, cx - w / 2, topY + h * 0.28, w, h * 0.72, 6)
  ctx.fill()
  // 顶面椭圆
  ctx.fillStyle = topColor
  ctx.beginPath()
  ctx.ellipse(cx, topY + h * 0.28, w / 2, h * 0.22, 0, 0, Math.PI * 2)
  ctx.fill()
  // 顶面高光
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.beginPath()
  ctx.ellipse(cx - w * 0.12, topY + h * 0.22, w * 0.16, h * 0.08, 0, 0, Math.PI * 2)
  ctx.fill()
}

// 底部奶油花边（一排白色半圆挤花）
function creamBorder(ctx, cx, baseY, w, h) {
  ctx.fillStyle = C_CREAM
  const n = 6
  const step = w / n
  const r = step * 0.72
  for (let i = 0; i < n; i++) {
    const x = cx - w / 2 + step * (i + 0.5)
    ctx.beginPath()
    ctx.arc(x, baseY - h * 0.06, r, 0, Math.PI, false)
    ctx.fill()
  }
  // 花边高光
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  for (let i = 0; i < n; i++) {
    const x = cx - w / 2 + step * (i + 0.5)
    ctx.beginPath()
    ctx.arc(x, baseY - h * 0.06, r * 0.45, 0, Math.PI, false)
    ctx.fill()
  }
}

// 巧克力酱：覆盖顶面并淋下
function chocolateTop(ctx, cx, topY, w, h) {
  ctx.fillStyle = C_CHOCO
  ctx.beginPath()
  ctx.ellipse(cx, topY + h * 0.28, w / 2, h * 0.22, 0, 0, Math.PI * 2)
  ctx.fill()
  // 淋边水滴
  const n = 4
  for (let i = 0; i < n; i++) {
    const x = cx - w * 0.34 + (w * 0.68 * i) / (n - 1)
    ctx.beginPath()
    ctx.arc(x, topY + h * 0.28 + h * 0.14, w * 0.06, 0, Math.PI * 2)
    ctx.fill()
  }
  // 高光
  ctx.fillStyle = 'rgba(255,255,255,0.28)'
  ctx.beginPath()
  ctx.ellipse(cx - w * 0.1, topY + h * 0.22, w * 0.14, h * 0.07, 0, 0, Math.PI * 2)
  ctx.fill()
}

// 草莓
export function drawStrawberry(ctx, cx, cy, s) {
  ctx.save()
  ctx.translate(cx, cy)
  // 果身（圆润倒三角）
  ctx.fillStyle = C_STRAWBERRY
  ctx.beginPath()
  ctx.moveTo(0, -s * 0.95)
  ctx.bezierCurveTo(s * 1.1, -s * 0.35, s * 0.85, s * 0.85, 0, s * 0.95)
  ctx.bezierCurveTo(-s * 0.85, s * 0.85, -s * 1.1, -s * 0.35, 0, -s * 0.95)
  ctx.fill()
  // 籽
  ctx.fillStyle = '#FFD97A'
  const seeds = [[-0.35, 0.05], [0.35, 0.05], [0, 0.5], [-0.5, -0.35], [0.5, -0.35], [0, -0.15]]
  for (const [dx, dy] of seeds) {
    ctx.beginPath()
    ctx.ellipse(dx * s, dy * s, s * 0.07, s * 0.1, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  // 叶子
  ctx.fillStyle = C_LEAF
  for (const a of [-0.6, 0, 0.6]) {
    ctx.save()
    ctx.rotate(a)
    ctx.beginPath()
    ctx.ellipse(0, -s * 0.85, s * 0.22, s * 0.38, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  ctx.restore()
}

// 芒果
export function drawMango(ctx, cx, cy, s) {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(Math.PI / 4.5)
  ctx.fillStyle = C_MANGO
  ctx.beginPath()
  ctx.ellipse(0, 0, s * 1.0, s * 0.72, 0, 0, Math.PI * 2)
  ctx.fill()
  // 内里浅色
  ctx.fillStyle = '#FFC65C'
  ctx.beginPath()
  ctx.ellipse(-s * 0.1, -s * 0.05, s * 0.55, s * 0.4, 0, 0, Math.PI * 2)
  ctx.fill()
  // 蒂
  ctx.fillStyle = C_LEAF
  ctx.beginPath()
  ctx.ellipse(s * 0.55, -s * 0.75, s * 0.18, s * 0.42, -0.6, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

// 顶部中央水果（草莓 / 芒果 / 草莓+芒果）
function fruitTop(ctx, cx, topY, w, h, toppings) {
  const fy = topY + h * 0.24
  const s = w * 0.16
  if (toppings.strawberry && toppings.mango) {
    drawStrawberry(ctx, cx - w * 0.14, fy - h * 0.05, s * 0.95)
    drawMango(ctx, cx + w * 0.16, fy + h * 0.02, s * 0.8)
  } else if (toppings.strawberry) {
    drawStrawberry(ctx, cx, fy - h * 0.06, s)
  } else if (toppings.mango) {
    drawMango(ctx, cx, fy - h * 0.02, s * 0.95)
  }
}

// 未烤蛋糕胚（米黄圆柱）
function drawBatter(ctx, cx, baseY, w, h) {
  cakeBody(ctx, cx, baseY, w, h, C_BATTER, C_BATTER_TOP)
  // 未烤质感：顶部画几条面糊纹
  ctx.strokeStyle = 'rgba(190,150,90,0.35)'
  ctx.lineWidth = Math.max(1, w * 0.03)
  const topY = baseY - h
  for (const dx of [-0.2, 0, 0.2]) {
    ctx.beginPath()
    ctx.moveTo(cx + dx * w - w * 0.1, topY + h * 0.2)
    ctx.quadraticCurveTo(cx + dx * w, topY + h * 0.34, cx + dx * w + w * 0.1, topY + h * 0.2)
    ctx.stroke()
  }
}

// 糊掉的蛋糕（深棕 + 焦黑）
function drawBurned(ctx, cx, baseY, w, h) {
  cakeBody(ctx, cx, baseY, w, h, C_BURNED, C_BURNED_TOP)
  ctx.fillStyle = 'rgba(40,20,10,0.55)'
  ctx.beginPath()
  ctx.ellipse(cx, baseY - h + h * 0.28, w / 2, h * 0.22, 0, 0, Math.PI * 2)
  ctx.fill()
  // 焦黑斑点
  ctx.fillStyle = 'rgba(30,15,8,0.8)'
  for (const [dx, dy] of [[-0.25, 0.15], [0.15, -0.1], [0.28, 0.3]]) {
    ctx.beginPath()
    ctx.arc(cx + dx * w, baseY - h * 0.35 + dy * h, w * 0.06, 0, Math.PI * 2)
    ctx.fill()
  }
}

// 完成蛋糕（粉色胚 + 配料）
function drawCake(ctx, cx, baseY, w, h, toppings) {
  cakeBody(ctx, cx, baseY, w, h, C_BAKED, C_BAKED_TOP)
  if (toppings.chocolate) chocolateTop(ctx, cx, baseY - h, w, h)
  if (toppings.cream) creamBorder(ctx, cx, baseY, w, h)
  fruitTop(ctx, cx, baseY - h, w, h, toppings)
}

// 冰激凌（蛋筒 + 螺旋 + 樱桃）
function drawIceCreamShape(ctx, cx, cy, s) {
  // 蛋筒
  ctx.fillStyle = '#E8B87E'
  ctx.beginPath()
  ctx.moveTo(cx - s * 0.78, cy - s * 0.15)
  ctx.lineTo(cx + s * 0.78, cy - s * 0.15)
  ctx.lineTo(cx, cy + s * 1.05)
  ctx.closePath()
  ctx.fill()
  // 网格
  ctx.strokeStyle = '#C8935A'
  ctx.lineWidth = Math.max(1, s * 0.06)
  for (let i = 1; i <= 3; i++) {
    const y = cy - s * 0.15 + (s * 1.2 / 4) * i
    const half = (y - (cy - s * 0.15)) * 0.72
    ctx.beginPath()
    ctx.moveTo(cx - half, y)
    ctx.lineTo(cx + half, y)
    ctx.stroke()
  }
  // 螺旋（两圈粉色）
  const scoops = [
    { r: s * 0.62, y: cy - s * 0.5, c: '#FF9EC4' },
    { r: s * 0.5, y: cy - s * 0.9, c: '#FFB6D4' },
    { r: s * 0.34, y: cy - s * 1.18, c: '#FFD3E4' },
  ]
  for (const scoop of scoops) {
    ctx.fillStyle = scoop.c
    ctx.beginPath()
    ctx.arc(cx, scoop.y, scoop.r, 0, Math.PI * 2)
    ctx.fill()
  }
  // 樱桃
  ctx.fillStyle = '#E8484E'
  ctx.beginPath()
  ctx.arc(cx, cy - s * 1.34, s * 0.16, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = C_LEAF
  ctx.lineWidth = Math.max(1, s * 0.06)
  ctx.beginPath()
  ctx.moveTo(cx, cy - s * 1.45)
  ctx.quadraticCurveTo(cx + s * 0.18, cy - s * 1.6, cx + s * 0.3, cy - s * 1.5)
  ctx.stroke()
}

// 盲盒订单：紫色礼物盒 + 白色问号
function drawBlindBox(ctx, cx, cy, s) {
  // 盒子
  ctx.fillStyle = '#8E44AD'
  roundRect(ctx, cx - s * 0.62, cy - s * 0.62, s * 1.24, s * 1.24, s * 0.22)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.16)'
  roundRect(ctx, cx - s * 0.62, cy - s * 0.62, s * 1.24, s * 0.5, s * 0.22)
  ctx.fill()
  // 丝带
  ctx.fillStyle = '#FFD23F'
  ctx.fillRect(cx - s * 0.1, cy - s * 0.62, s * 0.2, s * 1.24)
  // 问号
  ctx.fillStyle = '#FFFFFF'
  ctx.font = `bold ${s * 1.05}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('?', cx, cy + s * 0.05)
}

// 猫（橘猫，圆脸大耳）
export function drawCat(ctx, cx, cy, s) {
  ctx.save()
  ctx.translate(cx, cy)
  const fur = '#F5A97E'
  // 尾巴
  ctx.strokeStyle = fur
  ctx.lineWidth = s * 0.18
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-s * 0.55, s * 0.5)
  ctx.quadraticCurveTo(-s * 0.95, s * 0.35, -s * 0.9, -s * 0.1)
  ctx.stroke()
  // 身体
  ctx.fillStyle = fur
  ctx.beginPath()
  ctx.ellipse(0, s * 0.42, s * 0.52, s * 0.42, 0, 0, Math.PI * 2)
  ctx.fill()
  // 头
  ctx.beginPath()
  ctx.arc(0, -s * 0.28, s * 0.5, 0, Math.PI * 2)
  ctx.fill()
  // 耳朵
  for (const a of [-0.55, 0.55]) {
    ctx.save()
    ctx.rotate(a)
    ctx.beginPath()
    ctx.moveTo(0, -s * 0.55)
    ctx.lineTo(-s * 0.28, -s * 1.02)
    ctx.lineTo(s * 0.28, -s * 1.02)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }
  // 耳内粉
  ctx.fillStyle = '#FF9EC4'
  for (const a of [-0.55, 0.55]) {
    ctx.save()
    ctx.rotate(a)
    ctx.beginPath()
    ctx.moveTo(0, -s * 0.6)
    ctx.lineTo(-s * 0.15, -s * 0.9)
    ctx.lineTo(s * 0.15, -s * 0.9)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }
  // 眼睛
  ctx.fillStyle = '#2E7D32'
  ctx.beginPath()
  ctx.ellipse(-s * 0.2, -s * 0.3, s * 0.1, s * 0.13, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(s * 0.2, -s * 0.3, s * 0.1, s * 0.13, 0, 0, Math.PI * 2)
  ctx.fill()
  // 瞳孔
  ctx.fillStyle = '#1B1B1B'
  ctx.beginPath()
  ctx.ellipse(-s * 0.2, -s * 0.3, s * 0.04, s * 0.1, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(s * 0.2, -s * 0.3, s * 0.04, s * 0.1, 0, 0, Math.PI * 2)
  ctx.fill()
  // 鼻子
  ctx.fillStyle = '#E8484E'
  ctx.beginPath()
  ctx.moveTo(-s * 0.06, -s * 0.06)
  ctx.lineTo(s * 0.06, -s * 0.06)
  ctx.lineTo(0, s * 0.04)
  ctx.closePath()
  ctx.fill()
  // 胡须
  ctx.strokeStyle = 'rgba(80,50,30,0.6)'
  ctx.lineWidth = s * 0.025
  for (const dir of [-1, 1]) {
    for (const dy of [-0.1, 0]) {
      ctx.beginPath()
      ctx.moveTo(dir * s * 0.14, -s * 0.05 + dy * s)
      ctx.lineTo(dir * s * 0.5, -s * 0.02 + dy * s)
      ctx.stroke()
    }
  }
  // 额头条纹
  ctx.strokeStyle = 'rgba(200,110,60,0.55)'
  ctx.lineWidth = s * 0.05
  ctx.beginPath()
  ctx.moveTo(-s * 0.12, -s * 0.55)
  ctx.quadraticCurveTo(0, -s * 0.68, s * 0.12, -s * 0.55)
  ctx.stroke()
  ctx.restore()
}

// 材料栏图标
export function drawIngredientIcon(ctx, size, id) {
  const s = size
  ctx.clearRect(0, 0, s, s)
  const cx = s / 2
  const baseY = s * 0.86
  const w = s * 0.62
  const h = s * 0.5
  if (id === 'batter') {
    drawBatter(ctx, cx, baseY, w, h)
  } else if (id === 'cream') {
    // 白色花边示例
    cakeBody(ctx, cx, baseY, w * 0.7, h * 0.7, '#F7E6F0', '#FCEBF5')
    creamBorder(ctx, cx, baseY, w * 0.7, h * 0.7)
  } else if (id === 'chocolate') {
    cakeBody(ctx, cx, baseY, w * 0.7, h * 0.7, '#F7E6F0', '#FCEBF5')
    chocolateTop(ctx, cx, baseY - h * 0.7, w * 0.7, h * 0.7)
  } else if (id === 'strawberry') {
    drawStrawberry(ctx, cx, s * 0.5, s * 0.22)
  } else if (id === 'mango') {
    drawMango(ctx, cx, s * 0.52, s * 0.22)
  }
}

// 统一入口：按 kind 绘制
export function drawFood(ctx, size, kind, toppings = {}) {
  const s = size
  ctx.clearRect(0, 0, s, s)
  const cx = s / 2
  const baseY = s * 0.84
  const w = s * 0.6
  const h = s * 0.52
  if (kind === 'batter') drawBatter(ctx, cx, baseY, w, h)
  else if (kind === 'burned') drawBurned(ctx, cx, baseY, w, h)
  else if (kind === 'cake') drawCake(ctx, cx, baseY, w, h, toppings)
  else if (kind === 'icecream') drawIceCreamShape(ctx, cx, s * 0.6, s * 0.28)
  else if (kind === 'blind') drawBlindBox(ctx, cx, s * 0.5, s * 0.44)
}

// 顾客（探出头）
export function drawCustomer(ctx, w, h, order, needIcons) {
  ctx.clearRect(0, 0, w, h)
  // 窗户背景
  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, '#A8E6FF')
  sky.addColorStop(1, '#DFF6FF')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)
  // 云朵
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  for (const [dx, dy, r] of [[0.2, 0.18, 0.07], [0.72, 0.12, 0.055], [0.85, 0.35, 0.045]]) {
    ctx.beginPath()
    ctx.arc(w * dx, h * dy, r * w, 0, Math.PI * 2)
    ctx.fill()
  }
  // 柜台
  ctx.fillStyle = '#C68B59'
  ctx.fillRect(0, h * 0.82, w, h * 0.18)
  ctx.fillStyle = '#B07647'
  ctx.fillRect(0, h * 0.82, w, h * 0.035)

  // 顾客（头 + 肩，从柜台后探出）
  const cx = w * 0.5
  const headR = h * 0.17
  const headY = h * 0.72
  // 身体
  ctx.fillStyle = '#F7B733'
  ctx.beginPath()
  ctx.ellipse(cx, h * 0.9, headR * 1.15, h * 0.16, 0, 0, Math.PI * 2)
  ctx.fill()
  // 脸
  ctx.fillStyle = '#FFE0BD'
  ctx.beginPath()
  ctx.arc(cx, headY, headR, 0, Math.PI * 2)
  ctx.fill()
  // 腮红
  ctx.fillStyle = 'rgba(255,120,120,0.55)'
  ctx.beginPath()
  ctx.arc(cx - headR * 0.62, headY + headR * 0.28, headR * 0.16, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(cx + headR * 0.62, headY + headR * 0.28, headR * 0.16, 0, Math.PI * 2)
  ctx.fill()
  // 眼睛
  ctx.fillStyle = '#3A2A22'
  ctx.beginPath()
  ctx.arc(cx - headR * 0.38, headY - headR * 0.1, headR * 0.09, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(cx + headR * 0.38, headY - headR * 0.1, headR * 0.09, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(cx - headR * 0.33, headY - headR * 0.16, headR * 0.035, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(cx + headR * 0.43, headY - headR * 0.16, headR * 0.035, 0, Math.PI * 2)
  ctx.fill()
  // 嘴
  ctx.strokeStyle = '#B05A5A'
  ctx.lineWidth = Math.max(2, headR * 0.08)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.arc(cx, headY + headR * 0.3, headR * 0.3, 0.15, Math.PI - 0.15)
  ctx.stroke()
  // 厨师帽
  ctx.fillStyle = '#FFFFFF'
  ctx.beginPath()
  ctx.arc(cx, headY - headR * 0.95, headR * 0.75, Math.PI, 0)
  ctx.closePath()
  ctx.fill()
  ctx.fillRect(cx - headR * 0.78, headY - headR * 0.72, headR * 1.56, headR * 0.28)
  ctx.strokeStyle = '#E5D9C8'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(cx, headY - headR * 0.95, headR * 0.75, Math.PI, 0)
  ctx.stroke()

  // 气泡：显示订单需求
  if (order) {
    const bw = w * 0.34
    const bh = h * 0.42
    const bx = w * 0.66
    const by = h * 0.12
    ctx.fillStyle = '#FFFFFF'
    roundRect(ctx, bx, by, bw, bh, 10)
    ctx.fill()
    ctx.strokeStyle = '#F0B7CD'
    ctx.lineWidth = 2
    roundRect(ctx, bx, by, bw, bh, 10)
    ctx.stroke()
    // 气泡尾巴
    ctx.fillStyle = '#FFFFFF'
    ctx.beginPath()
    ctx.moveTo(bx + bw * 0.3, by + bh)
    ctx.lineTo(bx + bw * 0.15, by + bh + h * 0.1)
    ctx.lineTo(bx + bw * 0.52, by + bh)
    ctx.closePath()
    ctx.fill()
    // 需求图标
    const icons = needIcons || []
    const per = bw / (icons.length + 1)
    icons.forEach((icon, i) => {
      const ix = bx + per * (i + 1)
      const iy = by + bh * 0.28
      ctx.save()
      ctx.translate(ix, iy)
      drawFood(ctx, bw * 0.32, icon.kind, icon.toppings || {})
      ctx.restore()
    })
    // 文字
    ctx.fillStyle = '#7A4A2B'
    ctx.font = `bold ${Math.max(10, bw * 0.12)}px sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText('我要这个！', bx + bw / 2, by + bh * 0.85)
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// React 组件：把食物画到 canvas 上
export function FoodCanvas({ kind, toppings, size = 84, className, title }) {
  const ref = useRef(null)
  const key = kind + '|' + JSON.stringify(toppings || {})
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (kind === 'nested') return
    drawFood(ctx, size, kind, toppings || {})
  }, [key, size])
  return <canvas ref={ref} width={size} height={size} className={className} title={title} style={{ width: size, height: size }} />
}

// 顾客画布组件
export function CustomerCanvas({ order, needIcons, width = 340, height = 200 }) {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    drawCustomer(ctx, width, height, order, needIcons)
  }, [order, needIcons, width, height])
  return <canvas ref={ref} width={width} height={height} className="customer-canvas" style={{ width, height }} />
}

// 猫画布组件
export function CatCanvas({ size = 64, className, title }) {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    drawCat(canvas.getContext('2d'), size / 2, size / 2, size / 2)
  }, [size])
  return <canvas ref={ref} width={size} height={size} className={className} title={title} style={{ width: size, height: size }} />
}
