import { Reminder } from '@/types/reminder'
import { FileStorageService } from './fileStorage'

export interface CreateReminderParams {
  id: string
  title: string
  notes?: string
  dueDate?: string
  tags?: string[]
  completed?: boolean
  rank: number
  createdAt: string
  updatedAt: string
  source?: string
}

export interface UpdateReminderParams {
  id: string
  updates: Partial<Reminder>
  currentReminder: Reminder
  source?: string
}

export interface DeleteReminderParams {
  id: string
  reminder: Reminder
  source?: string
}

export interface BatchMoveParams {
  reminderIds: string[]
  reminders: Reminder[]
  targetDate: Date
  source?: string
}

export interface BatchDeleteParams {
  reminderIds: string[]
  reminders: Reminder[]
  source?: string
}

export interface ReorderParams {
  reminders: Reminder[]
  newOrder: Reminder[]
  source?: string
}

export class MutationService {
  /**
   * 创建新的 Reminder
   */
  static createReminder(
    params: CreateReminderParams,
    currentReminders: Reminder[]
  ): Reminder[] {
    const newReminder: Reminder = {
      id: params.id,
      title: params.title,
      notes: params.notes,
      dueDate: params.dueDate,
      tags: params.tags || [],
      completed: params.completed ?? false,
      rank: params.rank,
      createdAt: params.createdAt,
      updatedAt: params.updatedAt
    }

    // 根据 rank 值插入到正确位置（按 rank 排序）
    const updatedReminders = [...currentReminders, newReminder]
    // 按 rank 排序，rank 越小越靠前
    updatedReminders.sort((a, b) => (a.rank || 0) - (b.rank || 0))

    // 保存数据
    FileStorageService.saveData(updatedReminders).catch(error => {
      console.error('保存数据失败:', error)
    })

    // 打印新增操作日志
    console.log('📝 [新增 Reminder]', {
      id: newReminder.id,
      title: newReminder.title,
      dueDate: newReminder.dueDate,
      tags: newReminder.tags,
      rank: newReminder.rank,
      source: params.source || 'createReminder'
    })

    return updatedReminders
  }

  /**
   * 更新 Reminder
   */
  static updateReminder(
    params: UpdateReminderParams,
    currentReminders: Reminder[]
  ): Reminder[] {
    const { id, updates, currentReminder } = params

    const updatedReminders = currentReminders.map(reminder =>
      reminder.id === id ? { ...reminder, ...updates } : reminder
    )

    // 保存数据
    FileStorageService.saveData(updatedReminders).catch(error => {
      console.error('保存数据失败:', error)
    })

    // 打印修改操作日志
    const changedFields: Record<string, { old: any, new: any }> = {}
    Object.keys(updates).forEach(key => {
      const typedKey = key as keyof Reminder
      if (updates[typedKey] !== undefined && updates[typedKey] !== currentReminder[typedKey]) {
        changedFields[key] = {
          old: currentReminder[typedKey],
          new: updates[typedKey]
        }
      }
    })

    if (Object.keys(changedFields).length > 0) {
      console.log('✏️ [修改 Reminder]', {
        id: currentReminder.id,
        title: currentReminder.title,
        changedFields,
        source: params.source || 'updateReminder'
      })
    }

    return updatedReminders
  }

  /**
   * 删除 Reminder
   */
  static deleteReminder(
    params: DeleteReminderParams,
    currentReminders: Reminder[]
  ): Reminder[] {
    const { id, reminder } = params

    const updatedReminders = currentReminders.filter(reminder => reminder.id !== id)

    // 保存数据
    FileStorageService.saveData(updatedReminders).catch(error => {
      console.error('保存数据失败:', error)
    })

    // 打印删除操作日志
    console.log('🗑️ [删除 Reminder]', {
      id: reminder.id,
      title: reminder.title,
      dueDate: reminder.dueDate,
      tags: reminder.tags,
      source: params.source || 'deleteReminder'
    })

    return updatedReminders
  }

