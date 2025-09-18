/**
 * 从文本中提取标签
 * 标签格式：#标签名 （以#开头，空格结尾）
 */
export function extractTags(text: string): string[] {
  if (!text) return []
  
  const tagRegex = /#([^\s]+)/g
  const tags: string[] = []
  let match
  
  while ((match = tagRegex.exec(text)) !== null) {
    const tag = match[1].trim()
    if (tag && !tags.includes(tag)) {
      tags.push(tag)
    }
  }
  
  return tags
}

/**
 * 从提醒事项中提取所有标签
 */
export function extractTagsFromReminder(title: string, notes?: string): string[] {
  const titleTags = extractTags(title)
  const notesTags = notes ? extractTags(notes) : []
  
  // 合并标签并去重
  const allTags = [...titleTags, ...notesTags]
  return Array.from(new Set(allTags))
}

/**
 * 一次性计算所有标签统计数据
 * 返回包含标签计数、完成率和完成统计的对象
 */
export function calculateAllTagStatistics(reminders: any[]): {
  tagCounts: Record<string, number>;
  tagCompletionRates: Record<string, number>;
  tagCompletionStats: Record<string, { total: number; completed: number }>;
} {
  const tagStats: Record<string, { total: number; completed: number }> = {}
  
  // 只遍历一次数据，收集所有统计信息
  reminders.forEach(reminder => {
    if (reminder.tags && Array.isArray(reminder.tags)) {
      reminder.tags.forEach((tag: string) => {
        if (!tagStats[tag]) {
          tagStats[tag] = { total: 0, completed: 0 }
        }
        tagStats[tag].total += 1
        if (reminder.completed) {
          tagStats[tag].completed += 1
        }
      })
    }
  })
  
  // 基于收集的数据计算所有需要的统计信息
  const tagCounts: Record<string, number> = {}
  const tagCompletionRates: Record<string, number> = {}
  
  Object.entries(tagStats).forEach(([tag, stats]) => {
    tagCounts[tag] = stats.total
    tagCompletionRates[tag] = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0
  })
  
  return {
    tagCounts,
    tagCompletionRates,
    tagCompletionStats: tagStats
  }
}

/**
 * 统计标签在提醒事项列表中的出现次数
 * @deprecated 使用 calculateAllTagStatistics 替代
 */
export function countTagsInReminders(reminders: any[]): Record<string, number> {
  return calculateAllTagStatistics(reminders).tagCounts
}

/**
 * 计算标签的完成率
 * @deprecated 使用 calculateAllTagStatistics 替代
 */
export function calculateTagCompletionRates(reminders: any[]): Record<string, number> {
  return calculateAllTagStatistics(reminders).tagCompletionRates
}

/**
 * 获取标签的完成统计信息
 * @deprecated 使用 calculateAllTagStatistics 替代
 */
export function getTagCompletionStats(reminders: any[]): Record<string, { total: number; completed: number }> {
  return calculateAllTagStatistics(reminders).tagCompletionStats
} 