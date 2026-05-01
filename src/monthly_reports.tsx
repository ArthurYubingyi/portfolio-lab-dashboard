/* ========================================================================
 * PortfolioLab —— 主题月报自动生成（P0）
 * 每月 1 号自动生成（首次进入时检测，本月未生成则触发）
 * 也可手动生成；支持 Markdown 导出 / 复制
 * 独立 localStorage key: portfoliolab_monthly_reports
 * ====================================================================== */
import { useEffect, useMemo, useState } from 'react'
import type { Theme } from './themes'

export interface MonthlyReport {
  id: string
  yearMonth: string
  generatedAt: string
  content: string
}

const LS_REPORTS = 'portfoliolab_monthly_reports'
const LS_AUTO_RUN = 'portfoliolab_monthly_auto_run_for'

const genId = () => Math.random().toString(36).slice(2, 10)
const currentYM = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function loadReports(): MonthlyReport[] {
  try {
    const raw = localStorage.getItem(LS_REPORTS)
    if (raw) {
      const p = JSON.parse(raw)
      if (Array.isArray(p)) return p
    }
  } catch (e) { console.warn('reports load failed', e) }
  return []
}

function saveReports(r: MonthlyReport[]) {
  localStorage.setItem(LS_REPORTS, JSON.stringify(r))
}

export function useMonthlyReports() {
  const [reports, setReports] = useState<MonthlyReport[]>(() => loadReports())
  useEffect(() => { saveReports(reports) }, [reports])
  return { reports, setReports }
}

const MONTHLY_SYSTEM_PROMPT = `你是产业研究助手。请基于Arthur的所有 active 状态主题数据生成结构化月报。

请按以下格式输出（使用 Markdown 标题分段）：

## {month}月主题月报

### 一、本月最值得关注的3个主题
（排序依据：判断变化大、关键变量触及阈值、反面证据严重等级提升）
对每个主题写：
- 当前判断
- 本月关键变化
- 给Arthur的具体建议（持有 / 加仓 / 减仓 / 观望 / 退出 之一）

### 二、其他主题简报
对每个剩余主题：1句话当前状态

### 三、跨主题洞察
- 三个或以上主题共同指向的趋势
- 矛盾的主题判断（如A主题看好科技，B主题看科技见顶）

### 四、下月观测重点
列出 3-5 个最值得跟踪的关键变量及阈值

风格：简洁、可操作、不水。`

export async function generateMonthlyReport(activeThemes: Theme[]): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apiKey = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_ANTHROPIC_API_KEY) || ''
  if (!apiKey) throw new Error('未配置 VITE_ANTHROPIC_API_KEY，无法调用 AI')

  const ym = currentYM()
  const themesText = activeThemes.map(t => {
    const vars = t.keyVariables.map(v => `  - ${v.name}: 当前 ${v.currentValue || '–'} / 阈值 ${v.threshold} / 信号 ${v.observationSignal}`).join('\n') || '  （无）'
    const counters = t.counterEvidence.map(c => `  - [Sev ${c.severity}/${c.status}] ${c.description}`).join('\n') || '  （无）'
    const supports = t.supportingEvidence.map((s, i) => `  ${i + 1}. ${s}`).join('\n') || '  （无）'
    return `### 主题：${t.name}
- 描述：${t.description}
- 当前判断：${t.currentJudgment || '（未填）'}
- 关联持仓：${t.relatedHoldings.join(', ') || '（无）'}
- 最后更新：${t.lastUpdated}
- 关键变量：
${vars}
- 支持论据：
${supports}
- 反面证据：
${counters}`
  }).join('\n\n')

  const userMsg = `当前年月：${ym}\n\n以下是当前活跃主题（共 ${activeThemes.length} 个）：\n\n${themesText}\n\n请生成本月度月报。`

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
      max_tokens: 3500,
      system: MONTHLY_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMsg }],
    }),
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`API ${res.status}: ${t}`)
  }
  const data = await res.json()
  return data.content?.[0]?.text || '（AI 无回复）'
}

interface MonthlyReportSectionProps {
  themes: Theme[]
  reports: MonthlyReport[]
  setReports: React.Dispatch<React.SetStateAction<MonthlyReport[]>>
  showToast: (msg: string) => void
  /** 是否自动检测当月未生成则触发 */
  autoCheck?: boolean
}

