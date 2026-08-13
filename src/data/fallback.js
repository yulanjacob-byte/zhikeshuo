/**
 * 静态兜底数据
 * 当后端不可用时，前端使用这些数据展示
 */
import { fmtPrice, fmtPct, dirClass } from '../utils/format.js'

/** 兜底指数行情 */
const indices = [
  { code: 'sh000001', name: '上证指数', price: 3940.04, changePct: 1.02, prevClose: 3900.26 },
  { code: 'sz399001', name: '深证成指', price: 14311.01, changePct: 1.42, prevClose: 14113.65 },
  { code: 'sz399006', name: '创业板指', price: 3563.12, changePct: 1.35, prevClose: 3515.65 },
  { code: 'sh000300', name: '沪深300', price: 4694.44, changePct: 0.93, prevClose: 4651.02 },
  { code: 'sh000905', name: '中证500', price: 7980.12, changePct: 1.93, prevClose: 7829.45 },
  { code: 'sh000688', name: '科创50', price: 1620.33, changePct: 2.15, prevClose: 1586.30 }
].map(e => ({
  code: e.code,
  name: e.name,
  price: e.price,
  changePct: e.changePct,
  prevClose: e.prevClose,
  priceText: fmtPrice(e.price),
  pctText: fmtPct(e.changePct),
  dir: dirClass(e.changePct)
}))

/** 兜底领涨板块 */
const topSectors = [
  { name: 'CXO概念', changePct: 11.61 },
  { name: 'CRO概念', changePct: 11.13 },
  { name: '创新药', changePct: 7.41 },
  { name: 'BC电池', changePct: 6.11 },
  { name: '宽带提速', changePct: 5.32 },
  { name: 'TOPCon', changePct: 5.12 }
]

/** 兜底领跌板块 */
const bottomSectors = [
  { name: '生物育种', changePct: -1.5 },
  { name: '信息安全', changePct: -1.38 },
  { name: '生物燃料', changePct: -1.27 },
  { name: '黄河三角', changePct: -1.1 },
  { name: '猪肉', changePct: -1.09 },
  { name: '含GDR', changePct: -1.08 }
]

const turnover = '两市成交 2.66万亿'
const breadth = '上涨 2,856 家 / 下跌 2,536 家'

/** 兜底涨跌分布数据 */
const breadthData = {
  upCount: 2856,
  downCount: 2536,
  amountYi: 26600,
  limitUp: 74,
  limitDown: 4,
  volumeChange: { pct: 5.36, diffYi: 1356, label: '放量', pending: false }
}

/** 兜底今日话术 */
const dailyScriptTitle = '#{date}收盤行情 · 点击「刷新实时行情」获取最新数据'

/** 兜底场景话术 */
const scripts = [
  {
    title: '【浮亏安抚】科技基金深套客户的主动触达',
    scene: '适用：7月重仓科技/成长方向、浮亏较大的客户 · 建议电话沟通，今天务必主动联系',
    body: 'XX总，最近这段时间确实不好受，7月成长方向调整比较深，昨天半导体又跌了近6%，您的感受我完全理解。跟您说三个事实：第一，这次调整主要是前期涨幅过大后的估值消化，不是基金本身的逻辑变了；第二，昨天全市场七成个股是涨的，资金并没有离场，只是从高位往低位走；第三，历史上每一轮这种级别的调整，最后比的不是谁跑得快，而是谁的配置结构合理、拿得住。我建议这周内帮您做一次免费的组合体检——看看您每只基金跌的原因是市场因素还是产品因素，再决定是持有、调整还是分批修复。您看明天下午方便吗？'
  },
  {
    title: '【热点降温】客户想追核电/机器人热点',
    scene: '适用：看到核电涨停潮、AI应用连板，要求买入相关主题基金的客户 · 建议微信沟通',
    body: '您关注到核电这个方向，说明对市场很敏感。昨天核电确实强——国常会刚核准了4个核电项目、总投资超1700亿，是实打实的政策利好。不过有两点想提醒您：一是这类消息刺激型的上涨，历史上持续性往往不强，追在最热的时候，容易买在情绪高点；二是就算这个方向长期看好，也要看它在您整体资产中承担什么角色、占多大比例，而不是单点押注。如果您确实看好，我们可以讨论用小比例、分批的方式参与，把它放进组合里而不是孤注一掷，您看这样行吗？'
  },
  {
    title: '【定投提醒】下跌行情中的定投续投话术',
    scene: '适用：设置定投但近期亏损想暂停的客户 · 建议微信沟通',
    body: 'XX总，看到您这周的定投还没扣款，想跟您说两句。现在的位置，恰恰是定投性价比最高的时候——同样的钱能买到更多的份额，拉低平均成本。历史数据看，A股每轮调整后，坚持定投的账户恢复速度比一次性买入快30%-50%。当然，如果您有资金安排上的考虑，我们也可以调低金额或暂停一期，但建议不要完全停掉。您看怎么安排比较合适？'
  }
]

/** 兜底朋友圈文案 */
const moments = {
  title: '朋友圈文案',
  scene: '',
  body: `【昨日盘面】#{date}：沪指收3809.66点（-0.59%），创业板指-1.24%，科创50 -5.08%。但全市场超4000只个股上涨，占比七成——指数是绿的，账户却可能是红的。

怎么看？前期领涨的半导体在消化估值，资金转向核电（1700亿新项目核准）、机器人、光伏这些低位方向。7月的大跌之后，市场正在用自己的方式修复。

一句话：别被指数的绿色吓到，结构比点位重要。手里的组合拿的是什么、为什么拿，比今天涨没涨重要。

（个人市场观察，不构成投资建议）`
}

/** 合规提示 */
const compliance = [
  '生成内容发送前必须人工通读审核，数据引用须与当日真实行情一致',
  '朋友圈/群聊文案须标注"不构成投资建议"，不得承诺收益、不得夸大宣传',
  '所有话术均为沟通参考示例，对客使用须遵守所在机构合规要求'
]

/** 评分页合规提示 */
const scoreCompliance = [
  '评分结果仅为客户经营参考，不构成风险评估替代，适当性评估以机构正式流程为准',
  '所有话术均为沟通参考示例，不构成任何投资建议或产品推荐',
  '对客使用须遵守所在机构合规要求，做好投资者适当性管理'
]

/** 生成器页合规提示 */
const generatorCompliance = [
  '所有话术均为沟通参考示例，对客使用前须结合客户实际情况调整',
  '不得承诺收益、不得夸大宣传、不得隐瞒风险，成交前确认客户理解净值会波动',
  '生成内容发送前必须人工通读审核，做好投资者适当性管理',
  '不构成任何投资建议或产品推荐，一切销售行为以客户真实需求和风险承受能力为唯一出发点'
]

/** 免责声明 */
const disclaimer = '⚠️ 免责声明：本站内容由AI生成，仅供学习参考之用，不构成任何形式的投资建议、产品推荐或基金宣传推介。内容可能存在不准确、不完整或过时的情况。使用者应结合自身专业判断，独立做出决策，并对使用后果自行承担责任。开发者不对因使用本内容而产生的任何直接或间接损失承担责任。'

/** 页脚配置 */
const footer = {
  f2: '基金有风险，投资须谨慎',
  disclaimer
}

export {
  indices,
  topSectors,
  bottomSectors,
  turnover,
  breadth,
  breadthData,
  dailyScriptTitle,
  scripts,
  moments,
  compliance,
  scoreCompliance,
  generatorCompliance,
  footer,
  disclaimer
}
