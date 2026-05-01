import { useState } from 'react'
import { useValuation } from './valuation'

/**
 * 第三批 · 模块三 — 恐高心理诊断器
 *
 * 针对 Arthur 2025 年总结里写的痛点:
 *   "恐高心理导致反复错失长期优质标的建仓时机。谷歌等到300美元以上才建仓，
 *    特斯拉100、200美元都没买。"
 *
 * 提供一个客观自检流程，把「不买」的真实理由摊开。
 */

const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined

type FearReason =
  | 'overvalued'        // 估值偏高，理性
  | 'waitLower'         // 等更低价，恐高
  | 'uncertainty'       // 业务不确定，理性
  | 'positionFull'      // 仓位已满，理性

const REASON_LABELS: Record<FearReason, { label: string; warning: boolean; description: string }> = {
  overvalued:    { label: '估值偏高（数据驱动）',  warning: false, description: '基于估值百分位 / 历史区间客观判断' },
  waitLower:     { label: '我等更低价',             warning: true,  description: '⚠️ 这是恐高心理的典型表现' },
  uncertainty:   { label: '业务有重大不确定性',     warning: false, description: '基于公司基本面 / 治理 / 行业判断' },
  positionFull:  { label: '仓位已满（>25%）',        warning: false, description: '巴菲特建议核心仓位上限' },
}

interface FearCheckTabProps {
  symbolHints: { symbol: string; name: string }[]
}

