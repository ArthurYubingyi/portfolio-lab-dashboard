import { useEffect, useState, useMemo } from 'react'

/**
 * 第三批 · 模块一 — 估值百分位追踪
 *
 * 数据由 .github/workflows/valuation-fetch.yml 每周生成，存放在 public/valuation/
 * 前端按需 fetch /valuation/<symbol>.json 与 /valuation/index.json。
 */

export interface ValuationStats {
  min: number | null
  max: number | null
  median: number | null
  currentPercentile?: number | null
}

export interface ValuationHistory {
  pe?: ValuationStats
  pb?: ValuationStats
  ps?: ValuationStats
  dividendYield?: ValuationStats
}

export interface ValuationData {
  symbol: string
  name?: string
  market?: 'A' | 'HK' | 'US' | string
  lastUpdate: string
  current: {
    pe: number | null
    pb: number | null
    ps: number | null
    dividendYield: number | null
    peg: number | null
  }
  history5y?: ValuationHistory
  history10y?: ValuationHistory
  source?: string
}

export interface ValuationIndex {
  updated: string
  list: { symbol: string; name: string; market: string; lastUpdate: string }[]
}

const memoryCache = new Map<string, ValuationData | null>()

function symbolToFile(symbol: string): string {
  return symbol.replace(/\//g, '_')
}

export async function loadValuation(symbol: string): Promise<ValuationData | null> {
  if (memoryCache.has(symbol)) return memoryCache.get(symbol) ?? null
  try {
    const r = await fetch(`/valuation/${symbolToFile(symbol)}.json`, { cache: 'no-cache' })
    if (!r.ok) {
      memoryCache.set(symbol, null)
      return null
    }
    const data = (await r.json()) as ValuationData
    memoryCache.set(symbol, data)
    return data
  } catch {
    memoryCache.set(symbol, null)
    return null
  }
}

/* ────────── React hooks ────────── */

export function useValuation(symbol: string | null | undefined) {
  const [data, setData] = useState<ValuationData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!symbol) { setData(null); return }
    let cancelled = false
    setLoading(true)
    loadValuation(symbol).then(d => {
      if (!cancelled) { setData(d); setLoading(false) }
    })
    return () => { cancelled = true }
  }, [symbol])

  return { data, loading }
}

export function useValuationIndex() {
  const [index, setIndex] = useState<ValuationIndex | null>(null)
  useEffect(() => {
    fetch('/valuation/index.json', { cache: 'no-cache' })
      .then(r => r.ok ? r.json() : null)
      .then(setIndex)
      .catch(() => setIndex(null))
  }, [])
  return index
}

/**
 * 批量加载多个 symbol 的估值（并行）
 */
