import { useState, useMemo } from 'react'

export interface DividendRecord {
  id: string
  date: string
  symbol: string
  name: string
  perShare: number
  shares: number
  currency: 'CNY' | 'HKD' | 'USD'
  grossAmount: number
  netAmountCny: number
  note?: string
}

interface SymbolHint {
  symbol: string
  name: string
  currency: 'CNY' | 'HKD' | 'USD'
  quantity: number
}

interface DividendRegisterProps {
  symbolHints: SymbolHint[]
  dividendLog: DividendRecord[]
  usdcny: number
  hkdcny: number
  onRegister: (record: DividendRecord) => void
  onDelete: (id: string) => void
}

// A股红利税：持股>1年免税，1个月-1年10%，<1个月20%。这里默认可调，常见长期持有取0
// 港股通：内地投资者收20%红利税
// 美股：30%预扣（除非W-8BEN，QDII通常10%）
const TAX_PRESETS: Record<string, { label: string; rate: number }[]> = {
  CNY: [
    { label: '长期持有免税(0%)', rate: 0 },
    { label: '持有1月-1年(10%)', rate: 0.10 },
    { label: '持有<1月(20%)', rate: 0.20 },
  ],
  HKD: [
    { label: '港股通(20%)', rate: 0.20 },
    { label: '直接持有H股(10%)', rate: 0.10 },
    { label: '红筹/民企(0%)', rate: 0 },
  ],
  USD: [
    { label: 'QDII预扣(10%)', rate: 0.10 },
    { label: '个人预扣(30%)', rate: 0.30 },
    { label: '免税(0%)', rate: 0 },
  ],
}

function today() {
  return new Date().toISOString().slice(0, 10)
}
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}
function fmtNum(n: number, d = 2) {
  return n.toLocaleString('zh-CN', { minimumFractionDigits: d, maximumFractionDigits: d })
}

