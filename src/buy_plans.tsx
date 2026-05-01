import { useState, useMemo, useEffect } from 'react'

/**
 * 第三批 · 模块二 — 加仓金字塔工具
 *
 * 基于 Arthur 的「逆势分批加仓 + 凯利公式」哲学，根据当前价、目标买入价区间、
 * 最大投入资金、胜率自动生成 4 档金字塔加仓表，并支持保存为活跃计划，触发提醒。
 *
 * 数据存储 key: portfoliolab_buyplans
 */

const LS_KEY = 'portfoliolab_buyplans'

export interface PyramidLevel {
  price: number
  drawdownPct: number
  amount: number
  cumAmount: number
  cumPct: number
  triggered: boolean
  triggeredAt?: string
}

export interface BuyPlan {
  id: string
  symbol: string
  name?: string
  createdAt: string
  currentPrice: number
  targetHigh: number  // 区间上限（首仓价）
  targetLow: number   // 区间下限（最低价）
  maxCapital: number
  winRate: number     // 1-9
  kellyFraction: number  // 计算后的 f*
  totalAssets: number
  pyramid: PyramidLevel[]
  status: 'active' | 'completed' | 'cancelled'
  note?: string
}

function genId() { return Math.random().toString(36).slice(2, 10) }

/* ────────── 凯利公式 ────────── */

/**
 * 胜率 1-9 映射为 0.55..0.85
 */
function winRateToProb(score: number): number {
  const s = Math.max(1, Math.min(9, score))
  return 0.50 + (s - 1) * (0.35 / 8)  // 1→50%, 9→85%
}

/**
 * 赔率 b：跳仓估值赔率。推导为给定价区间的隐含上行空间。
 *  简化：b = 平均买入价 上反弹 50% (理论 1y 目标) ㉇ 下跌幅度 ≈20% 下限
 */
export function computeKelly(winScore: number): { p: number; q: number; b: number; f: number } {
  const p = winRateToProb(winScore)
  const q = 1 - p
  const b = 2.5  // 隐含赔率 = 2.5（胜贺 2.5 单位 / 败赔 1 单位，对应逆势分批场景）
  let f = (b * p - q) / b
  if (!isFinite(f) || f < 0) f = 0
  // 安全上限 25%
  f = Math.min(f, 0.25)
  return { p, q, b, f: Math.round(f * 1000) / 1000 }
}

/* ────────── 金字塔生成 ────────── */

/**
 * 4 档跳价：从 targetHigh 等间距到 targetLow，低价分配更多资金。
 * 默认主重分布 [0.15, 0.25, 0.30, 0.30]。
 */
export function buildPyramid(
  currentPrice: number,
  targetHigh: number,
  targetLow: number,
  maxCapital: number,
): PyramidLevel[] {
  if (targetHigh <= 0 || targetLow <= 0 || targetLow >= targetHigh || maxCapital <= 0) return []
  const weights = [0.15, 0.25, 0.30, 0.30]
  // 4 档价位：high, high*0.95, mid, low (几何平均跳)
  const ratio = (targetLow / targetHigh) ** (1 / 3)
  const prices = [
    targetHigh,
    targetHigh * ratio,
    targetHigh * ratio * ratio,
    targetLow,
  ]
  const levels: PyramidLevel[] = []
  let cum = 0
  for (let i = 0; i < 4; i++) {
    const price = Math.round(prices[i] * 100) / 100
    const amount = Math.round(maxCapital * weights[i])
    cum += amount
    const drawdown = Math.round((price - currentPrice) / currentPrice * 1000) / 10
    levels.push({
      price,
      drawdownPct: drawdown,
      amount,
      cumAmount: cum,
      cumPct: Math.round(cum / maxCapital * 1000) / 10,
      triggered: currentPrice <= price,
      triggeredAt: undefined,
    })
  }
  return levels
}

/* ────────── 存储 hook ────────── */

export function useBuyPlans() {
  const [plans, setPlans] = useState<BuyPlan[]>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      return raw ? JSON.parse(raw) as BuyPlan[] : []
    } catch { return [] }
  })

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(plans)) } catch { /* ignore */ }
  }, [plans])

  return { plans, setPlans }
}

