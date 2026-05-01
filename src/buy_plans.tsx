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
  targetHigh: number  // \u533a\u95f4\u4e0a\u9650\uff08\u9996\u4ed3\u4ef7\uff09
  targetLow: number   // \u533a\u95f4\u4e0b\u9650\uff08\u6700\u4f4e\u4ef7\uff09
  maxCapital: number
  winRate: number     // 1-9
  kellyFraction: number  // \u8ba1\u7b97\u540e\u7684 f*
  totalAssets: number
  pyramid: PyramidLevel[]
  status: 'active' | 'completed' | 'cancelled'
  note?: string
}

function genId() { return Math.random().toString(36).slice(2, 10) }

/* ────────── \u51ef\u5229\u516c\u5f0f ────────── */

/**
 * \u80dc\u7387 1-9 \u6620\u5c04\u4e3a 0.55..0.85
 */
function winRateToProb(score: number): number {
  const s = Math.max(1, Math.min(9, score))
  return 0.50 + (s - 1) * (0.35 / 8)  // 1\u219250%, 9\u219285%
}

/**
 * \u8d54\u7387 b\uff1a\u8df3\u4ed3\u4f30\u503c\u8d54\u7387\u3002\u63a8\u5bfc\u4e3a\u7ed9\u5b9a\u4ef7\u533a\u95f4\u7684\u9690\u542b\u4e0a\u884c\u7a7a\u95f4\u3002
 *  \u7b80\u5316\uff1ab = \u5e73\u5747\u4e70\u5165\u4ef7 \u4e0a\u53cd\u5f39 50% (\u7406\u8bba 1y \u76ee\u6807) \u3247 \u4e0b\u8dcc\u5e45\u5ea6 \u224820% \u4e0b\u9650
 */
export function computeKelly(winScore: number): { p: number; q: number; b: number; f: number } {
  const p = winRateToProb(winScore)
  const q = 1 - p
  const b = 2.5  // \u9690\u542b\u8d54\u7387 = 2.5\uff08\u80dc\u8d3a 2.5 \u5355\u4f4d / \u8d25\u8d54 1 \u5355\u4f4d\uff0c\u5bf9\u5e94\u9006\u52bf\u5206\u6279\u573a\u666f\uff09
  let f = (b * p - q) / b
  if (!isFinite(f) || f < 0) f = 0
  // \u5b89\u5168\u4e0a\u9650 25%
  f = Math.min(f, 0.25)
  return { p, q, b, f: Math.round(f * 1000) / 1000 }
}

/* ────────── \u91d1\u5b57\u5854\u751f\u6210 ────────── */

/**
 * 4 \u6863\u8df3\u4ef7\uff1a\u4ece targetHigh \u7b49\u95f4\u8ddd\u5230 targetLow\uff0c\u4f4e\u4ef7\u5206\u914d\u66f4\u591a\u8d44\u91d1\u3002
 * \u9ed8\u8ba4\u4e3b\u91cd\u5206\u5e03 [0.15, 0.25, 0.30, 0.30]\u3002
 */