export function useBulkValuation(symbols: string[]) {
  const [map, setMap] = useState<Map<string, ValuationData>>(new Map())
  const [loading, setLoading] = useState(false)

  // stable key
  const key = useMemo(() => [...symbols].sort().join(','), [symbols])

  useEffect(() => {
    if (symbols.length === 0) { setMap(new Map()); return }
    let cancelled = false
    setLoading(true)
    Promise.all(symbols.map(s => loadValuation(s).then(d => [s, d] as const)))
      .then(pairs => {
        if (cancelled) return
        const m = new Map<string, ValuationData>()
        for (const [s, d] of pairs) if (d) m.set(s, d)
        setMap(m)
        setLoading(false)
      })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return { map, loading }
}

/* ────────── helpers ────────── */

export function percentileColor(p: number | null | undefined): string {
  if (p == null) return 'var(--fg2)'
  if (p < 30) return 'var(--green)'
  if (p < 70) return '#d4a72c'
  return 'var(--red)'
}

export function percentileLabel(p: number | null | undefined): string {
  if (p == null) return '—'
  if (p < 30) return '低估'
  if (p < 70) return '中性'
  return '高估'
}

export function buildAdvice(data: ValuationData | null | undefined): string {
  if (!data) return '无数据'
  const p5 = data.history5y?.pe?.currentPercentile
  const p10 = data.history10y?.pe?.currentPercentile
  if (p5 == null && p10 == null) return '历史数据不足'
  const p = p5 ?? p10 ?? 50
  if (p < 15) return '⭐ 历史极低估值，符合凯利公式建仓条件'
  if (p < 30) return '✓ 低估区间，可考虑分批建仓 / 加仓'
  if (p < 50) return '中性偏低，正常仓位运作'
  if (p < 70) return '中性偏高，谨慎追高'
  if (p < 85) return '⚠️ 高估区间，警惕回调'
  return '🚨 历史极高估值，慎入'
}

/* ────────── ValuationCell — 为持仓表每行按需加载 ────────── */

export function ValuationCell({ symbol, onClick }: { symbol: string; onClick?: () => void }) {
  const { data } = useValuation(symbol)
  return (
    <span onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <ValuationBar data={data} small />
    </span>
  )
}

/* ────────── ValuationBar — 进度条组件（持仓表内联） ────────── */

interface BarProps {
  data: ValuationData | null
  small?: boolean
}

export function ValuationBar({ data, small = false }: BarProps) {
  const p = data?.history5y?.pe?.currentPercentile ?? data?.history10y?.pe?.currentPercentile
  if (data == null) {
    return <span style={{ color: 'var(--fg2)', fontSize: '.75rem' }}>—</span>
  }
  if (p == null) {
    return <span style={{ color: 'var(--fg2)', fontSize: '.75rem' }}>无史</span>
  }
  const w = small ? 60 : 80
  const color = percentileColor(p)
  return (
    <div title={`PE 5y 百分位: ${p}% · ${percentileLabel(p)} · ${buildAdvice(data)}`}
         style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <div style={{
        width: w, height: 8, background: 'var(--bg2)',
        borderRadius: 4, overflow: 'hidden', position: 'relative',
      }}>
        <div style={{
          width: `${Math.min(100, Math.max(0, p))}%`, height: '100%',
          background: color, transition: 'width .3s',
        }} />
      </div>
      <span style={{ fontSize: '.72rem', color, fontWeight: 600, minWidth: 32 }}>{p.toFixed(0)}%</span>
    </div>
  )
}

/* ────────── ValuationDetailDialog — 估值详情弹窗 ────────── */

interface DialogProps {
  symbol: string
  onClose: () => void
}

export function ValuationDetailDialog({ symbol, onClose }: DialogProps) {
  const { data, loading } = useValuation(symbol)

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={e => e.stopPropagation()}
           style={{ maxWidth: 600, width: '92%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ margin: 0 }}>估值详情 · {data?.name || symbol}</h3>
          <button onClick={onClose}>✕</button>
        </div>
        {loading && <div style={{ padding: 20, textAlign: 'center', color: 'var(--fg2)' }}>加载中…</div>}
        {!loading && !data && (
          <div style={{ padding: 20, color: 'var(--fg2)' }}>
            暂无该标的估值数据。每周一次自动抓取（valuation-fetch.yml），或可在监控池中添加后等待下次运行。
          </div>
        )}
        {data && (
          <div style={{ padding: 16 }}>
            <div style={{ fontSize: '.78rem', color: 'var(--fg2)', marginBottom: 12 }}>
              数据更新于 {data.lastUpdate} · 来源 {data.source || 'akshare/yfinance'}
            </div>

            {/* 当前估值 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 16 }}>
              <Metric label="PE (TTM)" value={fmt(data.current.pe)} />
              <Metric label="PB" value={fmt(data.current.pb)} />
              <Metric label="PS" value={fmt(data.current.ps)} />
              <Metric label="股息率" value={data.current.dividendYield != null ? `${(data.current.dividendYield * 100).toFixed(2)}%` : '—'} />
              <Metric label="PEG" value={fmt(data.current.peg)} />
            </div>

            {/* 5y / 10y 区间 */}
            <RangeSection title="过去 5 年区间" hist={data.history5y} current={data.current} />
            <RangeSection title="过去 10 年区间" hist={data.history10y} current={data.current} />

            <div style={{
              marginTop: 16, padding: 12, borderRadius: 6,
              background: 'var(--bg2)', border: '1px solid var(--border)',
              fontSize: '.85rem',
            }}>
              <div style={{ color: 'var(--fg2)', marginBottom: 4 }}>📊 估值建议</div>
              <div style={{ fontWeight: 600 }}>{buildAdvice(data)}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      padding: '8px 10px', borderRadius: 6,
      border: '1px solid var(--border)', background: 'var(--bg)',
    }}>
      <div style={{ fontSize: '.7rem', color: 'var(--fg2)' }}>{label}</div>
      <div style={{ fontSize: '.95rem', fontWeight: 600 }}>{value}</div>
    </div>
  )
}

function RangeSection({ title, hist, current }: {
  title: string
  hist?: ValuationHistory
  current: ValuationData['current']
}) {
  if (!hist) return null
  const rows: { label: string; cur: number | null; stats?: ValuationStats }[] = [
    { label: 'PE', cur: current.pe, stats: hist.pe },
    { label: 'PB', cur: current.pb, stats: hist.pb },
  ]
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: '.85rem', fontWeight: 600, marginBottom: 6 }}>{title}</div>
      {rows.map(r => {
        if (!r.stats || r.stats.min == null || r.stats.max == null) return null
        const cur = r.cur
        const min = r.stats.min, max = r.stats.max, med = r.stats.median
        const pct = r.stats.currentPercentile
        const pos = cur != null && max > min ? (cur - min) / (max - min) * 100 : null
        return (
          <div key={r.label} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', fontSize: '.75rem', color: 'var(--fg2)', justifyContent: 'space-between' }}>
              <span>{r.label}</span>
              <span>百分位 {pct != null ? `${pct}%` : '—'}</span>
            </div>
            <div style={{
              position: 'relative', height: 10, background: 'var(--bg2)',
              borderRadius: 4, marginTop: 2,
            }}>
              {/* 中位数 */}
              {med != null && max > min && (
                <div style={{
                  position: 'absolute', left: `${(med - min) / (max - min) * 100}%`,
                  top: 0, bottom: 0, width: 1, background: 'var(--fg2)',
                }} title={`中位数 ${med}`} />
              )}
              {/* 当前 */}
              {pos != null && (
                <div style={{
                  position: 'absolute', left: `${Math.min(100, Math.max(0, pos))}%`,
                  top: -3, width: 3, height: 16,
                  background: percentileColor(pct), borderRadius: 2,
                  transform: 'translateX(-1.5px)',
                }} title={`当前 ${cur}`} />
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.7rem', color: 'var(--fg2)', marginTop: 2 }}>
              <span>{min}</span>
              {med != null && <span>中位 {med}</span>}
              <span>{max}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function fmt(n: number | null | undefined): string {
  if (n == null) return '—'
  return n.toFixed(2)
}

/* ────────── ValuationMonitorTab — 估值监控 tab ────────── */

interface MonitorProps {
  heldSymbols: string[]
}

export function ValuationMonitorTab({ heldSymbols }: MonitorProps) {
  const index = useValuationIndex()
  const allSymbols = useMemo(() => index?.list.map(x => x.symbol) ?? [], [index])
  const { map, loading } = useBulkValuation(allSymbols)

  const [filter, setFilter] = useState<'all' | 'held' | 'watch' | 'low'>('all')
  const [sortBy, setSortBy] = useState<'pe5y' | 'pe10y'>('pe5y')

  const heldSet = useMemo(() => new Set(heldSymbols), [heldSymbols])

  const rows = useMemo(() => {
    const list = (index?.list ?? []).map(item => {
      const v = map.get(item.symbol)
      const p5 = v?.history5y?.pe?.currentPercentile ?? null
      const p10 = v?.history10y?.pe?.currentPercentile ?? null
      const dy = v?.current.dividendYield ?? null
      const isHeld = heldSet.has(item.symbol)
      return {
        ...item,
        v, p5, p10, dy, isHeld,
      }
    })
    let filtered = list
    if (filter === 'held') filtered = list.filter(x => x.isHeld)
    if (filter === 'watch') filtered = list.filter(x => !x.isHeld)
    if (filter === 'low') filtered = list.filter(x => (x.p5 ?? 100) < 30)
    filtered.sort((a, b) => {
      const av = (sortBy === 'pe5y' ? a.p5 : a.p10) ?? 999
      const bv = (sortBy === 'pe5y' ? b.p5 : b.p10) ?? 999
      return av - bv
    })
    return filtered
  }, [index, map, filter, sortBy, heldSet])

  const [detailSymbol, setDetailSymbol] = useState<string | null>(null)

  return (
    <>
      <div className="section">
        <div className="section-header">
          <h2>估值监控</h2>
          {index && <span style={{ fontSize: '.75rem', color: 'var(--fg2)' }}>更新于 {index.updated}</span>}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          {([['all', '全部'], ['held', '仅持仓'], ['watch', '仅自选'], ['low', '百分位<30']] as const).map(([k, l]) => (
            <button key={k}
              className={filter === k ? 'primary' : ''}
              onClick={() => setFilter(k)}
              style={{ fontSize: '.8rem' }}>{l}</button>
          ))}
          <div style={{ marginLeft: 'auto', fontSize: '.8rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: 'var(--fg2)' }}>排序</span>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as 'pe5y' | 'pe10y')}>
              <option value="pe5y">5年PE百分位</option>
              <option value="pe10y">10年PE百分位</option>
            </select>
          </div>
        </div>

        {loading && <div style={{ color: 'var(--fg2)', fontSize: '.85rem' }}>加载中…</div>}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>标的</th><th>市场</th>
                <th className="r">当前PE</th><th className="r">当前PB</th><th className="r">股息率</th>
                <th className="r">5年PE分位</th><th className="r">10年PE分位</th>
                <th>建议</th><th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.symbol}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{row.symbol}</div>
                    <div style={{ fontSize: '.72rem', color: 'var(--fg2)' }}>
                      {row.name}{row.isHeld && <span style={{ marginLeft: 6, color: 'var(--accent)' }}>· 持仓</span>}
                    </div>
                  </td>
                  <td>{row.market}</td>
                  <td className="r">{fmt(row.v?.current.pe ?? null)}</td>
                  <td className="r">{fmt(row.v?.current.pb ?? null)}</td>
                  <td className="r">{row.dy != null ? `${(row.dy * 100).toFixed(2)}%` : '—'}</td>
                  <td className="r">
                    <span style={{ color: percentileColor(row.p5), fontWeight: 600 }}>
                      {row.p5 != null ? `${row.p5}%` : '—'}
                    </span>
                  </td>
                  <td className="r">
                    <span style={{ color: percentileColor(row.p10), fontWeight: 600 }}>
                      {row.p10 != null ? `${row.p10}%` : '—'}
                    </span>
                  </td>
                  <td style={{ fontSize: '.78rem' }}>{buildAdvice(row.v)}</td>
                  <td>
                    <button className="sm" onClick={() => setDetailSymbol(row.symbol)}>详情</button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--fg2)', padding: 20 }}>无符合筛选的标的</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {detailSymbol && <ValuationDetailDialog symbol={detailSymbol} onClose={() => setDetailSymbol(null)} />}
    </>
  )
}