  /**
   * 切换 Reminder 完成状态
   */
  static toggleReminder(
    id: string,
    currentReminders: Reminder[]
  ): Reminder[] {
    const reminder = currentReminders.find(r => r.id === id)
    if (!reminder) {
      return currentReminders
    }

    const updatedReminders = currentReminders.map(reminder =>
      reminder.id === id
        ? { ...reminder, completed: !reminder.completed, updatedAt: new Date().toISOString() }
        : reminder
    ).sort((a, b) => {
      // 已完成的排在最前面
      if (a.completed && !b.completed) return -1
      if (!a.completed && b.completed) return 1
      // 如果都是已完成，按更新时间排序（最新的在后面）
      if (a.completed && b.completed) {
        const aUpdatedAt = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
        const bUpdatedAt = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
        return aUpdatedAt - bUpdatedAt // 降序排列，最新的在后面
      }
      // 如果都是未完成，按 rank 排序（rank 越小越靠前）
      return (a.rank || 0) - (b.rank || 0)
    })

    // 保存数据
    FileStorageService.saveData(updatedReminders).catch(error => {
      console.error('保存数据失败:', error)
    })

    // 打印修改操作日志
    const newCompleted = !reminder.completed
    console.log('✏️ [修改 Reminder]', {
      id: reminder.id,
      title: reminder.title,
      action: 'toggleCompleted',
      oldValue: reminder.completed,
      newValue: newCompleted,
      source: 'toggleReminder'
    })

    return updatedReminders
  }

  /**
   * 批量移动 Reminder
   */
  static batchMoveReminders(
    params: BatchMoveParams,
    currentReminders: Reminder[]
  ): Reminder[] {
    const { reminderIds, reminders, targetDate } = params
    const targetDateStr = targetDate.toISOString()

    // 先更新日期
    let updatedReminders = currentReminders.map(reminder =>
      reminderIds.includes(reminder.id)
        ? { ...reminder, dueDate: targetDateStr, updatedAt: new Date().toISOString() }
        : reminder
    )

    // 获取目标日期中已有的提醒事项（不包括正在移动的）
    const targetDateReminders = updatedReminders.filter(
      r => r.dueDate === targetDateStr && !reminderIds.includes(r.id)
    )

    // 按 rank 排序目标日期中已有的提醒事项
    targetDateReminders.sort((a, b) => (a.rank || 0) - (b.rank || 0))

    // 为移动的提醒事项重新计算 rank 值
    // 将它们添加到目标日期列表的末尾
    const movedReminders = updatedReminders.filter(r => reminderIds.includes(r.id))
    const rankChanges: Array<{ id: string, title: string, oldRank: number, newRank: number }> = []

    if (targetDateReminders.length === 0) {
      // 如果目标日期没有其他提醒事项，从 0 开始分配 rank
      movedReminders.forEach((reminder, index) => {
        const oldRank = reminder.rank || 0
        const newRank = index
        rankChanges.push({
          id: reminder.id,
          title: reminder.title,
          oldRank,
          newRank
        })
        reminder.rank = newRank
      })
    } else {
      // 如果目标日期已有提醒事项，将移动的事项添加到末尾
      const lastRank = targetDateReminders[targetDateReminders.length - 1].rank || 0
      movedReminders.forEach((reminder, index) => {
        const oldRank = reminder.rank || 0
        const newRank = lastRank + index + 1
        rankChanges.push({
          id: reminder.id,
          title: reminder.title,
          oldRank,
          newRank
        })
        reminder.rank = newRank
      })
    }

    // 更新 reminders 数组中的 rank 值
    updatedReminders = updatedReminders.map(reminder => {
      const movedReminder = movedReminders.find(r => r.id === reminder.id)
      if (movedReminder) {
        return movedReminder
      }
      return reminder
    })

    // 保存数据
    FileStorageService.saveData(updatedReminders).catch(error => {
      console.error('保存数据失败:', error)
    })

    // 打印批量修改操作日志
    if (reminders.length > 0) {
      console.log('✏️ [批量修改 Reminder]', {
        count: reminders.length,
        reminderIds: reminderIds,
        reminders: reminders.map(r => ({
          id: r.id,
          title: r.title,
          oldDueDate: r.dueDate,
          newDueDate: targetDateStr
        })),
        rankChanges: rankChanges,
        targetDate: targetDateStr,
        source: params.source || 'handleBatchMove'
      })
    }

    return updatedReminders
  }

  /**
   * 批量删除 Reminder
   */
  static batchDeleteReminders(
    params: BatchDeleteParams,
    currentReminders: Reminder[]
  ): Reminder[] {
    const { reminderIds, reminders } = params

    const updatedReminders = currentReminders.filter(reminder => !reminderIds.includes(reminder.id))

    // 保存数据
    FileStorageService.saveData(updatedReminders).catch(error => {
      console.error('保存数据失败:', error)
    })

    // 打印批量删除操作日志
    if (reminders.length > 0) {
      console.log('🗑️ [批量删除 Reminder]', {
        count: reminders.length,
        reminderIds: reminderIds,
        reminders: reminders.map(r => ({
          id: r.id,
          title: r.title,
          dueDate: r.dueDate,
          tags: r.tags
        })),
        source: params.source || 'handleBatchDelete'
      })
    }

    return updatedReminders
  }

