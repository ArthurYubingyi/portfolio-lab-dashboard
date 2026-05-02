import React, { useState, useMemo, useEffect } from 'react'

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

/* ────────── 凯利仓位速查表（专业版） ────────── */

type AssetCategory = 'core' | 'growth' | 'satellite' | 'cyclical' | 'theme' | 'winner'

const CATEGORY_LABELS: Record<AssetCategory, string> = {
  core: '核心 Core',
  growth: '成长 Growth',
  satellite: '卫星 Satellite',
  cyclical: '周期 Cyclical',
  theme: '主题 Theme',
  winner: '少数赢家',
}

// 表格中显示的短标签（仅中文，防止列过宽）
const CATEGORY_LABELS_SHORT: Record<AssetCategory, string> = {
  core: '核心',
  growth: '成长',
  satellite: '卫星',
  cyclical: '周期',
  theme: '主题',
  winner: '赢家',
}

// 按类别的默认 Cap%（风控硬上限）
const CATEGORY_CAP: Record<AssetCategory, number> = {
  core: 20,
  growth: 15,
  satellite: 8,
  cyclical: 10,
  theme: 7,
  winner: 20,
}

// 旧默认 Cap 值——用于识别未手动修改过的行，加载时自动迁移到新默认。
const LEGACY_CATEGORY_CAPS: Record<AssetCategory, number[]> = {
  core: [18],
  growth: [12],
  satellite: [6],
  cyclical: [8],
  theme: [5],
  winner: [15],
}

interface KellyRow {
  symbol: string
  name: string
  currentValueCny: number
  category: AssetCategory
  cap: number          // 0-100, %
  rUp: number          // e.g. 0.5 = 上行50%
  rDown: number        // e.g. -0.25 = 下行25%（写负数）
  moat: number         // 0-5
  mgmt: number         // 0-5
  valPct: number       // 0-5
  shrinkM: number      // 贝叶斯收缩 m，默认 10
  note?: string
}

const KELLY_TABLE_LS_KEY = 'portfoliolab_kelly_table'

/* 默认值 + 旧数据迁移 */
function defaultRowFields(): Omit<KellyRow, 'symbol' | 'name' | 'currentValueCny'> {
  return {
    category: 'core',
    cap: CATEGORY_CAP.core,
    rUp: 0.4,
    rDown: -0.25,
    moat: 3,
    mgmt: 3,
    valPct: 3,
    shrinkM: 10,
  }
}

function migrateRow(raw: Record<string, unknown>): KellyRow {
  const def = defaultRowFields()
  const cat = (raw.category as AssetCategory) || def.category
  // 自动升级：如果 cap 值与该类别的某个旧默认完全相等（即用户从未手动调过），自动迁移到新默认。
  // 手动设过的值（如 11.3、14、任何不在旧默认列表的数字）不会被覆盖。
  let cap = Number(raw.cap)
  if (!Number.isFinite(cap) || cap === 0) {
    cap = def.cap
  } else if (LEGACY_CATEGORY_CAPS[cat]?.some(legacy => Math.abs(cap - legacy) < 0.001)) {
    cap = CATEGORY_CAP[cat]
  }
  return {
    symbol: String(raw.symbol || ''),
    name: String(raw.name || ''),
    currentValueCny: Number(raw.currentValueCny) || 0,
    category: cat,
    cap,
    rUp: Number(raw.rUp ?? def.rUp),
    rDown: Number(raw.rDown ?? def.rDown),
    moat: Number(raw.moat ?? def.moat),
    mgmt: Number(raw.mgmt ?? def.mgmt),
    valPct: Number(raw.valPct ?? def.valPct),
    shrinkM: Number(raw.shrinkM) || def.shrinkM,
    note: typeof raw.note === 'string' ? raw.note : undefined,
  }
}

