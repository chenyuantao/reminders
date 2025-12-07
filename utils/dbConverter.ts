import { Reminder } from '@/types/reminder'

/**
 * 数据库字段格式（snake_case）
 */
interface DatabaseReminder {
  id: string
  title: string
  notes?: string | null
  completed: boolean
  dueDate?: string | null
  priority?: 'low' | 'medium' | 'high' | null
  tags?: string | null;
  rank: number
  createdAt: string
  updatedAt: string
}

/**
 * 将 Reminder (camelCase) 转换为数据库格式 (snake_case)
 * 用于插入和更新操作
 */
export function toDatabaseFormat(reminder: Partial<Reminder>): Partial<DatabaseReminder> {
  const dbData: Partial<DatabaseReminder> = {}

  if (reminder.id !== undefined) dbData.id = reminder.id
  if (reminder.title !== undefined) dbData.title = reminder.title
  if (reminder.notes !== undefined) dbData.notes = reminder.notes || null
  if (reminder.completed !== undefined) dbData.completed = reminder.completed
  if (reminder.dueDate !== undefined) dbData.dueDate = reminder.dueDate || null
  if (reminder.priority !== undefined) dbData.priority = reminder.priority || null
  if (reminder.tags !== undefined) {
    // 如果 tags 是数组，转换为数组；如果是字符串，保持原样
    dbData.tags = reminder.tags ? reminder.tags.join(',') : null
  }
  if (reminder.rank !== undefined) dbData.rank = reminder.rank
  if (reminder.createdAt !== undefined) dbData.createdAt = reminder.createdAt
  if (reminder.updatedAt !== undefined) dbData.updatedAt = reminder.updatedAt

  return dbData
}

/**
 * 将数据库格式 (snake_case) 转换为 Reminder (camelCase)
 * 用于查询结果
 */
export function fromDatabaseFormat(dbData: any): Reminder {
  // 处理 tags：可能是数组、字符串或 null
  let tags: string[] = []
  if (dbData.tags) {
    tags = dbData.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean)
  }

  return {
    id: dbData.id,
    title: dbData.title,
    notes: dbData.notes || dbData.notes === null ? undefined : dbData.notes,
    completed: dbData.completed ?? false,
    dueDate: dbData.dueDate,
    priority: dbData.priority || undefined,
    tags,
    rank: dbData.rank ?? 0,
    createdAt: dbData.createdAt,
    updatedAt: dbData.updatedAt,
  }
}