export function DividendRegister({ symbolHints, dividendLog, usdcny, hkdcny, onRegister, onDelete }: DividendRegisterProps) {
  const [draft, setDraft] = useState({
    symbol: '',
    perShare: '',
    shares: '',
    taxRate: '0',
    date: today(),
    note: '',
  })

  const selectedHint = symbolHints.find(h => h.symbol === draft.symbol)
  const currency = selectedHint?.currency || 'CNY'
  const taxPresets = TAX_PRESETS[currency] || TAX_PRESETS.CNY

  const calc = useMemo(() => {
    const perShare = parseFloat(draft.perShare) || 0
    const shares = parseFloat(draft.shares) || 0
    const taxRate = parseFloat(draft.taxRate) || 0
    const gross = perShare * shares
    const net = gross * (1 - taxRate)
    let fx = 1
    if (currency === 'USD') fx = usdcny
    else if (currency === 'HKD') fx = hkdcny
    const netCny = net * fx
    const grossCny = gross * fx
    return { gross, net, netCny, grossCny, fx, taxRate }
  }, [draft.perShare, draft.shares, draft.taxRate, currency, usdcny, hkdcny])

  const canSubmit = draft.symbol && calc.gross > 0

  const handleSelectSymbol = (symbol: string) => {
    const hint = symbolHints.find(h => h.symbol === symbol)
    setDraft({
      ...draft,
      symbol,
      shares: hint ? hint.quantity.toString() : draft.shares,
    })
  }

  const submit = () => {
    if (!canSubmit) return
    const hint = symbolHints.find(h => h.symbol === draft.symbol)
    const record: DividendRecord = {
      id: genId(),
      date: draft.date,
      symbol: draft.symbol,
      name: hint?.name || draft.symbol,
      perShare: parseFloat(draft.perShare),
      shares: parseFloat(draft.shares),
      currency,
      grossAmount: calc.gross,
      netAmountCny: calc.netCny,
      note: draft.note || undefined,
    }
    onRegister(record)
    setDraft({ symbol: '', perShare: '', shares: '', taxRate: '0', date: today(), note: '' })
  }

  // 年度统计
  const yearStats = useMemo(() => {
    const byYear: Record<string, number> = {}
    dividendLog.forEach(d => {
      const yr = d.date.slice(0, 4)
      byYear[yr] = (byYear[yr] || 0) + d.netAmountCny
    })
    return byYear
  }, [dividendLog])

  const currentYear = today().slice(0, 4)

  return (
    <div className="section">
      <div className="section-header">
        <h2>💰 分红登记</h2>
      </div>
      <div style={{ fontSize: '.82rem', color: 'var(--fg2)', marginBottom: 12, lineHeight: 1.6 }}>
        登记分红后，<b>税后金额自动加入现金固收</b>，但<b>不增加份额、不影响净值</b>（分红是钱从股票挪到现金，非盈亏）。
        股票市值的除权下跌由"刷新行情"自动处理，此处只负责把到账现金计入。
      </div>

      {/* 输入表单 */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 12 }}>
        <div className="field" style={{ minWidth: 160 }}>
          <label>选择持仓股</label>
          <select value={draft.symbol} onChange={e => handleSelectSymbol(e.target.value)}>
            <option value="">选择...</option>
            {symbolHints.map(h => (
              <option key={h.symbol} value={h.symbol}>{h.name} ({h.symbol})</option>
            ))}
          </select>
        </div>
        <div className="field" style={{ minWidth: 110 }}>
          <label>每股分红 ({currency})</label>
          <input type="number" step="0.001" value={draft.perShare}
            onChange={e => setDraft({ ...draft, perShare: e.target.value })} placeholder="如 2.0" />
        </div>
        <div className="field" style={{ minWidth: 110 }}>
          <label>持股数</label>
          <input type="number" value={draft.shares}
            onChange={e => setDraft({ ...draft, shares: e.target.value })} placeholder="自动填充" />
        </div>
        <div className="field" style={{ minWidth: 150 }}>
          <label>红利税</label>
          <select value={draft.taxRate} onChange={e => setDraft({ ...draft, taxRate: e.target.value })}>
            {taxPresets.map(t => (
              <option key={t.rate} value={t.rate}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="field" style={{ minWidth: 130 }}>
          <label>到账日期</label>
          <input type="date" value={draft.date} onChange={e => setDraft({ ...draft, date: e.target.value })} />
        </div>
        <div className="field" style={{ minWidth: 120, flex: 1 }}>
          <label>备注（可选）</label>
          <input value={draft.note} onChange={e => setDraft({ ...draft, note: e.target.value })} placeholder="如 2025年度分红" />
        </div>
      </div>

      {/* 计算预览 */}
      {calc.gross > 0 && (
        <div style={{ padding: 10, background: 'var(--bg2)', borderRadius: 6, fontSize: '.82rem', marginBottom: 12 }}>
          税前 {currency} {fmtNum(calc.gross)} · 税率 {(calc.taxRate * 100).toFixed(0)}% ·
          税后 {currency} {fmtNum(calc.net)}
          {currency !== 'CNY' && <> · 汇率 {calc.fx}</>}
          · <b style={{ color: 'var(--green)' }}>到账 ¥{fmtNum(calc.netCny)}</b>
          <span style={{ color: 'var(--fg2)' }}>（将加入现金固收）</span>
        </div>
      )}

      <button className="primary" disabled={!canSubmit} onClick={submit}
        style={{ opacity: canSubmit ? 1 : 0.5 }}>
        登记分红并计入现金
      </button>
      {!canSubmit && <span style={{ marginLeft: 10, fontSize: '.78rem', color: 'var(--fg2)' }}>请选择股票并填写每股分红</span>}

      {/* 年度统计 */}
      {Object.keys(yearStats).length > 0 && (
        <div style={{ marginTop: 16, padding: 10, background: 'var(--bg2)', borderRadius: 6, fontSize: '.85rem' }}>
          <b>年度分红收入：</b>
          {Object.entries(yearStats).sort((a, b) => b[0].localeCompare(a[0])).map(([yr, amt]) => (
            <span key={yr} style={{ marginRight: 16 }}>
              {yr}年 <b style={{ color: yr === currentYear ? 'var(--accent)' : 'var(--fg)' }}>¥{fmtNum(amt, 0)}</b>
            </span>
          ))}
        </div>
      )}

      {/* 分红历史 */}
      {dividendLog.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h3 style={{ fontSize: '.95rem', marginBottom: 8 }}>分红历史</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>日期</th>
                  <th>股票</th>
                  <th className="r">每股</th>
                  <th className="r">股数</th>
                  <th className="r">税前</th>
                  <th className="r">到账(CNY)</th>
                  <th>备注</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {[...dividendLog].sort((a, b) => b.date.localeCompare(a.date)).map(d => (
                  <tr key={d.id}>
                    <td>{d.date}</td>
                    <td><b>{d.name}</b><br /><span style={{ fontSize: '.72rem', color: 'var(--fg2)' }}>{d.symbol}</span></td>
                    <td className="r">{d.currency} {fmtNum(d.perShare, 3)}</td>
                    <td className="r">{d.shares.toLocaleString()}</td>
                    <td className="r">{d.currency} {fmtNum(d.grossAmount, 0)}</td>
                    <td className="r" style={{ color: 'var(--green)' }}>¥{fmtNum(d.netAmountCny, 0)}</td>
                    <td style={{ fontSize: '.78rem' }}>{d.note || '-'}</td>
                    <td>
                      <button className="sm danger" style={{ padding: '2px 6px', fontSize: '.7rem' }}
                        onClick={() => onDelete(d.id)}>删除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