/* 按名称智能推断类别 */
function inferCategory(symbol: string, name: string): AssetCategory {
  const s = (symbol + ' ' + name).toLowerCase()
  // 周期：金属/矿/煤/石油/有色/钢/化工
  if (/(宁德|catl|矿|铜|金|银|油|煤|钢|化工|周期|cnq|xom|cvx)/i.test(s)) {
    if (/(宁德|catl)/i.test(s)) return 'cyclical'
  }
  // 少数赢家：高成长高波动单股 (TSLA, NVDA超明显, PDD)
  if (/(tsla|tesla|特斯拉)/i.test(s)) return 'winner'
  if (/(nvda|英伟达|nvidia)/i.test(s)) return 'winner'
  if (/(pdd|拼多多)/i.test(s)) return 'winner'
  // 核心：龙头蓝筹
  if (/(腾讯|tencent|00700|招行|招商银行|600036|茅台|600519|苹果|aapl|微软|msft|google|goog|阿里|baba|9988|amzn)/i.test(s)) return 'core'
  // 成长：互联网/科技平台
  if (/(meta|facebook|netflix|nflx|3690|美团|快手|01024|9988)/i.test(s)) return 'growth'
  // 主题：ETF / 行业指数 / 概念
  if (/(etf|index|theme|主题|半导体|新能源|ai|人工智能)/i.test(s)) return 'theme'
  // 默认核心
  return 'core'
}

