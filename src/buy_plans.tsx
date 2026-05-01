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
  winRate: number     // 0-100 (胜率百分比)
  kellyFraction: number  // 计算后的 f*
  totalAssets: number
  pyramid: PyramidLevel[]
  status: 'active' | 'completed' | 'cancelled'
  note?: string
}

function genId() { return Math.random().toString(36).slice(2, 10) }

/* ────────── 凯利公式 ────────── */

/**
 * 胜率 1-9 映射为更合理的概率分布
 * 1-3: 较差到一般 (45-55%)
 * 4-6: 较好 (58-68%)
 * 7-9: 很好到极佳 (72-85%)
 */
/**
 * 旧版本兼容：1-9 打分制 → 概率值
 * 1→45%, 2→50%, ..., 9→85%（每档+5%）
 */
export function legacyScoreToPercent(score: number): number {
  const s = Math.max(1, Math.min(9, Math.round(score)))
  return 40 + s * 5
}

/**
 * 自动迁移：判断输入值是 1-9 旧打分还是 0-100 新百分比
 * 旧值 ≤9 → 转换；新值（≥10 或带小数）原样
 */
export function migrateWinValue(v: number): number {
  if (!isFinite(v) || v < 0) return 50
  if (v >= 1 && v <= 9 && Number.isInteger(v)) return legacyScoreToPercent(v)
  return Math.max(0, Math.min(100, v))
}

/**
 * 凯利公式：f* = (bp - q) / b
 * @param winPercent 胜率（0-100，例如 65 代表 65%）
 * @param oddsB 赔率 b（赢时回报/亏损单位）。默认2，即1赔2
 * 返回 f（原始凯利）+ fHalf（半凯利，更稳妥）
 * - f 安全上限 25%
 * - fHalf 安全上限 12.5%（实际推荐使用）
 */
export function computeKelly(winPercent: number, oddsB: number = 2): { p: number; q: number; b: number; f: number; fHalf: number } {
  const pct = Math.max(0, Math.min(100, winPercent))
  const p = pct / 100
  const q = 1 - p
  const b = Math.max(0.5, oddsB)
  let f = (b * p - q) / b
  if (!isFinite(f) || f < 0) f = 0
  f = Math.min(f, 0.25)
  const fHalf = Math.min(f / 2, 0.125)
  return {
    p, q, b,
    f: Math.round(f * 1000) / 1000,
    fHalf: Math.round(fHalf * 1000) / 1000,
  }
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
      if (!raw) return []
      const parsed = JSON.parse(raw) as BuyPlan[]
      // 迁移旧 1-9 胜率值 → 0-100 百分比
      return parsed.map(p => ({ ...p, winRate: migrateWinValue(p.winRate) }))
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
  symbolHints: { symbol: string; name: string; lastPrice: number; valueCny?: number }[]
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
    winRate: '50',
    oddsB: '2',
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
  const win = parseFloat(draft.winRate) || 50
  const oddsB = parseFloat(draft.oddsB) || 2

  const pyramid = useMemo(
    () => buildPyramid(cur, hi, lo, cap),
    [cur, hi, lo, cap],
  )
  const kelly = useMemo(() => computeKelly(win, oddsB), [win, oddsB])

  // 推荐仓位采用半凯利（更稳妥）
  const recommendedTotalCapital = useMemo(() => {
    if (totalAssets <= 0) return null
    return Math.round(totalAssets * kelly.fHalf)
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
      kellyFraction: kelly.fHalf,
      totalAssets,
      pyramid,
      status: 'active',
      note: draft.note || undefined,
    }
    setPlans([plan, ...plans])
    setDraft({ symbol: '', name: '', currentPrice: '', targetHigh: '', targetLow: '', maxCapital: '', winRate: '50', oddsB: '2', note: '' })
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
            <label>胜率 (0-100%)</label>
            <input type="number" min={0} max={100} step={1} value={draft.winRate}
              onChange={e => setDraft({ ...draft, winRate: e.target.value })}
              placeholder="例如 65 代表 65%" />
          </div>
          <div className="field">
            <label>赔率 b (赢:亏比)</label>
            <input type="number" min={0.5} step={0.5} value={draft.oddsB} onChange={e => setDraft({ ...draft, oddsB: e.target.value })} placeholder="默认2 (1赔2)" />
            <div style={{ fontSize: '.7rem', color: 'var(--fg2)', marginTop: 2 }}>
              胜率 {Math.round(kelly.p * 100)}% · 赔率 {kelly.b} · 凯利 f*={kelly.f} · 半凯利 {(kelly.fHalf * 100).toFixed(1)}% · 推荐总仓位
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
                  <span>胜率 {p.winRate}% · 半凯利={(p.kellyFraction * 100).toFixed(1)}%</span>
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

      {/* 凯利仓位速查表 */}
      <KellyPositionTable symbolHints={symbolHints} totalAssets={totalAssets} />
    </>
  )
}

/* ────────── 凯利仓位速查表 ────────── */