export function FearCheckTab({ symbolHints }: FearCheckTabProps) {
  // step state
  const [symbol, setSymbol] = useState('')
  const [name, setName] = useState('')
  const [roeBelief, setRoeBelief] = useState<'yes' | 'no' | 'unsure' | ''>('')
  const [roeTarget, setRoeTarget] = useState('15')
  const [reasons, setReasons] = useState<Set<FearReason>>(new Set())
  const [thoughts, setThoughts] = useState('')

  const { data: valuation } = useValuation(symbol || null)
  const p5 = valuation?.history5y?.pe?.currentPercentile ?? null
  const p10 = valuation?.history10y?.pe?.currentPercentile ?? null

  const [aiResults, setAiResults] = useState<{ buffett: string; wangyuquan: string }>({ buffett: '', wangyuquan: '' })
  const [aiLoading, setAiLoading] = useState(false)

  const onPickSymbol = (s: string) => {
    const hint = symbolHints.find(h => h.symbol === s)
    setSymbol(s)
    if (hint) setName(hint.name)
  }

  const toggleReason = (r: FearReason) => {
    const next = new Set(reasons)
    if (next.has(r)) next.delete(r); else next.add(r)
    setReasons(next)
  }

  const askAI = async () => {
    if (!symbol || !ANTHROPIC_KEY) return
    setAiLoading(true)
    try {
      const ctx = `标的: ${symbol}${name ? ` (${name})` : ''}
当前 PE 5y 百分位: ${p5 != null ? p5 + '%' : '未知'}
当前 PE 10y 百分位: ${p10 != null ? p10 + '%' : '未知'}
ROE 信念: ${roeBelief} (${roeTarget}%+)
我犹豫的理由: ${[...reasons].map(r => REASON_LABELS[r].label).join('、') || '未填'}
我的额外想法: ${thoughts || '无'}`

      const buffett = `你是巴菲特，请用简短中文(150字内)直接回答：基于以上信息，"在当前价位买入" 你会同意吗？为什么？务必给出明确的「会买/不会买/视情况」结论。\n\n${ctx}`
      const wangyuquan = `你是段永平/王雨权风格的长期投资者，请用简短中文(150字内)直接回答：基于以上信息，"在当前价位买入" 你会同意吗？为什么？务必给出明确的「会买/不会买/视情况」结论。\n\n${ctx}`

      const ask = async (q: string) => {
        const r = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_KEY!,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 600,
            messages: [{ role: 'user', content: q }],
          }),
        })
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const j = await r.json()
        return j.content?.[0]?.text || '(无回答)'
      }

      const [b, w] = await Promise.all([ask(buffett), ask(wangyuquan)])
      setAiResults({ buffett: b, wangyuquan: w })
    } catch (e) {
      setAiResults({ buffett: `调用失败: ${(e as Error).message}`, wangyuquan: '' })
    } finally {
      setAiLoading(false)
    }
  }

  // 诊断输出
  const hasWaitLower = reasons.has('waitLower')
  const isLowValuation = p5 != null && p5 < 30

  return (
    <>
      <div className="section">
        <div className="section-header">
          <h2>恐高自检</h2>
        </div>

        <div style={{
          padding: 12, borderRadius: 6,
          background: 'var(--bg2)', border: '1px solid var(--border)',
          fontSize: '.85rem', marginBottom: 16, lineHeight: 1.6,
        }}>
          <strong>Arthur 2025 年自我反思：</strong>"恐高心理导致反复错失长期优质标的建仓时机。谷歌等到300美元以上才建仓，
          特斯拉100、200美元都没买。这是<u>系统性的行为偏差</u>。"
          <div style={{ marginTop: 6, color: 'var(--fg2)', fontSize: '.78rem' }}>
            本工具用于把"不买"的真实理由摊开 —— 是数据驱动的克制，还是心理上的恐高？
          </div>
        </div>

        {/* Step 1: 标的 */}
        <div className="field" style={{ marginBottom: 12 }}>
          <label>① 你正在犹豫买入的标的</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} placeholder="如 GOOG / 00700.HK" style={{ flex: 1 }} />
            <input value={name} onChange={e => setName(e.target.value)} placeholder="名称" style={{ flex: 1 }} />
            {symbolHints.length > 0 && (
              <select value="" onChange={e => onPickSymbol(e.target.value)} style={{ width: 120 }}>
                <option value="">从持仓选</option>
                {symbolHints.map(h => <option key={h.symbol} value={h.symbol}>{h.symbol}</option>)}
              </select>
            )}
          </div>
        </div>

        {/* Step 2: ROE 信念 */}
        <div className="field" style={{ marginBottom: 12 }}>
          <label>② 这家公司未来 5 年内 ROE 能保持在</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="number" value={roeTarget} onChange={e => setRoeTarget(e.target.value)} style={{ width: 80 }} />
            <span style={{ color: 'var(--fg2)' }}>% 以上吗？</span>
            {(['yes', 'no', 'unsure'] as const).map(v => (
              <button key={v}
                onClick={() => setRoeBelief(v)}
                className={roeBelief === v ? 'primary' : ''}
                style={{ fontSize: '.85rem' }}>
                {v === 'yes' ? '我相信' : v === 'no' ? '不相信' : '不确定'}
              </button>
            ))}
          </div>
        </div>

        {/* Step 3: 估值百分位（自动） */}
        <div className="field" style={{ marginBottom: 12 }}>
          <label>③ 当前估值百分位（自动取自模块一）</label>
          {!symbol ? (
            <div style={{ color: 'var(--fg2)', fontSize: '.85rem' }}>请先填写代码</div>
          ) : valuation ? (
            <div style={{ fontSize: '.85rem' }}>
              5年 PE 百分位: <strong style={{ color: p5 != null && p5 < 30 ? 'var(--green)' : p5 != null && p5 > 70 ? 'var(--red)' : '#d4a72c' }}>
                {p5 != null ? `${p5}%` : '—'}
              </strong>
              {' · '}
              10年 PE 百分位: <strong>{p10 != null ? `${p10}%` : '—'}</strong>
              {p5 != null && p5 < 30 && <span style={{ marginLeft: 8, color: 'var(--green)' }}>✓ 处于历史低估区间</span>}
              {p5 != null && p5 > 70 && <span style={{ marginLeft: 8, color: 'var(--red)' }}>⚠️ 处于历史高估区间</span>}
            </div>
          ) : (
            <div style={{ color: 'var(--fg2)', fontSize: '.85rem' }}>该标的暂无估值数据，请等待 valuation-fetch.yml 下次运行。</div>
          )}
        </div>

        {/* Step 4: 不买的真实理由 */}
        <div className="field" style={{ marginBottom: 12 }}>
          <label>④ 你不买的真实理由（多选）</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(Object.entries(REASON_LABELS) as [FearReason, typeof REASON_LABELS[FearReason]][]).map(([key, info]) => (
              <label key={key} style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                padding: 8, borderRadius: 6, cursor: 'pointer',
                border: reasons.has(key) ? `1px solid ${info.warning ? 'var(--red)' : 'var(--accent)'}` : '1px solid var(--border)',
                background: reasons.has(key) ? 'var(--bg2)' : 'transparent',
              }}>
                <input type="checkbox" checked={reasons.has(key)} onChange={() => toggleReason(key)} />
                <div>
                  <div style={{ fontWeight: 500 }}>{info.label}</div>
                  <div style={{ fontSize: '.75rem', color: info.warning ? 'var(--red)' : 'var(--fg2)' }}>{info.description}</div>
                </div>
              </label>
            ))}
          </div>
          <div style={{ marginTop: 8 }}>
            <textarea value={thoughts} onChange={e => setThoughts(e.target.value)}
              placeholder="其他想法（可选）"
              style={{ width: '100%', minHeight: 60, padding: 8, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--fg)' }} />
          </div>
        </div>

        {/* Step 5: 大佬会买吗 */}
        <div className="field" style={{ marginBottom: 12 }}>
          <label>⑤ 让两位大佬给你交叉验证</label>
          <button className="primary" onClick={askAI} disabled={!symbol || aiLoading}>
            {aiLoading ? '思考中…' : '问巴菲特 + 段永平'}
          </button>
        </div>

        {(aiResults.buffett || aiResults.wangyuquan) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div style={{ padding: 12, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg2)' }}>
              <div style={{ fontSize: '.78rem', color: 'var(--fg2)', marginBottom: 4 }}>巴菲特</div>
              <div style={{ fontSize: '.85rem', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{aiResults.buffett}</div>
            </div>
            <div style={{ padding: 12, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg2)' }}>
              <div style={{ fontSize: '.78rem', color: 'var(--fg2)', marginBottom: 4 }}>段永平 / 王雨权</div>
              <div style={{ fontSize: '.85rem', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{aiResults.wangyuquan}</div>
            </div>
          </div>
        )}

        {/* 诊断输出 */}
        <div style={{ marginTop: 12 }}>
          {hasWaitLower && (
            <div style={{
              padding: 16, borderRadius: 8,
              border: '2px solid var(--red)', background: 'var(--bg2)',
              marginBottom: 12,
            }}>
              <div style={{ fontSize: '.95rem', fontWeight: 700, color: 'var(--red)', marginBottom: 6 }}>
                ⚠️ 你正在用"恐高"阻止自己
              </div>
              <div style={{ fontSize: '.85rem', lineHeight: 1.6 }}>
                <strong>Arthur 2025 年总结：</strong>"恐高心理导致谷歌、特斯拉错失多次建仓机会。" 请重新审视 ——
                "等更低价" 的本质是<u>把决策权交给随机价格波动</u>，而不是公司的内在价值。
              </div>
              <div style={{ fontSize: '.78rem', color: 'var(--fg2)', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                <strong>王川教训第 7 条：</strong>"不怕改错和高价买回。" —— 看错了价格不是耻辱，错过好公司才是。
              </div>
            </div>
          )}

          {!hasWaitLower && reasons.size > 0 && (
            <div style={{
              padding: 12, borderRadius: 6,
              border: '1px solid var(--green)', background: 'var(--bg2)',
            }}>
              <div style={{ fontSize: '.85rem', color: 'var(--green)', fontWeight: 600 }}>
                ✓ 你的犹豫看起来是基于数据 / 基本面的理性判断
              </div>
              <div style={{ fontSize: '.78rem', color: 'var(--fg2)', marginTop: 4 }}>
                如果决定不买，建议在「决策日志」里留一条记录，未来回看可验证判断。
              </div>
            </div>
          )}

          {isLowValuation && hasWaitLower && (
            <div style={{
              padding: 12, borderRadius: 6,
              border: '1px solid var(--red)', background: 'var(--bg2)', marginTop: 12,
            }}>
              <div style={{ fontSize: '.85rem', color: 'var(--red)' }}>
                <strong>双重警告：</strong>当前估值已在历史低估区间（5y分位 {p5}%），
                却又勾选了"等更低价"。这正是 Arthur 反复犯的错误模式。
              </div>
            </div>
          )}

          {roeBelief === 'yes' && isLowValuation && !hasWaitLower && (
            <div style={{
              padding: 12, borderRadius: 6,
              border: '1px solid var(--accent)', background: 'var(--bg2)', marginTop: 12,
            }}>
              <div style={{ fontSize: '.85rem' }}>
                <strong style={{ color: 'var(--accent)' }}>⭐ 教科书式建仓机会：</strong>
                高 ROE 信念 + 历史低估值 + 无心理恐高。建议立即跳到「加仓计划」生成金字塔。
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
