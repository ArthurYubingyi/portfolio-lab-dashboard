import { useState, useEffect, useMemo } from 'react'
import { useValuationIndex, useBulkValuation } from './valuation'

/**
 * 第三批 · 模块四 — 股息再投资追踪
 *
 * Arthur 招行 / 茅台 / 腾讯 等都有可观股息，本模块帮助：
 * 1. 手动录入股息派发日历
 * 2. 当某笔股息到账时，提示用红利再投资进估值百分位 < 30 的标的
 * 3. 联动模块一 (valuation) 自动推荐 Top 3 候选
 *
 * 数据存储 key: portfoliolab_dividends
 */

const LS_KEY = 'portfoliolab_dividends'

export interface DividendEntry {
  id: string
  symbol: string
  name?: string
  exDate: string         // 除息日 YYYY-MM-DD
  payDate?: string       // 派发到账日
  amount: number         // 现金股息总额（持仓口径，CNY 等本币）
  currency: 'CNY' | 'HKD' | 'USD'
  status: 'pending' | 'received' | 'reinvested'
  reinvestedTo?: string  // 已再投资到哪只股票
  note?: string
}

function genId() { return Math.random().toString(36).slice(2, 10) }

export function useDividends() {
  const [list, setList] = useState<DividendEntry[]>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      return raw ? JSON.parse(raw) as DividendEntry[] : []
    } catch { return [] }
  })

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(list)) } catch { /* ignore */ }
  }, [list])

  return { list, setList }
}

/* ────────── DividendsTab — 录入与维护 ────────── */

interface TabProps {
  symbolHints: { symbol: string; name: string; currency: 'CNY' | 'HKD' | 'USD' }[]
}