interface KellyRow {
  symbol: string
  name: string
  currentValueCny: number
  winRate: number
  oddsB: number
  note?: string
}

const KELLY_TABLE_LS_KEY = 'portfoliolab_kelly_table'

function useKellyTable(symbolHints: { symbol: string; name: string; lastPrice: number; valueCny: number }[]) {
  const [rows, setRows] = useState<KellyRow[]>(() => {
    try {
      const raw = localStorage.getItem(KELLY_TABLE_LS_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as KellyRow[]
        // 迁移旧 1-9 胜率值 → 0-100 百分比
        return parsed.map(r => ({ ...r, winRate: migrateWinValue(r.winRate) }))
      }
    } catch { /* ignore */ }
    // 默认从持仓股初始化
    return symbolHints.map(h => ({
      symbol: h.symbol,
      name: h.name,
      currentValueCny: h.valueCny || 0,
      winRate: 50,
      oddsB: 2,
    }))
  })

  useEffect(() => {
    localStorage.setItem(KELLY_TABLE_LS_KEY, JSON.stringify(rows))
  }, [rows])

  // 同步持仓股的最新市值（不覆盖用户填写的胜率/赔率）
  useEffect(() => {
    setRows(prev => {
      const next = [...prev]
      let changed = false
      symbolHints.forEach(h => {
        const idx = next.findIndex(r => r.symbol === h.symbol)
        if (idx >= 0) {
          if (Math.abs(next[idx].currentValueCny - (h.valueCny || 0)) > 1) {
            next[idx] = { ...next[idx], currentValueCny: h.valueCny || 0, name: h.name }
            changed = true
          }
        }
      })
      return changed ? next : prev
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(symbolHints.map(h => `${h.symbol}:${h.valueCny}`))])

  return { rows, setRows }
}

interface KellyPositionTableProps {
  symbolHints: { symbol: string; name: string; lastPrice: number; valueCny?: number }[]
  totalAssets: number
}

function KellyPositionTable({ symbolHints, totalAssets }: KellyPositionTableProps) {
  // 适配旧数据
  const hintsWithValue = useMemo(
    () => symbolHints.map(h => ({ ...h, valueCny: (h as { valueCny?: number }).valueCny || 0 })),
    [symbolHints],
  )
  const { rows, setRows } = useKellyTable(hintsWithValue)
  const [newRow, setNewRow] = useState({ symbol: '', name: '', winRate: '50', oddsB: '2', note: '' })

  const updateRow = (i: number, field: keyof KellyRow, value: number | string) => {
    setRows(prev => {
      const next = [...prev]
      next[i] = { ...next[i], [field]: value as never }
      return next
    })
  }

  const removeRow = (i: number) => {
    if (!confirm('从凯利表中移除这一行？')) return
    setRows(prev => prev.filter((_, idx) => idx !== i))
  }

  const addRow = () => {
    if (!newRow.symbol.trim()) { alert('请填写股票代码'); return }
    if (rows.find(r => r.symbol === newRow.symbol.trim())) { alert('该标的已在表中'); return }
    setRows(prev => [...prev, {
      symbol: newRow.symbol.trim(),
      name: newRow.name.trim() || newRow.symbol.trim(),
      currentValueCny: 0,
      winRate: parseFloat(newRow.winRate) || 50,
      oddsB: parseFloat(newRow.oddsB) || 2,
      note: newRow.note.trim() || undefined,
    }])
    setNewRow({ symbol: '', name: '', winRate: '50', oddsB: '2', note: '' })
  }

  return (
    <div className="section" style={{ marginTop: 24 }}>
      <div className="section-header">
        <h2>📐 凯利仓位速查表</h2>
      </div>
      <div style={{ fontSize: '.78rem', color: 'var(--fg2)', marginBottom: 10 }}>
        填写每只股票的胜率（0-100%）和赔率，自动计算凯利推荐仓位 vs 实际仓位。
        <strong>建议仓位采用半凯利（凯利 f* / 2），更稳妥</strong>：min(f*/2, 12.5%) × 总资产。差距大时考虑加仓 / 减仓。
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>代码</th>
              <th>名称</th>
              <th className="r">胜率(%)</th>
              <th className="r">赔率b</th>
              <th className="r">凯利f*</th>
              <th className="r" title="采用半凯利，上限 12.5%">建议仓位 %</th>
              <th className="r">建议金额</th>
              <th className="r">实际市值</th>
              <th className="r">实际仓位%</th>
              <th className="r">差距</th>
              <th>建议</th>
              <th>备注</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const k = computeKelly(r.winRate, r.oddsB)
              // 采用半凯利作为推荐仓位
              const recPct = k.fHalf * 100
              const recCapital = totalAssets > 0 ? totalAssets * k.fHalf : 0
              const actualPct = totalAssets > 0 ? (r.currentValueCny / totalAssets * 100) : 0
              const diff = recPct - actualPct
              let suggestion = '持有'
              let color = 'var(--fg)'
              if (k.fHalf === 0) {
                suggestion = '不建议持有'
                color = 'var(--red)'
              } else if (diff > 2) {
                suggestion = `加仓 ${diff.toFixed(1)}%`
                color = 'var(--green)'
              } else if (diff < -2) {
                suggestion = `减仓 ${Math.abs(diff).toFixed(1)}%`
                color = 'var(--red)'
              }
              return (
                <tr key={r.symbol}>
                  <td><b>{r.symbol}</b></td>
                  <td>{r.name}</td>
                  <td className="r">
                    <input type="number" min={0} max={100} step={1} value={r.winRate}
                      onChange={e => updateRow(i, 'winRate', parseFloat(e.target.value) || 50)}
                      style={{ width: 60, padding: '2px 4px', textAlign: 'right' }} />
                  </td>
                  <td className="r">
                    <input type="number" min={0.5} step={0.5} value={r.oddsB}
                      onChange={e => updateRow(i, 'oddsB', parseFloat(e.target.value) || 2)}
                      style={{ width: 60, padding: '2px 4px', textAlign: 'right' }} />
                  </td>
                  <td className="r" style={{ color: 'var(--fg2)' }}>{(k.f * 100).toFixed(1)}%</td>
                  <td className="r"><b>{recPct.toFixed(1)}%</b></td>
                  <td className="r">¥{Math.round(recCapital).toLocaleString()}</td>
                  <td className="r">¥{Math.round(r.currentValueCny).toLocaleString()}</td>
                  <td className="r">{actualPct.toFixed(1)}%</td>
                  <td className="r" style={{ color: diff > 0 ? 'var(--green)' : diff < 0 ? 'var(--red)' : 'var(--fg2)' }}>
                    {diff > 0 ? '+' : ''}{diff.toFixed(1)}%
                  </td>
                  <td style={{ color, fontWeight: 600 }}>{suggestion}</td>
                  <td>
                    <input value={r.note || ''} onChange={e => updateRow(i, 'note', e.target.value)}
                      placeholder="备注" style={{ width: 120, padding: '2px 4px' }} />
                  </td>
                  <td>
                    <button className="sm danger" onClick={() => removeRow(i)} style={{ padding: '2px 6px', fontSize: '.7rem' }}>×</button>
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr><td colSpan={13} style={{ textAlign: 'center', padding: 16, color: 'var(--fg2)' }}>暂无数据，添加股票开始</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 添加新行 */}
      <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="field" style={{ minWidth: 100 }}>
          <label style={{ fontSize: '.75rem' }}>代码</label>
          <input value={newRow.symbol} onChange={e => setNewRow({ ...newRow, symbol: e.target.value })} placeholder="如 NVDA" />
        </div>
        <div className="field" style={{ minWidth: 100 }}>
          <label style={{ fontSize: '.75rem' }}>名称</label>
          <input value={newRow.name} onChange={e => setNewRow({ ...newRow, name: e.target.value })} placeholder="英伟达" />
        </div>
        <div className="field" style={{ minWidth: 80 }}>
          <label style={{ fontSize: '.75rem' }}>胜率 %</label>
          <input type="number" min={0} max={100} step={1} value={newRow.winRate} onChange={e => setNewRow({ ...newRow, winRate: e.target.value })} placeholder="50" />
        </div>
        <div className="field" style={{ minWidth: 70 }}>
          <label style={{ fontSize: '.75rem' }}>赔率</label>
          <input type="number" min={0.5} step={0.5} value={newRow.oddsB} onChange={e => setNewRow({ ...newRow, oddsB: e.target.value })} />
        </div>
        <button className="primary" onClick={addRow}>+ 添加观察标的</button>
      </div>

      {/* 总结统计 */}
      {rows.length > 0 && (() => {
        // 总建议仓位：采用半凯利汇总
        const totalRecPct = rows.reduce((sum, r) => sum + computeKelly(r.winRate, r.oddsB).fHalf * 100, 0)
        const totalActualPct = rows.reduce((sum, r) => sum + (totalAssets > 0 ? r.currentValueCny / totalAssets * 100 : 0), 0)
        return (
          <div style={{ marginTop: 12, padding: 10, background: 'var(--bg2)', borderRadius: 6, fontSize: '.8rem' }}>
            <span>建议总仓位 <b style={{ color: 'var(--accent)' }}>{totalRecPct.toFixed(1)}%</b></span>
            <span style={{ marginLeft: 16 }}>实际总仓位 <b>{totalActualPct.toFixed(1)}%</b></span>
            <span style={{ marginLeft: 16, color: 'var(--fg2)' }}>
              {totalRecPct > 75 ? '⚠️ 建议总仓位>75%上限，请降低部分胜率/赔率' :
               totalRecPct < 25 ? 'ℹ️ 建议总仓位<25%下限，可考虑提高部分胜率' :
               '✓ 建议总仓位在 25-75% 健康区间'}
            </span>
          </div>
        )
      })()}
    </div>
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