export function buildPyramid(
  currentPrice: number,
  targetHigh: number,
  targetLow: number,
  maxCapital: number,
): PyramidLevel[] {
  if (targetHigh <= 0 || targetLow <= 0 || targetLow >= targetHigh || maxCapital <= 0) return []
  const weights = [0.15, 0.25, 0.30, 0.30]
  // 4 \u6863\u4ef7\u4f4d\uff1ahigh, high*0.95, mid, low (\u51e0\u4f55\u5e73\u5747\u8df3)
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

/* ────────── \u5b58\u50a8 hook ────────── */

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
 * \u67e5\u770b\u54ea\u4e9b\u8ba1\u5212\u88ab\u300c\u5b9e\u65f6\u4ef7\u300d\u89e6\u53d1\uff0c\u8fd4\u56de banner \u9700\u8981\u7684\u63d0\u793a\u3002
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
    // \u627e\u51fa\u5f53\u524d\u4ef7 \u2264 \u67d0\u6863\uff0c\u4e14\u5c1a\u672a\u88ab\u6807\u8bb0 triggered \u7684\u6700\u9ad8\u4ef7\u4f4d
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

/* ────────── BuyPlansTab \u2014 \u8ba1\u5212\u5668 + \u6d3b\u8dc3\u8ba1\u5212\u5217\u8868 ────────── */

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

  // \u5f53\u9009\u4e2d\u6301\u4ed3\u80a1\u65f6\u81ea\u52a8\u586b\u5145\u73b0\u4ef7\u4e0e\u540d\u79f0
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
    if (!confirm('\u5220\u9664\u8be5\u52a0\u4ed3\u8ba1\u5212\uff1f')) return
    setPlans(plans.filter(p => p.id !== id))
  }

  const toggleStatus = (id: string, status: BuyPlan['status']) => {
    setPlans(plans.map(p => p.id === id ? { ...p, status } : p))
  }

  return (
    <>
      {/* \u52a0\u4ed3\u8ba1\u5212\u5668 */}
      <div className="section">
        <div className="section-header">
          <h2>\u52a0\u4ed3\u8ba1\u5212\u5668</h2>
        </div>

        <div style={{
          padding: 12, borderRadius: 6,
          background: 'var(--bg2)', border: '1px solid var(--border)',
          fontSize: '.78rem', color: 'var(--fg2)', marginBottom: 12,
        }}>
          \u3010Arthur \u54f2\u5b66\u3011\u9006\u52bf\u5206\u6279\u52a0\u4ed3 + \u51ef\u5229\u516c\u5f0f\u3002\u4f4e\u4ef7\u4f4d\u4e0b\u91cd\u591a\u4ed3\uff0c\u5355\u6807\u7684\u4e0a\u9650 25%\u3002
          \u80dc\u7387\u8d8a\u9ad8 / \u8d54\u7387\u8d8a\u5927\uff0c\u51ef\u5229\u63a8\u8350\u4ed3\u4f4d\u8d8a\u91cd\u3002
        </div>

        {/* \u8f93\u5165\u533a */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
          <div className="field">
            <label>\u80a1\u7968\u4ee3\u7801</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={draft.symbol} onChange={e => setDraft({ ...draft, symbol: e.target.value })} placeholder="\u5982 00700.HK" />
              {symbolHints.length > 0 && (
                <select onChange={e => onPickSymbol(e.target.value)} value="" style={{ width: 110 }}>
                  <option value="">\u9009\u6301\u4ed3</option>
                  {symbolHints.map(h => <option key={h.symbol} value={h.symbol}>{h.symbol}</option>)}
                </select>
              )}
            </div>
          </div>
          <div className="field">
            <label>\u540d\u79f0\uff08\u53ef\u9009\uff09</label>
            <input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="\u817e\u8baf\u63a7\u80a1" />
          </div>
          <div className="field">
            <label>\u5f53\u524d\u4ef7</label>
            <input type="number" value={draft.currentPrice} onChange={e => setDraft({ ...draft, currentPrice: e.target.value })} />
          </div>
          <div className="field">
            <label>\u76ee\u6807\u4e70\u5165\u4ef7\u4e0a\u9650 (\u9996\u4ed3\u4ef7)</label>
            <input type="number" value={draft.targetHigh} onChange={e => setDraft({ ...draft, targetHigh: e.target.value })} placeholder="\u5982 450" />
          </div>
          <div className="field">
            <label>\u76ee\u6807\u4e70\u5165\u4ef7\u4e0b\u9650 (\u6700\u4f4e\u52a0\u4ef7)</label>
            <input type="number" value={draft.targetLow} onChange={e => setDraft({ ...draft, targetLow: e.target.value })} placeholder="\u5982 400" />
          </div>
          <div className="field">
            <label>\u6700\u5927\u6295\u5165\u8d44\u91d1</label>
            <input type="number" value={draft.maxCapital} onChange={e => setDraft({ ...draft, maxCapital: e.target.value })} placeholder="\u5982 2000000" />
          </div>
          <div className="field">
            <label>\u80dc\u7387\u5224\u65ad (1=\u5f88\u5dee, 9=\u9ad8\u80dc\u7387)</label>
            <input type="number" min={1} max={9} value={draft.winRate} onChange={e => setDraft({ ...draft, winRate: e.target.value })} />
            <div style={{ fontSize: '.7rem', color: 'var(--fg2)', marginTop: 2 }}>
              \u5f53\u524d\u80dc\u7387 {Math.round(kelly.p * 100)}% \u00b7 \u51ef\u5229 f*={kelly.f} \u00b7 \u63a8\u8350\u603b\u4ed3\u4f4d
              {recommendedTotalCapital ? ` \u00a5${recommendedTotalCapital.toLocaleString()}` : ' (\u8bf7\u586b\u603b\u8d44\u4ea7)'}
            </div>
          </div>
          <div className="field" style={{ gridColumn: 'span 2' }}>
            <label>\u5907\u6ce8\uff08\u53ef\u9009\uff09</label>
            <input value={draft.note} onChange={e => setDraft({ ...draft, note: e.target.value })} placeholder="\u4e3a\u4ec0\u4e48\u8981\u4e70\uff1f\u7406\u7531\u4e00\u53e5\u8bdd" />
          </div>
        </div>

        {/* \u91d1\u5b57\u5854\u8868 */}
        {pyramid.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>\u4ef7\u4f4d\u6863</th>
                  <th className="r">\u4ef7\u683c</th>
                  <th className="r">\u8ddd\u73b0\u4ef7\u8dcc\u5e45</th>
                  <th className="r">\u5355\u6863\u91d1\u989d</th>
                  <th className="r">\u7d2f\u8ba1\u91d1\u989d</th>
                  <th className="r">\u7d2f\u8ba1\u4ed3\u4f4d</th>
                  <th>\u72b6\u6001</th>
                </tr>
              </thead>
              <tbody>
                {pyramid.map((lvl, i) => (
                  <tr key={i}>
                    <td>\u7b2c {i + 1} \u6863</td>
                    <td className="r">{lvl.price.toFixed(2)}</td>
                    <td className="r" style={{ color: lvl.drawdownPct < 0 ? 'var(--red)' : 'var(--fg2)' }}>
                      {lvl.drawdownPct > 0 ? '+' : ''}{lvl.drawdownPct.toFixed(1)}%
                    </td>
                    <td className="r">\u00a5{lvl.amount.toLocaleString()}</td>
                    <td className="r">\u00a5{lvl.cumAmount.toLocaleString()}</td>
                    <td className="r">{lvl.cumPct.toFixed(1)}%</td>
                    <td>{lvl.triggered
                      ? <span style={{ color: 'var(--green)' }}>\u2713 \u5df2\u89e6\u53d1</span>
                      : <span style={{ color: 'var(--fg2)' }}>\u7b49\u5f85</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button className="primary" onClick={save} disabled={!canSave}>\u4fdd\u5b58\u4e3a\u52a0\u4ed3\u8ba1\u5212</button>
          {!canSave && <span style={{ color: 'var(--fg2)', fontSize: '.78rem', alignSelf: 'center' }}>
            \u8bf7\u5b8c\u6574\u586b\u5199\u4ee3\u7801 / \u4ef7\u533a\u95f4 / \u8d44\u91d1
          </span>}
        </div>
      </div>

      {/* \u6d3b\u8dc3\u8ba1\u5212\u5217\u8868 */}
      <div className="section" style={{ marginTop: 16 }}>
        <div className="section-header">
          <h2>\u5df2\u4fdd\u5b58\u52a0\u4ed3\u8ba1\u5212</h2>
        </div>
        {plans.length === 0 ? (
          <div style={{ color: 'var(--fg2)', fontSize: '.85rem' }}>\u8fd8\u6ca1\u6709\u4fdd\u5b58\u4efb\u4f55\u8ba1\u5212</div>
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
                    {p.status === 'active' ? '\u8fdb\u884c\u4e2d' : p.status === 'completed' ? '\u5df2\u5b8c\u6210' : '\u5df2\u53d6\u6d88'}
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: '.72rem', color: 'var(--fg2)' }}>
                    {new Date(p.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: '.78rem', color: 'var(--fg2)', flexWrap: 'wrap' }}>
                  <span>\u521b\u5efa\u4ef7 {p.currentPrice}</span>
                  <span>\u533a\u95f4 {p.targetLow}\u2013{p.targetHigh}</span>
                  <span>\u603b\u8d44\u91d1 \u00a5{p.maxCapital.toLocaleString()}</span>
                  <span>\u80dc\u7387 {p.winRate}/9 \u00b7 f*={p.kellyFraction}</span>
                </div>
                {p.note && <div style={{ fontSize: '.78rem', color: 'var(--fg2)', marginTop: 4 }}>{p.note}</div>}
                <div style={{ marginTop: 8, fontSize: '.75rem' }}>
                  {p.pyramid.map((lvl, i) => (
                    <span key={i} style={{
                      marginRight: 12,
                      color: lvl.triggered ? 'var(--green)' : 'var(--fg2)',
                    }}>
                      {lvl.triggered ? '\u25cf' : '\u25cb'} \u6863{i + 1} {lvl.price.toFixed(2)} (\u00a5{(lvl.amount / 10000).toFixed(1)}\u4e07)
                    </span>
                  ))}
                </div>
                <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                  {p.status === 'active' && (
                    <>
                      <button className="sm" onClick={() => toggleStatus(p.id, 'completed')}>\u6807\u8bb0\u5b8c\u6210</button>
                      <button className="sm" onClick={() => toggleStatus(p.id, 'cancelled')}>\u53d6\u6d88</button>
                    </>
                  )}
                  {p.status !== 'active' && (
                    <button className="sm" onClick={() => toggleStatus(p.id, 'active')}>\u91cd\u542f</button>
                  )}
                  <button className="sm danger" onClick={() => remove(p.id)}>\u5220\u9664</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

/* ────────── \u603b\u89c8\u9876\u90e8\u63d0\u793a banner ────────── */

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
        \ud83d\udd14 \u52a0\u4ed3\u8ba1\u5212\u89e6\u53d1
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {alerts.map(a => (
          <div key={a.planId} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.85rem' }}>
            <span style={{ fontWeight: 600 }}>{a.symbol}</span>
            {a.name && <span style={{ color: 'var(--fg2)' }}>{a.name}</span>}
            <span style={{ color: 'var(--fg2)' }}>\u73b0\u4ef7 {a.currentPrice.toFixed(2)} \u2264 \u6863 {a.triggeredLevel} (\u89e6\u53d1\u4ef7 {a.triggerPrice.toFixed(2)})</span>
            <span style={{ marginLeft: 'auto', color: 'var(--green)', fontWeight: 600 }}>
              \u5efa\u8bae\u52a0\u4ed3 \u00a5{a.amount.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
