/* ========================================================================
 * PortfolioLab —— 信号级信息流（P2）
 * 读取 public/signals/latest.json（由 GitHub Actions 周抓取生成）
 * ====================================================================== */
import { useEffect, useState } from 'react'

interface Signal {
  source: string
  title: string
  link: string
  pubDate: string
  summary: string
  themes: string[]
  importance: number
  aiSummary?: string
}

interface SignalFile {
  generatedAt: string
  filter: 'ai' | 'raw'
  signals: Signal[]
}

export function SignalsTab() {
  const [data, setData] = useState<SignalFile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let aborted = false
    const url = `${import.meta.env.BASE_URL || '/'}signals/latest.json`
    fetch(url, { cache: 'no-cache' })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(j => { if (!aborted) setData(j) })
      .catch(e => { if (!aborted) setError(e instanceof Error ? e.message : String(e)) })
      .finally(() => { if (!aborted) setLoading(false) })
    return () => { aborted = true }
  }, [])

  return (
    <div>
      <div className="section-header">
        <h2>产业信号流</h2>
        {data && (
          <span style={{ fontSize: '.78rem', color: 'var(--fg2)' }}>
            生成时间: {data.generatedAt.slice(0, 16).replace('T', ' ')} ｜ 过滤模式: {data.filter === 'ai' ? 'AI 过滤（≥4分）' : '原始数据'}
          </span>
        )}
      </div>

      <div className="card" style={{ marginBottom: 12, fontSize: '.82rem', color: 'var(--fg2)', lineHeight: 1.6 }}>
        每周一通过 GitHub Actions 自动从 Anthropic / OpenAI / Google Research / Tesla IR 等精选源抓取，
        并由 Claude 过滤评分。<strong>只展示重要性 ≥ 4 分的信号</strong>。无日常新闻、无讨论区噪音。
      </div>

      {loading && <div style={{ padding: 16, color: 'var(--fg2)' }}>加载中...</div>}

      {error && (
        <div className="card" style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}>
          ⚠ 信号文件未生成: {error}
          <div style={{ marginTop: 6, fontSize: '.78rem', color: 'var(--fg2)' }}>
            首次部署后需在 GitHub Actions 中手动触发一次 Weekly Signal Fetch；或等待下周一自动运行。
            如果使用 AI 过滤，请在仓库 Settings → Secrets 中添加 ANTHROPIC_API_KEY。
          </div>
        </div>
      )}

      {data && data.signals.length === 0 && (
        <div className="card" style={{ color: 'var(--fg2)' }}>本周暂无 ≥4 分信号。</div>
      )}

      {data && data.signals.map((s, i) => (
        <div key={i} className="card" style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                <span className="badge" style={{ background: 'var(--accent)', color: '#fff' }}>{s.source}</span>
                <span className="badge" style={{ background: s.importance >= 5 ? 'var(--down)' : 'var(--warn)', color: '#fff' }}>
                  重要性 {s.importance}
                </span>
                {s.themes.map(t => (
                  <span key={t} className="badge" style={{ background: 'var(--bg)', color: 'var(--fg2)', border: '1px solid var(--border)' }}>{t}</span>
                ))}
                <span style={{ fontSize: '.72rem', color: 'var(--fg2)' }}>{s.pubDate}</span>
              </div>
              <a href={s.link} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600, fontSize: '.92rem' }}>
                {s.title}
              </a>
              {s.aiSummary && (
                <div style={{ marginTop: 6, padding: 6, background: 'var(--bg)', borderRadius: 'var(--radius)', fontSize: '.82rem' }}>
                  🧠 {s.aiSummary}
                </div>
              )}
              {!s.aiSummary && s.summary && (
                <div style={{ marginTop: 6, fontSize: '.82rem', color: 'var(--fg2)', lineHeight: 1.5 }}>{s.summary}</div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