/**
 * 查看哪些计划被「实时价」触发，返回 banner 需要的提示。
 */
export interface BuyPlanAlert {
  planId: string
  symbol: string
  name?: string
  triggeredLevel: number  // 1-4
  triggerPrice: number
  amount: number
  currentPrice: number
}

export function pickActiveAlerts(
  plans: BuyPlan[],
  livePrice: (sym: string) => number | undefined,
): BuyPlanAlert[] {
  const out: BuyPlanAlert[] = []
  for (const plan of plans) {
    if (plan.status !== 'active') continue
    const cur = livePrice(plan.symbol)
    if (cur == null || cur <= 0) continue
    // 找出当前价 ≤ 某档，且尚未被标记 triggered 的最高价位
    for (let i = 0; i < plan.pyramid.length; i++) {
      const lvl = plan.pyramid[i]
      if (cur <= lvl.price) {
        out.push({
          planId: plan.id,
          symbol: plan.symbol,
          name: plan.name,
          triggeredLevel: i + 1,
          triggerPrice: lvl.price,
          amount: lvl.amount,
          currentPrice: cur,
        })
        break
      }
    }
  }
  return out
}

/* ────────── BuyPlansTab — 计划器 + 活跃计划列表 ────────── */

interface BuyPlansTabProps {
  symbolHints: { symbol: string; name: string; lastPrice: number }[]
  totalAssets: number
}

