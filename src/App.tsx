import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

/* ────────── types ────────── */
interface Position {
  id: string
  symbol: string
  name: string
  qty: number
  currency: 'CNY' | 'USD' | 'HKD'
  market: 'A' | 'HK' | 'US'
  lastPrice: number
  lastUpdated: string
}

interface OptionPosition {
  id: string
  symbol: string       // e.g. "GOOG"
  optionType: 'Put' | 'Call'
  strike: number
  expiry: string       // YYYY-MM-DD
  direction: 'Buy' | 'Sell'
  contracts: number    // num contracts (each = 100 shares)
  markPrice: number    // per-share mark price
  currency: 'USD' | 'HKD' // option denomination currency
  lastUpdated: string
}

interface CashFlow {
  id: string
  date: string
  type: 'inflow' | 'outflow'
  amount: number       // CNY
  note: string
  navAtTime: number    // NAV per share at time of flow
  sharesChanged: number // positive for inflow, negative for outflow
}

interface NavRecord {
  date: string
  nav: number          // per-share NAV
  totalCny: number
}

interface AppState {
  positions: Position[]
  options: OptionPosition[]
  cashflows: CashFlow[]
  navHistory: NavRecord[]
  totalShares: number
  epochDate: string
  lastRefresh: string
  usdcny: number
  hkdcny: number
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

/* ────────── defaults ────────── */
const EPOCH_DATE = '2026-03-06'
const INITIAL_SHARES = 10000
const INITIAL_NAV = 1.0

/* ────────── 静态资产常量 (CNY) ────────── */
const CASH_FIXED_INCOME = 48_000_000   // 现金固收 4800万
const PHYSICAL_GOLD = 1_080_000         // 实物黄金 108万
const OFFMARKET_STOCK_FUND = 3_200_000  // 场外股票基金 320万

/* 股票型 ETF 代码（算入股票仓位） */
const STOCK_TYPE_ETF_SYMBOLS = new Set(['510900.SH', '159941.SZ', '513050.SH'])
/* 黄金 ETF 不计入股票仓位 */
// 159934.SZ (黄金ETF易方达) excluded

const defaultPositions: Position[] = [
  // A股 / 基金
  { id: 's1', symbol: '600036.SH', name: '招商银行', qty: 455400, currency: 'CNY', market: 'A', lastPrice: 0, lastUpdated: '' },
  { id: 's2', symbol: '300750.SZ', name: '宁德时代', qty: 12400, currency: 'CNY', market: 'A', lastPrice: 0, lastUpdated: '' },
  { id: 's3', symbol: '159934.SZ', name: '黄金ETF易方达', qty: 95721, currency: 'CNY', market: 'A', lastPrice: 0, lastUpdated: '' },
  { id: 's4', symbol: '002027.SZ', name: '分众传媒', qty: 463100, currency: 'CNY', market: 'A', lastPrice: 0, lastUpdated: '' },
  { id: 's5', symbol: '510900.SH', name: '恒生中国企业ETF', qty: 300000, currency: 'CNY', market: 'A', lastPrice: 0, lastUpdated: '' },
  { id: 's6', symbol: '159941.SZ', name: '纳指ETF广发', qty: 100000, currency: 'CNY', market: 'A', lastPrice: 0, lastUpdated: '' },
  { id: 's7', symbol: '513050.SH', name: '中概互联网ETF', qty: 600000, currency: 'CNY', market: 'A', lastPrice: 0, lastUpdated: '' },
  { id: 's8', symbol: '300059.SZ', name: '东方财富', qty: 10000, currency: 'CNY', market: 'A', lastPrice: 0, lastUpdated: '' },
  { id: 's9', symbol: '600519.SH', name: '贵州茅台', qty: 2800, currency: 'CNY', market: 'A', lastPrice: 0, lastUpdated: '' },
  // 港股
  { id: 'h1', symbol: '00700.HK', name: '腾讯控股', qty: 32900, currency: 'HKD', market: 'HK', lastPrice: 0, lastUpdated: '' },
  { id: 'h2', symbol: '03968.HK', name: '招商银行H', qty: 18000, currency: 'HKD', market: 'HK', lastPrice: 0, lastUpdated: '' },
  { id: 'h3', symbol: '00939.HK', name: '建设银行', qty: 9000, currency: 'HKD', market: 'HK', lastPrice: 0, lastUpdated: '' },
  { id: 'h4', symbol: '01810.HK', name: '小米集团', qty: 10000, currency: 'HKD', market: 'HK', lastPrice: 0, lastUpdated: '' },
  { id: 'h5', symbol: '09660.HK', name: '地平线机器人', qty: 9400, currency: 'HKD', market: 'HK', lastPrice: 0, lastUpdated: '' },
  { id: 'h6', symbol: '09888.HK', name: '百度集团', qty: 5300, currency: 'HKD', market: 'HK', lastPrice: 0, lastUpdated: '' },
  { id: 'h7', symbol: '03690.HK', name: '美团', qty: 3490, currency: 'HKD', market: 'HK', lastPrice: 0, lastUpdated: '' },
  { id: 'h8', symbol: '09988.HK', name: '阿里巴巴', qty: 15200, currency: 'HKD', market: 'HK', lastPrice: 0, lastUpdated: '' },
  // 美股
  { id: 'u1', symbol: 'TSLA', name: '特斯拉', qty: 1815, currency: 'USD', market: 'US', lastPrice: 0, lastUpdated: '' },
  { id: 'u2', symbol: 'NVDA', name: '英伟达', qty: 210, currency: 'USD', market: 'US', lastPrice: 0, lastUpdated: '' },
  { id: 'u3', symbol: 'AAPL', name: '苹果', qty: 100, currency: 'USD', market: 'US', lastPrice: 0, lastUpdated: '' },
  { id: 'u4', symbol: 'LMND', name: 'Lemonade', qty: 200, currency: 'USD', market: 'US', lastPrice: 0, lastUpdated: '' },
  { id: 'u5', symbol: 'GOOG', name: '谷歌', qty: 100, currency: 'USD', market: 'US', lastPrice: 0, lastUpdated: '' },
]

const defaultOptions: OptionPosition[] = [
  { id: 'o1', symbol: 'GOOG', optionType: 'Put', strike: 285, expiry: '2026-05-15', direction: 'Sell', contracts: 1, markPrice: 0, currency: 'USD', lastUpdated: '' },
  { id: 'o2', symbol: 'TSLA', optionType: 'Put', strike: 425, expiry: '2026-06-18', direction: 'Sell', contracts: 1, markPrice: 0, currency: 'USD', lastUpdated: '' },
  { id: 'o3', symbol: 'TSLA', optionType: 'Put', strike: 400, expiry: '2026-08-21', direction: 'Sell', contracts: 1, markPrice: 0, currency: 'USD', lastUpdated: '' },
  { id: 'o4', symbol: '00700.HK', optionType: 'Put', strike: 450, expiry: '2026-09-29', direction: 'Sell', contracts: 11, markPrice: 0, currency: 'HKD', lastUpdated: '' },
]

/* ────────── 投资哲学 System Prompt ────────── */
const INVESTMENT_SYSTEM_PROMPT = `你是Arthur的私人投资顾问AI。你必须严格基于以下投资原则来分析、讨论、提醒和建议。当Arthur提出投资想法时，你要：
1. 判断是否符合他的投资原则
2. 如果违背原则，明确指出违背了哪条
3. 用他自己的话提醒他（引用原则原文）
4. 给出建议时要考虑当前仓位数据

投资原则全文：
目标: 花合适的时间，追求复合增长。市场给多少都行，心中有市场就很难战胜市场。腾出时间，回归生活，才是真自由。健康长寿是成功投资者的必要条件。追求安全稳定持续的现金流。
原则：要么被动投资，动态平衡，避免人性的贪婪和恐惧。要么减少决策频率，等待低估买，等待高估卖。寻找少数赢家，承担有价值风险。不依牛熊，依竞争力保守估值。横盘筑底买入。
策略：高筑墙（大核安全，人生只要富一次，不下牌桌），广积粮（现金），缓称王（耐心，不追平凡机会，投资就是可以重仓，胜率9成才动）。凯利公式指导建仓。
性格和心理最重要——了解自己，关注过程。不按耐不住或忧心忡忡。最痛时往往最不该放手。买到更低是贪婪，涨一点就抛是恐惧。25-75%仓位比较合适，事先订计划条件达到坚决执行。
极大耐心——不追逐平庸机会，投资就是可以下重手。一生只要富一次。投资30年最多50标的，一年1-2个。少做决策，频繁操作是复利大敌。血流成河时手上有多少现金最重要。坚持不付过高价格。站在人少的一边。
选股和能力圈——买股票买的是公司未来净现金流。知道能力圈多大比能力圈多大更重要。不懂不碰。寻找20年仍会在的好公司。好生意好人好价格。世界是幂律法则，少数赢家驱动。投资真正难点是熬过伟大公司必然经历的巨大回撤。
安全边际——不仅是估值，还是保守仓位、保守组合、逢深度价值逆势买入、简朴知足。投资失败多来于不守安全边际。
健康长寿是投资成功必要条件。`

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }
function today() { return new Date().toISOString().slice(0, 10) }
function fmtNum(n: number, d = 2) { return n.toLocaleString('zh-CN', { minimumFractionDigits: d, maximumFractionDigits: d }) }
function fmtInt(n: number) { return n.toLocaleString('zh-CN', { maximumFractionDigits: 0 }) }