function useKellyTable(symbolHints: { symbol: string; name: string; lastPrice: number; valueCny: number }[]) {
  const [rows, setRows] = useState<KellyRow[]>(() => {
    try {
      const raw = localStorage.getItem(KELLY_TABLE_LS_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, unknown>[]
        return parsed.map(migrateRow)
      }
    } catch { /* ignore */ }
    return symbolHints.map(h => ({
      symbol: h.symbol,
      name: h.name,
      currentValueCny: h.valueCny || 0,
      ...defaultRowFields(),
    }))
  })

  useEffect(() => {
    localStorage.setItem(KELLY_TABLE_LS_KEY, JSON.stringify(rows))
  }, [rows])

  // 同步持仓股最新市值（不覆盖用户填写的输入）
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

/* 核心计算：每个 row 实时算出衍生量 */
interface KellyMetrics {
  S: number           // 评分总分 0-15
  pBase: number       // 0.5 + 0.04·(S−7.5)（封顶 0.75、封底 0.30）
  pAdj: number        // 贝叶斯收缩
  b: number           // 赔率
  p0: number          // 盈亏平衡概率
  edge: number        // b·p_adj - (1-p_adj)
  fStar: number       // Edge / b（≥0）
  fHalf: number       // f* × 0.5
  recPct: number      // min(fHalf, cap)，最终建议仓位百分比
}

function computeMetrics(r: KellyRow): KellyMetrics {
  const S = (r.moat || 0) + (r.mgmt || 0) + (r.valPct || 0)
  // p_base 以 S=7.5 为中性点（0.5），斜率0.04：S=10→60%、S=12.5→70%、S=5→40%、S=2.5→30%
  // 封顶 0.75（避免过度乐观），封底 0.30（避免 p_base=0）
  const pBase = Math.min(0.75, Math.max(0.30, 0.5 + 0.04 * (S - 7.5)))
  const m = 10  // 贝叶斯收缩参数，固定为 10
  const pAdj = (S * pBase + m * 0.5) / (S + m)
  const downAbs = Math.abs(r.rDown || 0)
  const b = downAbs > 0 ? (r.rUp || 0) / downAbs : 0
  const p0 = b > 0 ? 1 / (1 + b) : 1
  const edge = b > 0 ? b * pAdj - (1 - pAdj) : -1
  const fStarRaw = b > 0 ? edge / b : 0
  const fStar = Math.max(0, fStarRaw)
  const fHalf = fStar * 0.5
  const cap = (r.cap > 0 ? r.cap : 0) / 100
  const recPct = Math.min(fHalf, cap) * 100
  return { S, pBase, pAdj, b, p0, edge, fStar, fHalf, recPct }
}

interface KellyPositionTableProps {
  symbolHints: { symbol: string; name: string; lastPrice: number; valueCny?: number }[]
  totalAssets: number
}

/* 受控 number input（顶层定义）
   - draft 是输入框的真相。初始值从 prop value 填入。
   - 每个 keystroke：同步更新 draft 并立即调 onChange，触发表格衡生列重算。
   - 仅当 prop value 变动且与当前 draft 解析后的数值不一致时才被动同步，避免覆盖输入中间态。 */
const NumInput = React.memo(function NumInput({ value, onChange, step = 1, min, max, width = 60 }: {
  value: number
  onChange: (v: number) => void
  step?: number
  min?: number
  max?: number
  width?: number
}) {
  const [draft, setDraft] = useState<string>(() => String(value))
  // 仅在外部 prop value 与当前 draft 不一致时同步（处理重置 Cap 等场景）
  useEffect(() => {
    const parsed = parseFloat(draft)
    if (!Number.isFinite(parsed) || parsed !== value) {
      setDraft(String(value))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  return (
    <input
      type="number"
      value={draft}
      step={step}
      min={min}
      max={max}
      onChange={e => {
        const v = e.target.value
        setDraft(v)
        const n = parseFloat(v)
        if (Number.isFinite(n)) onChange(n)
      }}
      onBlur={() => {
        const n = parseFloat(draft)
        if (!Number.isFinite(n)) setDraft(String(value))
        else setDraft(String(n))
      }}
      style={{ width, padding: '2px 4px', textAlign: 'right' }}
    />
  )
})

/* 术语解释面板（可折叠，默认展开） */
function KellyTermsPanel() {
  const [open, setOpen] = useState(true)
  const item = (term: string, desc: string) => (
    <div style={{ display: 'flex', gap: 8, padding: '4px 0', borderBottom: '1px dashed var(--border)', fontSize: '.78rem' }}>
      <div style={{ minWidth: 130, fontWeight: 600 }}>{term}</div>
      <div style={{ flex: 1, color: 'var(--fg2)' }}>{desc}</div>
    </div>
  )
  return (
    <div style={{ marginBottom: 10, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg2)' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', userSelect: 'none' }}
      >
        <strong style={{ fontSize: '.85rem' }}>📖 术语说明</strong>
        <span style={{ color: 'var(--fg2)', fontSize: '.75rem' }}>{open ? '收起 ▲' : '展开 ▼'}</span>
      </div>
      {open && (
        <div style={{ padding: '4px 12px 10px' }}>
          {item('Cap 上限', '单标的风控硬上限百分比，按类别预设：核心20% / 成长15% / 卫星8% / 周期10% / 主题7% / 少数赢家20%。')}
          {item('R_up / R_down', '3 年视角的目标价上行 / 下跌幅度，例 R_up = 0.5 即涨 50%、R_down = -0.25 即跌 25%。')}
          {item('护城河 / 管理 / 估值', '0–5 分主观打分（支持一位小数），越高越好；分别衡量业务护城河、管理资本分配、当前估值位置。')}
          {item('评分 S', '= 护城河 + 管理 + 估值分位（0–15 分）。')}
          {item('p_base 基础胜率', '= min(0.75, max(0.30, 0.5 + 0.04×(S−7.5)))。以 S=7.5 为中性点（p_base=50%）：S=10→60%、S=12.5→70%、S=15→封顶 75%；S=5→40%、S=2.5→封底 30%。评分偏中性以下的标的会出现负 Edge，从而被识别为“不推荐仓位”。')}
          {item('p_adj 修正胜率', '贝叶斯收缩后的胜率 = (S·p_base + m·0.5)/(S+m)，向 0.5 靠拢以避免过度自信。')}
          {item('收缩参数 m（固定为 10）', '贝叶斯收缩参数，用于计算 p_adj 时让胜率向 0.5 靠拢，避免过度自信。值越大越保守。')}
          {item('赔率 b', '= R_up / |R_down|，赢亏比。')}
          {item('p0 盈亏平衡', '= 1 / (1+b)，胜率需突破此值才有正期望。')}
          {item('Edge 优势', '= b×p_adj − (1−p_adj)，期望收益 > 0 才值得投。')}
          {item('凯利 f*', '理论最优仓位 = Edge / b（下限 0）。')}
          {item('建议仓位', '= min(凯利 f* × 0.5, Cap 上限)。即将理论最优仓位 f* 乘以 0.5（半凯利保守值），再受 Cap 上限约束。')}
          {item('结论', '按「建议 − 实际」的差距给出「已超过Cap / 接近上限 / 逢低加X% / 还有X%加仓 / 存疑观望」。')}
        </div>
      )}
    </div>
  )
}

function KellyPositionTable({ symbolHints, totalAssets }: KellyPositionTableProps) {
  const hintsWithValue = useMemo(
    () => symbolHints.map(h => ({ ...h, valueCny: (h as { valueCny?: number }).valueCny || 0 })),
    [symbolHints],
  )
  const { rows, setRows } = useKellyTable(hintsWithValue)
  const [newRow, setNewRow] = useState({ symbol: '', name: '' })

  const updateRow = <K extends keyof KellyRow>(i: number, field: K, value: KellyRow[K]) => {
    setRows(prev => {
      const next = [...prev]
      next[i] = { ...next[i], [field]: value }
      // 切换类别时同步默认 Cap（仅当用户未自定义时）
      if (field === 'category') {
        const newCat = value as AssetCategory
        const oldCat = prev[i].category
        // 如果当前 cap 等于旧类别默认值，认为是"未自定义"，自动跟随新类别
        if (Math.abs(prev[i].cap - CATEGORY_CAP[oldCat]) < 0.01) {
          next[i].cap = CATEGORY_CAP[newCat]
        }
      }
      return next
    })
  }

  const removeRow = (i: number) => {
    if (!confirm('从凯利表中移除这一行？')) return
    setRows(prev => prev.filter((_, idx) => idx !== i))
  }

  const addRow = () => {
    const sym = newRow.symbol.trim().toUpperCase()
    if (!sym) { alert('请填写代码'); return }
    if (rows.find(r => r.symbol === sym)) { alert('该标的已在表中'); return }
    const inferred = inferCategory(sym, newRow.name)
    setRows(prev => [...prev, {
      symbol: sym,
      name: newRow.name.trim() || sym,
      currentValueCny: 0,
      ...defaultRowFields(),
      category: inferred,
      cap: CATEGORY_CAP[inferred],
    }])
    setNewRow({ symbol: '', name: '' })
  }

  // 重新应用类别默认 Cap：只重置 cap，其他字段不动
  const resetCaps = () => {
    if (!confirm('将所有行的 Cap 重置为当前类别默认值（核心 20% / 成长 15% / 卫星 8% / 周期 10% / 主题 7% / 少数赢家 20%）。其他字段保持不变。继续？')) return
    setRows(prev => prev.map(r => ({ ...r, cap: CATEGORY_CAP[r.category] })))
  }

  // 一键按类别填默认值（智能推断 + 重置 Cap）
  const fillDefaults = () => {
    if (!confirm('将根据股票名称智能推断类别并重置 Cap、护城河/管理/估值（=3）、R_up=40%、R_down=-25%、收缩m=10。继续？')) return
    setRows(prev => prev.map(r => {
      const cat = inferCategory(r.symbol, r.name)
      return {
        ...r,
        category: cat,
        cap: CATEGORY_CAP[cat],
        rUp: 0.4,
        rDown: -0.25,
        moat: 3,
        mgmt: 3,
        valPct: 3,
        shrinkM: 10,
      }
    }))
  }

  return (
    <div className="section" style={{ marginTop: 24 }}>
      <div className="section-header">
        <h2>📐 凯利仓位速查表 · 专业版</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="sm" onClick={resetCaps}>重新应用类别默认 Cap</button>
          <button className="sm" onClick={fillDefaults}>按类别一键填默认值</button>
        </div>
      </div>
      <KellyTermsPanel />
      <div style={{ fontSize: '.78rem', color: 'var(--fg2)', marginBottom: 10 }}>
        Edge = b·p_adj − (1−p_adj) · f* = Edge/b · 建议仓位 = min(f*×0.5, Cap)。
        <strong>护城河/管理/估值改一下 → 评分S → p_base → p_adj → f* 立即重算。</strong>
      </div>
      <div className="table-wrap">
        <table style={{ fontSize: '.78rem' }}>
          <thead>
            <tr>
              <th>代码 / 名称</th>
              <th>类别</th>
              <th className="r" title="风控硬上限">Cap %</th>
              <th className="r" title="3年目标价上行%">R_up</th>
              <th className="r" title="边际下跌%（负数）">R_down</th>
              <th className="r">护城河</th>
              <th className="r">管理</th>
              <th className="r">估值分位</th>
              <th className="r">S</th>
              <th className="r">p_base</th>
              <th className="r">p_adj</th>
              <th className="r">b</th>
              <th className="r">p0</th>
              <th className="r">Edge</th>
              <th className="r">f*</th>
              <th className="r"><b>建议仓位%</b></th>
              <th className="r">实际仓位%</th>
              <th>结论</th>
              <th>备注</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {/* 衡生列计算全部在 render 内联完成，不进入 state、不走 useEffect。
                rows 变化 → KellyPositionTable 重渲染 → computeMetrics(r) 重跑。 */}
            {rows.map((r, i) => {
              const m = computeMetrics(r)
              const actualPct = totalAssets > 0 ? (r.currentValueCny / totalAssets * 100) : 0
              const diff = m.recPct - actualPct  // 正数=可加仓
              let conclusion = '持有'
              let color: string = 'var(--fg)'
              if (m.edge <= 0) {
                conclusion = '存疑，观望'
                color = 'var(--fg2)'
              } else if (actualPct > m.recPct + 2) {
                conclusion = '已超过Cap'
                color = 'var(--red)'
              } else if (actualPct > m.recPct - 1) {
                conclusion = '接近上限'
                color = 'var(--warn)'
              } else if (diff > 5) {
                conclusion = `逢低加 ${diff.toFixed(1)}%`
                color = 'var(--green)'
              } else if (diff > 2) {
                conclusion = `还有 ${diff.toFixed(1)}% 加仓`
                color = 'var(--green)'
              }
              return (
                <tr key={r.symbol}>
                  <td style={{ width: 80, maxWidth: 80 }} title={`${r.symbol} · ${r.name}`}>
                    <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.symbol}</div>
                    <div style={{ fontSize: '.68rem', color: 'var(--fg2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
                  </td>
                  <td style={{ width: 64 }}>
                    <select value={r.category}
                      onChange={e => updateRow(i, 'category', e.target.value as AssetCategory)}
                      title={CATEGORY_LABELS[r.category]}
                      style={{ fontSize: '.75rem', padding: '2px 4px', width: 60 }}>
                      {(Object.keys(CATEGORY_LABELS) as AssetCategory[]).map(k =>
                        <option key={k} value={k}>{CATEGORY_LABELS_SHORT[k]}</option>)}
                    </select>
                  </td>
                  <td className="r">
                    <NumInput value={r.cap} step={0.5} min={0} max={100}
                      onChange={v => updateRow(i, 'cap', v)} width={55} />
                  </td>
                  <td className="r">
                    <NumInput value={r.rUp} step={0.05}
                      onChange={v => updateRow(i, 'rUp', v)} width={55} />
                  </td>
                  <td className="r">
                    <NumInput value={r.rDown} step={0.05}
                      onChange={v => updateRow(i, 'rDown', v)} width={55} />
                  </td>
                  <td className="r">
                    <NumInput value={r.moat} step={0.1} min={0} max={5}
                      onChange={v => updateRow(i, 'moat', v)} width={50} />
                  </td>
                  <td className="r">
                    <NumInput value={r.mgmt} step={0.1} min={0} max={5}
                      onChange={v => updateRow(i, 'mgmt', v)} width={50} />
                  </td>
                  <td className="r">
                    <NumInput value={r.valPct} step={0.1} min={0} max={5}
                      onChange={v => updateRow(i, 'valPct', v)} width={50} />
                  </td>
                  <td className="r" style={{ color: 'var(--fg2)' }}>{m.S.toFixed(1)}</td>
                  <td className="r" style={{ color: 'var(--fg2)' }}>{(m.pBase * 100).toFixed(1)}%</td>
                  <td className="r" style={{ color: 'var(--fg2)' }}>{(m.pAdj * 100).toFixed(1)}%</td>
                  <td className="r" style={{ color: 'var(--fg2)' }}>{m.b.toFixed(2)}</td>
                  <td className="r" style={{ color: 'var(--fg2)' }}>{(m.p0 * 100).toFixed(1)}%</td>
                  <td className="r" style={{ color: m.edge > 0 ? 'var(--green)' : 'var(--red)' }}>
                    {(m.edge * 100).toFixed(1)}%
                  </td>
                  <td className="r" style={{ color: 'var(--fg2)' }}>{(m.fStar * 100).toFixed(1)}%</td>
                  <td className="r" style={{ fontWeight: 600 }}>{m.recPct.toFixed(1)}%</td>
                  <td className="r">{actualPct.toFixed(1)}%</td>
                  <td style={{ color, fontWeight: 600, whiteSpace: 'nowrap' }}>{conclusion}</td>
                  <td>
                    <input value={r.note || ''} onChange={e => updateRow(i, 'note', e.target.value)}
                      placeholder="备注" style={{ width: 100, padding: '2px 4px', fontSize: '.78rem' }} />
                  </td>
                  <td>
                    <button className="sm danger" onClick={() => removeRow(i)} style={{ padding: '2px 6px', fontSize: '.7rem' }}>×</button>
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr><td colSpan={20} style={{ textAlign: 'center', padding: 16, color: 'var(--fg2)' }}>暂无数据，添加股票开始</td></tr>
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
        <button className="primary" onClick={addRow}>+ 添加观察标的</button>
        <span style={{ fontSize: '.72rem', color: 'var(--fg2)', alignSelf: 'center' }}>
          类别会按名字自动推断，可在表内修改。
        </span>
      </div>

      {/* 总结统计 */}
      {rows.length > 0 && (() => {
        const totalRecPct = rows.reduce((sum, r) => sum + computeMetrics(r).recPct, 0)
        const totalActualPct = rows.reduce((sum, r) => sum + (totalAssets > 0 ? r.currentValueCny / totalAssets * 100 : 0), 0)
        return (
          <div style={{ marginTop: 12, padding: 10, background: 'var(--bg2)', borderRadius: 6, fontSize: '.8rem' }}>
            <span>建议总仓位 <b style={{ color: 'var(--accent)' }}>{totalRecPct.toFixed(1)}%</b></span>
            <span style={{ marginLeft: 16 }}>实际总仓位 <b>{totalActualPct.toFixed(1)}%</b></span>
            <span style={{ marginLeft: 16, color: 'var(--fg2)' }}>
              {totalRecPct > 75 ? '⚠️ 建议总仓位>75%上限，请下调评分或Cap'
                : totalRecPct < 25 ? 'ℹ️ 建议总仓位<25%下限，可上调评分'
                : '✓ 建议总仓位在 25-75% 健康区间'}
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
