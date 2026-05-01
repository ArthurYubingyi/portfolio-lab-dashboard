import { useState, useEffect, useMemo } from 'react'
import { useValuationIndex, useBulkValuation } from './valuation'

/**
 * 第三批 · 模块四（第四批增强） — 股息再投资追踪
 *
 * 改动点：
 * - 自动从 public/dividends/{symbol}.json 拉取派息历史 + 即将到来的除息日
 * - 派息日历视图（按月份显示即将到来的除息日，含颜色提示）
 * - 计算"年度股息收入" = 持仓数量 × 最近12个月每股派息总额
 * - 保留手动录入/状态切换/再投资建议
 *
 * 数据存储 key: portfoliolab_dividends（不变）
 */

const LS_KEY = 'portfoliolab_dividends'

export interface DividendEntry {
  id: string
  symbol: string
  name?: string
  exDate: string
  payDate?: string
  amount: number
  currency: 'CNY' | 'HKD' | 'USD'
  status: 'pending' | 'received' | 'reinvested'
  reinvestedTo?: string
  note?: string
}

interface DividendRecord {
  exDividendDate: string
  paymentDate?: string | null
  amount: number | null
  currency: 'CNY' | 'HKD' | 'USD'
  estimated?: boolean
}

interface DividendData {
  symbol: string
  lastUpdate: string
  history: DividendRecord[]
  upcoming: DividendRecord[]
}

interface DividendIndex {
  updatedAt: string
  list: { symbol: string; lastUpdate: string; historyCount: number; upcomingCount: number }[]
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

/* 自动拉取 dividends/{symbol}.json，支持单 + 批 */

function useDividendData(symbol: string | null) {
  const [data, setData] = useState<DividendData | null>(null)
  useEffect(() => {
    if (!symbol) { setData(null); return }
    let cancelled = false
    fetch(`/dividends/${symbol}.json`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!cancelled) setData(d) })
      .catch(() => { if (!cancelled) setData(null) })
    return () => { cancelled = true }
  }, [symbol])
  return data
}

