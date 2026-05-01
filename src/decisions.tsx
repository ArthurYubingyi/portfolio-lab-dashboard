/* ========================================================================
 * PortfolioLab —— 决策日志强制表单
 * 在持仓增/减/新建/清仓时弹出，强制思考
 * 独立 localStorage key: portfoliolab_decisions
 * ====================================================================== */
import { useEffect, useMemo, useState } from 'react'
import type { Theme } from './themes'

export interface Decision {
  id: string
  date: string
  symbol: string
  symbolName?: string
  direction: 'add' | 'reduce' | 'new' | 'close'
  positionLevel: 'core' | 'satellite' | 'sellput'
  themeIds: string[]
  framework: 'buffett' | 'duan' | 'wangyuquan' | 'wangchuan'
  frameworkDetail: string
  counterEvidenceObserved: boolean
  rationale: string
  daysSinceLastOp: number
}

const LS_DECISIONS = 'portfoliolab_decisions'

const today = () => new Date().toISOString().slice(0, 10)
const genId = () => Math.random().toString(36).slice(2, 10)

function loadDecisions(): Decision[] {
  try {
    const raw = localStorage.getItem(LS_DECISIONS)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch (e) { console.warn('decisions load failed', e) }
  return []
}

function saveDecisions(d: Decision[]) {
  localStorage.setItem(LS_DECISIONS, JSON.stringify(d))
}

export function useDecisions() {
  const [decisions, setDecisions] = useState<Decision[]>(() => loadDecisions())
  useEffect(() => { saveDecisions(decisions) }, [decisions])

  const daysSinceLast = (symbol: string) => {
    const last = decisions
      .filter(d => d.symbol === symbol)
      .sort((a, b) => b.date.localeCompare(a.date))[0]
    if (!last) return 9999
    const ms = Date.now() - new Date(last.date).getTime()
    return Math.floor(ms / (24 * 3600 * 1000))
  }

  const addDecision = (d: Decision) => setDecisions(prev => [d, ...prev])

  return { decisions, setDecisions, addDecision, daysSinceLast }
}

/* ────────── 决策表单 Modal ────────── */
interface DecisionFormProps {
  open: boolean
  symbol: string
  symbolName?: string
  preDirection?: Decision['direction']
  themes: Theme[]
  daysSinceLastOp: number
  onCancel: () => void
  onConfirm: (d: Decision) => void
}

export function DecisionForm(p: DecisionFormProps) {
  const { open, symbol, symbolName, preDirection, themes, daysSinceLastOp, onCancel, onConfirm } = p

  const [direction, setDirection] = useState<Decision['direction']>(preDirection || 'new')
  const [positionLevel, setPositionLevel] = useState<Decision['positionLevel']>('core')
  const [themeIds, setThemeIds] = useState<string[]>([])
  const [framework, setFramework] = useState<Decision['framework']>('buffett')
  const [frameworkDetail, setFrameworkDetail] = useState('')
  const [counterEvidenceObserved, setCounterEvidenceObserved] = useState(false)
  const [rationale, setRationale] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setDirection(preDirection || 'new')
      setPositionLevel('core')
      setThemeIds([])
      setFramework('buffett')
      setFrameworkDetail('')
      setCounterEvidenceObserved(false)
      setRationale('')
      setError(null)
    }
  }, [open, preDirection, symbol])

  const activeThemes = useMemo(() => themes.filter(t => t.status === 'active'), [themes])

  if (!open) return null

  const submit = () => {
    setError(null)
    if (counterEvidenceObserved) {
      setError('已观测到反面证据，操作禁止。请先评估反面证据并在主题页处理（升级或排除）。')
      return
    }
    if (!frameworkDetail.trim()) {
      setError('请填写框架引用细节（具体哪条原则/教训）')
      return
    }
    if (rationale.trim().length < 50) {
      setError(`操作理由不少于 50 字（当前 ${rationale.trim().length} 字）`)
      return
    }

    const d: Decision = {
      id: genId(),
      date: today(),
      symbol,
      symbolName,
      direction,
      positionLevel,
      themeIds,
      framework,
      frameworkDetail: frameworkDetail.trim(),
      counterEvidenceObserved,
      rationale: rationale.trim(),
      daysSinceLastOp,
    }
    onConfirm(d)
  }

  const showFreqWarn = daysSinceLastOp < 14 && daysSinceLastOp >= 0 && daysSinceLastOp < 9999

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog" onClick={e => e.stopPropagation()} style={{ maxWidth: 620, width: '95%', maxHeight: '92vh', overflowY: 'auto' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          📋 决策前思考（必填）
          <span className="badge" style={{ background: 'var(--warn)', color: '#fff' }}>{symbol}</span>
        </h3>
        <p style={{ fontSize: '.78rem', color: 'var(--fg2)', marginBottom: 12 }}>
          {symbolName ? `${symbolName} (${symbol})` : symbol} ｜ 不通过决策日志，操作不会被保存
        </p>

        {/* 方向 + 仓位级别 */}
        <div className="row">
          <div className="field">
            <label>方向</label>
            <select value={direction} onChange={e => setDirection(e.target.value as Decision['direction'])}>
              <option value="add">加仓</option>
              <option value="reduce">减仓</option>
              <option value="new">新建仓</option>
              <option value="close">清仓</option>
            </select>
          </div>
          <div className="field">
            <label>仓位级别</label>
            <select value={positionLevel} onChange={e => setPositionLevel(e.target.value as Decision['positionLevel'])}>
              <option value="core">重仓 ≥3%</option>
              <option value="satellite">试探仓 0.5-1%</option>
              <option value="sellput">Sell Put</option>
            </select>
          </div>
        </div>

        {/* 1. 关联主题 */}
        <div className="field" style={{ marginTop: 6 }}>
          <label>1. 关联主题（多选，可空）</label>
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 8, maxHeight: 110, overflowY: 'auto', background: 'var(--bg)' }}>
            {activeThemes.length === 0 && (
              <div style={{ fontSize: '.78rem', color: 'var(--fg2)' }}>（暂无活跃主题）</div>
            )}
            {activeThemes.map(t => (
              <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', fontSize: '.82rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={themeIds.includes(t.id)}
                  onChange={e => {
                    if (e.target.checked) setThemeIds([...themeIds, t.id])
                    else setThemeIds(themeIds.filter(x => x !== t.id))
                  }}
                />
                {t.name}
                {t.relatedHoldings.includes(symbol) && (
                  <span className="badge badge-buy" style={{ marginLeft: 4 }}>命中</span>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* 2. 框架适用 */}
        <div className="field">
          <label>2. 框架适用（必选）</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              ['buffett', '巴菲特：好生意 + 好人 + 好价格'],
              ['duan', '段永平：买股票就是买公司（DCF + 不懂不碰）'],
              ['wangyuquan', '王煜全：技术领先 + 市场空间 + 护城河'],
              ['wangchuan', '王川：八教训第 __ 条'],
            ].map(([v, label]) => (
              <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.82rem', cursor: 'pointer' }}>
                <input type="radio" checked={framework === v} onChange={() => setFramework(v as Decision['framework'])} />
                {label}
              </label>
            ))}
          </div>
          <input
            value={frameworkDetail}
            onChange={e => setFrameworkDetail(e.target.value)}
            placeholder={framework === 'wangchuan' ? '如 第 4 条：越垄断越加仓' : '具体引用哪条原则'}
            style={{ width: '100%', marginTop: 6 }}
          />
        </div>

        {/* 3. 反面证据 */}
        <div className="field">
          <label>3. 反面证据是否已观测到？</label>
          <div style={{ display: 'flex', gap: 16, fontSize: '.85rem' }}>
            <label style={{ cursor: 'pointer' }}>
              <input type="radio" checked={!counterEvidenceObserved} onChange={() => setCounterEvidenceObserved(false)} /> 否
            </label>
            <label style={{ cursor: 'pointer', color: 'var(--down)' }}>
              <input type="radio" checked={counterEvidenceObserved} onChange={() => setCounterEvidenceObserved(true)} /> 是
            </label>
          </div>
          {counterEvidenceObserved && (
            <div style={{ marginTop: 6, padding: 8, background: '#fef2f2', color: '#dc2626', borderRadius: 'var(--radius)', fontSize: '.78rem', border: '1px solid #fecaca' }}>
              ⚠ 操作禁止：请先评估反面证据，到对应主题页将该反面证据状态升级为 confirmed 并执行触发动作。
            </div>
          )}
        </div>

        {/* 4. 操作理由 */}
        <div className="field">
          <label>4. 操作理由（不少于 50 字，当前 {rationale.trim().length} 字）</label>
          <textarea
            value={rationale}
            onChange={e => setRationale(e.target.value)}
            placeholder="为什么现在做？为什么是这个方向？为什么是这个仓位？反面证据评估结论是什么？"
            style={{ width: '100%', minHeight: 100, padding: '6px 10px', fontSize: '.85rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--bg)', color: 'var(--fg)', fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.6 }}
          />
        </div>

        {/* 5. 距上次操作 */}
        <div className="field" style={{ fontSize: '.82rem', color: 'var(--fg2)' }}>
          5. 距上次操作此标的：
          <span style={{ marginLeft: 6, fontWeight: 600, color: showFreqWarn ? 'var(--warn)' : 'var(--fg)' }}>
            {daysSinceLastOp >= 9999 ? '首次操作' : `${daysSinceLastOp} 天`}
          </span>
          {showFreqWarn && (
            <span style={{ marginLeft: 8, color: 'var(--warn)' }}>⚠ 不足 14 天，建议谨慎（不强制阻止）</span>
          )}
        </div>

        {error && (
          <div style={{ padding: 8, background: '#fef2f2', color: '#dc2626', borderRadius: 'var(--radius)', fontSize: '.82rem', border: '1px solid #fecaca', marginTop: 8 }}>
            {error}
          </div>
        )}

        <div className="actions">
          <button onClick={onCancel}>取消</button>
          <button className="primary" onClick={submit}>确认决策并保存</button>
        </div>
      </div>
    </div>
  )
}

