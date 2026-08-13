/**
 * 交易日历工具
 * 自动计算最近一个交易日的日期（跳过周末 + 法定节假日）
 *
 * 数据来源：沪深北交易所2026年部分节假日休市安排通知
 * https://www.cs.com.cn/xwzx/hg/202512/t20251223_6529603.html
 *
 * ⚠️ 每年底交易所发布次年安排后，需更新 HOLIDAYS 字典
 */

// ==================== 节假日配置 ====================

/**
 * A股休市日（含法定节假日内的周末，完整覆盖）
 * 格式："MM-DD"，年份由 HOLIDAY_YEARS 映射
 *
 * 2026年休市安排（沪深北交易所公告）：
 * - 元旦: 1/1(四) - 1/3(六)，1/4(日)周末休市
 * - 春节: 2/15(日) - 2/23(一)，2/14(六) 2/28(六)周末休市
 * - 清明: 4/4(六) - 4/6(一)
 * - 劳动节: 5/1(五) - 5/5(二)，5/9(六)周末休市
 * - 端午: 6/19(五) - 6/21(日)
 * - 中秋: 9/25(五) - 9/27(日)
 * - 国庆: 10/1(四) - 10/7(三)，9/20(日) 10/10(六)周末休市
 */
const HOLIDAYS_2026 = new Set([
  // 元旦
  '01-01', '01-02', '01-03', '01-04',
  // 春节（含前后周末）
  '02-14', '02-15', '02-16', '02-17', '02-18', '02-19', '02-20', '02-21', '02-22', '02-23', '02-28',
  // 清明
  '04-04', '04-05', '04-06',
  // 劳动节（含后续周末）
  '05-01', '05-02', '05-03', '05-04', '05-05', '05-09',
  // 端午
  '06-19', '06-20', '06-21',
  // 中秋
  '09-25', '09-26', '09-27',
  // 国庆（含前后周末）
  '09-20', '10-01', '10-02', '10-03', '10-04', '10-05', '10-06', '10-07', '10-10',
])

/** 按年份映射节假日集合，方便扩展 */
const HOLIDAY_YEARS = {
  2026: HOLIDAYS_2026,
}

// ==================== 基础工具 ====================

/** 获取当前北京时间（UTC+8）的日期信息 */
function now() {
  const d = new Date()
  const beijing = new Date(d.getTime() + 8 * 3600 * 1000)
  return {
    year: beijing.getUTCFullYear(),
    month: beijing.getUTCMonth() + 1,
    day: beijing.getUTCDate(),
    hour: beijing.getUTCHours(),
    minute: beijing.getUTCMinutes(),
    dow: beijing.getUTCDay() // 0=周日, 1=周一, ..., 6=周六
  }
}

/** 格式化 "MM-DD" */
function mdKey(month, day) {
  return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** 判断是否周末 */
function isWeekend(dow) {
  return dow === 0 || dow === 6
}

/** 判断指定日期是否为法定节假日休市 */
function isHoliday(year, month, day) {
  const holidaySet = HOLIDAY_YEARS[year]
  if (!holidaySet) return false // 未配置的年份，仅按周末判断
  return holidaySet.has(mdKey(month, day))
}

/** 判断指定日期是否为交易日（非周末且非节假日） */
function isTradingDay(year, month, day) {
  const dow = new Date(year, month - 1, day).getDay()
  if (isWeekend(dow)) return false
  if (isHoliday(year, month, day)) return false
  return true
}

// ==================== 交易时段判断 ====================

/**
 * 当前市场阶段
 * @returns {'交易中' | '午间休市' | '收盘' | '休市'}
 */
export function marketPhase() {
  const t = now()

  // 非交易日
  if (!isTradingDay(t.year, t.month, t.day)) return '休市'

  const mins = t.hour * 60 + t.minute
  const morningStart = 9 * 60 + 30   // 9:30
  const morningEnd = 11 * 60 + 30     // 11:30
  const afternoonStart = 13 * 60      // 13:00
  const afternoonEnd = 15 * 60        // 15:00

  if (mins >= morningStart && mins < morningEnd) return '交易中'
  if (mins >= morningEnd && mins < afternoonStart) return '午间休市'
  if (mins >= afternoonStart && mins < afternoonEnd) return '交易中'
  return '收盘'
}

/** 是否在交易时段内（含上午 + 下午连续竞价） */
export function isTradingHours() {
  return marketPhase() === '交易中'
}

// ==================== 交易日计算 ====================

/**
 * 计算最近一个交易日
 * 规则：
 *   - 交易日 15:00 前 → 当天（盘中）
 *   - 交易日 15:00 后 → 当天（已收盘）
 *   - 非交易日 → 往前找最近一个交易日
 */
function prevTradingDay() {
  const t = now()
  let m = t.month
  let d = t.day

  // 如果今天不是交易日，往前找
  if (!isTradingDay(t.year, t.month, t.day)) {
    const date = new Date(t.year, t.month - 1, t.day)
    do {
      date.setDate(date.getDate() - 1)
      m = date.getMonth() + 1
      d = date.getDate()
    } while (!isTradingDay(t.year, m, d))
  }

  return { m, d }
}

/**
 * 当前交易日的日期标签
 * - 交易日 → 当天日期
 * - 非交易日 → 最近一个交易日
 */
function currentTradingDayLabel() {
  const { m, d } = prevTradingDay()
  return `${m}月${d}日`
}

// ==================== 导出 ====================

/** 返回 "X月Y日" 格式的最近交易日标签（用于收盘后展示） */
export function prevCloseLabel() {
  return currentTradingDayLabel()
}

/** 返回 "X/Y" 格式的最近交易日标签 */
export function prevCloseSlashLabel() {
  const { m, d } = prevTradingDay()
  return `${m}/${d}`
}

/**
 * 返回当前展示用的日期 + 状态后缀
 * - 交易中 → "8月10日盘中"
 * - 午间休市 → "8月10日午间休市"
 * - 收盘 → "8月10日收盘"
 * - 休市 → "8月7日收盘"（最近交易日）
 */
export function dateStatusLabel() {
  const phase = marketPhase()
  const label = currentTradingDayLabel()
  if (phase === '交易中') return `${label}盘中`
  if (phase === '午间休市') return `${label}午间休市`
  if (phase === '收盘') return `${label}收盘`
  return `${label}收盘` // 休市时显示最近交易日的收盘
}

/** 今日日期标签 "X月Y日"（自然日，非交易日） */
export function todayLabel() {
  const t = now()
  return `${t.month}月${t.day}日`
}

export default {
  prevCloseLabel,
  prevCloseSlashLabel,
  dateStatusLabel,
  todayLabel,
  marketPhase,
  isTradingHours
}