export function BuyPlansTab({ symbolHints, totalAssets }: BuyPlansTabProps) {
  const { plans, setPlans } = useBuyPlans()
  const [draft, setDraft] = useState({
    symbol: '',
    name: '',
    currentPrice: '',
    targetHigh: '',
    targetLow: '',
    maxCapital: '',
    winRate: '5',
    note: '',
  })

  // 当选中持仓股时自动填充现价与名称
  const onPickSymbol = (sym: string) => {
    const hint = symbolHints.find(x => x.symbol === sym)
    setDraft({
      ...draft,
      symbol: sym,
      name: hint?.name || draft.name,
      currentPrice: hint?.lastPrice ? hint.lastPrice.toString() : draft.currentPrice,
    })
  }

  const cur = parseFloat(draft.currentPrice) || 0
  const hi = parseFloat(draft.targetHigh) || 0
  const lo = parseFloat(draft.targetLow) || 0
  const cap = parseFloat(draft.maxCapital) || 0
  const win = parseInt(draft.winRate) || 5

  const pyramid = useMemo(
    () => buildPyramid(cur, hi, lo, cap),
    [cur, hi, lo, cap],
  )
  const kelly = useMemo(() => computeKelly(win), [win])

  const recommendedTotalCapital = useMemo(() => {
    if (totalAssets <= 0) return null
    return Math.round(totalAssets * kelly.f)
  }, [totalAssets, kelly])

  const canSave = draft.symbol && pyramid.length > 0 && cap > 0

  const save = () => {
    if (!canSave) return
    const plan: BuyPlan = {
      id: genId(),
      symbol: draft.symbol.toUpperCase(),
      name: draft.name || undefined,
      createdAt: new Date().toISOString(),
      currentPrice: cur,
      targetHigh: hi,
      targetLow: lo,
      maxCapital: cap,
      winRate: win,
      kellyFraction: kelly.f,
      totalAssets,
      pyramid,
      status: 'active',
      note: draft.note || undefined,
    }
    setPlans([plan, ...plans])
    setDraft({ symbol: '', name: '', currentPrice: '', targetHigh: '', targetLow: '', maxCapital: '', winRate: '5', note: '' })
  }

  const remove = (id: string) => {
    if (!confirm('删除该加仓计划？')) return
    setPlans(plans.filter(p => p.id !== id))
  }

  const toggleStatus = (id: string, status: BuyPlan['status']) => {
    setPlans(plans.map(p => p.id === id ? { ...p, status } : p))
  }

  return (
    <>
      {/* 加仓计划器 */}
      <div className="section">
        <div className="section-header">
          <h2>加仓计划器</h2>
        </div>

        <div style={{
          padding: 12, borderRadius: 6,
          background: 'var(--bg2)', border: '1px solid var(--border)',
          fontSize: '.78rem', color: 'var(--fg2)', marginBottom: 12,
        }}>
          【Arthur 哲学】逆势分批加仓 + 凯利公式。低价位下重多仓，单标的上限 25%。
          胜率越高 / 赔率越大，凯利推荐仓位越重。
        </div>

        {/* 输入区 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
          <div className="field">
            <label>股票代码</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={draft.symbol} onChange={e => setDraft({ ...draft, symbol: e.target.value })} placeholder="如 00700.HK" />
              {symbolHints.length > 0 && (
                <select onChange={e => onPickSymbol(e.target.value)} value="" style={{ width: 110 }}>
                  <option value="">选持仓</option>
                  {symbolHints.map(h => <option key={h.symbol} value={h.symbol}>{h.symbol}</option>)}
                </select>
              )}
            </div>
          </div>
          <div className="field">
            <label>名称（可选）</label>
            <input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="腾讯控股" />
          </div>
          <div className="field">
            <label>当前价</label>
            <input type="number" value={draft.currentPrice} onChange={e => setDraft({ ...draft, currentPrice: e.target.value })} />
          </div>
          <div className="field">
            <label>目标买入价上限 (首仓价)</label>
            <input type="number" value={draft.targetHigh} onChange={e => setDraft({ ...draft, targetHigh: e.target.value })} placeholder="如 450" />
          </div>
          <div className="field">
            <label>目标买入价下限 (最低加价)</label>
            <input type="number" value={draft.targetLow} onChange={e => setDraft({ ...draft, targetLow: e.target.value })} placeholder="如 400" />
          </div>
          <div className="field">
            <label>最大投入资金</label>
            <input type="number" value={draft.maxCapital} onChange={e => setDraft({ ...draft, maxCapital: e.target.value })} placeholder="如 2000000" />
          </div>
          <div className="field">
            <label>胜率判断 (1=很差, 9=高胜率)</label>
            <input type="number" min={1} max={9} value={draft.winRate} onChange={e => setDraft({ ...draft, winRate: e.target.value })} />
            <div style={{ fontSize: '.7rem', color: 'var(--fg2)', marginTop: 2 }}>
              当前胜率 {Math.round(kelly.p * 100)}% · 凯利 f*={kelly.f} · 推荐总仓位
              {recommendedTotalCapital ? ` ¥${recommendedTotalCapital.toLocaleString()}` : ' (请填总资产)'}
            </div>
          </div>
          <div className="field" style={{ gridColumn: 'span 2' }}>
            <label>备注（可选）</label>
            <input value={draft.note} onChange={e => setDraft({ ...draft, note: e.target.value })} placeholder="为什么要买？理由一句话" />
          </div>
        </div>

        {/* 金字塔表 */}
        {pyramid.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>价位档</th>
                  <th className="r">价格</th>
                  <th className="r">距现价跌幅</th>
                  <th className="r">单档金额</th>
                  <th className="r">累计金额</th>
                  <th className="r">累计仓位</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {pyramid.map((lvl, i) => (
                  <tr key={i}>
                    <td>第 {i + 1} 档</td>
                    <td className="r">{lvl.price.toFixed(2)}</td>
                    <td className="r" style={{ color: lvl.drawdownPct < 0 ? 'var(--red)' : 'var(--fg2)' }}>
                      {lvl.drawdownPct > 0 ? '+' : ''}{lvl.drawdownPct.toFixed(1)}%
                    </td>
                    <td className="r">¥{lvl.amount.toLocaleString()}</td>
                    <td className="r">¥{lvl.cumAmount.toLocaleString()}</td>
                    <td className="r">{lvl.cumPct.toFixed(1)}%</td>
                    <td>{lvl.triggered
                      ? <span style={{ color: 'var(--green)' }}>✓ 已触发</span>
                      : <span style={{ color: 'var(--fg2)' }}>等待</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button className="primary" onClick={save} disabled={!canSave}>保存为加仓计划</button>
          {!canSave && <span style={{ color: 'var(--fg2)', fontSize: '.78rem', alignSelf: 'center' }}>
            请完整填写代码 / 价区间 / 资金
          </span>}
        </div>
      </div>

      {/* 活跃计划列表 */}
      <div className="section" style={{ marginTop: 16 }}>
        <div className="section-header">
          <h2>已保存加仓计划</h2>
        </div>
        {plans.length === 0 ? (
          <div style={{ color: 'var(--fg2)', fontSize: '.85rem' }}>还没有保存任何计划</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {plans.map(p => (
              <div key={p.id} style={{
                padding: 12, borderRadius: 6,
                border: '1px solid var(--border)', background: 'var(--bg2)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontWeight: 600 }}>{p.symbol}</span>
                  {p.name && <span style={{ color: 'var(--fg2)', fontSize: '.85rem' }}>{p.name}</span>}
                  <span style={{
                    fontSize: '.7rem', padding: '2px 6px', borderRadius: 4,
                    background: p.status === 'active' ? 'var(--green)' : 'var(--bg)',
                    color: p.status === 'active' ? '#fff' : 'var(--fg2)',
                  }}>
                    {p.status === 'active' ? '进行中' : p.status === 'completed' ? '已完成' : '已取消'}
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: '.72rem', color: 'var(--fg2)' }}>
                    {new Date(p.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: '.78rem', color: 'var(--fg2)', flexWrap: 'wrap' }}>
                  <span>创建价 {p.currentPrice}</span>
                  <span>区间 {p.targetLow}–{p.targetHigh}</span>
                  <span>总资金 ¥{p.maxCapital.toLocaleString()}</span>
                  <span>胜率 {p.winRate}/9 · f*={p.kellyFraction}</span>
                </div>
                {p.note && <div style={{ fontSize: '.78rem', color: 'var(--fg2)', marginTop: 4 }}>{p.note}</div>}
                <div style={{ marginTop: 8, fontSize: '.75rem' }}>
                  {p.pyramid.map((lvl, i) => (
                    <span key={i} style={{
                      marginRight: 12,
                      color: lvl.triggered ? 'var(--green)' : 'var(--fg2)',
                    }}>
                      {lvl.triggered ? '●' : '○'} 档{i + 1} {lvl.price.toFixed(2)} (¥{(lvl.amount / 10000).toFixed(1)}万)
                    </span>
                  ))}
                </div>
                <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                  {p.status === 'active' && (
                    <>
                      <button className="sm" onClick={() => toggleStatus(p.id, 'completed')}>标记完成</button>
                      <button className="sm" onClick={() => toggleStatus(p.id, 'cancelled')}>取消</button>
                    </>
                  )}
                  {p.status !== 'active' && (
                    <button className="sm" onClick={() => toggleStatus(p.id, 'active')}>重启</button>
                  )}
                  <button className="sm danger" onClick={() => remove(p.id)}>删除</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

/* ────────── 总览顶部提示 banner ────────── */

interface BannerProps {
  alerts: BuyPlanAlert[]
}

export function BuyPlanBanner({ alerts }: BannerProps) {
  if (alerts.length === 0) return null
  return (
    <div style={{
      marginTop: 12, padding: 12, borderRadius: 8,
      border: '1px solid var(--red)', background: 'var(--bg2)',
    }}>
      <div style={{ fontSize: '.8rem', color: 'var(--red)', marginBottom: 6, fontWeight: 600 }}>
        🔔 加仓计划触发
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {alerts.map(a => (
          <div key={a.planId} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.85rem' }}>
            <span style={{ fontWeight: 600 }}>{a.symbol}</span>
            {a.name && <span style={{ color: 'var(--fg2)' }}>{a.name}</span>}
            <span style={{ color: 'var(--fg2)' }}>现价 {a.currentPrice.toFixed(2)} ≤ 档 {a.triggeredLevel} (触发价 {a.triggerPrice.toFixed(2)})</span>
            <span style={{ marginLeft: 'auto', color: 'var(--green)', fontWeight: 600 }}>
              建议加仓 ¥{a.amount.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
