import { useEffect, useState } from 'react'

interface NavRecord { date: string; nav_per_share: number; total_value_cny: number; is_legacy: number }
interface Position { symbol: string; name: string; qty: number; currency: string; category: string; last_price: number; id?: number; last_updated?: string }
interface Config { epochDate: string; usdcny: string; initialShares: string }
interface Data { nav_history: NavRecord[]; current_positions: Position[]; config: Config }

const fmt = (n: number, digits = 2) => n.toLocaleString('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits })

export default function App() {
  const [data, setData] = useState<Data | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editQty, setEditQty] = useState<string>('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newPosition, setNewPosition] = useState<Omit<Position, 'id' | 'last_updated'>>({
    symbol: '',
    name: '',
    qty: 0,
    currency: 'CNY',
    category: 'equity',
    last_price: 0
  })

  useEffect(() => {
    fetch('/data.json').then(r => r.json()).then(setData)
  }, [])

  if (!data) return <div style={{ padding: 40, fontFamily: 'system-ui' }}>加载中...</div>

  const { nav_history, current_positions, config } = data
  const usdcny = parseFloat(config.usdcny)

  // NAV
  const nonLegacy = nav_history.filter(r => !r.is_legacy)
  const latest = nonLegacy[nonLegacy.length - 1]
  const prev = nonLegacy[nonLegacy.length - 2]
  const nav = latest.nav_per_share
  const totalCny = latest.total_value_cny
  const ytd = ((nav - 1) * 100).toFixed(2)
  const dayChange = prev ? ((nav - prev.nav_per_share) / prev.nav_per_share * 100).toFixed(2) : '0.00'
  const isUp = parseFloat(dayChange) >= 0

  // Positions with CNY value
  const equities = current_positions.filter(p => p.category === 'equity').map(p => {
    let valueCny = p.qty * p.last_price
    if (p.currency === 'USD') valueCny *= usdcny
    if (p.currency === 'HKD') valueCny *= usdcny * 0.9
    return { ...p, valueCny }
  }).sort((a, b) => b.valueCny - a.valueCny)

  const funds = current_positions.filter(p => p.category === 'fund' || p.category === 'cash')

  // 编辑数量
  const handleEdit = (position: Position) => {
    setEditingId(position.id || null)
    setEditQty(position.qty.toString())
  }

  // 保存编辑
  const handleSaveEdit = async () => {
    if (editingId === null) return

    const updatedPositions = data.current_positions.map(p => {
      if (p.id === editingId) {
        return { ...p, qty: parseFloat(editQty) }
      }
      return p
    })

    const updatedData = { ...data, current_positions: updatedPositions }
    setData(updatedData)
    setEditingId(null)
    setEditQty('')

    // 保存到 data.json
    try {
      const response = await fetch('/data.json', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedData, null, 2)
      })

      if (response.ok) {
        console.log('数据已保存')
        // 提交到 git
        const commitResponse = await fetch('/api/commit', { method: 'POST' })
        if (commitResponse.ok) {
          console.log('已提交到 git')
        }
      }
    } catch (error) {
      console.error('保存失败:', error)
    }
  }

  // 删除持仓
  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个持仓吗？')) return

    const updatedPositions = data.current_positions.filter(p => p.id !== id)
    const updatedData = { ...data, current_positions: updatedPositions }
    setData(updatedData)

    // 保存到 data.json
    try {
      const response = await fetch('/data.json', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedData, null, 2)
      })

      if (response.ok) {
        console.log('数据已保存')
        // 提交到 git
        const commitResponse = await fetch('/api/commit', { method: 'POST' })
        if (commitResponse.ok) {
          console.log('已提交到 git')
        }
      }
    } catch (error) {
      console.error('保存失败:', error)
    }
  }

  // 添加新持仓
  const handleAddPosition = async () => {
    if (!newPosition.symbol || !newPosition.name || newPosition.qty <= 0) {
      alert('请填写完整信息')
      return
    }

    const newId = Math.max(...data.current_positions.map(p => p.id || 0), 0) + 1
    const position: Position = {
      ...newPosition,
      id: newId,
      last_updated: new Date().toISOString().split('T')[0]
    }

    const updatedPositions = [...data.current_positions, position]
    const updatedData = { ...data, current_positions: updatedPositions }
    setData(updatedData)
    setShowAddForm(false)
    setNewPosition({
      symbol: '',
      name: '',
      qty: 0,
      currency: 'CNY',
      category: 'equity',
      last_price: 0
    })

    // 保存到 data.json
    try {
      const response = await fetch('/data.json', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedData, null, 2)
      })

      if (response.ok) {
        console.log('数据已保存')
        // 提交到 git
        const commitResponse = await fetch('/api/commit', { method: 'POST' })
        if (commitResponse.ok) {
          console.log('已提交到 git')
        }
      }
    } catch (error) {
      console.error('保存失败:', error)
    }
  }

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: 1000, margin: '0 auto', padding: '24px 16px', background: '#f8f9fa', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <span style={{ fontSize: 20 }}>📊</span>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>PortfolioLab</h1>
        <span style={{ fontSize: 12, color: '#888', marginLeft: 'auto' }}>数据截止 {latest.date}</span>
      </div>

      {/* NAV Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: '单位净值', value: nav.toFixed(6), sub: `+1.27% 成立以来`, color: '#16a34a' },
          { label: '总资产 (CNY)', value: `¥${fmt(totalCny, 0)}`, sub: `$${fmt(totalCny / usdcny, 0)}`, color: '#555' },
          { label: 'YTD 收益', value: `+${ytd}%`, sub: '', color: parseFloat(ytd) >= 0 ? '#16a34a' : '#dc2626' },
          { label: '当日盈亏', value: `${isUp ? '+' : ''}${dayChange}%`, sub: '', color: isUp ? '#16a34a' : '#dc2626' },
        ].map(c => (
          <div key={c.label} style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: c.color }}>{c.value}</div>
            {c.sub && <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>{c.sub}</div>}
          </div>
        ))}
      </div>

      {/* Equity Positions */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600, marginBottom: 14 }}>
          <span>股票持仓</span>
          <button
            style={{
              padding: '4px 12px',
              fontSize: 12,
              borderRadius: 6,
              border: '1px solid #ddd',
              background: '#fff',
              cursor: 'pointer',
              color: '#666'
            }}
            onClick={() => setShowAddForm(!showAddForm)}
          >
            + 新增标的
          </button>
        </div>

        {showAddForm && (
          <div style={{ background: '#f9f9f9', padding: 12, borderRadius: 8, marginBottom: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, fontSize: 12 }}>
              <input
                placeholder="代码"
                value={newPosition.symbol}
                onChange={(e) => setNewPosition({ ...newPosition, symbol: e.target.value })}
                style={{ padding: 6, borderRadius: 4, border: '1px solid #ddd' }}
              />
              <input
                placeholder="名称"
                value={newPosition.name}
                onChange={(e) => setNewPosition({ ...newPosition, name: e.target.value })}
                style={{ padding: 6, borderRadius: 4, border: '1px solid #ddd' }}
              />
              <input
                type="number"
                placeholder="数量"
                value={newPosition.qty}
                onChange={(e) => setNewPosition({ ...newPosition, qty: parseFloat(e.target.value) || 0 })}
                style={{ padding: 6, borderRadius: 4, border: '1px solid #ddd' }}
              />
              <select
                value={newPosition.currency}
                onChange={(e) => setNewPosition({ ...newPosition, currency: e.target.value })}
                style={{ padding: 6, borderRadius: 4, border: '1px solid #ddd' }}
              >
                <option value="CNY">CNY</option>
                <option value="USD">USD</option>
                <option value="HKD">HKD</option>
              </select>
              <input
                type="number"
                placeholder="价格"
                value={newPosition.last_price}
                onChange={(e) => setNewPosition({ ...newPosition, last_price: parseFloat(e.target.value) || 0 })}
                style={{ padding: 6, borderRadius: 4, border: '1px solid #ddd' }}
              />
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  onClick={handleAddPosition}
                  style={{
                    padding: '4px 8px',
                    background: '#16a34a',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: 12
                  }}
                >
                  保存
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  style={{
                    padding: '4px 8px',
                    background: '#fff',
                    color: '#666',
                    border: '1px solid #ddd',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: 12
                  }}
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ color: '#aaa', borderBottom: '1px solid #f0f0f0' }}>
              {['代码', '名称', '数量', '币种', '最新价', '估值(CNY)', '操作'].map(h => (
                <th key={h} style={{ textAlign: 'left', paddingBottom: 8, fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {equities.map(p => (
              <tr key={p.symbol} style={{ borderBottom: '1px solid #f8f8f8' }}>
                <td style={td}>{p.symbol}</td>
                <td style={td}>{p.name}</td>
                <td style={td}>
                  {editingId === p.id ? (
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <input
                        type="number"
                        value={editQty}
                        onChange={(e) => setEditQty(e.target.value)}
                        style={{ width: 80, padding: 4, borderRadius: 4, border: '1px solid #ddd' }}
                      />
                      <div style={{ display: 'flex', gap: 2 }}>
                        <button
                          onClick={handleSaveEdit}
                          style={{
                            padding: '2px 6px',
                            background: '#16a34a',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 3,
                            cursor: 'pointer',
                            fontSize: 11
                          }}
                        >
                          保存
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null)
                            setEditQty('')
                          }}
                          style={{
                            padding: '2px 6px',
                            background: '#fff',
                            color: '#666',
                            border: '1px solid #ddd',
                            borderRadius: 3,
                            cursor: 'pointer',
                            fontSize: 11
                          }}
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    fmt(p.qty, 0)
                  )}
                </td>
                <td style={td}>{p.currency}</td>
                <td style={td}>{p.last_price}</td>
                <td style={td}>¥{fmt(p.valueCny, 0)}</td>
                <td style={td}>
                  {editingId === p.id ? null : (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        onClick={() => handleEdit(p)}
                        style={{
                          padding: '2px 6px',
                          fontSize: 11,
                          borderRadius: 3,
                          border: '1px solid #ddd',
                          background: '#fff',
                          cursor: 'pointer',
                          color: '#666'
                        }}
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDelete(p.id!)}
                        style={{
                          padding: '2px 6px',
                          fontSize: 11,
                          borderRadius: 3,
                          border: '1px solid #ddd',
                          background: '#fff',
                          cursor: 'pointer',
                          color: '#dc2626'
                        }}
                      >
                        删除
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Funds & Cash */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ fontWeight: 600, marginBottom: 14 }}>现金 & 基金</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ color: '#aaa', borderBottom: '1px solid #f0f0f0' }}>
              {['名称', '金额(CNY)'].map(h => (
                <th key={h} style={{ textAlign: 'left', paddingBottom: 8, fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {funds.map(p => (
              <tr key={p.symbol} style={{ borderBottom: '1px solid #f8f8f8' }}>
                <td style={td}>{p.name}</td>
                <td style={td}>¥{fmt(p.qty * p.last_price, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: 11, color: '#ccc', marginTop: 12, textAlign: 'right' }}>
        PortfolioLab · 静态快照 · {latest.date}
      </div>
    </div>
  )
}

const td: React.CSSProperties = { padding: '9px 0', color: '#333' }