/* ────────── localStorage helpers ────────── */
const LS_KEY = 'portfoliolab_state'
function loadState(): AppState | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return JSON.parse(raw) as AppState
  } catch { /* ignore */ }
  return null
}
function saveState(s: AppState) {
  localStorage.setItem(LS_KEY, JSON.stringify(s))
}

function buildInitialState(): AppState {
  return {
    positions: defaultPositions,
    options: defaultOptions,
    cashflows: [],
    navHistory: [{ date: EPOCH_DATE, nav: INITIAL_NAV, totalCny: 0 }],
    totalShares: INITIAL_SHARES,
    epochDate: EPOCH_DATE,
    lastRefresh: '',
    usdcny: 7.25,
    hkdcny: 0.93,
  }
}

/* ────────── CORS proxy helper ────────── */
const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
]
let proxyIdx = 0

async function fetchWithProxy(url: string, retries = 2): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const proxy = CORS_PROXIES[(proxyIdx + i) % CORS_PROXIES.length]
    try {
      const r = await fetch(proxy + encodeURIComponent(url), { signal: AbortSignal.timeout(12000) })
      if (r.ok) {
        proxyIdx = (proxyIdx + i) % CORS_PROXIES.length
        return r
      }
    } catch { /* next proxy */ }
  }
  return fetch(url, { signal: AbortSignal.timeout(12000) })
}

/* ────────── price fetch ────────── */
async function fetchFxRates(): Promise<{ usdcny: number; hkdcny: number }> {
  try {
    const r = await fetch('https://open.er-api.com/v6/latest/USD', { signal: AbortSignal.timeout(10000) })
    const d = await r.json()
    const usdcny = d.rates?.CNY ?? 7.25
    const usdhkd = d.rates?.HKD ?? 7.8
    return { usdcny, hkdcny: usdcny / usdhkd }
  } catch {
    try {
      const r = await fetch('https://www.floatrates.com/daily/usd.json', { signal: AbortSignal.timeout(10000) })
      const d = await r.json()
      return { usdcny: d.cny?.rate ?? 7.25, hkdcny: (d.cny?.rate ?? 7.25) / (d.hkd?.rate ?? 7.8) }
    } catch { return { usdcny: 7.25, hkdcny: 0.93 } }
  }
}

async function fetchASharePrices(symbols: string[]): Promise<Record<string, number>> {
  if (!symbols.length) return {}
  const prices: Record<string, number> = {}
  const tencentCodes = symbols.map(s => {
    const [code, suffix] = s.split('.')
    return suffix.toLowerCase() + code
  })
  try {
    const r = await fetchWithProxy(`https://qt.gtimg.cn/q=${tencentCodes.join(',')}`)
    const text = await r.text()
    text.split('\n').forEach(line => {
      if (!line.trim()) return
      const m = line.match(/v_(.*?)="(.*?)"/)
      if (!m) return
      const code = m[1]
      const fields = m[2].split('~')
      const price = parseFloat(fields[3])
      if (isNaN(price) || price <= 0) return
      let sym = ''
      if (code.startsWith('sz')) sym = code.slice(2) + '.SZ'
      else if (code.startsWith('sh')) sym = code.slice(2) + '.SH'
      if (sym) prices[sym] = price
    })
  } catch (e) { console.warn('A-share fetch failed', e) }
  return prices
}

async function fetchHKPrices(symbols: string[]): Promise<Record<string, number>> {
  if (!symbols.length) return {}
  const prices: Record<string, number> = {}
  const tencentCodes = symbols.map(s => {
    const code = s.replace('.HK', '')
    return 'hk' + code
  })
  try {
    const r = await fetchWithProxy(`https://qt.gtimg.cn/q=${tencentCodes.join(',')}`)
    const text = await r.text()
    text.split('\n').forEach(line => {
      if (!line.trim()) return
      const m = line.match(/v_(.*?)="(.*?)"/)
      if (!m) return
      const code = m[1]
      const fields = m[2].split('~')
      const price = parseFloat(fields[3])
      if (isNaN(price) || price <= 0) return
      if (code.startsWith('hk')) {
        const sym = code.slice(2) + '.HK'
        prices[sym] = price
      }
    })
  } catch (e) { console.warn('HK fetch failed', e) }
  return prices
}

async function fetchUSPrices(symbols: string[]): Promise<Record<string, number>> {
  if (!symbols.length) return {}
  const prices: Record<string, number> = {}

  // Primary: Tencent Finance (same source as A-shares / HK)
  try {
    const tencentCodes = symbols.map(s => 'us' + s)
    const r = await fetchWithProxy(`https://qt.gtimg.cn/q=${tencentCodes.join(',')}`)
    const text = await r.text()
    text.split('\n').forEach(line => {
      if (!line.trim()) return
      const m = line.match(/v_us(\w+?)="(.*?)"/)
      if (!m) return
      const sym = m[1]
      const fields = m[2].split('~')
      const price = parseFloat(fields[3])
      if (!isNaN(price) && price > 0 && symbols.includes(sym)) {
        prices[sym] = price
      }
    })
  } catch (e) { console.warn('US Tencent fetch failed', e) }

  // Fallback: Sina Finance for any symbols still missing
  const missing = symbols.filter(s => !(s in prices))
  if (missing.length > 0) {
    try {
      const sinaCodes = missing.map(s => 'gb_' + s.toLowerCase())
      const r = await fetchWithProxy(
        `https://hq.sinajs.cn/list=${sinaCodes.join(',')}`,
      )
      const text = await r.text()
      text.split('\n').forEach(line => {
        if (!line.trim()) return
        const m = line.match(/hq_str_gb_(\w+)="(.*?)"/)
        if (!m) return
        const sym = m[1].toUpperCase()
        const fields = m[2].split(',')
        const price = parseFloat(fields[1])
        if (!isNaN(price) && price > 0 && symbols.includes(sym)) {
          prices[sym] = price
        }
      })
    } catch (e) { console.warn('US Sina fallback failed', e) }
  }

  return prices
}

/* ────────── NAV calculation ────────── */
function calcTotalValueCny(
  positions: Position[],
  options: OptionPosition[],
  usdcny: number,
  hkdcny: number,
): number {
  let total = 0
  for (const p of positions) {
    let val = p.qty * p.lastPrice
    if (p.currency === 'USD') val *= usdcny
    else if (p.currency === 'HKD') val *= hkdcny
    total += val
  }
  for (const o of options) {
    const sign = o.direction === 'Sell' ? -1 : 1
    const fxRate = o.currency === 'HKD' ? hkdcny : usdcny
    const notional = sign * o.contracts * 100 * o.markPrice * fxRate
    total += notional
  }
  return total
}

function calcNavPerShare(totalCny: number, totalShares: number): number {
  if (totalShares <= 0) return 1
  return totalCny / totalShares
}