/* ────────── 决策日志 Tab（P1） ────────── */
interface DecisionsTabProps {
  decisions: Decision[]
  setDecisions: React.Dispatch<React.SetStateAction<Decision[]>>
  themes: Theme[]
  showToast: (msg: string) => void
}

export function DecisionsTab({ decisions, setDecisions, themes, showToast }: DecisionsTabProps) {
  const themeMap = useMemo(() => {
    const m: Record<string, string> = {}
    themes.forEach(t => { m[t.id] = t.name })
    return m
  }, [themes])

  const stats = useMemo(() => {
    const total = decisions.length
    const fwCount: Record<Decision['framework'], number> = { buffett: 0, duan: 0, wangyuquan: 0, wangchuan: 0 }
    decisions.forEach(d => { fwCount[d.framework] = (fwCount[d.framework] || 0) + 1 })
    const cutoff = Date.now() - 30 * 24 * 3600 * 1000
    const recent = decisions.filter(d => new Date(d.date).getTime() >= cutoff).length
    return { total, fwCount, recent }
  }, [decisions])

  const directionLabel = (d: Decision['direction']) =>
    ({ add: '加仓', reduce: '减仓', new: '新建', close: '清仓' } as const)[d]

  const positionLabel = (p: Decision['positionLevel']) =>
    ({ core: '重仓', satellite: '试探', sellput: 'SellPut' } as const)[p]

  const fwLabel = (f: Decision['framework']) =>
    ({ buffett: '巴菲特', duan: '段永平', wangyuquan: '王煜全', wangchuan: '王川' } as const)[f]

  const handleDelete = (id: string) => {
    if (!confirm('确定删除此决策记录？')) return
    setDecisions(prev => prev.filter(d => d.id !== id))
    showToast('已删除')
  }

  return (
    <div>
      {/* 统计卡片 */}
      <div className="kpi-grid" style={{ marginTop: 0 }}>
        <div className="card">
          <div className="label">总决策数</div>
          <div className="value">{stats.total}</div>
        </div>
        <div className="card">
          <div className="label">最近 30 天</div>
          <div className="value">{stats.recent}</div>
        </div>
        <div className="card">
          <div className="label">框架使用频次</div>
          <div style={{ fontSize: '.82rem', marginTop: 4, lineHeight: 1.6 }}>
            巴菲特 {stats.fwCount.buffett} ｜ 段永平 {stats.fwCount.duan}<br />
            王煜全 {stats.fwCount.wangyuquan} ｜ 王川 {stats.fwCount.wangchuan}
          </div>
        </div>
        <div className="card">
          <div className="label">提示</div>
          <div style={{ fontSize: '.78rem', marginTop: 4, color: 'var(--fg2)', lineHeight: 1.5 }}>
            决策日志在持仓增/减/删时强制弹出，思考≥50字 + 三框架之一 + 反面证据评估
          </div>
        </div>
      </div>

      <div className="section-header" style={{ marginTop: 20 }}>
        <h2>决策日志（时间倒序）</h2>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>日期</th>
              <th>标的</th>
              <th>方向</th>
              <th>仓位</th>
              <th>框架</th>
              <th>关联主题</th>
              <th>理由摘要</th>
              <th>距上次</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {decisions.length === 0 && (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 24, color: 'var(--fg2)' }}>暂无决策记录。在"持仓"tab 增删改持仓时会自动弹出表单。</td></tr>
            )}
            {decisions.map(d => (
              <tr key={d.id}>
                <td>{d.date}</td>
                <td>{d.symbolName ? `${d.symbolName} (${d.symbol})` : d.symbol}</td>
                <td>
                  <span className={`badge ${d.direction === 'add' || d.direction === 'new' ? 'badge-buy' : 'badge-sell'}`}>
                    {directionLabel(d.direction)}
                  </span>
                </td>
                <td style={{ fontSize: '.78rem' }}>{positionLabel(d.positionLevel)}</td>
                <td style={{ fontSize: '.78rem' }}>
                  {fwLabel(d.framework)}
                  <div style={{ fontSize: '.7rem', color: 'var(--fg2)' }}>{d.frameworkDetail}</div>
                </td>
                <td style={{ fontSize: '.78rem' }}>
                  {d.themeIds.length === 0 ? '–' : d.themeIds.map(id => themeMap[id] || id).join(', ')}
                </td>
                <td style={{ fontSize: '.78rem', maxWidth: 300, whiteSpace: 'normal', lineHeight: 1.5 }}>
                  {d.rationale.length > 80 ? d.rationale.slice(0, 80) + '...' : d.rationale}
                </td>
                <td style={{ fontSize: '.78rem' }}>{d.daysSinceLastOp >= 9999 ? '首次' : `${d.daysSinceLastOp}天`}</td>
                <td><button className="sm danger" onClick={() => handleDelete(d.id)}>×</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