export function MonthlyReportSection({ themes, reports, setReports, showToast, autoCheck }: MonthlyReportSectionProps) {
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const activeThemes = useMemo(() => themes.filter(t => t.status === 'active'), [themes])
  const ym = currentYM()
  const thisMonthReport = reports.find(r => r.yearMonth === ym)

  const run = async (force = false) => {
    if (loading) return
    if (!force && thisMonthReport) {
      showToast(`${ym} 月报已存在`)
      setExpanded(thisMonthReport.id)
      return
    }
    if (activeThemes.length === 0) {
      showToast('当前没有活跃主题，无法生成月报')
      return
    }
    setLoading(true)
    try {
      const content = await generateMonthlyReport(activeThemes)
      const r: MonthlyReport = {
        id: genId(),
        yearMonth: ym,
        generatedAt: new Date().toISOString(),
        content,
      }
      setReports(prev => {
        // 同月覆盖
        const filtered = prev.filter(x => x.yearMonth !== ym)
        return [r, ...filtered]
      })
      setExpanded(r.id)
      showToast(`${ym} 月报已生成`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : '未知错误'
      showToast(`月报生成失败: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  // 自动检测：本月未生成则触发一次（每个 ym 只自动跑 1 次，避免反复触发）
  useEffect(() => {
    if (!autoCheck || loading) return
    if (thisMonthReport) return
    const lastAuto = localStorage.getItem(LS_AUTO_RUN)
    if (lastAuto === ym) return
    if (activeThemes.length === 0) return
    // 标记并触发
    localStorage.setItem(LS_AUTO_RUN, ym)
    run(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCheck, ym])

  const handleDelete = (id: string) => {
    if (!confirm('确认删除此月报？')) return
    setReports(prev => prev.filter(r => r.id !== id))
    showToast('已删除')
  }

  const handleExport = (r: MonthlyReport) => {
    const filename = `theme-monthly-${r.yearMonth}.md`
    const blob = new Blob([r.content], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCopy = async (r: MonthlyReport) => {
    try {
      await navigator.clipboard.writeText(r.content)
      showToast('已复制到剪贴板')
    } catch {
      showToast('复制失败，请手动选择文本')
    }
  }

  // 倒序展示
  const sorted = useMemo(() => [...reports].sort((a, b) => b.yearMonth.localeCompare(a.yearMonth)), [reports])

  return (
    <div style={{ marginBottom: 16 }}>
      <div className="section-header">
        <h2>主题月报（{reports.length} 篇）</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '.78rem', color: 'var(--fg2)' }}>
            当月 ({ym}): {thisMonthReport ? '✓ 已生成' : '○ 未生成'}
          </span>
          <button className="primary" disabled={loading || activeThemes.length === 0} onClick={() => run(true)}>
            {loading ? <><span className="spinner" /> 生成中...</> : '📊 生成月报'}
          </button>
        </div>
      </div>

      {sorted.length === 0 && (
        <div className="card" style={{ color: 'var(--fg2)', fontSize: '.85rem' }}>
          暂无月报。每月 1 号将自动生成本月主题月报，也可立即手动生成。
        </div>
      )}

      {sorted.map(r => {
        const isOpen = expanded === r.id
        return (
          <div key={r.id} className="card" style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', gap: 8 }}
                 onClick={() => setExpanded(isOpen ? null : r.id)}>
              <div>
                <div style={{ fontSize: '.95rem', fontWeight: 600 }}>
                  {r.yearMonth} 月报
                </div>
                <div style={{ fontSize: '.72rem', color: 'var(--fg2)', marginTop: 2 }}>
                  生成于 {r.generatedAt.slice(0, 16).replace('T', ' ')}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="sm" onClick={(e) => { e.stopPropagation(); handleCopy(r) }}>复制</button>
                <button className="sm" onClick={(e) => { e.stopPropagation(); handleExport(r) }}>导出 MD</button>
                <button className="sm" onClick={(e) => { e.stopPropagation(); setExpanded(isOpen ? null : r.id) }}>{isOpen ? '收起' : '展开'}</button>
                <button className="sm danger" onClick={(e) => { e.stopPropagation(); handleDelete(r.id) }}>×</button>
              </div>
            </div>
            {isOpen && (
              <div style={{ marginTop: 12, padding: 12, background: 'var(--bg)', borderRadius: 'var(--radius)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '.85rem', lineHeight: 1.65, fontFamily: 'inherit', maxHeight: 700, overflowY: 'auto' }}>
                {r.content}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