/* ────────── pie colors ────────── */
const PIE_COLORS = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#0891b2', '#d97706', '#6366f1', '#14b8a6', '#f43f5e']
const ASSET_PIE_COLORS = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#d97706', '#16a34a']

/* ────────── component ────────── */
export default function App() {
  const [state, setState] = useState<AppState>(() => loadState() ?? buildInitialState())
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
    return false
  })
  const [refreshing, setRefreshing] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [tab, setTab] = useState<'overview' | 'positions' | 'options' | 'cashflow' | 'advisor'>('overview')

  // Dialogs
  const [showAddStock, setShowAddStock] = useState(false)
  const [showAddOption, setShowAddOption] = useState(false)
  const [showCashFlow, setShowCashFlow] = useState(false)
  const [editingPosition, setEditingPosition] = useState<Position | null>(null)
  const [editDeltaQty, setEditDeltaQty] = useState('')

  // Chart range
  const [chartRange, setChartRange] = useState<'all' | '30d' | '90d'>('all')

  // AI Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Philosophy section toggle
  const [showPhilosophy, setShowPhilosophy] = useState(true)

  // Persist
  useEffect(() => { saveState(state) }, [state])

  // Dark mode class
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // Toast timer
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(null)
  const showToast = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }, [])

  /* ────── update helper ────── */
  const update = useCallback((fn: (s: AppState) => AppState) => {
    setState(prev => fn(prev))
  }, [])

  /* ────── refresh prices ────── */
  const refreshPrices = useCallback(async () => {
    setRefreshing(true)
    try {
      const fx = await fetchFxRates()
      const aSyms = state.positions.filter(p => p.market === 'A').map(p => p.symbol)
      const hkSyms = state.positions.filter(p => p.market === 'HK').map(p => p.symbol)
      const usSyms = state.positions.filter(p => p.market === 'US').map(p => p.symbol)

      const [aPrices, hkPrices, usPrices] = await Promise.all([
        fetchASharePrices(aSyms),
        fetchHKPrices(hkSyms),
        fetchUSPrices(usSyms),
      ])

      const allPrices = { ...aPrices, ...hkPrices, ...usPrices }
      const now = today()

      // Count how many symbols failed
      const allSyms = [...aSyms, ...hkSyms, ...usSyms]
      const failedSyms = allSyms.filter(s => !(s in allPrices))

      update(s => {
        const newPositions = s.positions.map(p => {
          const price = allPrices[p.symbol]
          if (price !== undefined) return { ...p, lastPrice: price, lastUpdated: now }
          return p
        })

        const newOptions = s.options.map(o => {
          return { ...o, lastUpdated: now }
        })

        const totalCny = calcTotalValueCny(newPositions, newOptions, fx.usdcny, fx.hkdcny)
        const nav = calcNavPerShare(totalCny, s.totalShares)

        let newHistory = [...s.navHistory]
        const lastIdx = newHistory.findIndex(r => r.date === now)
        if (lastIdx >= 0) {
          newHistory[lastIdx] = { date: now, nav, totalCny }
        } else {
          newHistory.push({ date: now, nav, totalCny })
        }

        return {
          ...s,
          positions: newPositions,
          options: newOptions,
          usdcny: fx.usdcny,
          hkdcny: fx.hkdcny,
          lastRefresh: new Date().toLocaleString('zh-CN'),
          navHistory: newHistory,
        }
      })

      if (failedSyms.length > 0) {
        showToast(`已刷新，${failedSyms.length} 只取价失败: ${failedSyms.join(', ')}`)
      } else {
        showToast('价格和汇率已刷新')
      }
    } catch (e) {
      console.error('Refresh failed', e)
      showToast('刷新失败，请稍后重试')
    } finally {
      setRefreshing(false)
    }
  }, [state.positions, state.options, update, showToast])

  /* ────── computed values ────── */
  const totalCny = useMemo(() =>
    calcTotalValueCny(state.positions, state.options, state.usdcny, state.hkdcny),
    [state.positions, state.options, state.usdcny, state.hkdcny]
  )

  const navPerShare = useMemo(() =>
    calcNavPerShare(totalCny, state.totalShares),
    [totalCny, state.totalShares]
  )

  const latestNav = state.navHistory.length > 0 ? state.navHistory[state.navHistory.length - 1] : null
  const prevNav = state.navHistory.length > 1 ? state.navHistory[state.navHistory.length - 2] : null
  const displayNav = latestNav?.nav ?? navPerShare
  const dayChange = prevNav ? ((displayNav - prevNav.nav) / prevNav.nav * 100) : 0
  const sinceInception = ((displayNav / INITIAL_NAV) - 1) * 100

  // 总资产 = 场内所有持仓市值 + 现金固收 + 实物黄金 + 场外股票基金
  const totalAssets = totalCny + CASH_FIXED_INCOME + PHYSICAL_GOLD + OFFMARKET_STOCK_FUND

  // Positions with CNY value — weight based on totalAssets (#4)
  const positionsEnriched = useMemo(() =>
    state.positions.map(p => {
      let valueCny = p.qty * p.lastPrice
      if (p.currency === 'USD') valueCny *= state.usdcny
      else if (p.currency === 'HKD') valueCny *= state.hkdcny
      const weight = totalAssets > 0 ? (valueCny / totalAssets * 100) : 0
      return { ...p, valueCny, weight }
    }).sort((a, b) => b.valueCny - a.valueCny),
    [state.positions, state.usdcny, state.hkdcny, totalAssets]
  )

  // Grouped by market (#5)
  const positionsGrouped = useMemo(() => {
    const a = positionsEnriched.filter(p => p.market === 'A').sort((a, b) => b.valueCny - a.valueCny)
    const hk = positionsEnriched.filter(p => p.market === 'HK').sort((a, b) => b.valueCny - a.valueCny)
    const us = positionsEnriched.filter(p => p.market === 'US').sort((a, b) => b.valueCny - a.valueCny)
    return { a, hk, us }
  }, [positionsEnriched])

  // Options with CNY notional
  const optionsEnriched = useMemo(() =>
    state.options.map(o => {
      const fxRate = o.currency === 'HKD' ? state.hkdcny : state.usdcny
      const notionalLocal = o.contracts * 100 * o.markPrice
      const notionalCny = notionalLocal * fxRate
      const sign = o.direction === 'Sell' ? -1 : 1
      const currSymbol = o.currency === 'HKD' ? 'HK$' : '$'
      return { ...o, notionalLocal, notionalCny, signedCny: sign * notionalCny, currSymbol }
    }),
    [state.options, state.usdcny, state.hkdcny]
  )

  // Pie data (individual stock positions + options)
  const pieData = useMemo(() => {
    const items: { name: string; value: number }[] = []
    for (const p of positionsEnriched) {
      if (p.valueCny > 0) items.push({ name: p.name, value: p.valueCny })
    }
    const optTotal = optionsEnriched.reduce((s, o) => s + Math.abs(o.signedCny), 0)
    if (optTotal > 0) items.push({ name: '期权', value: optTotal })
    return items
  }, [positionsEnriched, optionsEnriched])

  /* ────── 总资产概览计算 ────── */

  // 个股市值（A股非ETF + 港股 + 美股）
  const individualStockValue = useMemo(() => {
    return positionsEnriched
      .filter(p => !STOCK_TYPE_ETF_SYMBOLS.has(p.symbol) && p.symbol !== '159934.SZ')
      .reduce((s, p) => s + p.valueCny, 0)
  }, [positionsEnriched])

  // 股票型 ETF 市值
  const stockEtfValue = useMemo(() => {
    return positionsEnriched
      .filter(p => STOCK_TYPE_ETF_SYMBOLS.has(p.symbol))
      .reduce((s, p) => s + p.valueCny, 0)
  }, [positionsEnriched])

  // 黄金ETF市值
  const goldEtfValue = useMemo(() => {
    return positionsEnriched
      .filter(p => p.symbol === '159934.SZ')
      .reduce((s, p) => s + p.valueCny, 0)
  }, [positionsEnriched])

  // 期权名义值
  const optionAbsTotal = useMemo(() => {
    return optionsEnriched.reduce((s, o) => s + Math.abs(o.signedCny), 0)
  }, [optionsEnriched])

  // 场内股票持仓 = 个股 + 股票型ETF
  const inMarketStockValue = individualStockValue + stockEtfValue

  // 股票仓位 = (场内股票持仓 + 场外股票基金) / 总资产
  const stockExposureValue = inMarketStockValue + OFFMARKET_STOCK_FUND

  const stockPositionRatio = totalAssets > 0 ? (stockExposureValue / totalAssets * 100) : 0

  // 黄金合并: 黄金ETF + 实物黄金 (#3)
  const totalGoldValue = goldEtfValue + PHYSICAL_GOLD

  // 资产大类配置饼图 (#3: 黄金合并)
  const assetAllocationData = useMemo(() => {
    const items: { name: string; value: number }[] = []
    if (individualStockValue > 0) items.push({ name: '股票', value: individualStockValue })
    // 基金 = 股票型ETF + 场外股票基金 (黄金ETF不再归入基金)
    const fundTotal = stockEtfValue + OFFMARKET_STOCK_FUND
    if (fundTotal > 0) items.push({ name: '基金', value: fundTotal })
    if (optionAbsTotal > 0) items.push({ name: '期权', value: optionAbsTotal })
    items.push({ name: '现金固收', value: CASH_FIXED_INCOME })
    // 黄金 = 黄金ETF + 实物黄金
    if (totalGoldValue > 0) items.push({ name: '黄金', value: totalGoldValue })
    return items
  }, [individualStockValue, stockEtfValue, optionAbsTotal, totalGoldValue])

  // Chart data
  const chartData = useMemo(() => {
    let data = state.navHistory
    if (chartRange === '30d') data = data.slice(-30)
    else if (chartRange === '90d') data = data.slice(-90)
    return data.map(r => ({ date: r.date.slice(5), nav: parseFloat(r.nav.toFixed(6)), total: r.totalCny }))
  }, [state.navHistory, chartRange])

  /* ────── add stock ────── */
  const [newStock, setNewStock] = useState({ symbol: '', name: '', qty: '', currency: 'CNY' as 'CNY' | 'USD' | 'HKD', market: 'A' as 'A' | 'HK' | 'US', lastPrice: '' })
  const handleAddStock = () => {
    const qty = parseFloat(newStock.qty)
    const price = parseFloat(newStock.lastPrice)
    if (!newStock.symbol || !newStock.name || isNaN(qty) || qty <= 0) { showToast('请填写完整信息'); return }
    update(s => ({
      ...s,
      positions: [...s.positions, {
        id: genId(), symbol: newStock.symbol.toUpperCase(), name: newStock.name,
        qty, currency: newStock.currency, market: newStock.market,
        lastPrice: isNaN(price) ? 0 : price, lastUpdated: today(),
      }]
    }))
    setNewStock({ symbol: '', name: '', qty: '', currency: 'CNY', market: 'A', lastPrice: '' })
    setShowAddStock(false)
    showToast('已添加持仓')
  }

  /* ────── delta qty (adjust shares) ────── */
  const handleDeltaQty = () => {
    if (!editingPosition) return
    const delta = parseFloat(editDeltaQty)
    if (isNaN(delta)) { showToast('请输入有效数字'); return }
    update(s => ({
      ...s,
      positions: s.positions.map(p =>
        p.id === editingPosition.id
          ? { ...p, qty: Math.max(0, p.qty + delta), lastUpdated: today() }
          : p
      )
    }))
    setEditingPosition(null)
    setEditDeltaQty('')
    showToast(delta >= 0 ? `已增持 ${delta} 股` : `已减持 ${Math.abs(delta)} 股`)
  }

  /* ────── delete position ────── */
  const handleDeletePosition = (id: string) => {
    if (!confirm('确定删除此持仓？')) return
    update(s => ({ ...s, positions: s.positions.filter(p => p.id !== id) }))
    showToast('已删除')
  }

  /* ────── add option ────── */
  const [newOpt, setNewOpt] = useState({ symbol: '', optionType: 'Put' as 'Put' | 'Call', strike: '', expiry: '', direction: 'Sell' as 'Buy' | 'Sell', contracts: '1', markPrice: '', currency: 'USD' as 'USD' | 'HKD' })
  const handleAddOption = () => {
    const strike = parseFloat(newOpt.strike)
    const mark = parseFloat(newOpt.markPrice)
    const contracts = parseInt(newOpt.contracts)
    if (!newOpt.symbol || isNaN(strike) || isNaN(contracts) || !newOpt.expiry) { showToast('请填写完整信息'); return }
    update(s => ({
      ...s,
      options: [...s.options, {
        id: genId(), symbol: newOpt.symbol.toUpperCase(), optionType: newOpt.optionType,
        strike, expiry: newOpt.expiry, direction: newOpt.direction,
        contracts, markPrice: isNaN(mark) ? 0 : mark, currency: newOpt.currency, lastUpdated: today(),
      }]
    }))
    setNewOpt({ symbol: '', optionType: 'Put', strike: '', expiry: '', direction: 'Sell', contracts: '1', markPrice: '', currency: 'USD' })
    setShowAddOption(false)
    showToast('已添加期权')
  }

  /* ────── delete option ────── */
  const handleDeleteOption = (id: string) => {
    if (!confirm('确定删除此期权？')) return
    update(s => ({ ...s, options: s.options.filter(o => o.id !== id) }))
    showToast('已删除')
  }

  /* ────── cashflow (unitization) ────── */
  const [newCF, setNewCF] = useState({ type: 'inflow' as 'inflow' | 'outflow', amount: '', note: '' })
  const handleCashFlow = () => {
    const amount = parseFloat(newCF.amount)
    if (isNaN(amount) || amount <= 0) { showToast('请输入有效金额'); return }
    const currentNav = navPerShare > 0 ? navPerShare : INITIAL_NAV
    const sharesChanged = newCF.type === 'inflow'
      ? amount / currentNav
      : -(amount / currentNav)

    update(s => {
      const newShares = Math.max(0, s.totalShares + sharesChanged)
      return {
        ...s,
        totalShares: newShares,
        cashflows: [...s.cashflows, {
          id: genId(), date: today(), type: newCF.type,
          amount, note: newCF.note || (newCF.type === 'inflow' ? '资金流入' : '资金流出'),
          navAtTime: currentNav, sharesChanged,
        }]
      }
    })
    setNewCF({ type: 'inflow', amount: '', note: '' })
    setShowCashFlow(false)
    showToast(newCF.type === 'inflow' ? '资金已流入，份额已增加' : '资金已流出，份额已减少')
  }

  /* ────── export / import ────── */
  const handleExport = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `portfoliolab-${today()}.json`; a.click()
    URL.revokeObjectURL(url)
    showToast('数据已导出')
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = '.json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const imported = JSON.parse(text) as AppState
        if (imported.positions && imported.navHistory) {
          setState(imported)
          showToast('数据已导入')
        } else {
          showToast('无效的数据格式')
        }
      } catch { showToast('导入失败') }
    }
    input.click()
  }

  const handleReset = () => {
    if (!confirm('确定要重置所有数据吗？这将恢复为默认持仓。')) return
    const fresh = buildInitialState()
    setState(fresh)
    showToast('已重置为默认数据')
  }

  /* ────── AI Chat (#2) ────── */
  const buildPortfolioContext = useCallback(() => {
    const lines: string[] = []
    lines.push(`当前持仓数据摘要：`)
    lines.push(`总资产(含场外): ¥${fmtInt(totalAssets)}`)
    lines.push(`场内持仓市值: ¥${fmtInt(totalCny)}`)
    lines.push(`现金固收: ¥${fmtInt(CASH_FIXED_INCOME)} (${totalAssets > 0 ? (CASH_FIXED_INCOME / totalAssets * 100).toFixed(1) : '0'}%)`)
    lines.push(`股票仓位: ${stockPositionRatio.toFixed(1)}% (¥${fmtInt(stockExposureValue)})`)
    lines.push(`实物黄金: ¥${fmtInt(PHYSICAL_GOLD)}`)
    lines.push(`场外股票基金: ¥${fmtInt(OFFMARKET_STOCK_FUND)}`)
    lines.push(`\n各持仓详情 (按市值排序):`)
    for (const p of positionsEnriched) {
      lines.push(`  ${p.name}(${p.symbol}): ${fmtInt(p.qty)}股, 市值¥${fmtInt(p.valueCny)}, 占总资产${p.weight.toFixed(1)}%`)
    }
    lines.push(`\n期权持仓:`)
    for (const o of optionsEnriched) {
      lines.push(`  ${o.direction === 'Sell' ? '卖出' : '买入'} ${o.symbol} ${o.optionType} @${o.currSymbol}${o.strike}, 到期${o.expiry}, ${o.contracts}张`)
    }
    lines.push(`\n汇率: USD/CNY=${state.usdcny.toFixed(4)}, HKD/CNY=${state.hkdcny.toFixed(4)}`)
    return lines.join('\n')
  }, [totalAssets, totalCny, stockPositionRatio, stockExposureValue, positionsEnriched, optionsEnriched, state.usdcny, state.hkdcny])

  const handleSendChat = useCallback(async () => {
    const msg = chatInput.trim()
    if (!msg || chatLoading) return
    setChatInput('')
    const newMessages: ChatMessage[] = [...chatMessages, { role: 'user', content: msg }]
    setChatMessages(newMessages)
    setChatLoading(true)

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const apiKey = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_ANTHROPIC_API_KEY) || ''
      const portfolioCtx = buildPortfolioContext()
      const systemPrompt = INVESTMENT_SYSTEM_PROMPT + '\n\n' + portfolioCtx

      const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }))

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2048,
          system: systemPrompt,
          messages: apiMessages,
        }),
      })

      if (!res.ok) {
        const errText = await res.text()
        throw new Error(`API ${res.status}: ${errText}`)
      }

      const data = await res.json()
      const assistantMsg = data.content?.[0]?.text || '抱歉，没有收到有效回复。'
      setChatMessages(prev => [...prev, { role: 'assistant', content: assistantMsg }])
    } catch (e) {
      console.error('Chat error', e)
      const errorMsg = e instanceof Error ? e.message : '未知错误'
      setChatMessages(prev => [...prev, { role: 'assistant', content: `请求失败: ${errorMsg}\n\n请确认已配置 VITE_ANTHROPIC_API_KEY 环境变量。` }])
    } finally {
      setChatLoading(false)
    }
  }, [chatInput, chatMessages, chatLoading, buildPortfolioContext])

  /* ────── price display helper ────── */
  const priceFailed = (p: { lastPrice: number }) => p.lastPrice <= 0 && !!state.lastRefresh
  const renderPrice = (p: { lastPrice: number }) => {
    if (p.lastPrice > 0) return fmtNum(p.lastPrice)
    if (state.lastRefresh) return <span style={{ color: '#ef4444', fontSize: '.78rem' }}>获取失败</span>
    return '--'
  }
  const renderValuation = (p: { lastPrice: number; valueCny: number }) => {
    if (priceFailed(p)) return <span style={{ color: '#ef4444', fontSize: '.78rem' }}>–</span>
    return `¥${fmtInt(p.valueCny)}`
  }
  const renderWeight = (p: { lastPrice: number; weight: number }) => {
    if (priceFailed(p)) return <span style={{ color: '#ef4444', fontSize: '.78rem' }}>–</span>
    return `${p.weight.toFixed(1)}%`
  }

  /* ────── render helpers for grouped table (#5) ────── */
  const renderMarketGroup = (label: string, positions: typeof positionsEnriched) => {
    if (positions.length === 0) return null
    return (
      <>
        <tr>
          <td colSpan={6} style={{ background: 'var(--bg2)', fontWeight: 600, fontSize: '.82rem', padding: '6px 12px', color: 'var(--fg2)' }}>
            {label}
          </td>
        </tr>
        {positions.map(p => (
          <tr key={p.id}>
            <td>{p.symbol}</td>
            <td>{p.name}</td>
            <td className="r">{fmtInt(p.qty)}</td>
            <td className="r">{renderPrice(p)}</td>
            <td className="r">{renderValuation(p)}</td>
            <td className="r">{renderWeight(p)}</td>
          </tr>
        ))}
      </>
    )
  }

  const renderMarketGroupManage = (label: string, positions: typeof positionsEnriched) => {
    if (positions.length === 0) return null
    return (
      <>
        <tr>
          <td colSpan={10} style={{ background: 'var(--bg2)', fontWeight: 600, fontSize: '.82rem', padding: '6px 12px', color: 'var(--fg2)' }}>
            {label}
          </td>
        </tr>
        {positions.map(p => (
          <tr key={p.id}>
            <td>{p.symbol}</td>
            <td>{p.name}</td>
            <td>{p.market}</td>
            <td>{p.currency}</td>
            <td className="r">{fmtInt(p.qty)}</td>
            <td className="r">{renderPrice(p)}</td>
            <td className="r">{renderValuation(p)}</td>
            <td className="r">{renderWeight(p)}</td>
            <td style={{ fontSize: '.75rem', color: 'var(--fg2)' }}>{p.lastUpdated || '--'}</td>
            <td>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="sm" onClick={() => { setEditingPosition(p); setEditDeltaQty('') }}>调仓</button>
                <button className="sm danger" onClick={() => handleDeletePosition(p.id)}>删除</button>
              </div>
            </td>
          </tr>
        ))}
      </>
    )
  }

  /* ────── render ────── */
  return (
    <div className="container" style={{ paddingBottom: 40 }}>
      {/* Header */}
      <header>
        <div className="inner">
          <h1>
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none" aria-label="PortfolioLab">
              <rect x="2" y="2" width="28" height="28" rx="6" stroke="currentColor" strokeWidth="2"/>
              <path d="M8 22 L12 14 L17 18 L22 8 L26 12" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <circle cx="12" cy="14" r="2" fill="var(--accent)"/>
              <circle cx="22" cy="8" r="2" fill="var(--accent)"/>
            </svg>
            PortfolioLab
          </h1>
          <div className="actions">
            <span style={{ fontSize: '.75rem', color: 'var(--fg2)' }}>
              {state.lastRefresh ? `更新: ${state.lastRefresh}` : '尚未刷新'}
            </span>
            <button onClick={refreshPrices} disabled={refreshing} className="primary">
              {refreshing ? <><span className="spinner" style={{ marginRight: 4 }}></span>刷新中...</> : '刷新行情'}
            </button>
            <button onClick={() => setDarkMode(!darkMode)} title="切换主题" style={{ fontSize: '1rem', padding: '4px 8px' }}>
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      {/* ===== 投资哲学板块 (#1) ===== */}
      <div className="section" style={{ marginTop: 12 }}>
        <div className="section-header" style={{ cursor: 'pointer' }} onClick={() => setShowPhilosophy(!showPhilosophy)}>
          <h2>投资哲学 {showPhilosophy ? '▾' : '▸'}</h2>
        </div>
        {showPhilosophy && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 8 }}>
            <div className="card" style={{ borderLeft: '3px solid #2563eb' }}>
              <div style={{ fontWeight: 600, fontSize: '.85rem', marginBottom: 6, color: '#2563eb' }}>🎯 核心目标</div>
              <ul style={{ fontSize: '.78rem', lineHeight: 1.7, margin: 0, paddingLeft: 16, color: 'var(--fg2)' }}>
                <li>追求复合增长</li>
                <li>回归生活真自由</li>
                <li>安全稳定现金流</li>
                <li>人生只富一次</li>
              </ul>
            </div>
            <div className="card" style={{ borderLeft: '3px solid #7c3aed' }}>
              <div style={{ fontWeight: 600, fontSize: '.85rem', marginBottom: 6, color: '#7c3aed' }}>🧠 投资心法</div>
              <ul style={{ fontSize: '.78rem', lineHeight: 1.7, margin: 0, paddingLeft: 16, color: 'var(--fg2)' }}>
                <li>关注过程</li>
                <li>克服贪婪恐惧</li>
                <li>敬畏市场</li>
                <li>不追平凡机会</li>
              </ul>
            </div>
            <div className="card" style={{ borderLeft: '3px solid #ea580c' }}>
              <div style={{ fontWeight: 600, fontSize: '.85rem', marginBottom: 6, color: '#ea580c' }}>📋 策略指南</div>
              <ul style={{ fontSize: '.78rem', lineHeight: 1.7, margin: 0, paddingLeft: 16, color: 'var(--fg2)' }}>
                <li>高筑墙广积粮缓称王</li>
                <li>凯利公式建仓</li>
                <li>25-75%动态仓位</li>
                <li>能力圈内不懂不碰</li>
              </ul>
            </div>
            <div className="card" style={{ borderLeft: '3px solid #16a34a' }}>
              <div style={{ fontWeight: 600, fontSize: '.85rem', marginBottom: 6, color: '#16a34a' }}>♻️ 持续循环</div>
              <ul style={{ fontSize: '.78rem', lineHeight: 1.7, margin: 0, paddingLeft: 16, color: 'var(--fg2)' }}>
                <li>长期持有优质股权</li>
                <li>现金流再投资</li>
                <li>健康长寿延续复利</li>
                <li>少做决策不频繁操作</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="card">
          <div className="label">单位净值</div>
          <div className="value">{navPerShare > 0 ? navPerShare.toFixed(6) : '--'}</div>
          <div className={`sub ${sinceInception >= 0 ? 'up' : 'down'}`}>
            {sinceInception >= 0 ? '+' : ''}{sinceInception.toFixed(2)}% 成立以来
          </div>
        </div>
        <div className="card">
          <div className="label">场内持仓 (CNY)</div>
          <div className="value">¥{fmtInt(totalCny)}</div>
          <div className="sub">${fmtInt(totalCny / (state.usdcny || 7.25))}</div>
        </div>
        <div className="card">
          <div className="label">当日涨跌</div>
          <div className={`value ${dayChange >= 0 ? 'up' : 'down'}`}>
            {dayChange >= 0 ? '+' : ''}{dayChange.toFixed(2)}%
          </div>
          <div className="sub">USD/CNY: {state.usdcny.toFixed(4)}</div>
        </div>
        <div className="card">
          <div className="label">总份额</div>
          <div className="value">{fmtNum(state.totalShares, 2)}</div>
          <div className="sub">初始 {fmtInt(INITIAL_SHARES)} 份</div>
        </div>
      </div>

      {/* Nav tabs */}
      <div style={{ display: 'flex', gap: 2, marginTop: 20, borderBottom: '2px solid var(--border)', paddingBottom: 0, flexWrap: 'wrap' }}>
        {([['overview', '总览'], ['positions', '持仓'], ['options', '期权'], ['cashflow', '资金流'], ['advisor', 'AI顾问']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              border: 'none', borderRadius: '6px 6px 0 0',
              padding: '8px 18px', fontSize: '.85rem', fontWeight: tab === key ? 600 : 400,
              background: tab === key ? 'var(--accent)' : 'transparent',
              color: tab === key ? '#fff' : 'var(--fg2)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ===== OVERVIEW TAB ===== */}
      {tab === 'overview' && (
        <>
          {/* 总资产概览 */}
          <div className="section" style={{ marginTop: 16 }}>
            <div className="section-header">
              <h2>总资产概览</h2>
            </div>
            <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              <div className="card">
                <div className="label">总资产 (含场外)</div>
                <div className="value" style={{ fontSize: '1.3rem' }}>¥{fmtInt(totalAssets)}</div>
                <div className="sub">${fmtInt(totalAssets / (state.usdcny || 7.25))}</div>
              </div>
              <div className="card">
                <div className="label">股票仓位</div>
                <div className="value" style={{ fontSize: '1.3rem' }}>{stockPositionRatio.toFixed(1)}%</div>
                <div className="sub">¥{fmtInt(stockExposureValue)}</div>
              </div>
              <div className="card">
                <div className="label">现金固收</div>
                <div className="value" style={{ fontSize: '1.3rem' }}>¥{fmtInt(CASH_FIXED_INCOME)}</div>
                <div className="sub">{totalAssets > 0 ? (CASH_FIXED_INCOME / totalAssets * 100).toFixed(1) : '0.0'}%</div>
              </div>
            </div>
            <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginTop: 8 }}>
              <div className="card">
                <div className="label">场内持仓市值</div>
                <div className="value" style={{ fontSize: '1rem' }}>¥{fmtInt(totalCny)}</div>
              </div>
              <div className="card">
                <div className="label">场外股票基金</div>
                <div className="value" style={{ fontSize: '1rem' }}>¥{fmtInt(OFFMARKET_STOCK_FUND)}</div>
              </div>
              <div className="card">
                <div className="label">黄金 (ETF+实物)</div>
                <div className="value" style={{ fontSize: '1rem' }}>¥{fmtInt(totalGoldValue)}</div>
              </div>
              <div className="card">
                <div className="label">期权名义值</div>
                <div className="value" style={{ fontSize: '1rem' }}>¥{fmtInt(optionAbsTotal)}</div>
              </div>
            </div>
          </div>

          {/* 资产大类配置饼图 */}
          {assetAllocationData.length > 0 && (
            <div className="pie-wrap" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="card">
                <h2 style={{ fontSize: '.95rem', fontWeight: 600, marginBottom: 12 }}>资产大类配置</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={assetAllocationData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={105} innerRadius={55} paddingAngle={2}
                      label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(1)}%`}
                    >
                      {assetAllocationData.map((_, i) => (
                        <Cell key={i} fill={ASSET_PIE_COLORS[i % ASSET_PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => `¥${fmtInt(v)}`} />
                    <Legend formatter={(v: string) => <span style={{ fontSize: 12 }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="card">
                <h2 style={{ fontSize: '.95rem', fontWeight: 600, marginBottom: 12 }}>股票仓位说明</h2>
                <div style={{ fontSize: '.82rem', lineHeight: 1.8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>个股市值</span><span>¥{fmtInt(individualStockValue)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>股票型ETF (510900/159941/513050)</span><span>¥{fmtInt(stockEtfValue)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>场外股票基金</span><span>¥{fmtInt(OFFMARKET_STOCK_FUND)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 6, fontWeight: 600 }}>
                    <span>股票敞口合计</span><span>¥{fmtInt(stockExposureValue)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: 'var(--accent)' }}>
                    <span>股票仓位占比</span><span>{stockPositionRatio.toFixed(1)}%</span>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--fg2)' }}>
                      <span>黄金ETF (159934)</span><span>¥{fmtInt(goldEtfValue)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--fg2)' }}>
                      <span>实物黄金</span><span>¥{fmtInt(PHYSICAL_GOLD)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                      <span>黄金合计</span><span>¥{fmtInt(totalGoldValue)}</span>
                    </div>
                  </div>
                  <div style={{ marginTop: 8, color: 'var(--fg2)', fontSize: '.78rem' }}>
                    注: 黄金ETF (159934) 不计入股票仓位
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* NAV Chart */}
          {state.navHistory.length > 1 && (
            <div className="chart-wrap">
              <div className="section-header">
                <h2>净值走势</h2>
                <div className="chart-toggle">
                  {(['all', '90d', '30d'] as const).map(r => (
                    <button key={r} onClick={() => setChartRange(r)} className={chartRange === r ? 'active' : ''}>
                      {r === 'all' ? '全部' : r === '90d' ? '90天' : '30天'}
                    </button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--fg2)" />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} stroke="var(--fg2)" />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => [v.toFixed(6), '净值']}
                  />
                  <Line type="monotone" dataKey="nav" stroke="var(--accent)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Pie */}
          {pieData.length > 0 && (
            <div className="pie-wrap">
              <div className="card">
                <h2 style={{ fontSize: '.95rem', fontWeight: 600, marginBottom: 12 }}>场内持仓配置</h2>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={50} paddingAngle={2}>
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => `¥${fmtInt(v)}`} />
                    <Legend formatter={(v: string) => <span style={{ fontSize: 12 }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="card">
                <h2 style={{ fontSize: '.95rem', fontWeight: 600, marginBottom: 12 }}>持仓占比 (占总资产)</h2>
                {positionsEnriched.slice(0, 10).map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', fontSize: '.82rem' }}>
                    <span>{p.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 80, height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(p.weight * 2, 100)}%`, height: '100%', background: 'var(--accent)', borderRadius: 3 }} />
                      </div>
                      <span style={{ width: 45, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{p.weight.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick position table grouped by market (#5) */}
          <div className="section">
            <div className="section-header">
              <h2>股票持仓概览</h2>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>代码</th><th>名称</th><th className="r">数量</th><th className="r">最新价</th>
                    <th className="r">估值(CNY)</th><th className="r">占比</th>
                  </tr>
                </thead>
                <tbody>
                  {renderMarketGroup('A股 / 基金', positionsGrouped.a)}
                  {renderMarketGroup('港股', positionsGrouped.hk)}
                  {renderMarketGroup('美股', positionsGrouped.us)}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick options table */}
          {optionsEnriched.length > 0 && (
            <div className="section">
              <div className="section-header">
                <h2>期权持仓概览</h2>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>标的</th><th>方向</th><th>类型</th><th className="r">行权价</th>
                      <th>到期日</th><th className="r">合约</th><th className="r">Mark</th><th className="r">名义(CNY)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {optionsEnriched.map(o => (
                      <tr key={o.id}>
                        <td>{o.symbol}</td>
                        <td><span className={`badge badge-${o.direction.toLowerCase()}`}>{o.direction === 'Sell' ? '卖出' : '买入'}</span></td>
                        <td><span className={`badge badge-${o.optionType.toLowerCase()}`}>{o.optionType}</span></td>
                        <td className="r">{o.currSymbol}{fmtNum(o.strike)}</td>
                        <td>{o.expiry}</td>
                        <td className="r">{o.contracts}</td>
                        <td className="r">{o.currSymbol}{fmtNum(o.markPrice)}</td>
                        <td className="r">¥{fmtInt(Math.abs(o.signedCny))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ===== POSITIONS TAB ===== */}
      {tab === 'positions' && (
        <div className="section">
          <div className="section-header">
            <h2>股票持仓管理</h2>
            <button className="primary" onClick={() => setShowAddStock(true)}>+ 新增持仓</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>代码</th><th>名称</th><th>市场</th><th>币种</th>
                  <th className="r">数量</th><th className="r">最新价</th><th className="r">估值(CNY)</th>
                  <th className="r">占比</th><th>更新时间</th><th>操作</th>
                </tr>
              </thead>
              <tbody>
                {renderMarketGroupManage('A股 / 基金', positionsGrouped.a)}
                {renderMarketGroupManage('港股', positionsGrouped.hk)}
                {renderMarketGroupManage('美股', positionsGrouped.us)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== OPTIONS TAB ===== */}
      {tab === 'options' && (
        <div className="section">
          <div className="section-header">
            <h2>期权持仓管理</h2>
            <button className="primary" onClick={() => setShowAddOption(true)}>+ 新增期权</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>标的</th><th>方向</th><th>类型</th><th className="r">行权价</th>
                  <th>到期日</th><th className="r">合约数</th><th className="r">Mark价格</th>
                  <th className="r">名义值</th><th className="r">名义(CNY)</th><th>操作</th>
                </tr>
              </thead>
              <tbody>
                {optionsEnriched.map(o => (
                  <tr key={o.id}>
                    <td>{o.symbol}</td>
                    <td><span className={`badge badge-${o.direction.toLowerCase()}`}>{o.direction === 'Sell' ? '卖出' : '买入'}</span></td>
                    <td><span className={`badge badge-${o.optionType.toLowerCase()}`}>{o.optionType}</span></td>
                    <td className="r">{o.currSymbol}{fmtNum(o.strike)}</td>
                    <td>{o.expiry}</td>
                    <td className="r">{o.contracts}</td>
                    <td className="r">{o.currSymbol}{fmtNum(o.markPrice)}</td>
                    <td className="r">{o.currSymbol}{fmtInt(o.notionalLocal)}</td>
                    <td className="r">¥{fmtInt(Math.abs(o.signedCny))}</td>
                    <td>
                      <button className="sm danger" onClick={() => handleDeleteOption(o.id)}>删除</button>
                    </td>
                  </tr>
                ))}
                {optionsEnriched.length === 0 && (
                  <tr><td colSpan={10} style={{ textAlign: 'center', padding: 24, color: 'var(--fg2)' }}>暂无期权持仓</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== CASHFLOW TAB ===== */}
      {tab === 'cashflow' && (
        <div className="section">
          <div className="section-header">
            <h2>资金流水 (份额法)</h2>
            <button className="primary" onClick={() => setShowCashFlow(true)}>+ 记录流水</button>
          </div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, fontSize: '.85rem' }}>
              <div>
                <div className="label">当前总份额</div>
                <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{fmtNum(state.totalShares, 2)}</div>
              </div>
              <div>
                <div className="label">当前净值</div>
                <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{navPerShare.toFixed(6)}</div>
              </div>
              <div>
                <div className="label">累计资金流水</div>
                <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>
                  {state.cashflows.length} 笔
                </div>
              </div>
            </div>
          </div>
          <div className="cashflow-log table-wrap">
            <table>
              <thead>
                <tr>
                  <th>日期</th><th>类型</th><th className="r">金额(CNY)</th><th className="r">当时净值</th>
                  <th className="r">份额变动</th><th>备注</th>
                </tr>
              </thead>
              <tbody>
                {[...state.cashflows].reverse().map(cf => (
                  <tr key={cf.id}>
                    <td>{cf.date}</td>
                    <td><span className={`badge ${cf.type === 'inflow' ? 'badge-buy' : 'badge-sell'}`}>
                      {cf.type === 'inflow' ? '流入' : '流出'}
                    </span></td>
                    <td className="r">¥{fmtNum(cf.amount, 0)}</td>
                    <td className="r">{cf.navAtTime.toFixed(6)}</td>
                    <td className={`r ${cf.sharesChanged >= 0 ? 'up' : 'down'}`}>
                      {cf.sharesChanged >= 0 ? '+' : ''}{fmtNum(cf.sharesChanged, 2)}
                    </td>
                    <td>{cf.note}</td>
                  </tr>
                ))}
                {state.cashflows.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--fg2)' }}>暂无资金流水记录</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== AI ADVISOR TAB (#2) ===== */}
      {tab === 'advisor' && (
        <div className="section" style={{ marginTop: 16 }}>
          <div className="section-header">
            <h2>AI 投资顾问</h2>
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', fontSize: '.78rem', color: 'var(--fg2)', background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
              基于你的投资哲学和当前持仓数据，AI将为你提供个性化投资建议。请配置 <code>VITE_ANTHROPIC_API_KEY</code> 环境变量。
            </div>
            {/* Chat messages area */}
            <div style={{ height: 420, overflowY: 'auto', padding: 16 }}>
              {chatMessages.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--fg2)', fontSize: '.85rem', marginTop: 60 }}>
                  <div style={{ fontSize: '2rem', marginBottom: 12 }}>🤖</div>
                  <div>你好，Arthur。我是你的AI投资顾问。</div>
                  <div style={{ marginTop: 4 }}>你可以问我关于投资决策、仓位调整、标的分析等问题。</div>
                  <div style={{ marginTop: 4, fontSize: '.78rem' }}>我会严格基于你的投资原则给出建议。</div>
                </div>
              )}
              {chatMessages.map((m, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                  marginBottom: 12,
                }}>
                  <div style={{
                    maxWidth: '80%', padding: '10px 14px', borderRadius: 12,
                    fontSize: '.85rem', lineHeight: 1.6, whiteSpace: 'pre-wrap',
                    background: m.role === 'user' ? 'var(--accent)' : 'var(--bg2)',
                    color: m.role === 'user' ? '#fff' : 'var(--fg)',
                    borderBottomRightRadius: m.role === 'user' ? 4 : 12,
                    borderBottomLeftRadius: m.role === 'assistant' ? 4 : 12,
                  }}>
                    {m.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
                  <div style={{ padding: '10px 14px', borderRadius: 12, background: 'var(--bg2)', fontSize: '.85rem' }}>
                    <span className="spinner" style={{ marginRight: 6 }}></span>思考中...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            {/* Chat input */}
            <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg2)' }}>
              <input
                style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--fg)', fontSize: '.85rem' }}
                placeholder="输入你的投资问题..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChat() } }}
                disabled={chatLoading}
              />
              <button className="primary" onClick={handleSendChat} disabled={chatLoading || !chatInput.trim()}>
                发送
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="footer-info">
        <p>PortfolioLab · 数据存储于浏览器 localStorage · Epoch: {state.epochDate}</p>
        <p style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
          <button className="sm" onClick={handleExport}>导出数据</button>
          <button className="sm" onClick={handleImport}>导入数据</button>
          <button className="sm danger" onClick={handleReset}>重置数据</button>
        </p>
      </div>

      {/* ===== DIALOGS ===== */}

      {/* Add Stock Dialog */}
      {showAddStock && (
        <div className="dialog-overlay" onClick={() => setShowAddStock(false)}>
          <div className="dialog" onClick={e => e.stopPropagation()}>
            <h3>新增股票持仓</h3>
            <div className="row">
              <div className="field">
                <label>代码</label>
                <input placeholder="如 600519.SH" value={newStock.symbol} onChange={e => setNewStock({ ...newStock, symbol: e.target.value })} />
              </div>
              <div className="field">
                <label>名称</label>
                <input placeholder="如 贵州茅台" value={newStock.name} onChange={e => setNewStock({ ...newStock, name: e.target.value })} />
              </div>
            </div>
            <div className="row3">
              <div className="field">
                <label>市场</label>
                <select value={newStock.market} onChange={e => {
                  const m = e.target.value as 'A' | 'HK' | 'US'
                  const cur = m === 'A' ? 'CNY' : m === 'HK' ? 'HKD' : 'USD'
                  setNewStock({ ...newStock, market: m, currency: cur as 'CNY' | 'USD' | 'HKD' })
                }}>
                  <option value="A">A股</option>
                  <option value="HK">港股</option>
                  <option value="US">美股</option>
                </select>
              </div>
              <div className="field">
                <label>数量</label>
                <input type="number" placeholder="0" value={newStock.qty} onChange={e => setNewStock({ ...newStock, qty: e.target.value })} />
              </div>
              <div className="field">
                <label>当前价格</label>
                <input type="number" placeholder="可选，刷新时自动获取" value={newStock.lastPrice} onChange={e => setNewStock({ ...newStock, lastPrice: e.target.value })} />
              </div>
            </div>
            <div className="actions">
              <button onClick={() => setShowAddStock(false)}>取消</button>
              <button className="primary" onClick={handleAddStock}>确认添加</button>
            </div>
          </div>
        </div>
      )}

      {/* Delta Qty Dialog */}
      {editingPosition && (
        <div className="dialog-overlay" onClick={() => setEditingPosition(null)}>
          <div className="dialog" onClick={e => e.stopPropagation()}>
            <h3>调仓 - {editingPosition.name} ({editingPosition.symbol})</h3>
            <p style={{ fontSize: '.85rem', color: 'var(--fg2)', marginBottom: 12 }}>
              当前持仓: {fmtInt(editingPosition.qty)} 股
            </p>
            <div className="field">
              <label>调整数量（正数增持，负数减持）</label>
              <input type="number" value={editDeltaQty} onChange={e => setEditDeltaQty(e.target.value)} placeholder="如 +500 或 -200" />
            </div>
            {editDeltaQty && !isNaN(parseFloat(editDeltaQty)) && (
              <p style={{ fontSize: '.82rem', color: 'var(--fg2)' }}>
                调整后: {fmtInt(Math.max(0, editingPosition.qty + parseFloat(editDeltaQty)))} 股
              </p>
            )}
            <div className="actions">
              <button onClick={() => setEditingPosition(null)}>取消</button>
              <button className="primary" onClick={handleDeltaQty}>确认调仓</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Option Dialog */}
      {showAddOption && (
        <div className="dialog-overlay" onClick={() => setShowAddOption(false)}>
          <div className="dialog" onClick={e => e.stopPropagation()}>
            <h3>新增期权持仓</h3>
            <div className="row">
              <div className="field">
                <label>标的代码</label>
                <input placeholder="如 TSLA" value={newOpt.symbol} onChange={e => setNewOpt({ ...newOpt, symbol: e.target.value })} />
              </div>
              <div className="field">
                <label>方向</label>
                <select value={newOpt.direction} onChange={e => setNewOpt({ ...newOpt, direction: e.target.value as 'Buy' | 'Sell' })}>
                  <option value="Sell">Sell (卖出)</option>
                  <option value="Buy">Buy (买入)</option>
                </select>
              </div>
            </div>
            <div className="row3">
              <div className="field">
                <label>类型</label>
                <select value={newOpt.optionType} onChange={e => setNewOpt({ ...newOpt, optionType: e.target.value as 'Put' | 'Call' })}>
                  <option value="Put">Put</option>
                  <option value="Call">Call</option>
                </select>
              </div>
              <div className="field">
                <label>行权价</label>
                <input type="number" placeholder="0" value={newOpt.strike} onChange={e => setNewOpt({ ...newOpt, strike: e.target.value })} />
              </div>
              <div className="field">
                <label>到期日</label>
                <input type="date" value={newOpt.expiry} onChange={e => setNewOpt({ ...newOpt, expiry: e.target.value })} />
              </div>
            </div>
            <div className="row3">
              <div className="field">
                <label>合约数</label>
                <input type="number" placeholder="1" value={newOpt.contracts} onChange={e => setNewOpt({ ...newOpt, contracts: e.target.value })} />
              </div>
              <div className="field">
                <label>Mark价格 (每股)</label>
                <input type="number" placeholder="0" value={newOpt.markPrice} onChange={e => setNewOpt({ ...newOpt, markPrice: e.target.value })} />
              </div>
              <div className="field">
                <label>币种</label>
                <select value={newOpt.currency} onChange={e => setNewOpt({ ...newOpt, currency: e.target.value as 'USD' | 'HKD' })}>
                  <option value="USD">USD</option>
                  <option value="HKD">HKD</option>
                </select>
              </div>
            </div>
            <div className="actions">
              <button onClick={() => setShowAddOption(false)}>取消</button>
              <button className="primary" onClick={handleAddOption}>确认添加</button>
            </div>
          </div>
        </div>
      )}

      {/* CashFlow Dialog */}
      {showCashFlow && (
        <div className="dialog-overlay" onClick={() => setShowCashFlow(false)}>
          <div className="dialog" onClick={e => e.stopPropagation()}>
            <h3>记录资金流水</h3>
            <p style={{ fontSize: '.82rem', color: 'var(--fg2)', marginBottom: 12 }}>
              当前净值: {navPerShare.toFixed(6)} | 当前份额: {fmtNum(state.totalShares, 2)}
            </p>
            <div className="row">
              <div className="field">
                <label>类型</label>
                <select value={newCF.type} onChange={e => setNewCF({ ...newCF, type: e.target.value as 'inflow' | 'outflow' })}>
                  <option value="inflow">资金流入 (申购)</option>
                  <option value="outflow">资金流出 (赎回)</option>
                </select>
              </div>
              <div className="field">
                <label>金额 (CNY)</label>
                <input type="number" placeholder="0" value={newCF.amount} onChange={e => setNewCF({ ...newCF, amount: e.target.value })} />
              </div>
            </div>
            <div className="field">
              <label>备注</label>
              <input placeholder="可选" value={newCF.note} onChange={e => setNewCF({ ...newCF, note: e.target.value })} />
            </div>
            {newCF.amount && !isNaN(parseFloat(newCF.amount)) && parseFloat(newCF.amount) > 0 && (
              <div className="card" style={{ marginTop: 8, fontSize: '.82rem' }}>
                <div>份额变动: {newCF.type === 'inflow' ? '+' : '-'}{fmtNum(parseFloat(newCF.amount) / (navPerShare > 0 ? navPerShare : 1), 2)} 份</div>
                <div>变动后总份额: {fmtNum(state.totalShares + (newCF.type === 'inflow' ? 1 : -1) * parseFloat(newCF.amount) / (navPerShare > 0 ? navPerShare : 1), 2)}</div>
              </div>
            )}
            <div className="actions">
              <button onClick={() => setShowCashFlow(false)}>取消</button>
              <button className="primary" onClick={handleCashFlow}>确认</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
