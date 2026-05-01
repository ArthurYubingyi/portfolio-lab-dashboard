/* ========================================================================
 * PortfolioLab —— 产业洞察工作站：主题追踪模块
 * 独立 localStorage key: portfoliolab_themes，与现有持仓 state 完全隔离
 * 沿用 var(--accent) 等 CSS 变量，不引入新 UI 库
 * ====================================================================== */
import { useEffect, useMemo, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'

/* ────────── types ────────── */
export interface VariableHistory {
  date: string
  value: string
  note?: string
}

export interface Variable {
  id: string
  name: string
  observationSignal: string
  currentValue: string
  threshold: string
  history: VariableHistory[]
}

export interface CounterEvidence {
  id: string
  description: string
  severity: 1 | 2 | 3 | 4 | 5
  status: 'watching' | 'confirmed' | 'rejected'
  triggerAction: string
}

export interface DiaryEntry {
  id: string
  date: string
  content: string
  type: 'observation' | 'add' | 'reduce' | 'reflection' | 'counter' | 'ai'
}

export interface Theme {
  id: string
  name: string
  description: string
  relatedHoldings: string[]
  keyVariables: Variable[]
  currentJudgment: string
  supportingEvidence: string[]
  counterEvidence: CounterEvidence[]
  diary: DiaryEntry[]
  lastUpdated: string
  status: 'active' | 'paused' | 'closed'
}

const LS_THEMES = 'portfoliolab_themes'

const today = () => new Date().toISOString().slice(0, 10)
const genId = () => Math.random().toString(36).slice(2, 10)

/* ────────── 10 个预置默认主题 ────────── */
function buildDefaultThemes(): Theme[] {
  const t = today()
  const base = (
    name: string,
    description: string,
    holdings: string[],
    judgment: string,
    vars: Array<{ name: string; signal: string; threshold: string }>,
    counters: Array<{ desc: string; sev: 1|2|3|4|5; action: string }>,
    supports: string[] = [],
  ): Theme => ({
    id: genId(),
    name,
    description,
    relatedHoldings: holdings,
    currentJudgment: judgment,
    supportingEvidence: supports,
    counterEvidence: counters.map(c => ({
      id: genId(),
      description: c.desc,
      severity: c.sev,
      status: 'watching',
      triggerAction: c.action,
    })),
    keyVariables: vars.map(v => ({
      id: genId(),
      name: v.name,
      observationSignal: v.signal,
      currentValue: '',
      threshold: v.threshold,
      history: [],
    })),
    diary: [],
    lastUpdated: t,
    status: 'active',
  })

  return [
    base(
      'AI入口革命',
      '生成式 AI 重塑消费级与企业级软件入口，搜索、办公、社交、电商接口被重新分配。',
      ['00700.HK', 'GOOG', '09988.HK', '09888.HK'],
      '入口正在从 App 转向 Agent，超级 App 厂商若不能掌握自有大模型与流量分发将被边缘化。',
      [
        { name: 'ChatGPT/Gemini 周活跃用户', signal: 'OpenAI/Google 官方披露或第三方监测', threshold: '当任一突破 5 亿 WAU 时入口替代加速' },
        { name: '腾讯/阿里自研模型在自家产品的渗透率', signal: '微信元宝、夸克、通义、混元的接入与日活', threshold: '若 12 个月仍未跑出 1 亿 DAU 则中国入口失守' },
      ],
      [
        { desc: 'Agent 能力进展若停滞在长程任务 <30 分钟，入口革命可能被高估', sev: 4, action: '降低互联网龙头权重，重新评估搜索/广告资产' },
      ],
      ['Token 成本年降 80% 推动应用爆发', '王煜全：通用目的技术正从科学家手中转向工程师手中'],
    ),
    base(
      '端侧AI普及',
      'AI 模型从云端向手机/PC/汽车端侧迁移，触发硬件升级与新交互形态。',
      ['AAPL', '01810.HK', 'NVDA'],
      '端侧 AI 的核心瓶颈是内存和能耗，2026-2027 是端侧大模型普及关键窗口。',
      [
        { name: '主流旗舰机端侧大模型参数规模', signal: '苹果/小米/三星发布会披露', threshold: '当端侧 7B+ 模型成为标配则 AI 手机替代周期启动' },
        { name: 'NVIDIA 数据中心营收同比', signal: '英伟达季报', threshold: '若同比连续两季回落至 20% 以下，云端供给压力缓解' },
      ],
      [
        { desc: '苹果 Apple Intelligence 推进低于预期，端侧叙事可能延后', sev: 3, action: '观察 iPhone 17 Pro 发布会内容并下调预期' },
      ],
      ['端侧高带宽内存进入量产', 'Qualcomm/MediaTek 端侧推理 NPU 性能翻倍'],
    ),
    base(
      '自动驾驶',
      'L4 Robotaxi 从单点示范进入多城市规模商用，FSD/Waymo/萝卜快跑的竞争格局逐步明朗。',
      ['TSLA'],
      'Robotaxi 是 10 年级别的新增市场，特斯拉的训练数据规模和成本优势仍是壁垒，但需警惕监管节奏。',
      [
        { name: 'FSD V13+ 接管里程', signal: 'Tesla 季度安全报告与第三方爬虫数据', threshold: '当 MTBI 突破 5 万英里则真正接近无监管 L4' },
        { name: 'Robotaxi 商用城市数', signal: 'Tesla/Waymo/萝卜快跑公告', threshold: '当任一玩家在 10 城同时商用，规模拐点确立' },
      ],
      [
        { desc: '法规批复节奏远低于硬件迭代，2026 内若仍未拿到 L4 牌照则估值需重置', sev: 4, action: '减仓至底仓水平' },
      ],
      ['训练数据飞轮：Tesla 全球车队每月数十亿英里', '王川：垄断逻辑没破就持有'],
    ),
    base(
      '固态电池',
      '半固态/固态电池产业化突破将重塑动力电池格局与新能源车续航/安全竞争维度。',
      ['300750.SZ'],
      '宁德时代凝聚态/麒麟系列保持代际领先，固态量产是 2026-2028 关键变量。',
      [
        { name: '宁德时代固态电池能量密度披露', signal: '宁德/比亚迪/丰田固态电池路线图', threshold: '当量产能量密度突破 500Wh/kg 则材料体系切换确立' },
        { name: '车厂搭载固态电池车型数', signal: '工信部公告与车厂发布会', threshold: '当 5 家以上车厂量产搭载则产业化确认' },
      ],
      [
        { desc: '日韩固态路线若率先量产，宁德的工程化优势可能被技术代际抵消', sev: 3, action: '密切跟踪丰田/三星 SDI 进度' },
      ],
      ['宁德的产能规模与车厂绑定深度', '半固态率先在高端车型搭载'],
    ),
    base(
      '白酒消费',
      '高端白酒受经济结构与消费降级影响，茅台批价是产业景气度风向标。',
      ['600519.SH'],
      '茅台护城河未破，但批价压力和反腐节奏决定中期估值，需以"好价格"思路逆势加。',
      [
        { name: '飞天茅台一批价', signal: '酒类垂直媒体周度跟踪', threshold: '若长期跌破 2200 元则需重估渠道价值' },
        { name: '茅台直营占比', signal: '茅台年报披露', threshold: '直营占比若稳定提升至 50% 以上则量价控制权增强' },
      ],
      [
        { desc: '年轻消费群体白酒消费习惯持续弱化', sev: 4, action: '若 25-35 岁人均白酒消费持续负增长 2 年则需重估终局' },
      ],
      ['品牌历史 + 工艺壁垒 + 渠道掌控力', '巴菲特：好生意 + 好价格'],
    ),
    base(
      '中国银行业NIM周期',
      '净息差(NIM)触底回升将带动银行 ROE 修复，招行/建行是核心标的。',
      ['600036.SH', '03968.HK', '00939.HK'],
      'NIM 在 2025 年触底，存款重定价将于 2026 年贡献正向效应，叠加分红率政策性支撑。',
      [
        { name: '招行季度 NIM', signal: '招商银行季报', threshold: '当 NIM 同比回升 5bp 以上则拐点确认' },
        { name: '银行业整体存款付息率', signal: '央行/银保监披露', threshold: '若付息率年下行 15bp 以上则息差释放显著' },
      ],
      [
        { desc: '地方债务化解成本可能由银行让渡', sev: 4, action: '关注 LPR 与化债补贴政策细则' },
      ],
      ['股息率护城河', '招行零售 AUM 仍在扩张'],
    ),
    base(
      '本地生活',
      '即时零售、外卖、到店三大战场重组，美团核心壁垒能否守住决定终局。',
      ['03690.HK'],
      '美团骑手网络 + 商户 BD 是真壁垒，但抖音/京东轮番冲击需消耗利润换市占率。',
      [
        { name: '美团核心本地商业经营利润率', signal: '美团季报', threshold: '若年度利润率回升至 20%+ 则竞争压力缓解' },
        { name: '抖音本地生活 GTV', signal: '字节跳动披露/第三方监测', threshold: '若年度增速降至 50% 以下则进攻势能减弱' },
      ],
      [
        { desc: '骑手成本/社保政策改变可能压缩长期利润空间', sev: 3, action: '跟踪人社部新规与骑手招募成本' },
      ],
      ['网络效应 + 履约密度壁垒', '段永平：买公司就是买未来现金流'],
    ),
    base(
      '数字广告',
      '电梯/搜索/电商三类广告承压程度不同，分众的电梯广告在消费弱周期反而具备防御性。',
      ['002027.SZ', '09988.HK', 'GOOG'],
      '数字广告大盘随宏观波动，分众和谷歌搜索是结构性 winners。',
      [
        { name: '分众电梯媒体刊例价', signal: '分众季报与媒体投放跟踪', threshold: '若刊例同比增长 15%+ 则广告主预算回流确认' },
        { name: '谷歌搜索广告同比', signal: 'Alphabet 季报', threshold: '若 AI Overview 后搜索广告仍能保持双位数增长则护城河稳固' },
      ],
      [
        { desc: 'AI 搜索可能侵蚀传统搜索广告收入', sev: 4, action: '观察 Gemini 商业化变现节奏' },
      ],
      ['电梯广告强制曝光特性', '搜索广告高 ROI 黏性'],
    ),
    base(
      '保险科技',
      'AI/数据驱动保险定价与理赔重塑财险/健康险中后台，Lemonade 是高赔率试探仓代表。',
      ['LMND'],
      'Lemonade 损失率走势是核心，技术领先 + 客群年轻 + 牌照 50 州 = 高赔率长期期权。',
      [
        { name: 'Lemonade 净损失率', signal: 'Lemonade 季报', threshold: '若连续两季跌破 75% 则基础假设确认' },
        { name: '在险保费 (IFP) 同比', signal: '季报披露', threshold: '若年增速维持 25%+ 则成长逻辑稳固' },
      ],
      [
        { desc: '巨灾天气频发导致再保险成本上升', sev: 3, action: '跟踪再保协议与巨灾事件' },
      ],
      ['AI 理赔效率 + 年轻客群高终身价值', '王煜全：技术领先 + 市场空间 + 护城河'],
    ),
    base(
      '黄金/比特币货币替代',
      '美元信用周期下行，黄金与 BTC 作为储备替代物的需求结构性提升。',
      ['159934.SZ'],
      '黄金和 BTC 受益于全球央行多元化储备与债务货币化，长期持有，逢深度回调加。',
      [
        { name: '全球央行黄金储备净增持', signal: 'WGC 季度报告', threshold: '若年净增持长期维持 1000 吨+ 则储备替代逻辑确认' },
        { name: '美国实际利率 (10Y TIPS)', signal: 'FRED', threshold: '若实际利率长期低于 1.5% 则黄金估值锚下移' },
      ],
      [
        { desc: '美联储重启加息周期导致实际利率走高', sev: 3, action: '减仓黄金 ETF 至底仓' },
      ],
      ['全球央行储备多元化趋势', 'BTC ETF 通过后机构资金持续流入'],
    ),
  ]
}

/* ────────── persistence ────────── */
function loadThemes(): Theme[] {
  try {
    const raw = localStorage.getItem(LS_THEMES)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch (e) { console.warn('themes load failed', e) }
  const seed = buildDefaultThemes()
  localStorage.setItem(LS_THEMES, JSON.stringify(seed))
  return seed
}

function saveThemes(themes: Theme[]) {
  localStorage.setItem(LS_THEMES, JSON.stringify(themes))
}

/* ────────── public hook for App.tsx ────────── */
export function useThemes() {
  const [themes, setThemes] = useState<Theme[]>(() => loadThemes())
  useEffect(() => { saveThemes(themes) }, [themes])

  const activeThemes = useMemo(() => themes.filter(t => t.status === 'active'), [themes])

  return { themes, setThemes, activeThemes }
}

/* ────────── 主题列表 + 详情容器 ────────── */
interface ThemesTabProps {
  themes: Theme[]
  setThemes: React.Dispatch<React.SetStateAction<Theme[]>>
  showToast: (msg: string) => void
  symbolNameMap: Record<string, string>
}

export function ThemesTab(props: ThemesTabProps) {
  const { themes, setThemes, showToast, symbolNameMap } = props
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showAddTheme, setShowAddTheme] = useState(false)
  const [newTheme, setNewTheme] = useState({ name: '', description: '' })

  const selected = themes.find(t => t.id === selectedId) || null

  const updateTheme = (id: string, patch: Partial<Theme>) => {
    setThemes(prev => prev.map(t => t.id === id ? { ...t, ...patch, lastUpdated: today() } : t))
  }

  const handleAddTheme = () => {
    if (!newTheme.name.trim()) { showToast('请填写主题名称'); return }
    const t: Theme = {
      id: genId(),
      name: newTheme.name.trim(),
      description: newTheme.description.trim(),
      relatedHoldings: [],
      keyVariables: [],
      currentJudgment: '',
      supportingEvidence: [],
      counterEvidence: [],
      diary: [],
      lastUpdated: today(),
      status: 'active',
    }
    setThemes(prev => [t, ...prev])
    setNewTheme({ name: '', description: '' })
    setShowAddTheme(false)
    showToast('主题已创建')
  }

  const handleDeleteTheme = (id: string) => {
    if (!confirm('确认删除此主题？')) return
    setThemes(prev => prev.filter(t => t.id !== id))
    if (selectedId === id) setSelectedId(null)
    showToast('已删除')
  }

  if (selected) {
    return (
      <ThemeDetail
        theme={selected}
        onBack={() => setSelectedId(null)}
        onUpdate={(patch) => updateTheme(selected.id, patch)}
        showToast={showToast}
        symbolNameMap={symbolNameMap}
      />
    )
  }

  return (
    <div>
      <div className="section-header">
        <h2>产业主题列表（共 {themes.length} 个）</h2>
        <button className="primary" onClick={() => setShowAddTheme(true)}>+ 新增主题</button>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 12,
      }}>
        {themes.map(t => {
          const watchingCount = t.counterEvidence.filter(c => c.status === 'watching').length
          const highSeverity = t.counterEvidence.some(c => c.status === 'watching' && c.severity >= 4)
          return (
            <div key={t.id} className="card" style={{ cursor: 'pointer', position: 'relative' }} onClick={() => setSelectedId(t.id)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <h3 style={{ fontSize: '.95rem', fontWeight: 600, color: 'var(--fg)' }}>{t.name}</h3>
                <span className={`badge ${t.status === 'active' ? 'badge-buy' : 'badge-sell'}`} style={{ flexShrink: 0 }}>
                  {t.status === 'active' ? '活跃' : t.status === 'paused' ? '暂停' : '关闭'}
                </span>
              </div>
              <p style={{ fontSize: '.78rem', color: 'var(--fg2)', marginTop: 6, minHeight: 36, lineHeight: 1.5 }}>
                {t.description || '（无描述）'}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                {t.relatedHoldings.slice(0, 6).map(s => (
                  <span key={s} className="badge" style={{ background: 'var(--bg)', color: 'var(--fg2)', border: '1px solid var(--border)' }}>
                    {symbolNameMap[s] || s}
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, fontSize: '.72rem', color: 'var(--fg2)' }}>
                <span>更新: {t.lastUpdated}</span>
                <span style={{ color: highSeverity ? 'var(--down)' : 'var(--fg2)', fontWeight: highSeverity ? 600 : 400 }}>
                  反面证据: {watchingCount}{highSeverity ? ' ⚠' : ''}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {showAddTheme && (
        <div className="dialog-overlay" onClick={() => setShowAddTheme(false)}>
          <div className="dialog" onClick={e => e.stopPropagation()}>
            <h3>新增产业主题</h3>
            <div className="field">
              <label>主题名称</label>
              <input value={newTheme.name} onChange={e => setNewTheme({ ...newTheme, name: e.target.value })} placeholder="如 机器人量产" />
            </div>
            <div className="field">
              <label>描述</label>
              <textarea
                value={newTheme.description}
                onChange={e => setNewTheme({ ...newTheme, description: e.target.value })}
                placeholder="简要描述主题核心逻辑"
                style={{ width: '100%', minHeight: 80, padding: '6px 10px', fontSize: '.85rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--bg2)', color: 'var(--fg)', fontFamily: 'inherit' }}
              />
            </div>
            <div className="actions">
              <button onClick={() => setShowAddTheme(false)}>取消</button>
              <button className="primary" onClick={handleAddTheme}>创建</button>
            </div>
          </div>
        </div>
      )}

      {/* hidden delete handler triggered from detail page */}
      <DeleteThemeProxy onDelete={handleDeleteTheme} />
    </div>
  )
}

/* placeholder element so detail page can fire delete */
function DeleteThemeProxy(_: { onDelete: (id: string) => void }) { return null }

/* ────────── 主题详情页 ────────── */
interface ThemeDetailProps {
  theme: Theme
  onBack: () => void
  onUpdate: (patch: Partial<Theme>) => void
  showToast: (msg: string) => void
  symbolNameMap: Record<string, string>
}

function ThemeDetail({ theme, onBack, onUpdate, showToast, symbolNameMap }: ThemeDetailProps) {
  const [judgment, setJudgment] = useState(theme.currentJudgment)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<string | null>(null)
  const [showVarModal, setShowVarModal] = useState(false)
  const [editVar, setEditVar] = useState<Variable | null>(null)
  const [obsVar, setObsVar] = useState<Variable | null>(null)
  const [obsValue, setObsValue] = useState('')
  const [obsNote, setObsNote] = useState('')
  const [showCounterModal, setShowCounterModal] = useState(false)
  const [editCounter, setEditCounter] = useState<CounterEvidence | null>(null)
  const [newDiary, setNewDiary] = useState({ content: '', type: 'observation' as DiaryEntry['type'] })
  const [newSupport, setNewSupport] = useState('')
  const [newHolding, setNewHolding] = useState('')

  useEffect(() => { setJudgment(theme.currentJudgment) }, [theme.id, theme.currentJudgment])

  const handleSaveJudgment = () => {
    onUpdate({ currentJudgment: judgment })
    showToast('判断已保存')
  }

  const handleAddVariable = (v: Variable) => {
    const existing = theme.keyVariables.find(x => x.id === v.id)
    if (existing) {
      onUpdate({ keyVariables: theme.keyVariables.map(x => x.id === v.id ? v : x) })
    } else {
      onUpdate({ keyVariables: [...theme.keyVariables, v] })
    }
  }

  const handleDeleteVariable = (id: string) => {
    if (!confirm('删除此关键变量？')) return
    onUpdate({ keyVariables: theme.keyVariables.filter(v => v.id !== id) })
  }

  const handleRecordObs = () => {
    if (!obsVar || !obsValue.trim()) { showToast('请输入观测值'); return }
    const updated: Variable = {
      ...obsVar,
      currentValue: obsValue,
      history: [...obsVar.history, { date: today(), value: obsValue, note: obsNote || undefined }],
    }
    onUpdate({ keyVariables: theme.keyVariables.map(v => v.id === obsVar.id ? updated : v) })
    setObsVar(null)
    setObsValue('')
    setObsNote('')
    showToast('观测值已记录')
  }

  const handleAddCounter = (c: CounterEvidence) => {
    const existing = theme.counterEvidence.find(x => x.id === c.id)
    if (existing) {
      onUpdate({ counterEvidence: theme.counterEvidence.map(x => x.id === c.id ? c : x) })
    } else {
      onUpdate({ counterEvidence: [...theme.counterEvidence, c] })
    }
  }

  const handleDeleteCounter = (id: string) => {
    if (theme.counterEvidence.filter(c => c.status !== 'rejected').length <= 1) {
      showToast('反面证据至少保留 1 条（可改为 rejected 而不是删除）')
      return
    }
    if (!confirm('删除此反面证据？')) return
    onUpdate({ counterEvidence: theme.counterEvidence.filter(c => c.id !== id) })
  }

  const handleAddSupport = () => {
    const v = newSupport.trim()
    if (!v) return
    onUpdate({ supportingEvidence: [...theme.supportingEvidence, v] })
    setNewSupport('')
  }

  const handleDeleteSupport = (idx: number) => {
    onUpdate({ supportingEvidence: theme.supportingEvidence.filter((_, i) => i !== idx) })
  }

  const handleAddHolding = () => {
    const v = newHolding.trim().toUpperCase()
    if (!v || theme.relatedHoldings.includes(v)) return
    onUpdate({ relatedHoldings: [...theme.relatedHoldings, v] })
    setNewHolding('')
  }

  const handleDeleteHolding = (s: string) => {
    onUpdate({ relatedHoldings: theme.relatedHoldings.filter(x => x !== s) })
  }

  const handleAddDiary = () => {
    if (!newDiary.content.trim()) return
    const entry: DiaryEntry = {
      id: genId(),
      date: today(),
      content: newDiary.content.trim(),
      type: newDiary.type,
    }
    onUpdate({ diary: [entry, ...theme.diary] })
    setNewDiary({ content: '', type: 'observation' })
    showToast('日记已添加')
  }

  const handleDeleteDiary = (id: string) => {
    if (!confirm('删除此日记条目？')) return
    onUpdate({ diary: theme.diary.filter(d => d.id !== id) })
  }

  const handleAcceptAi = () => {
    if (!aiResult) return
    const entry: DiaryEntry = {
      id: genId(),
      date: today(),
      content: '【AI 分析归档】\n' + aiResult,
      type: 'ai',
    }
    onUpdate({ diary: [entry, ...theme.diary] })
    setAiResult(null)
    showToast('AI 分析已存入日记')
  }

  /* ────── AI 分析（P1） ────── */
  const handleAiAnalyze = async () => {
    if (aiLoading) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const apiKey = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_ANTHROPIC_API_KEY) || ''
    if (!apiKey) {
      showToast('未配置 VITE_ANTHROPIC_API_KEY，无法调用 AI')
      return
    }
    setAiLoading(true)
    setAiResult(null)
    try {
      const systemPrompt = `你是产业研究助手。基于以下主题信息给出深度分析。

主题：${theme.name}
描述：${theme.description}
当前判断：${theme.currentJudgment || '（未填）'}
关联持仓：${theme.relatedHoldings.join(', ') || '（无）'}
关键变量：
${theme.keyVariables.map(v => `- ${v.name} | 信号: ${v.observationSignal} | 当前值: ${v.currentValue || '–'} | 阈值: ${v.threshold}`).join('\n') || '（无）'}
支持论据：
${theme.supportingEvidence.map((s, i) => `${i + 1}. ${s}`).join('\n') || '（无）'}
反面证据：
${theme.counterEvidence.map(c => `- [严重度${c.severity}/${c.status}] ${c.description} → 触发动作: ${c.triggerAction}`).join('\n') || '（无）'}

请按以下格式输出（使用 Markdown 标题分段）：
## 1. 主题成立度（1-5分）
评分及理由
## 2. 关键变量变化趋势分析
逐条点评
## 3. 反面证据严重等级评估
逐条点评，是否需要升级到 confirmed
## 4. 三框架交叉判断
- 巴菲特价值视角：
- 王煜全菱形四维：
- 王川八教训：
## 5. 给Arthur的具体建议
（持有 / 加仓 / 减仓 / 暂时观望 / 退出 之一并给出操作思路）
## 6. 接下来3个月需要重点关注的观测信号
列出具体的可量化指标`

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
          messages: [{ role: 'user', content: `请按上述结构对"${theme.name}"主题进行分析。` }],
        }),
      })
      if (!res.ok) {
        const errText = await res.text()
        throw new Error(`API ${res.status}: ${errText}`)
      }
      const data = await res.json()
      const text = data.content?.[0]?.text || '（无回复）'
      setAiResult(text)
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : '未知错误'
      setAiResult(`AI 分析失败: ${errMsg}`)
    } finally {
      setAiLoading(false)
    }
  }

  const watchingCount = theme.counterEvidence.filter(c => c.status === 'watching').length

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button onClick={onBack}>← 返回主题列表</button>
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            value={theme.status}
            onChange={e => onUpdate({ status: e.target.value as Theme['status'] })}
          >
            <option value="active">活跃</option>
            <option value="paused">暂停</option>
            <option value="closed">关闭</option>
          </select>
          <button className="primary" disabled={aiLoading} onClick={handleAiAnalyze}>
            {aiLoading ? <><span className="spinner" /> AI 分析中...</> : '🧠 AI 分析此主题'}
          </button>
        </div>
      </div>

      {/* 主题元信息 */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <input
              value={theme.name}
              onChange={e => onUpdate({ name: e.target.value })}
              style={{ fontSize: '1.1rem', fontWeight: 600, width: '100%', border: 'none', background: 'transparent', color: 'var(--fg)', padding: 0 }}
            />
            <textarea
              value={theme.description}
              onChange={e => onUpdate({ description: e.target.value })}
              placeholder="主题描述..."
              style={{ width: '100%', marginTop: 6, minHeight: 50, fontSize: '.85rem', color: 'var(--fg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '6px 10px', background: 'var(--bg)', fontFamily: 'inherit', resize: 'vertical' }}
            />
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: '.78rem', color: 'var(--fg2)', marginBottom: 4 }}>关联持仓</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
            {theme.relatedHoldings.map(s => (
              <span key={s} className="badge" style={{ background: 'var(--bg)', color: 'var(--fg)', border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {symbolNameMap[s] ? `${symbolNameMap[s]} (${s})` : s}
                <button className="sm" style={{ padding: '0 4px', fontSize: '.7rem' }} onClick={() => handleDeleteHolding(s)}>×</button>
              </span>
            ))}
            <input
              value={newHolding}
              onChange={e => setNewHolding(e.target.value)}
              placeholder="加股票代码"
              style={{ width: 130, fontSize: '.78rem' }}
              onKeyDown={e => { if (e.key === 'Enter') handleAddHolding() }}
            />
            <button className="sm" onClick={handleAddHolding}>+</button>
          </div>
        </div>
      </div>

      {/* 当前判断 */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ fontSize: '.95rem', fontWeight: 600 }}>当前判断</h3>
          <button className="sm primary" onClick={handleSaveJudgment}>保存</button>
        </div>
        <textarea
          value={judgment}
          onChange={e => setJudgment(e.target.value)}
          placeholder="对这个主题当前的核心判断，建议 100-300 字..."
          style={{ width: '100%', minHeight: 90, padding: '8px 10px', fontSize: '.88rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--bg)', color: 'var(--fg)', fontFamily: 'inherit', lineHeight: 1.6, resize: 'vertical' }}
        />
      </div>

      {/* 关键变量 */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-header" style={{ marginBottom: 8 }}>
          <h3 style={{ fontSize: '.95rem', fontWeight: 600 }}>关键变量（{theme.keyVariables.length}）</h3>
          <button className="sm primary" onClick={() => { setEditVar(null); setShowVarModal(true) }}>+ 新增变量</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>变量</th>
                <th>观测信号</th>
                <th>当前值</th>
                <th>阈值</th>
                <th>历史</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {theme.keyVariables.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 16, color: 'var(--fg2)' }}>尚未设置关键变量</td></tr>
              )}
              {theme.keyVariables.map(v => {
                const numericHist = v.history
                  .map(h => ({ date: h.date.slice(5), value: parseFloat(h.value) }))
                  .filter(h => !isNaN(h.value))
                return (
                  <tr key={v.id}>
                    <td style={{ fontWeight: 500 }}>{v.name}</td>
                    <td style={{ fontSize: '.78rem', color: 'var(--fg2)' }}>{v.observationSignal}</td>
                    <td>{v.currentValue || '–'}</td>
                    <td style={{ fontSize: '.78rem', color: 'var(--fg2)' }}>{v.threshold}</td>
                    <td style={{ minWidth: 150 }}>
                      {numericHist.length >= 2 ? (
                        <div style={{ width: 140, height: 32 }}>
                          <ResponsiveContainer>
                            <LineChart data={numericHist}>
                              <Line type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={1.5} dot={false} />
                              <XAxis dataKey="date" hide />
                              <YAxis hide domain={['auto', 'auto']} />
                              <Tooltip />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <span style={{ fontSize: '.75rem', color: 'var(--fg2)' }}>{v.history.length} 条记录</span>
                      )}
                    </td>
                    <td className="r" style={{ whiteSpace: 'nowrap' }}>
                      <button className="sm" onClick={() => { setObsVar(v); setObsValue(''); setObsNote('') }}>记录</button>{' '}
                      <button className="sm" onClick={() => { setEditVar(v); setShowVarModal(true) }}>编辑</button>{' '}
                      <button className="sm danger" onClick={() => handleDeleteVariable(v.id)}>删</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 支持论据 + 反面证据 双栏 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div className="card">
          <h3 style={{ fontSize: '.95rem', fontWeight: 600, marginBottom: 8, color: 'var(--up)' }}>✓ 支持论据</h3>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            <input
              value={newSupport}
              onChange={e => setNewSupport(e.target.value)}
              placeholder="新增一条支持论据"
              style={{ flex: 1 }}
              onKeyDown={e => { if (e.key === 'Enter') handleAddSupport() }}
            />
            <button className="sm primary" onClick={handleAddSupport}>+</button>
          </div>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {theme.supportingEvidence.length === 0 && (
              <li style={{ fontSize: '.78rem', color: 'var(--fg2)' }}>（尚未填写）</li>
            )}
            {theme.supportingEvidence.map((s, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: '.85rem' }}>
                <span style={{ flex: 1 }}>{s}</span>
                <button className="sm danger" onClick={() => handleDeleteSupport(i)}>×</button>
              </li>
            ))}
          </ul>
        </div>

        <div className="card" style={{ borderColor: watchingCount === 0 ? 'var(--down)' : undefined }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h3 style={{ fontSize: '.95rem', fontWeight: 600, color: 'var(--down)' }}>⚠ 反面证据（强制 ≥1 条）</h3>
            <button className="sm primary" onClick={() => { setEditCounter(null); setShowCounterModal(true) }}>+ 新增</button>
          </div>
          {watchingCount === 0 && (
            <div style={{ fontSize: '.78rem', color: 'var(--down)', marginBottom: 8 }}>
              ⚠ 当前没有 watching 状态的反面证据，请补充至少 1 条
            </div>
          )}
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {theme.counterEvidence.length === 0 && (
              <li style={{ fontSize: '.78rem', color: 'var(--down)' }}>（必须补充至少 1 条反面证据）</li>
            )}
            {theme.counterEvidence.map(c => (
              <li key={c.id} style={{ padding: 8, marginBottom: 6, border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--bg)', fontSize: '.82rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                  <span>
                    <span style={{ display: 'inline-block', padding: '0 6px', borderRadius: 4, fontSize: '.7rem', background: c.severity >= 4 ? 'var(--down)' : 'var(--warn)', color: '#fff', marginRight: 6 }}>
                      Sev {c.severity}
                    </span>
                    <span className="badge" style={{ background: c.status === 'confirmed' ? '#fef2f2' : c.status === 'rejected' ? '#f0fdf4' : 'var(--bg2)', color: c.status === 'confirmed' ? '#dc2626' : c.status === 'rejected' ? '#16a34a' : 'var(--fg2)', border: '1px solid var(--border)' }}>
                      {c.status}
                    </span>
                  </span>
                  <span>
                    <button className="sm" onClick={() => { setEditCounter(c); setShowCounterModal(true) }}>编辑</button>{' '}
                    <button className="sm danger" onClick={() => handleDeleteCounter(c.id)}>×</button>
                  </span>
                </div>
                <div>{c.description}</div>
                {c.triggerAction && (
                  <div style={{ marginTop: 4, fontSize: '.75rem', color: 'var(--fg2)' }}>触发动作: {c.triggerAction}</div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* AI 分析结果 */}
      {aiResult && (
        <div className="card" style={{ marginBottom: 16, borderColor: 'var(--accent)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h3 style={{ fontSize: '.95rem', fontWeight: 600, color: 'var(--accent)' }}>🧠 AI 分析结果</h3>
            <span>
              <button className="sm" onClick={() => setAiResult(null)}>关闭</button>{' '}
              <button className="sm primary" onClick={handleAcceptAi}>接受到日记</button>
            </span>
          </div>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '.85rem', lineHeight: 1.6, fontFamily: 'inherit', background: 'var(--bg)', padding: 12, borderRadius: 'var(--radius)', maxHeight: 480, overflowY: 'auto' }}>
            {aiResult}
          </pre>
        </div>
      )}

      {/* 日记 */}
      <div className="card">
        <h3 style={{ fontSize: '.95rem', fontWeight: 600, marginBottom: 8 }}>主题日记（{theme.diary.length} 条）</h3>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <select value={newDiary.type} onChange={e => setNewDiary({ ...newDiary, type: e.target.value as DiaryEntry['type'] })} style={{ width: 120 }}>
            <option value="observation">观察</option>
            <option value="add">加仓</option>
            <option value="reduce">减仓</option>
            <option value="reflection">反思</option>
            <option value="counter">反面证据</option>
            <option value="ai">AI 分析</option>
          </select>
          <input value={newDiary.content} onChange={e => setNewDiary({ ...newDiary, content: e.target.value })} placeholder="写一条主题日记..." style={{ flex: 1 }} />
          <button className="sm primary" onClick={handleAddDiary}>+</button>
        </div>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {theme.diary.length === 0 && (
            <li style={{ fontSize: '.78rem', color: 'var(--fg2)' }}>（暂无日记）</li>
          )}
          {theme.diary.map(d => (
            <li key={d.id} style={{ padding: 8, marginBottom: 6, border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--bg)', fontSize: '.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3, fontSize: '.75rem', color: 'var(--fg2)' }}>
                <span>
                  <span className="badge" style={{ background: 'var(--accent)', color: '#fff', marginRight: 6 }}>{diaryTypeLabel(d.type)}</span>
                  {d.date}
                </span>
                <button className="sm danger" onClick={() => handleDeleteDiary(d.id)}>×</button>
              </div>
              <div style={{ whiteSpace: 'pre-wrap' }}>{d.content}</div>
            </li>
          ))}
        </ul>
      </div>

      {/* 变量编辑 Modal */}
      {showVarModal && (
        <VariableModal
          initial={editVar}
          onClose={() => { setShowVarModal(false); setEditVar(null) }}
          onSave={(v) => { handleAddVariable(v); setShowVarModal(false); setEditVar(null) }}
        />
      )}

      {/* 观测值记录 Modal */}
      {obsVar && (
        <div className="dialog-overlay" onClick={() => setObsVar(null)}>
          <div className="dialog" onClick={e => e.stopPropagation()}>
            <h3>记录观测值 — {obsVar.name}</h3>
            <p style={{ fontSize: '.78rem', color: 'var(--fg2)', marginBottom: 8 }}>信号: {obsVar.observationSignal}</p>
            <div className="field">
              <label>本次观测值</label>
              <input value={obsValue} onChange={e => setObsValue(e.target.value)} placeholder="如 4.2亿 / 1.85% / 2350" />
            </div>
            <div className="field">
              <label>备注（可选）</label>
              <input value={obsNote} onChange={e => setObsNote(e.target.value)} placeholder="数据来源或观察心得" />
            </div>
            <div className="actions">
              <button onClick={() => setObsVar(null)}>取消</button>
              <button className="primary" onClick={handleRecordObs}>记录</button>
            </div>
          </div>
        </div>
      )}

      {/* 反面证据编辑 Modal */}
      {showCounterModal && (
        <CounterModal
          initial={editCounter}
          onClose={() => { setShowCounterModal(false); setEditCounter(null) }}
          onSave={(c) => { handleAddCounter(c); setShowCounterModal(false); setEditCounter(null) }}
        />
      )}
    </div>
  )
}

function diaryTypeLabel(t: DiaryEntry['type']) {
  return ({ observation: '观察', add: '加仓', reduce: '减仓', reflection: '反思', counter: '反面', ai: 'AI' } as const)[t]
}

/* ────────── 变量编辑 Modal ────────── */
function VariableModal(props: { initial: Variable | null; onClose: () => void; onSave: (v: Variable) => void }) {
  const { initial, onClose, onSave } = props
  const [form, setForm] = useState({
    name: initial?.name || '',
    observationSignal: initial?.observationSignal || '',
    currentValue: initial?.currentValue || '',
    threshold: initial?.threshold || '',
  })

  const submit = () => {
    if (!form.name.trim()) return
    const v: Variable = {
      id: initial?.id || genId(),
      name: form.name.trim(),
      observationSignal: form.observationSignal.trim(),
      currentValue: form.currentValue.trim(),
      threshold: form.threshold.trim(),
      history: initial?.history || [],
    }
    onSave(v)
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={e => e.stopPropagation()}>
        <h3>{initial ? '编辑' : '新增'}关键变量</h3>
        <div className="field">
          <label>变量名</label>
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="如 ChatGPT 月活跃用户" />
        </div>
        <div className="field">
          <label>观测信号（数据来源）</label>
          <input value={form.observationSignal} onChange={e => setForm({ ...form, observationSignal: e.target.value })} placeholder="如 OpenAI 官方披露 / SimilarWeb" />
        </div>
        <div className="row">
          <div className="field">
            <label>当前值</label>
            <input value={form.currentValue} onChange={e => setForm({ ...form, currentValue: e.target.value })} placeholder="如 4亿" />
          </div>
          <div className="field">
            <label>阈值（触发判断改变）</label>
            <input value={form.threshold} onChange={e => setForm({ ...form, threshold: e.target.value })} placeholder="如 突破 5 亿" />
          </div>
        </div>
        <div className="actions">
          <button onClick={onClose}>取消</button>
          <button className="primary" onClick={submit}>保存</button>
        </div>
      </div>
    </div>
  )
}

/* ────────── 反面证据编辑 Modal ────────── */
function CounterModal(props: { initial: CounterEvidence | null; onClose: () => void; onSave: (c: CounterEvidence) => void }) {
  const { initial, onClose, onSave } = props
  const [form, setForm] = useState({
    description: initial?.description || '',
    severity: (initial?.severity || 3) as 1 | 2 | 3 | 4 | 5,
    status: (initial?.status || 'watching') as CounterEvidence['status'],
    triggerAction: initial?.triggerAction || '',
  })

  const submit = () => {
    if (!form.description.trim()) return
    onSave({
      id: initial?.id || genId(),
      description: form.description.trim(),
      severity: form.severity,
      status: form.status,
      triggerAction: form.triggerAction.trim(),
    })
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={e => e.stopPropagation()}>
        <h3>{initial ? '编辑' : '新增'}反面证据</h3>
        <div className="field">
          <label>描述</label>
          <textarea
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="若 X 发生，则主题逻辑被破坏"
            style={{ width: '100%', minHeight: 70, padding: '6px 10px', fontSize: '.85rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--bg2)', color: 'var(--fg)', fontFamily: 'inherit', resize: 'vertical' }}
          />
        </div>
        <div className="row">
          <div className="field">
            <label>严重等级 (1-5)</label>
            <select value={form.severity} onChange={e => setForm({ ...form, severity: parseInt(e.target.value) as 1 | 2 | 3 | 4 | 5 })}>
              <option value={1}>1 - 轻微</option>
              <option value={2}>2 - 关注</option>
              <option value={3}>3 - 警告</option>
              <option value={4}>4 - 严重</option>
              <option value={5}>5 - 致命</option>
            </select>
          </div>
          <div className="field">
            <label>状态</label>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as CounterEvidence['status'] })}>
              <option value="watching">watching - 观察中</option>
              <option value="confirmed">confirmed - 已确认</option>
              <option value="rejected">rejected - 已排除</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label>触发动作</label>
          <input value={form.triggerAction} onChange={e => setForm({ ...form, triggerAction: e.target.value })} placeholder="如 减仓至底仓 / 退出主题" />
        </div>
        <div className="actions">
          <button onClick={onClose}>取消</button>
          <button className="primary" onClick={submit}>保存</button>
        </div>
      </div>
    </div>
  )
}
