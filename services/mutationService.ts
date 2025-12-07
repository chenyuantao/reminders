import { Reminder } from '@/types/reminder'
import { toast } from 'react-toastify'
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
    const updatedReminders = this.sortReminders([...currentReminders, newReminder])
    // 保存数据
    FileStorageService.saveData(updatedReminders).catch(error => {
      console.error('保存数据失败:', error)
    });
    this.insertCgi(newReminder);
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

    // 调用更新 API
    const updatedReminder = updatedReminders.find(r => r.id === id)
    if (updatedReminder) {
      this.updateCgi(id, updates)
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
    const { id } = params
    const updatedReminders = currentReminders.filter(reminder => reminder.id !== id)
    // 保存数据
    FileStorageService.saveData(updatedReminders).catch(error => {
      console.error('保存数据失败:', error)
    });
    // 调用删除 API
    this.deleteCgi(id)
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

    const updatedReminders = this.sortReminders(
      currentReminders.map(reminder =>
        reminder.id === id
          ? { ...reminder, completed: !reminder.completed, updatedAt: new Date().toISOString() }
          : reminder
      )
    )

    // 保存数据
    FileStorageService.saveData(updatedReminders).catch(error => {
      console.error('保存数据失败:', error)
    })
    // 调用更新 API
    const updatedReminder = updatedReminders.find(r => r.id === id)
    if (updatedReminder) {
      this.updateCgi(id, updatedReminder)
    }
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
    const targetDateReminders = this.sortReminders(updatedReminders.filter(
      r => r.dueDate === targetDateStr && !reminderIds.includes(r.id)
    ));
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

    // 调用更新 API（批量更新）
    movedReminders.forEach(reminder => {
      this.updateCgi(reminder.id, {
        ...reminder,
        updatedAt: new Date().toISOString()
      })
    })
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

    // 调用删除 API（批量删除）
    reminderIds.forEach(id => {
      this.deleteCgi(id)
    });
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
    const updatedReminders = this.sortReminders(reminders.map(reminder => {
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
    }))
    // 保存数据
    FileStorageService.saveData(updatedReminders).catch(error => {
      console.error('保存数据失败:', error)
    })
    // 调用更新 API（批量更新 rank）
    rankChangedReminders.forEach(reminder => {
      this.updateCgi(reminder.id, reminder)
    })
    return updatedReminders
  }

  static insertCgi(newReminder: Reminder) {
    return fetch('/api/insert', {
      method: 'POST',
      body: JSON.stringify(newReminder)
    }).then(response => response.json())
      .then(data => {
        if (data.success) {
          console.log('📝 [新增 Reminder]', data);
        } else {
          toast.error(data.error);
        }
      })
      .catch(error => {
        toast.error(error.message);
      });
  }

  static updateCgi(id: string, updates: Partial<Reminder>) {
    return fetch('/api/update', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id, ...updates })
    }).then(response => response.json())
      .then(data => {
        if (data.success) {
          console.log('✏️ [更新 Reminder]', data);
        } else {
          toast.error(data.error);
        }
      })
      .catch(error => {
        toast.error(error.message);
      });
  }

  static deleteCgi(id: string) {
    return fetch(`/api/delete?id=${id}`, {
      method: 'DELETE',
    }).then(response => response.json())
      .then(data => {
        if (data.success) {
          console.log('🗑️ [删除 Reminder]', data);
        } else {
          toast.error(data.error);
        }
      })
      .catch(error => {
        toast.error(error.message);
      });
  }

  /**
   * 排序 Reminder 数组
   * 规则：
   * 1. 已完成的排在最前面
   * 2. 已完成的按更新时间排序（最新的在后面）
   * 3. 未完成的按 rank 排序（rank 越小越靠前）
   */
  static sortReminders(reminders: Reminder[]): Reminder[] {
    return reminders.sort((a, b) => {
      // 已完成的排在最前面
      if (a.completed && !b.completed) return -1
      if (!a.completed && b.completed) return 1
      // 如果都是已完成，按更新时间排序（最新的在后面）
      if (a.completed && b.completed) {
        const aUpdatedAt = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
        const bUpdatedAt = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
        return aUpdatedAt - bUpdatedAt // 升序排列，最新的在后面
      }
      // 如果都是未完成，按 rank 排序（rank 越小越靠前）
      return (a.rank || 0) - (b.rank || 0)
    })
  }
}

