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

// 按类别的默认 Cap%（风控硬上限）
const CATEGORY_CAP: Record<AssetCategory, number> = {
  core: 18,
  growth: 12,
  satellite: 6,
  cyclical: 8,
  theme: 5,
  winner: 15,
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
  return {
    symbol: String(raw.symbol || ''),
    name: String(raw.name || ''),
    currentValueCny: Number(raw.currentValueCny) || 0,
    category: cat,
    cap: Number(raw.cap) || def.cap,
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
  pBase: number       // 0.5 + 0.02·S（封顶 0.75）
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
  const pBase = Math.min(0.75, 0.5 + 0.02 * S)
  const m = r.shrinkM > 0 ? r.shrinkM : 10
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

  /* 渲染辅助：受控 number input，保留空字符串编辑过程，blur 时回填 */
  function NumInput({ value, onChange, step = 1, min, max, width = 60 }: {
    value: number
    onChange: (v: number) => void
    step?: number
    min?: number
    max?: number
    width?: number
  }) {
    const [draft, setDraft] = useState<string>(() => String(value))
    useEffect(() => { setDraft(String(value)) }, [value])
    return (
      <input
        type="number"
        value={draft}
        step={step}
        min={min}
        max={max}
        onChange={e => {
          setDraft(e.target.value)
          const n = parseFloat(e.target.value)
          if (Number.isFinite(n)) onChange(n)
        }}
        onBlur={() => setDraft(String(value))}
        style={{ width, padding: '2px 4px', textAlign: 'right' }}
      />
    )
  }

  return (
    <div className="section" style={{ marginTop: 24 }}>
      <div className="section-header">
        <h2>📐 凯利仓位速查表 · 专业版</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="sm" onClick={fillDefaults}>按类别一键填默认值</button>
        </div>
      </div>
      <div style={{ fontSize: '.78rem', color: 'var(--fg2)', marginBottom: 10 }}>
        Edge = b·p_adj − (1−p_adj) · f* = Edge/b · 分数凯利 = f*×0.5 · 建议仓位 = min(分数凯利, Cap)。
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
              <th className="r" title="贝叶斯收缩 m">m</th>
              <th className="r">S</th>
              <th className="r">p_base</th>
              <th className="r">p_adj</th>
              <th className="r">b</th>
              <th className="r">p0</th>
              <th className="r">Edge</th>
              <th className="r">f*</th>
              <th className="r">分数凯利</th>
              <th className="r"><b>建议仓位%</b></th>
              <th className="r">实际仓位%</th>
              <th>结论</th>
              <th>备注</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
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
                  <td style={{ minWidth: 110 }}>
                    <div><b>{r.symbol}</b></div>
                    <div style={{ fontSize: '.7rem', color: 'var(--fg2)' }}>{r.name}</div>
                  </td>
                  <td>
                    <select value={r.category}
                      onChange={e => updateRow(i, 'category', e.target.value as AssetCategory)}
                      style={{ fontSize: '.75rem', padding: '2px 4px' }}>
                      {(Object.keys(CATEGORY_LABELS) as AssetCategory[]).map(k =>
                        <option key={k} value={k}>{CATEGORY_LABELS[k]}</option>)}
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
                    <NumInput value={r.moat} step={1} min={0} max={5}
                      onChange={v => updateRow(i, 'moat', v)} width={45} />
                  </td>
                  <td className="r">
                    <NumInput value={r.mgmt} step={1} min={0} max={5}
                      onChange={v => updateRow(i, 'mgmt', v)} width={45} />
                  </td>
                  <td className="r">
                    <NumInput value={r.valPct} step={1} min={0} max={5}
                      onChange={v => updateRow(i, 'valPct', v)} width={45} />
                  </td>
                  <td className="r">
                    <NumInput value={r.shrinkM} step={1} min={1}
                      onChange={v => updateRow(i, 'shrinkM', v)} width={45} />
                  </td>
                  <td className="r" style={{ color: 'var(--fg2)' }}>{m.S}</td>
                  <td className="r" style={{ color: 'var(--fg2)' }}>{(m.pBase * 100).toFixed(1)}%</td>
                  <td className="r" style={{ color: 'var(--fg2)' }}>{(m.pAdj * 100).toFixed(1)}%</td>
                  <td className="r" style={{ color: 'var(--fg2)' }}>{m.b.toFixed(2)}</td>
                  <td className="r" style={{ color: 'var(--fg2)' }}>{(m.p0 * 100).toFixed(1)}%</td>
                  <td className="r" style={{ color: m.edge > 0 ? 'var(--green)' : 'var(--red)' }}>
                    {(m.edge * 100).toFixed(1)}%
                  </td>
                  <td className="r" style={{ color: 'var(--fg2)' }}>{(m.fStar * 100).toFixed(1)}%</td>
                  <td className="r" style={{ color: 'var(--fg2)' }}>{(m.fHalf * 100).toFixed(1)}%</td>
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
              <tr><td colSpan={22} style={{ textAlign: 'center', padding: 16, color: 'var(--fg2)' }}>暂无数据，添加股票开始</td></tr>
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