export function DividendsTab({ symbolHints }: TabProps) {
  const { list, setList } = useDividends()
  const valuationIndex = useValuationIndex()
  const allSymbols = useMemo(() => valuationIndex?.list.map(x => x.symbol) ?? [], [valuationIndex])
  const { map: valMap } = useBulkValuation(allSymbols)

  const [draft, setDraft] = useState({
    symbol: '',
    name: '',
    exDate: '',
    payDate: '',
    amount: '',
    currency: 'CNY' as 'CNY' | 'HKD' | 'USD',
    note: '',
  })

  const onPickSymbol = (sym: string) => {
    const hint = symbolHints.find(x => x.symbol === sym)
    setDraft({
      ...draft,
      symbol: sym,
      name: hint?.name ?? draft.name,
      currency: hint?.currency ?? draft.currency,
    })
  }

  const add = () => {
    if (!draft.symbol || !draft.exDate || !draft.amount) return
    const e: DividendEntry = {
      id: genId(),
      symbol: draft.symbol.toUpperCase(),
      name: draft.name || undefined,
      exDate: draft.exDate,
      payDate: draft.payDate || undefined,
      amount: parseFloat(draft.amount),
      currency: draft.currency,
      status: 'pending',
      note: draft.note || undefined,
    }
    setList([e, ...list])
    setDraft({ symbol: '', name: '', exDate: '', payDate: '', amount: '', currency: 'CNY', note: '' })
  }

  const remove = (id: string) => {
    if (!confirm('删除该股息记录？')) return
    setList(list.filter(x => x.id !== id))
  }

  const updateStatus = (id: string, status: DividendEntry['status'], reinvestedTo?: string) => {
    setList(list.map(x => x.id === id ? { ...x, status, reinvestedTo: reinvestedTo ?? x.reinvestedTo } : x))
  }

  const sorted = useMemo(() => {
    return [...list].sort((a, b) => b.exDate.localeCompare(a.exDate))
  }, [list])

  // 推荐: 估值百分位 < 30 的 Top 3
  const candidates = useMemo(() => {
    const items = (valuationIndex?.list ?? []).map(item => {
      const v = valMap.get(item.symbol)
      const p5 = v?.history5y?.pe?.currentPercentile ?? null
      return { ...item, p5, dy: v?.current.dividendYield ?? null }
    }).filter(x => x.p5 != null && x.p5 < 30)
    items.sort((a, b) => (a.p5 ?? 100) - (b.p5 ?? 100))
    return items.slice(0, 3)
  }, [valuationIndex, valMap])

  // 待再投资 (status=received)
  const pendingReinvest = sorted.filter(x => x.status === 'received')
  const totalReceivedAmt = pendingReinvest.reduce((s, x) => s + x.amount, 0)

  return (
    <>
      {pendingReinvest.length > 0 && candidates.length > 0 && (
        <div className="section" style={{ marginTop: 16 }}>
          <div className="section-header">
            <h2>💸 红利再投资建议</h2>
          </div>
          <div style={{
            padding: 12, borderRadius: 6,
            background: 'var(--bg2)', border: '1px solid var(--green)',
            marginBottom: 12,
          }}>
            <div style={{ fontSize: '.85rem', marginBottom: 4 }}>
              你有 <strong>{pendingReinvest.length}</strong> 笔股息已到账，合计约 <strong>{totalReceivedAmt.toLocaleString()}</strong>。
            </div>
            <div style={{ fontSize: '.78rem', color: 'var(--fg2)' }}>
              建议优先加仓估值百分位 &lt; 30 的标的，让红利持续滚雪球。
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {candidates.map(c => (
              <div key={c.symbol} style={{
                padding: 10, borderRadius: 6,
                border: '1px solid var(--border)', background: 'var(--bg)',
              }}>
                <div style={{ fontWeight: 600 }}>{c.symbol}</div>
                <div style={{ fontSize: '.78rem', color: 'var(--fg2)' }}>{c.name}</div>
                <div style={{ marginTop: 6, fontSize: '.85rem' }}>
                  5y PE 分位: <strong style={{ color: 'var(--green)' }}>{c.p5}%</strong>
                </div>
                {c.dy != null && (
                  <div style={{ fontSize: '.78rem', color: 'var(--fg2)' }}>
                    股息率: {(c.dy * 100).toFixed(2)}%
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="section" style={{ marginTop: 16 }}>
        <div className="section-header">
          <h2>股息日历</h2>
        </div>

        {/* 录入 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr auto', gap: 8, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: '.7rem', color: 'var(--fg2)' }}>代码</label>
            <div style={{ display: 'flex', gap: 4 }}>
              <input value={draft.symbol} onChange={e => setDraft({ ...draft, symbol: e.target.value })} placeholder="代码" />
              {symbolHints.length > 0 && (
                <select value="" onChange={e => onPickSymbol(e.target.value)}>
                  <option value="">选</option>
                  {symbolHints.map(h => <option key={h.symbol} value={h.symbol}>{h.symbol}</option>)}
                </select>
              )}
            </div>
          </div>
          <div>
            <label style={{ fontSize: '.7rem', color: 'var(--fg2)' }}>名称</label>
            <input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: '.7rem', color: 'var(--fg2)' }}>除息日</label>
            <input type="date" value={draft.exDate} onChange={e => setDraft({ ...draft, exDate: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: '.7rem', color: 'var(--fg2)' }}>派发日</label>
            <input type="date" value={draft.payDate} onChange={e => setDraft({ ...draft, payDate: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: '.7rem', color: 'var(--fg2)' }}>金额</label>
            <input type="number" value={draft.amount} onChange={e => setDraft({ ...draft, amount: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: '.7rem', color: 'var(--fg2)' }}>币种</label>
            <select value={draft.currency} onChange={e => setDraft({ ...draft, currency: e.target.value as 'CNY' | 'HKD' | 'USD' })}>
              <option value="CNY">CNY</option>
              <option value="HKD">HKD</option>
              <option value="USD">USD</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="primary" onClick={add} disabled={!draft.symbol || !draft.exDate || !draft.amount}>添加</button>
          </div>
        </div>

        {/* 列表 */}
        {sorted.length === 0 ? (
          <div style={{ color: 'var(--fg2)', fontSize: '.85rem' }}>暂无股息记录</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>标的</th><th>除息日</th><th>派发日</th>
                  <th className="r">金额</th><th>币种</th><th>状态</th><th></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(d => (
                  <tr key={d.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{d.symbol}</div>
                      {d.name && <div style={{ fontSize: '.72rem', color: 'var(--fg2)' }}>{d.name}</div>}
                    </td>
                    <td style={{ fontSize: '.85rem' }}>{d.exDate}</td>
                    <td style={{ fontSize: '.85rem', color: 'var(--fg2)' }}>{d.payDate || '—'}</td>
                    <td className="r">{d.amount.toLocaleString()}</td>
                    <td>{d.currency}</td>
                    <td>
                      <select value={d.status} onChange={e => updateStatus(d.id, e.target.value as DividendEntry['status'])} style={{ fontSize: '.78rem' }}>
                        <option value="pending">待派发</option>
                        <option value="received">已到账</option>
                        <option value="reinvested">已再投资</option>
                      </select>
                    </td>
                    <td><button className="sm danger" onClick={() => remove(d.id)}>删除</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
