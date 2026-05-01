import { useState, useMemo } from 'react'

/**
 * P1 Module 4 — 财报提醒（手动录入版）
 *
 * 数据结构存储在 AppState.earningsCalendar (新增字段，向后兼容)。
 * 三档触发：
 *   - 7 天内：橙色提示
 *   - 1 天内（含当天）：红色 / 当天提示「建议执行主题复盘」
 */

export interface EarningsEntry {
  id: string
  symbol: string
  name?: string
  earningsDate: string         // YYYY-MM-DD
  fiscalQuarter?: string       // e.g. "FY26Q1"
  source: 'auto' | 'manual'
  lastChecked: string          // ISO timestamp
  note?: string
}

function genId() {
  return Math.random().toString(36).slice(2, 10)
}

function daysUntil(dateStr: string): number {
  // Returns days from today (00:00) to earningsDate (00:00)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + 'T00:00:00')
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

export interface EarningsAlert extends EarningsEntry {
  daysLeft: number
  level: 'today' | 'soon' | 'upcoming'  // today=0, soon=1-7, upcoming>7
}

export function pickEarningsAlerts(list: EarningsEntry[]): EarningsAlert[] {
  const out: EarningsAlert[] = []
  for (const e of list) {
    const d = daysUntil(e.earningsDate)
    if (d < -1) continue // 已过期超过一天的不显示
    let level: EarningsAlert['level'] = 'upcoming'
    if (d <= 0) level = 'today'
    else if (d <= 7) level = 'soon'
    else continue // 7 天之外不进 alerts banner
    out.push({ ...e, daysLeft: d, level })
  }
  return out.sort((a, b) => a.daysLeft - b.daysLeft)
}

/* ────────── EarningsBanner — 顶部红橙提示条 ────────── */

interface BannerProps {
  alerts: EarningsAlert[]
  onAskAdvisor?: (symbol: string, name?: string) => void
}

export function EarningsBanner({ alerts, onAskAdvisor }: BannerProps) {
  if (alerts.length === 0) return null
  return (
    <div style={{
      marginTop: 12,
      padding: 12,
      borderRadius: 8,
      border: '1px solid var(--border)',
      background: 'var(--bg2)',
    }}>
      <div style={{ fontSize: '.8rem', color: 'var(--fg2)', marginBottom: 6 }}>📊 财报提醒</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {alerts.map(a => {
          const color = a.level === 'today' ? 'var(--red)' : a.level === 'soon' && a.daysLeft <= 1 ? 'var(--red)' : 'orange'
          const label = a.daysLeft === 0 ? '今天' : a.daysLeft < 0 ? `已发布 ${-a.daysLeft}d` : `还有 ${a.daysLeft} 天`
          return (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.85rem' }}>
              <span style={{ color, fontWeight: 600, minWidth: 70 }}>{label}</span>
              <span style={{ fontWeight: 500 }}>{a.symbol}</span>
              {a.name && <span style={{ color: 'var(--fg2)' }}>{a.name}</span>}
              {a.fiscalQuarter && <span style={{ color: 'var(--fg2)', fontSize: '.75rem' }}>{a.fiscalQuarter}</span>}
              <span style={{ color: 'var(--fg2)', fontSize: '.75rem' }}>{a.earningsDate}</span>
              {a.daysLeft <= 0 && onAskAdvisor && (
                <button
                  className="primary"
                  style={{ marginLeft: 'auto', fontSize: '.75rem', padding: '2px 8px' }}
                  onClick={() => onAskAdvisor(a.symbol, a.name)}
                >
                  建议主题复盘
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ────────── EarningsManager — 录入与维护 ────────── */

interface ManagerProps {
  earnings: EarningsEntry[]
  onUpdate: (next: EarningsEntry[]) => void
}

export function EarningsManager({ earnings, onUpdate }: ManagerProps) {
  const [draft, setDraft] = useState({
    symbol: '',
    name: '',
    earningsDate: '',
    fiscalQuarter: '',
    note: '',
  })

  const sorted = useMemo(() => {
    return [...earnings].sort((a, b) => a.earningsDate.localeCompare(b.earningsDate))
  }, [earnings])

  const add = () => {
    if (!draft.symbol.trim() || !draft.earningsDate) return
    const e: EarningsEntry = {
      id: genId(),
      symbol: draft.symbol.trim().toUpperCase(),
      name: draft.name.trim() || undefined,
      earningsDate: draft.earningsDate,
      fiscalQuarter: draft.fiscalQuarter.trim() || undefined,
      source: 'manual',
      lastChecked: new Date().toISOString(),
      note: draft.note.trim() || undefined,
    }
    onUpdate([...earnings, e])
    setDraft({ symbol: '', name: '', earningsDate: '', fiscalQuarter: '', note: '' })
  }

  const remove = (id: string) => {
    if (!confirm('删除该财报提醒？')) return
    onUpdate(earnings.filter(x => x.id !== id))
  }

  return (
    <div className="section" style={{ marginTop: 16 }}>
      <div className="section-header">
        <h2>财报提醒</h2>
      </div>

      {/* Add form */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr auto', gap: 8, marginBottom: 12 }}>
        <input placeholder="代码 (如 NVDA)" value={draft.symbol} onChange={e => setDraft({ ...draft, symbol: e.target.value })} />
        <input placeholder="名称 (可选)" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />
        <input type="date" value={draft.earningsDate} onChange={e => setDraft({ ...draft, earningsDate: e.target.value })} />
        <input placeholder="财季 (如 FY26Q1)" value={draft.fiscalQuarter} onChange={e => setDraft({ ...draft, fiscalQuarter: e.target.value })} />
        <input placeholder="备注 (可选)" value={draft.note} onChange={e => setDraft({ ...draft, note: e.target.value })} />
        <button className="primary" onClick={add} disabled={!draft.symbol.trim() || !draft.earningsDate}>添加</button>
      </div>

      {/* List */}
      {sorted.length === 0 ? (
        <div style={{ color: 'var(--fg2)', fontSize: '.85rem' }}>暂无财报提醒，添加后将在「总览」顶部展示倒计时。</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sorted.map(e => {
            const d = daysUntil(e.earningsDate)
            const color = d < 0 ? 'var(--fg2)' : d === 0 ? 'var(--red)' : d <= 7 ? 'orange' : 'var(--fg2)'
            const label = d === 0 ? '今天' : d < 0 ? `已发布 ${-d}d` : `还有 ${d} 天`
            return (
              <div key={e.id} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)',
                background: 'var(--bg)', fontSize: '.85rem',
              }}>
                <span style={{ color, fontWeight: 600, minWidth: 80 }}>{label}</span>
                <span style={{ fontWeight: 500, minWidth: 80 }}>{e.symbol}</span>
                {e.name && <span style={{ color: 'var(--fg2)', minWidth: 100 }}>{e.name}</span>}
                <span style={{ color: 'var(--fg2)', minWidth: 100 }}>{e.earningsDate}</span>
                {e.fiscalQuarter && <span style={{ color: 'var(--fg2)' }}>{e.fiscalQuarter}</span>}
                {e.note && <span style={{ color: 'var(--fg2)', fontSize: '.75rem' }}>{e.note}</span>}
                <button onClick={() => remove(e.id)} style={{ marginLeft: 'auto' }}>删除</button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
