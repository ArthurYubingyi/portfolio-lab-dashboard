/* ========================================================================
 * PortfolioLab —— 决策复盘报告（P0）
 * 每 5 次决策触发一次 / 手动触发；调用 Anthropic API 生成结构化复盘
 * 独立 localStorage key: portfoliolab_reviews
 * ====================================================================== */
import { useEffect, useMemo, useState } from 'react'
import type { Decision } from './decisions'
import type { Theme } from './themes'

export interface DecisionReview {
  id: string
  generatedAt: string
  decisionsIncluded: string[]
  reportContent: string
  rating?: 1 | 2 | 3 | 4 | 5
}

const LS_REVIEWS = 'portfoliolab_reviews'
const REVIEW_BATCH = 5

const genId = () => Math.random().toString(36).slice(2, 10)

function loadReviews(): DecisionReview[] {
  try {
    const raw = localStorage.getItem(LS_REVIEWS)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch (e) { console.warn('reviews load failed', e) }
  return []
}

function saveReviews(r: DecisionReview[]) {
  localStorage.setItem(LS_REVIEWS, JSON.stringify(r))
}

export function useReviews() {
  const [reviews, setReviews] = useState<DecisionReview[]>(() => loadReviews())
  useEffect(() => { saveReviews(reviews) }, [reviews])

  const decisionsSinceLastReview = (decisions: Decision[]) => {
    if (reviews.length === 0) return decisions.length
    const lastReviewedSet = new Set(
      reviews.flatMap(r => r.decisionsIncluded)
    )
    return decisions.filter(d => !lastReviewedSet.has(d.id)).length
  }

  return { reviews, setReviews, decisionsSinceLastReview }
}

const REVIEW_SYSTEM_PROMPT = `你是Arthur的投资行为复盘助手，基于他的投资原则进行客观复盘：
- 巴菲特/段永平：少做决策、能力圈内、安全边际
- 王煜全菱形四维：技术-产业-应用-企业
- 王川八教训：等待临界点、越垄断越加仓、不怕改错

请基于Arthur最近的决策记录，生成结构化复盘报告，按以下结构输出（使用 Markdown 标题）：

## 1. 决策频率分析
（这些决策跨度多久？符合"一年1-2个标的"的原则吗？给出量化判断）

## 2. 框架使用偏好
（哪个框架引用最多？是否过度依赖单一框架？）

## 3. 反面证据评估质量
（是否真正考虑了反面证据，还是流于形式？）

## 4. 仓位级别合理性
（重仓决策是否真的胜率9成？试探仓是否真的是值得承担的风险？）

## 5. 关联主题一致性
（决策是否真的服务于追踪的主题判断？有没有"无主题决策"？）

## 6. 共性问题
（这些决策中暴露的最关键的1-2个问题，要尖锐）

## 7. 改进建议
（接下来应该如何调整决策习惯，给出可执行的3条建议）

风格：客观、不留情面、指出问题不绕弯。`

/* ────── 调用 AI 生成复盘 ────── */
export async function generateReview(decisions: Decision[], themes: Theme[]): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apiKey = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_ANTHROPIC_API_KEY) || ''
  if (!apiKey) throw new Error('未配置 VITE_ANTHROPIC_API_KEY，无法调用 AI')

  const themeMap: Record<string, Theme> = {}
  themes.forEach(t => { themeMap[t.id] = t })

  const fwLabel = (f: Decision['framework']) =>
    ({ buffett: '巴菲特', duan: '段永平', wangyuquan: '王煜全', wangchuan: '王川' } as const)[f]
  const dirLabel = (d: Decision['direction']) =>
    ({ add: '加仓', reduce: '减仓', new: '新建仓', close: '清仓' } as const)[d]
  const posLabel = (p: Decision['positionLevel']) =>
    ({ core: '重仓≥3%', satellite: '试探仓0.5-1%', sellput: 'Sell Put' } as const)[p]

  const decisionsText = decisions.map((d, i) => {
    const themeNames = d.themeIds.map(id => themeMap[id]?.name || '(已删除主题)').join(', ') || '（无关联主题）'
    return `### 决策 ${i + 1}（${d.date}）
- 标的：${d.symbolName ? `${d.symbolName} (${d.symbol})` : d.symbol}
- 方向：${dirLabel(d.direction)} / ${posLabel(d.positionLevel)}
- 关联主题：${themeNames}
- 引用框架：${fwLabel(d.framework)} —— ${d.frameworkDetail}
- 反面证据已观测：${d.counterEvidenceObserved ? '是' : '否'}
- 距上次操作此标的：${d.daysSinceLastOp >= 9999 ? '首次' : d.daysSinceLastOp + '天'}
- 操作理由：${d.rationale}`
  }).join('\n\n')

  const userMsg = `请对以下 ${decisions.length} 次决策进行复盘：\n\n${decisionsText}`

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
      max_tokens: 2500,
      system: REVIEW_SYSTEM_PROMPT,
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

/* ────── 复盘历史区域（嵌入到决策日志 tab） ────── */
interface ReviewSectionProps {
  decisions: Decision[]
  themes: Theme[]
  reviews: DecisionReview[]
  setReviews: React.Dispatch<React.SetStateAction<DecisionReview[]>>
  showToast: (msg: string) => void
}