  /**
   * 重新排序 Reminder（更新 rank）
   * 只调整必要的 rank 值，尽量集中在有变化的项
   */
  static reorderReminders(
    params: ReorderParams,
    currentReminders: Reminder[]
  ): Reminder[] {
    const { reminders, newOrder } = params

    // 创建原始 reminders 的 ID 到 Reminder 的映射
    const reminderMap = new Map(reminders.map(r => [r.id, r]))

    // 创建 newOrder 中元素的 ID 集合
    const newOrderIds = new Set(newOrder.map(r => r.id))

    // 获取不在 newOrder 中的 reminders，保持它们的 rank 不变
    const otherReminders = reminders.filter(r => !newOrderIds.has(r.id))
    const otherRanks = new Set(otherReminders.map(r => r.rank || 0))

    // 计算 newOrder 中每个项应该有的 rank（基于它在 newOrder 中的位置）
    // 从 0 开始，跳过已被其他 reminders 占用的 rank 值
    const targetRankMap = new Map<string, number>()
    let nextRank = 0

    newOrder.forEach(reminder => {
      // 找到下一个可用的 rank 值（跳过已被占用的）
      while (otherRanks.has(nextRank)) {
        nextRank++
      }
      targetRankMap.set(reminder.id, nextRank)
      nextRank++
    })

    // 找出需要调整 rank 的项（当前 rank 与目标 rank 不同的项）
    const needsUpdate = new Set<string>()

    newOrder.forEach(reminder => {
      const original = reminderMap.get(reminder.id)
      const targetRank = targetRankMap.get(reminder.id)!
      const currentRank = original?.rank || 0

      if (currentRank !== targetRank) {
        needsUpdate.add(reminder.id)
      }
    })

    // 构建 rank 更新映射，只更新有变化的项
    const rankUpdateMap = new Map<string, number>()

    // 找出所有会被占用的 rank（不在 newOrder 中的 reminders 和 newOrder 中不需要调整的项）
    const occupiedRanks = new Map<number, string>() // rank -> id
    reminders.forEach(r => {
      if (!newOrderIds.has(r.id) || !needsUpdate.has(r.id)) {
        occupiedRanks.set(r.rank || 0, r.id)
      }
    })

    // 找出目标 rank 被不在 newOrder 中的项占用的情况
    const occupiersToMove = new Set<string>()
    needsUpdate.forEach(id => {
      const targetRank = targetRankMap.get(id)!
      const occupierId = occupiedRanks.get(targetRank)

      // 如果目标 rank 被占用，且占用者不在 newOrder 中，需要移动占用者
      if (occupierId && !newOrderIds.has(occupierId)) {
        occupiersToMove.add(occupierId)
      }
    })

    // 处理冲突：将占用者移到一个空闲的位置
    const targetRanksToSet = new Set(Array.from(needsUpdate).map(id => targetRankMap.get(id)!))
    occupiersToMove.forEach(occupierId => {
      const occupier = reminderMap.get(occupierId)
      if (occupier) {
        // 找到一个空闲的 rank（不在目标 rank 中，且不在其他已占用的 rank 中）
        let freeRank = 0
        while (targetRanksToSet.has(freeRank) || occupiedRanks.has(freeRank)) {
          freeRank++
        }
        rankUpdateMap.set(occupierId, freeRank)
        occupiedRanks.set(freeRank, occupierId)
      }
    })

    // 设置所有需要调整的项的目标 rank
    needsUpdate.forEach(id => {
      rankUpdateMap.set(id, targetRankMap.get(id)!)
    })

    const rankChangedReminders: Reminder[] = [];

    // 更新全量 reminders，应用 newOrder 中的字段更新和 rank 变化
    const updatedReminders = reminders.map(reminder => {
      // 不在 newOrder 中，但可能需要更新 rank（处理冲突时移动的项）
      const newRank = rankUpdateMap.get(reminder.id)
      if (newRank !== undefined) {
        const newOrderItem = newOrder.find(r => r.id === reminder.id)
        const newReminder = {
          ...reminder,
          ...newOrderItem || {},
          rank: newRank,
          updatedAt: new Date().toISOString()
        }
        rankChangedReminders.push(newReminder);
        return newReminder;
      }

      return reminder
    })

    // 基于新的 rank 值重新排序整个列表
    updatedReminders.sort((a, b) => (a.rank || 0) - (b.rank || 0))

    // 保存数据
    FileStorageService.saveData(updatedReminders).catch(error => {
      console.error('保存数据失败:', error)
    })

    // 打印排序修改操作日志
    if (rankChangedReminders.length > 0) {
      console.log('🔄 [排序修改 Reminder]', {
        count: rankChangedReminders.length,
        reminders: rankChangedReminders,
        source: params.source || 'reorderReminders'
      })
    }

    return updatedReminders
  }
}