function useBulkDividendData(symbols: string[]) {
  const [map, setMap] = useState<Map<string, DividendData>>(new Map())
  const key = symbols.join('|')
  useEffect(() => {
    let cancelled = false
    Promise.all(symbols.map(s =>
      fetch(`/dividends/${s}.json`).then(r => r.ok ? r.json() : null).catch(() => null)
    )).then(results => {
      if (cancelled) return
      const m = new Map<string, DividendData>()
      results.forEach((d, i) => { if (d) m.set(symbols[i], d) })
      setMap(m)
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return map
}

function useDividendIndex() {
  const [data, setData] = useState<DividendIndex | null>(null)
  useEffect(() => {
    fetch('/dividends/index.json')
      .then(r => r.ok ? r.json() : null)
      .then(d => setData(d))
      .catch(() => setData(null))
  }, [])
  return data
}

/* ────────── DividendsTab ────────── */

interface TabProps {
  symbolHints: { symbol: string; name: string; currency: 'CNY' | 'HKD' | 'USD'; quantity?: number }[]
}

export function DividendsTab({ symbolHints }: TabProps) {
  const { list, setList } = useDividends()
  const valuationIndex = useValuationIndex()
  const allValSymbols = useMemo(() => valuationIndex?.list.map(x => x.symbol) ?? [], [valuationIndex])
  const { map: valMap } = useBulkValuation(allValSymbols)

  // 自动股息数据
  const divIndex = useDividendIndex()
  const portfolioSymbols = useMemo(() => symbolHints.map(s => s.symbol), [symbolHints])
  const divDataMap = useBulkDividendData(portfolioSymbols)

  // 详情查看
  const [detailSymbol, setDetailSymbol] = useState<string | null>(null)
  const detailData = useDividendData(detailSymbol)

  const [draft, setDraft] = useState({
    symbol: '', name: '', exDate: '', payDate: '', amount: '',
    currency: 'CNY' as 'CNY' | 'HKD' | 'USD', note: '',
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

  const pendingReinvest = sorted.filter(x => x.status === 'received')
  const totalReceivedAmt = pendingReinvest.reduce((s, x) => s + x.amount, 0)

  // 派息日历：未来 12 个月即将到来的除息日（来自自动数据）
  const today = new Date().toISOString().slice(0, 10)
  const oneYearLater = (() => { const d = new Date(); d.setFullYear(d.getFullYear() + 1); return d.toISOString().slice(0, 10) })()
  const upcomingFromAuto = useMemo(() => {
    const items: { symbol: string; name: string; record: DividendRecord }[] = []
    divDataMap.forEach((data, sym) => {
      const hint = symbolHints.find(h => h.symbol === sym)
      const merged = [...data.upcoming, ...data.history.filter(h => h.exDividendDate >= today && h.exDividendDate <= oneYearLater)]
      const seen = new Set<string>()
      merged.forEach(r => {
        const k = r.exDividendDate
        if (seen.has(k)) return
        seen.add(k)
        if (r.exDividendDate >= today && r.exDividendDate <= oneYearLater) {
          items.push({ symbol: sym, name: hint?.name ?? sym, record: r })
        }
      })
    })
    items.sort((a, b) => a.record.exDividendDate.localeCompare(b.record.exDividendDate))
    return items
  }, [divDataMap, symbolHints, today, oneYearLater])

  // 年度股息收入估算：每只股票 = 最近12个月每股派息总额 × 持仓数量
  const annualIncome = useMemo(() => {
    const oneYearAgoStr = (() => { const d = new Date(); d.setFullYear(d.getFullYear() - 1); return d.toISOString().slice(0, 10) })()
    const rows: { symbol: string; name: string; perShare: number; quantity?: number; total: number; currency: string }[] = []
    divDataMap.forEach((data, sym) => {
      const recent = data.history.filter(h => h.exDividendDate >= oneYearAgoStr && h.amount != null)
      if (recent.length === 0) return
      const perShare = recent.reduce((s, r) => s + (r.amount ?? 0), 0)
      const hint = symbolHints.find(h => h.symbol === sym)
      const qty = hint?.quantity
      const currency = recent[0].currency
      rows.push({
        symbol: sym,
        name: hint?.name ?? sym,
        perShare,
        quantity: qty,
        total: qty ? perShare * qty : perShare,
        currency,
      })
    })
    rows.sort((a, b) => b.total - a.total)
    return rows
  }, [divDataMap, symbolHints])

  const lastUpdate = divIndex?.updatedAt?.slice(0, 10) ?? '尚未同步'

  return (
    <>
      {/* 同步状态 + 触发说明 */}
      <div className="section" style={{ marginTop: 16 }}>
        <div className="section-header">
          <h2>📥 自动同步</h2>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', fontSize: '.9rem' }}>
          <div>
            上次同步：<strong>{lastUpdate}</strong>
          </div>
          <div style={{ color: 'var(--fg2)' }}>
            股息数据每周一 12:00 自动从 AKShare（A股/港股）和 Yahoo Finance（美股）抓取。
          </div>
          <a
            href="https://github.com/ArthurYubingyi/portfolio-lab-dashboard/actions/workflows/dividend-fetch.yml"
            target="_blank" rel="noreferrer"
            style={{ fontSize: '.85rem', color: 'var(--accent)' }}
          >手动触发 →</a>
        </div>
        {divIndex && (
          <div style={{ marginTop: 8, fontSize: '.78rem', color: 'var(--fg2)' }}>
            已覆盖 {divIndex.list.length} 个标的；持仓中 {portfolioSymbols.filter(s => divDataMap.has(s)).length}/{portfolioSymbols.length} 命中自动数据。
          </div>
        )}
      </div>

      {/* 红利再投资建议 banner */}
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
            <div style={{ fontSize: '.95rem', marginBottom: 4 }}>
              你有 <strong>{pendingReinvest.length}</strong> 笔股息已到账，合计约 <strong>{totalReceivedAmt.toLocaleString()}</strong>。
            </div>
            <div style={{ fontSize: '.85rem', color: 'var(--fg2)' }}>
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
                <div style={{ fontSize: '.85rem', color: 'var(--fg2)' }}>{c.name}</div>
                <div style={{ marginTop: 6, fontSize: '.9rem' }}>
                  5y PE 分位: <strong style={{ color: 'var(--green)' }}>{c.p5}%</strong>
                </div>
                {c.dy != null && (
                  <div style={{ fontSize: '.85rem', color: 'var(--fg2)' }}>
                    股息率: {(c.dy * 100).toFixed(2)}%
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 派息日历（未来 12 个月） */}
      {upcomingFromAuto.length > 0 && (
        <div className="section" style={{ marginTop: 16 }}>
          <div className="section-header">
            <h2>📅 派息日历 · 未来 12 个月</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 }}>
            {upcomingFromAuto.slice(0, 24).map((it, idx) => {
              const days = Math.ceil((new Date(it.record.exDividendDate).getTime() - Date.now()) / 86400000)
              const color = days <= 14 ? 'var(--red)' : days <= 60 ? 'var(--accent)' : 'var(--green)'
              return (
                <div key={idx} style={{
                  padding: 10, borderRadius: 6,
                  border: `1px solid ${days <= 14 ? 'var(--red)' : 'var(--border)'}`,
                  background: 'var(--bg)',
                  cursor: 'pointer',
                }} onClick={() => setDetailSymbol(it.symbol)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>{it.symbol}</strong>
                    <span style={{ fontSize: '.85rem', color }}>
                      {days <= 0 ? '今日' : `${days}天后`}
                    </span>
                  </div>
                  <div style={{ fontSize: '.85rem', color: 'var(--fg2)', marginTop: 2 }}>
                    {it.name}
                  </div>
                  <div style={{ fontSize: '.85rem', marginTop: 4 }}>
                    除息：{it.record.exDividendDate}
                    {it.record.estimated && <span style={{ marginLeft: 6, color: 'var(--fg2)' }}>(预估)</span>}
                  </div>
                  {it.record.amount != null && (
                    <div style={{ fontSize: '.85rem' }}>
                      每股：{it.record.amount} {it.record.currency}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 年度股息收入 */}
      {annualIncome.length > 0 && (
        <div className="section" style={{ marginTop: 16 }}>
          <div className="section-header">
            <h2>💰 年度股息收入估算</h2>
          </div>
          <div style={{ fontSize: '.85rem', color: 'var(--fg2)', marginBottom: 8 }}>
            基于过去 12 个月每股派息总额 × 持仓数量（持仓数据来自总览）。
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>标的</th>
                  <th className="r">每股派息(12月)</th>
                  <th className="r">持仓数量</th>
                  <th className="r">年度股息</th>
                  <th>币种</th>
                </tr>
              </thead>
              <tbody>
                {annualIncome.map(r => (
                  <tr key={r.symbol} style={{ cursor: 'pointer' }} onClick={() => setDetailSymbol(r.symbol)}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{r.symbol}</div>
                      <div style={{ fontSize: '.78rem', color: 'var(--fg2)' }}>{r.name}</div>
                    </td>
                    <td className="r">{r.perShare.toFixed(3)}</td>
                    <td className="r">{r.quantity != null ? r.quantity.toLocaleString() : '—'}</td>
                    <td className="r"><strong>{r.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong></td>
                    <td>{r.currency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 手动录入 + 已记录 */}
      <div className="section" style={{ marginTop: 16 }}>
        <div className="section-header">
          <h2>股息日历（手动）</h2>
        </div>
        <div style={{ fontSize: '.85rem', color: 'var(--fg2)', marginBottom: 8 }}>
          自动数据缺失或需补充时，在此手动录入；用于跟踪状态（待派 / 已到账 / 已再投资）。
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr auto', gap: 8, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: '.78rem', color: 'var(--fg2)' }}>代码</label>
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
            <label style={{ fontSize: '.78rem', color: 'var(--fg2)' }}>名称</label>
            <input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: '.78rem', color: 'var(--fg2)' }}>除息日</label>
            <input type="date" value={draft.exDate} onChange={e => setDraft({ ...draft, exDate: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: '.78rem', color: 'var(--fg2)' }}>派发日</label>
            <input type="date" value={draft.payDate} onChange={e => setDraft({ ...draft, payDate: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: '.78rem', color: 'var(--fg2)' }}>金额</label>
            <input type="number" value={draft.amount} onChange={e => setDraft({ ...draft, amount: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: '.78rem', color: 'var(--fg2)' }}>币种</label>
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

        {sorted.length === 0 ? (
          <div style={{ color: 'var(--fg2)', fontSize: '.9rem' }}>暂无手动记录</div>
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
                      {d.name && <div style={{ fontSize: '.78rem', color: 'var(--fg2)' }}>{d.name}</div>}
                    </td>
                    <td style={{ fontSize: '.9rem' }}>{d.exDate}</td>
                    <td style={{ fontSize: '.9rem', color: 'var(--fg2)' }}>{d.payDate || '—'}</td>
                    <td className="r">{d.amount.toLocaleString()}</td>
                    <td>{d.currency}</td>
                    <td>
                      <select value={d.status} onChange={e => updateStatus(d.id, e.target.value as DividendEntry['status'])} style={{ fontSize: '.85rem' }}>
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

      {/* 详情弹窗 */}
      {detailSymbol && detailData && (
        <div className="dialog-overlay" onClick={() => setDetailSymbol(null)}>
          <div className="dialog" onClick={e => e.stopPropagation()} style={{ maxWidth: 720 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ margin: 0 }}>{detailSymbol} · 派息历史</h2>
              <button className="sm" onClick={() => setDetailSymbol(null)}>关闭</button>
            </div>
            <div style={{ fontSize: '.85rem', color: 'var(--fg2)', marginBottom: 8 }}>
              数据更新于 {detailData.lastUpdate}
            </div>
            {detailData.upcoming.length > 0 && (
              <>
                <div style={{ fontWeight: 600, marginTop: 8 }}>即将到来</div>
                <table>
                  <thead><tr><th>除息日</th><th>派发日</th><th className="r">金额</th><th>币种</th></tr></thead>
                  <tbody>
                    {detailData.upcoming.map((r, i) => (
                      <tr key={i}>
                        <td>{r.exDividendDate} {r.estimated && <span style={{ color: 'var(--fg2)', fontSize: '.78rem' }}>(预估)</span>}</td>
                        <td>{r.paymentDate || '—'}</td>
                        <td className="r">{r.amount ?? '—'}</td>
                        <td>{r.currency}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
            {detailData.history.length > 0 ? (
              <>
                <div style={{ fontWeight: 600, marginTop: 12 }}>历史 ({detailData.history.length})</div>
                <table>
                  <thead><tr><th>除息日</th><th>派发日</th><th className="r">金额</th><th>币种</th></tr></thead>
                  <tbody>
                    {detailData.history.slice(0, 20).map((r, i) => (
                      <tr key={i}>
                        <td>{r.exDividendDate}</td>
                        <td>{r.paymentDate || '—'}</td>
                        <td className="r">{r.amount ?? '—'}</td>
                        <td>{r.currency}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : (
              <div style={{ color: 'var(--fg2)', fontSize: '.9rem', marginTop: 12 }}>暂无历史派息记录</div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