export function ReviewSection({ decisions, themes, reviews, setReviews, showToast }: ReviewSectionProps) {
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  const reviewedIds = useMemo(() => new Set(reviews.flatMap(r => r.decisionsIncluded)), [reviews])
  const pendingDecisions = useMemo(
    () => decisions.filter(d => !reviewedIds.has(d.id)).sort((a, b) => a.date.localeCompare(b.date)),
    [decisions, reviewedIds]
  )
  const pendingCount = pendingDecisions.length
  const remaining = Math.max(0, REVIEW_BATCH - pendingCount)

  // 5 次后弹一次提示
  useEffect(() => {
    if (pendingCount >= REVIEW_BATCH && !loading) {
      const dismissedKey = 'portfoliolab_review_prompt_dismissed_for'
      const lastDismissed = localStorage.getItem(dismissedKey)
      const fingerprint = pendingDecisions.slice(-REVIEW_BATCH).map(d => d.id).join(',')
      if (lastDismissed !== fingerprint) {
        setShowPrompt(true)
      }
    }
  }, [pendingCount, loading, pendingDecisions])

  const dismissPrompt = () => {
    const fingerprint = pendingDecisions.slice(-REVIEW_BATCH).map(d => d.id).join(',')
    localStorage.setItem('portfoliolab_review_prompt_dismissed_for', fingerprint)
    setShowPrompt(false)
  }

  const runReview = async (manual = false) => {
    if (loading) return
    const targets = manual
      ? (pendingCount > 0 ? pendingDecisions : decisions.slice(-REVIEW_BATCH))
      : pendingDecisions.slice(-REVIEW_BATCH)
    if (targets.length === 0) {
      showToast('暂无可复盘的决策')
      return
    }
    setLoading(true)
    setShowPrompt(false)
    try {
      const content = await generateReview(targets, themes)
      const r: DecisionReview = {
        id: genId(),
        generatedAt: new Date().toISOString(),
        decisionsIncluded: targets.map(t => t.id),
        reportContent: content,
      }
      setReviews(prev => [r, ...prev])
      setExpanded(r.id)
      showToast(`复盘已生成（含 ${targets.length} 次决策）`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : '未知错误'
      showToast(`复盘失败: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  const setRating = (id: string, rating: DecisionReview['rating']) => {
    setReviews(prev => prev.map(r => r.id === id ? { ...r, rating } : r))
  }

  const handleDelete = (id: string) => {
    if (!confirm('确认删除此复盘报告？')) return
    setReviews(prev => prev.filter(r => r.id !== id))
    showToast('已删除')
  }

  return (
    <div style={{ marginTop: 24 }}>
      {/* 提示横幅 */}
      {showPrompt && (
        <div className="card" style={{ marginBottom: 12, borderColor: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 6%, var(--bg2))' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontSize: '.88rem' }}>
              📋 已积累 <strong>{pendingCount}</strong> 次未复盘决策，建议生成 AI 复盘报告。
            </div>
            <div>
              <button onClick={dismissPrompt}>稍后</button>{' '}
              <button className="primary" disabled={loading} onClick={() => runReview(false)}>
                {loading ? <><span className="spinner" /> 生成中...</> : '立即复盘'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="section-header">
        <h2>复盘历史（{reviews.length} 篇）</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '.78rem', color: 'var(--fg2)' }}>
            未复盘决策: <strong>{pendingCount}</strong>
            {remaining > 0 ? ` ｜ 距下次自动提示还差 ${remaining} 次` : ''}
          </span>
          <button className="primary" disabled={loading || decisions.length === 0} onClick={() => runReview(true)}>
            {loading ? <><span className="spinner" /> 生成中...</> : '🧠 立即复盘'}
          </button>
        </div>
      </div>

      {reviews.length === 0 && (
        <div className="card" style={{ color: 'var(--fg2)', fontSize: '.85rem' }}>
          暂无复盘报告。每 5 次决策会自动提示，也可点击"立即复盘"手动触发。
        </div>
      )}

      {reviews.map(r => {
        const isOpen = expanded === r.id
        return (
          <div key={r.id} className="card" style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', gap: 8 }}
                 onClick={() => setExpanded(isOpen ? null : r.id)}>
              <div>
                <div style={{ fontSize: '.9rem', fontWeight: 600 }}>
                  {r.generatedAt.slice(0, 10)} 复盘
                  <span className="badge" style={{ marginLeft: 8, background: 'var(--bg)', color: 'var(--fg2)', border: '1px solid var(--border)' }}>
                    含 {r.decisionsIncluded.length} 次决策
                  </span>
                </div>
                <div style={{ fontSize: '.72rem', color: 'var(--fg2)', marginTop: 2 }}>
                  生成于 {r.generatedAt.slice(0, 16).replace('T', ' ')}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '.78rem', color: 'var(--fg2)' }}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      className="sm"
                      style={{ padding: '0 5px', background: r.rating === n ? 'var(--accent)' : undefined, color: r.rating === n ? '#fff' : undefined, borderColor: r.rating === n ? 'var(--accent)' : undefined }}
                      onClick={(e) => { e.stopPropagation(); setRating(r.id, n as DecisionReview['rating']) }}
                    >
                      {n}
                    </button>
                  ))}
                </span>
                <button className="sm" onClick={(e) => { e.stopPropagation() }}>{isOpen ? '收起' : '展开'}</button>
                <button className="sm danger" onClick={(e) => { e.stopPropagation(); handleDelete(r.id) }}>×</button>
              </div>
            </div>
            {isOpen && (
              <div style={{ marginTop: 12, padding: 12, background: 'var(--bg)', borderRadius: 'var(--radius)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '.85rem', lineHeight: 1.65, fontFamily: 'inherit', maxHeight: 600, overflowY: 'auto' }}>
                {r.reportContent}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
