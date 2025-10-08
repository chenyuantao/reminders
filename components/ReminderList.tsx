'use client'

import { useState, useEffect, useRef } from 'react'
import { Trash2, Flag, Plus, Clock } from 'lucide-react'
import { Reminder } from '@/types/reminder'
import { format, startOfWeek, addDays, isSameDay } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { extractTagsFromReminder, countTagsInReminders } from '@/utils/tagExtractor'
import ContextMenu from './ContextMenu'
import LinkifiedText from './LinkifiedText'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// 添加提醒事项按钮组件
interface AddReminderButtonProps {
  onClick: () => void
  variant?: 'primary' | 'secondary'
  children: React.ReactNode
}

function AddReminderButton({ onClick, variant = 'primary', children }: AddReminderButtonProps) {
  const baseClasses = "flex items-center justify-center transition-colors cursor-pointer add-reminder-item"
  const variantClasses = variant === 'primary'
    ? "p-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600"
    : "p-2 text-gray-400 hover:text-gray-600"

  return (
    <div
      className={`${baseClasses} ${variantClasses}`}
      onClick={(e) => {
        e.stopPropagation()
        e.preventDefault()
        onClick()
      }}
    >
      {children}
    </div>
  )
}

// 日期标题组件
interface DayHeaderProps {
  dayName: string
  date: Date
  onAddClick: () => void
}

function DayHeader({ dayName, date, onAddClick }: DayHeaderProps) {
  const today = new Date()
  const isToday = isSameDay(date, today)
  const dateString = format(date, 'MM/dd');
  const text = dayName === dateString ? dayName : `${dayName}（${dateString}）`;

  if (isToday) {
    return (
      <div
        className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
        onClick={onAddClick}
        title="点击添加提醒事项"
      >
        <h3 className="text-lg font-semibold text-gray-900">
          今天
        </h3>

      </div>
    )
  }

  return (
    <div
      className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
      onClick={onAddClick}
      title="点击添加提醒事项"
    >
      <h3 className="text-sm text-gray-500">
        {text}
      </h3>

    </div>
  )
}

// 日期区块组件
interface DaySectionProps {
  dayData: {
    dayName: string
    date: Date
    reminders: Reminder[]
    dayKey: string
  }
  reminders: Reminder[]
  editingId: string | null
  editingTitle: string
  editingNotes: string
  insertPosition: number | null
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onUpdate: (id: string, updates: Partial<Reminder>) => void
  onTagClick: (date: Date, tag: string) => void
  setEditingTitle: (title: string) => void
  setEditingNotes: (notes: string) => void
  startEditing: (reminder: Reminder) => void
  saveEditing: () => void
  cancelEditing: () => void
  onAddReminder: (insertPosition?: number, targetDate?: Date) => string
  setInsertPosition: (position: number | null) => void
  selectedReminderIds: Set<string>
  onReminderItemClick: (reminderId: string, event: React.MouseEvent) => void
  onReminderContextMenu: (reminderId: string, event: React.MouseEvent) => void
}

function DaySection({
  dayData,
  reminders,
  editingId,
  editingTitle,
  editingNotes,
  insertPosition,
  onToggle,
  onDelete,
  onUpdate,
  onTagClick,
  setEditingTitle,
  setEditingNotes,
  startEditing,
  saveEditing,
  cancelEditing,
  onAddReminder,
  setInsertPosition,
  selectedReminderIds,
  onReminderItemClick,
  onReminderContextMenu
}: DaySectionProps) {
  // 处理添加按钮点击
  const handleAddClick = () => {
    // 如果当前有正在编辑的提醒事项，先保存它
    if (editingId && editingTitle.trim()) {
      // 保存当前编辑的内容（保留所有空格）
      onUpdate(editingId, {
        title: editingTitle,
        notes: editingNotes || undefined,
        updatedAt: new Date().toISOString()
      })
      // 退出编辑态
      cancelEditing()
    }

    // 计算插入位置
    let insertPos: number

    // 找到该日期在全局提醒事项中的最后位置
    // 遍历全局列表，找到该日期之后第一个提醒事项的位置
    insertPos = reminders.findIndex(reminder => {
      if (reminder.dueDate) {
        const reminderDate = new Date(reminder.dueDate)
        // 如果找到的日期大于当前日期，就在这个位置插入
        return reminderDate > dayData.date
      }
      return false
    })

    // 如果没有找到更大的日期，说明应该插入到末尾
    if (insertPos === -1) {
      insertPos = reminders.length
    }

    // 如果该日期已经有提醒事项，需要确保插入到该日期的最后
    if (dayData.reminders.length > 0) {
      // 找到该日期最后一个提醒事项在全局列表中的位置
      const lastReminderInDay = dayData.reminders[dayData.reminders.length - 1]
      const lastReminderGlobalIndex = reminders.findIndex(reminder => reminder.id === lastReminderInDay.id)

      // 如果找到了，就在其后插入；否则使用之前计算的位置
      if (lastReminderGlobalIndex !== -1) {
        insertPos = lastReminderGlobalIndex + 1
      }
    }

    // 直接创建新的提醒事项并进入编辑态
    const newReminderId = onAddReminder(insertPos, dayData.date)
    if (newReminderId) {
      // 立即进入编辑态
      startEditing({
        id: newReminderId,
        title: '',
        notes: '',
        completed: false,
        dueDate: dayData.date.toISOString(),
        // priority: 'medium', // 暂时不写入priority数据
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    }
  }

  return (
    <div key={dayData.dayKey} className="space-y-2">
      {/* 日期标题 */}
      <DayHeader
        dayName={dayData.dayName}
        date={dayData.date}
        onAddClick={handleAddClick}
      />

      {/* 该日期的提醒事项 */}
      <div className="space-y-1" style={{
        display: dayData.reminders.length > 0 ? 'block' : 'none',
        marginLeft: '8px'
      }}>
        {dayData.reminders
          .map((reminder, index) => (
            <div key={reminder.id}>
              <SortableReminderItem
                reminder={reminder}
                onToggle={onToggle}
                onDelete={onDelete}
                onUpdate={onUpdate}
                onTagClick={(tag) => onTagClick(dayData.date, tag)}
                editingId={editingId}
                editingTitle={editingTitle}
                editingNotes={editingNotes}
                setEditingTitle={setEditingTitle}
                setEditingNotes={setEditingNotes}
                startEditing={startEditing}
                saveEditing={saveEditing}
                cancelEditing={cancelEditing}
                isSelected={selectedReminderIds.has(reminder.id)}
                onClick={onReminderItemClick}
                onContextMenu={onReminderContextMenu}
                selectedReminderIds={selectedReminderIds}
              />
              {/* 在提醒事项之间添加分割线，最后一个不添加 */}
              {index < dayData.reminders.length - 1 && (
                <div className="h-px bg-gray-200 mx-5 my-1"></div>
              )}
            </div>
          ))}
      </div>

      {/* 添加按钮 */}
      {(dayData.reminders.length > 0 || isSameDay(dayData.date, new Date())) && (isSameDay(dayData.date, new Date()) || dayData.date > new Date()) && (
        <AddReminderButton
          onClick={handleAddClick}
          variant={
            dayData.reminders.length > 0 ? 'secondary' : 'primary'
          }
        >
          <Plus className="w-4 h-4 mr-1" />
          <span className="text-sm">{
            dayData.reminders.length > 0 ? '添加更多' : '添加提醒事项'
          }</span>
        </AddReminderButton>
      )}
    </div>
  )
}

interface ReminderListProps {
  reminders: Reminder[]
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onUpdate: (id: string, updates: Partial<Reminder>) => void
  onReorder: (reminders: Reminder[]) => void
  onAddReminder: (insertPosition?: number, targetDate?: Date) => string
  onTagClick: (date: Date, tag: string) => void
  onBatchMove: (reminderIds: string[], targetDate: Date) => void
  onBatchDelete: (reminderIds: string[]) => void
  newlyCreatedReminderId?: string | null
  currentWeek?: Date
  selectedList: string
}

const getPriorityColor = (priority: string | undefined) => {
  switch (priority) {
    case 'high':
      return 'text-red-500'
    case 'medium':
      return 'text-yellow-500'
    case 'low':
      return 'text-green-500'
    default:
      return 'text-gray-400'
  }
}

const getPriorityText = (priority: string | undefined) => {
  switch (priority) {
    case 'high':
      return '高'
    case 'medium':
      return '中'
    case 'low':
      return '低'
    default:
      return ''
  }
}

// 可拖拽的提醒事项组件
function SortableReminderItem({
  reminder,
  onToggle,
  onDelete,
  onUpdate,
  onTagClick,
  editingId,
  editingTitle,
  editingNotes,
  setEditingTitle,
  setEditingNotes,
  startEditing,
  saveEditing,
  cancelEditing,
  isSelected,
  onClick,
  onContextMenu,
  selectedReminderIds
}: {
  reminder: Reminder
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onUpdate: (id: string, updates: Partial<Reminder>) => void
  onTagClick: (tag: string) => void
  editingId: string | null
  editingTitle: string
  editingNotes: string
  setEditingTitle: (title: string) => void
  setEditingNotes: (notes: string) => void
  startEditing: (reminder: Reminder) => void
  saveEditing: () => void
  cancelEditing: () => void
  isSelected: boolean
  onClick: (reminderId: string, event: React.MouseEvent) => void
  onContextMenu: (reminderId: string, event: React.MouseEvent) => void
  selectedReminderIds: Set<string>
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: reminder.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // 当该提醒事项处于编辑态时，添加全局ESC键监听器
  useEffect(() => {
    if (editingId === reminder.id) {
      const handleGlobalKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          // 触发不保存退出输入态
          cancelEditing()
        }
      }

      // 添加全局键盘事件监听器
      document.addEventListener('keydown', handleGlobalKeyDown)

      // 清理函数
      return () => {
        document.removeEventListener('keydown', handleGlobalKeyDown)
      }
    }
  }, [editingId === reminder.id, cancelEditing])

  // 自动调整textarea高度的useEffect
  useEffect(() => {
    if (editingId === reminder.id) {
      const textarea = document.querySelector(`[data-reminder-id="${reminder.id}"] textarea`) as HTMLTextAreaElement
      if (textarea) {
        // 重置高度为auto，然后设置为实际需要的高度
        textarea.style.height = 'auto'
        textarea.style.height = Math.min(textarea.scrollHeight, 80) + 'px'
      }
    }
  }, [editingNotes, editingId, reminder.id])

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-reminder-id={reminder.id}
      className={`reminder-item ${reminder.completed ? 'opacity-60' : ''
        } ${editingId === reminder.id ? 'editing' : ''
        } ${isDragging ? 'opacity-50 scale-105' : ''
        } ${isSelected ? 'bg-blue-50 border-blue-300 shadow-md' : ''
        } ${isSelected ? 'hover:bg-blue-50' : 'hover:bg-gray-50'
        }`}
      {...attributes}
      {...listeners}
      onClick={(e) => onClick(reminder.id, e)}
      onContextMenu={(e) => onContextMenu(reminder.id, e)}
    >
      <button
        onClick={() => onToggle(reminder.id)}
        className={`reminder-checkbox flex items-center justify-center ${reminder.completed ? 'checked' : ''
          }`}
      >
        {reminder.completed && (
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )}
      </button>

      <div
        className="flex-1 min-w-0 cursor-pointer reminder-content"
        onClick={(e) => {
          if(e.shiftKey || e.ctrlKey || e.metaKey) {
            // 多选模式下退出编辑态
            if (editingId) {
              cancelEditing()
            }
            return
          }
          if (editingId !== reminder.id) {
            startEditing(reminder)
          }
        }}
      >
        {editingId === reminder.id ? (
          // 编辑模式
          <div className="space-y-2">
            <input
              type="text"
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) {
                  return
                }
                if (e.key === 'Escape') {
                  cancelEditing()
                }
                if (e.key === 'Enter') {
                  saveEditing()
                }
              }}
              onCompositionEndCapture={(e) => {
                // 中文输入法组合输入完成时，更新标题
                e.stopPropagation()
                e.preventDefault()
                setEditingTitle((e.target as HTMLInputElement).value)
              }}
              className="w-full px-0 py-0 border-none bg-transparent text-gray-900 text-sm focus:outline-none focus:ring-0 break-words"
              autoFocus
            />
            <textarea
              value={editingNotes}
              onChange={(e) => setEditingNotes(e.target.value)}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) {
                  return
                }
                if (e.key === 'Escape') {
                  cancelEditing()
                } else if ((e.key === 'Enter' && e.ctrlKey) || (e.key === 'Enter' && e.metaKey)) {
                  // Ctrl+Enter 或 Cmd+Enter 换行
                  e.preventDefault()
                  // 手动插入换行符
                  const textarea = e.target as HTMLTextAreaElement
                  const start = textarea.selectionStart
                  const end = textarea.selectionEnd
                  const value = textarea.value
                  const newValue = value.substring(0, start) + '\n' + value.substring(end)
                  setEditingNotes(newValue)
                  // 设置光标位置到换行符后
                  setTimeout(() => {
                    textarea.selectionStart = textarea.selectionEnd = start + 1
                  }, 0)
                } else if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
                  // Enter 键保存（没有按 Ctrl 或 Cmd）
                  e.preventDefault()
                  saveEditing()
                }
              }}
              onCompositionEndCapture={(e) => {
                // 中文输入法组合输入完成时，更新备注
                e.stopPropagation()
                e.preventDefault()
                setEditingNotes((e.target as HTMLTextAreaElement).value)
              }}
              placeholder="添加备注（可选），Enter 保存，Ctrl/Cmd+Enter 换行，ESC 取消"
              className="w-full px-0 py-0 border-none bg-transparent text-gray-500 text-sm resize-none focus:outline-none focus:ring-0 min-h-[20px] max-h-[80px] overflow-y-auto break-words"
              style={{
                height: 'auto',
                minHeight: '20px',
                maxHeight: '100px'
              }}
              rows={1}
              ref={(el) => {
                if (el) {
                  // 自动调整高度
                  el.style.height = 'auto'
                  el.style.height = Math.min(el.scrollHeight, 100) + 'px'
                }
              }}
            />

            {/* 时间信息放在输入框下面 */}
            <div className="flex items-center gap-3 text-xs text-gray-500">
              {/* 显示最后更新时间 */}
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {format(new Date(reminder.updatedAt), 'MMM dd, yyyy HH:mm', { locale: zhCN })}
              </span>

              {reminder.priority && (
                <span className={getPriorityColor(reminder.priority)}>
                  {getPriorityText(reminder.priority)}
                </span>
              )}
            </div>
          </div>
        ) : (
          // 显示模式
          <>
            <div className="flex items-center gap-2">
              <h3
                className={`text-sm whitespace-normal flex-1 min-w-0 ${
                  reminder.completed ? 'line-through text-gray-500' : 'text-gray-900'
                }`}
              >
                <LinkifiedText 
                  text={reminder.title}
                  linkClassName="text-blue-600 hover:text-blue-800"
                  showIcon={true}
                />
              </h3>
            </div>
            {reminder.notes && (
              <p className="text-sm text-gray-500 break-words mt-1">
                <LinkifiedText 
                  text={reminder.notes}
                  linkClassName="text-blue-500 hover:text-blue-700"
                  showIcon={true}
                />
              </p>
            )}

            {/* 显示标签 */}
            {reminder.tags && reminder.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {reminder.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 text-xs text-blue-600 bg-gray-100 rounded-full cursor-pointer hover:bg-blue-50 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation()
                      onTagClick(tag)
                    }}
                    title={`点击创建带有 #${tag} 标签的新事项`}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex items-center gap-1">
        {editingId !== reminder.id && (
          // 只在非编辑模式下显示删除按钮
          <button
            onClick={() => onDelete(reminder.id)}
            className="text-gray-400 hover:text-red-500 transition-colors p-1"
            title="删除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}

export default function ReminderList({
  reminders,
  onToggle,
  onDelete,
  onUpdate,
  onReorder,
  onAddReminder,
  onTagClick,
  onBatchMove,
  onBatchDelete,
  newlyCreatedReminderId,
  currentWeek,
  selectedList
}: ReminderListProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [editingNotes, setEditingNotes] = useState('')
  const [insertPosition, setInsertPosition] = useState<number | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  
  // 多选状态管理
  const [selectedReminderIds, setSelectedReminderIds] = useState<Set<string>>(new Set())
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    reminderId: string
  } | null>(null)

  // 自动滚动到"今天"的DaySection
  useEffect(() => {
    if (scrollContainerRef.current && selectedList === 'all') {
      // 查找所有DaySection，通过日期判断哪个是"今天"
      const daySections = Array.from(scrollContainerRef.current.querySelectorAll('[data-day-date]'))
      const today = new Date()

      for (const section of daySections) {
        const dayDate = section.getAttribute('data-day-date')

        if (dayDate && isSameDay(new Date(dayDate), today)) {
          section.scrollIntoView({
            block: 'start',
            inline: 'nearest'
          })
          break
        }
      }
    }
  }, [selectedList, currentWeek])

  // 监听新创建的事项ID，立即进入编辑状态
  useEffect(() => {
    if (newlyCreatedReminderId) {
      const newReminder = reminders.find(reminder => reminder.id === newlyCreatedReminderId)
      if (newReminder) {
        startEditing(newReminder)
      }
    }
  }, [newlyCreatedReminderId, reminders])

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // 清除选择状态
        setSelectedReminderIds(new Set())
        setContextMenu(null)
      }
    }

    const handleWindowClick = (event: MouseEvent) => {
      // 检查是否点击的是空白区域（不是提醒事项）
      const target = event.target as Element
      const isReminderItem = target.closest('.reminder-item')
      const isContextMenu = target.closest('[data-context-menu]')
      
      // 如果没有点击提醒事项或右键菜单，且没有使用修饰键，则退出多选
      if (!isReminderItem && !isContextMenu && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
        setSelectedReminderIds(new Set())
        setContextMenu(null)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('click', handleWindowClick)
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('click', handleWindowClick)
    }
  }, [])

  // 处理 ReminderItem 点击
  const handleReminderItemClick = (reminderId: string, event: React.MouseEvent) => {
    if (event.shiftKey || event.ctrlKey || event.metaKey) {
      // 多选模式
      event.preventDefault()
      event.stopPropagation()
      
      // 如果当前有正在编辑的事项，先退出编辑态
      if (editingId) {
        cancelEditing()
      }
      
      setSelectedReminderIds(prev => {
        const newSet = new Set(prev)
        if (newSet.has(reminderId)) {
          newSet.delete(reminderId)
        } else {
          newSet.add(reminderId)
        }
        return newSet
      })
    } else {
      // 单选模式 - 不阻止事件传播，让内容区域可以正常进入编辑态
      setSelectedReminderIds(new Set([reminderId]))
    }
  }

  // 处理右键菜单
  const handleContextMenu = (reminderId: string, event: React.MouseEvent) => {
    event.preventDefault()
    
    // 如果右键点击的事项不在选中列表中，则选中它
    if (!selectedReminderIds.has(reminderId)) {
      setSelectedReminderIds(new Set([reminderId]))
    }
    
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      reminderId
    })
  }

  // 关闭右键菜单
  const closeContextMenu = () => {
    setContextMenu(null)
  }

  // 获取选中的提醒事项ID
  const getSelectedReminderIds = () => {
    return Array.from(selectedReminderIds)
  }

  // 右键菜单操作
  const handleMoveToToday = () => {
    const selectedIds = getSelectedReminderIds()
    const today = new Date()
    onBatchMove(selectedIds, today)
    closeContextMenu()
  }

  const handleMoveToTomorrow = () => {
    const selectedIds = getSelectedReminderIds()
    const tomorrow = addDays(new Date(), 1)
    onBatchMove(selectedIds, tomorrow)
    closeContextMenu()
  }

  const handleMoveToFriday = () => {
    const selectedIds = getSelectedReminderIds()
    const today = new Date()
    const daysUntilFriday = (5 - today.getDay() + 7) % 7
    const friday = addDays(today, daysUntilFriday)
    onBatchMove(selectedIds, friday)
    closeContextMenu()
  }

  const handleMoveToNextMonday = () => {
    const selectedIds = getSelectedReminderIds()
    const today = new Date()
    const daysUntilMonday = (1 - today.getDay() + 7) % 7
    const nextMonday = addDays(today, daysUntilMonday)
    onBatchMove(selectedIds, nextMonday)
    closeContextMenu()
  }

  const handleDelete = () => {
    const selectedIds = getSelectedReminderIds()
    onBatchDelete(selectedIds)
    setSelectedReminderIds(new Set())
    closeContextMenu()
  }

  // 按周分类提醒事项
  const getWeeklyReminders = () => {
    // 如果选择"今天"，只返回今天的日期区块
    if (selectedList === 'today') {
      const today = new Date()
      const todayReminders = reminders.filter(reminder => {
        if (reminder.dueDate) {
          return isSameDay(new Date(reminder.dueDate), today)
        }
        return false
      })

      // 获取今天是周几
      const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
      const dayOfWeek = weekDays[today.getDay()]

      return [{
        dayName: dayOfWeek,
        date: today,
        reminders: todayReminders,
        dayKey: 'today'
      }]
    }

    // 如果选择"未完成"，直接返回所有未完成的任务，不按周分组
    if (selectedList === 'scheduled') {
      const scheduledReminders = reminders.filter(reminder => reminder.dueDate && !reminder.completed)

      // 按日期分组，但不显示星期
      const groupedByDate = scheduledReminders.reduce((groups, reminder) => {
        const dateKey = reminder.dueDate ? new Date(reminder.dueDate).toDateString() : 'no-date'
        if (!groups[dateKey]) {
          groups[dateKey] = {
            reminders: [],
            date: reminder.dueDate ? new Date(reminder.dueDate) : new Date()
          }
        }
        groups[dateKey].reminders.push(reminder)
        return groups
      }, {} as Record<string, { reminders: Reminder[], date: Date }>)

      // 转换为数组格式，按日期排序
      return Object.entries(groupedByDate)
        .sort(([, a], [, b]) => a.date.getTime() - b.date.getTime())
        .map(([dateKey, data], index) => ({
          dayName: format(data.date, 'MM/dd'),
          date: data.date,
          reminders: data.reminders,
          dayKey: `scheduled-${index}`
        }))
    }

    // 如果选择"已完成"，直接返回所有已完成的任务，不按周分组
    if (selectedList === 'completed') {
      const completedReminders = reminders.filter(reminder => reminder.dueDate && reminder.completed)

      // 按完成日期分组，但不显示星期
      const groupedByDate = completedReminders.reduce((groups, reminder) => {
        const dateKey = reminder.dueDate ? new Date(reminder.dueDate).toDateString() : 'no-date'
        if (!groups[dateKey]) {
          groups[dateKey] = {
            reminders: [],
            date: reminder.dueDate ? new Date(reminder.dueDate) : new Date()
          }
        }
        groups[dateKey].reminders.push(reminder)
        return groups
      }, {} as Record<string, { reminders: Reminder[], date: Date }>)

      // 转换为数组格式，按日期排序（最新的在前）
      return Object.entries(groupedByDate)
        .sort(([, a], [, b]) => b.date.getTime() - a.date.getTime())
        .map(([dateKey, data], index) => ({
          dayName: format(data.date, 'MM/dd'),
          date: data.date,
          reminders: data.reminders,
          dayKey: `completed-${index}`
        }))
    }

    // 其他情况按周分类显示（每周事项、已标记等）
    const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
    // 使用传入的 currentWeek，如果没有则使用当前日期
    const baseDate = currentWeek || new Date()
    const startOfCurrentWeek = startOfWeek(baseDate, { weekStartsOn: 1 }) // 周一开始

    const weeklyData = weekDays.map((dayName, index) => {
      const dayDate = addDays(startOfCurrentWeek, index)
      const dayReminders = reminders.filter(reminder => {
        if (reminder.dueDate) {
          return isSameDay(new Date(reminder.dueDate), dayDate)
        }
        return false
      })

      return {
        dayName,
        date: dayDate,
        reminders: dayReminders,
        dayKey: `day-${index}`
      }
    })

    return weeklyData
  }


  // 拖拽传感器配置 - 在编辑态时完全禁用拖拽
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 100, // 100ms 长按激活拖拽，避免与点击事件冲突
        tolerance: 8, // 8px 移动容差，增加拖拽的稳定性
      },
      // 在编辑态时完全禁用拖拽
      disabled: editingId !== null,
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      // 在编辑态时完全禁用键盘拖拽
      disabled: editingId !== null,
    })
  )

  // 在编辑态时完全禁用拖拽功能
  const isDragDisabled = editingId !== null

  // 拖拽结束处理
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      const oldIndex = reminders.findIndex(reminder => reminder.id === active.id)
      const newIndex = reminders.findIndex(reminder => reminder.id === over?.id)

      const newReminders = arrayMove(reminders, oldIndex, newIndex)
      onReorder(newReminders)
    }
  }

  const startEditing = (reminder: Reminder) => {
    setEditingId(reminder.id)
    setEditingTitle(reminder.title)
    setEditingNotes(reminder.notes || '')
  }

  const saveEditing = () => {
    if (editingId) {
      if (editingTitle.trim() || editingNotes.trim()) {
        // 提取标签
        const tags = extractTagsFromReminder(editingTitle, editingNotes)

        // 标题不为空，保存更新（保留所有空格）
        onUpdate(editingId, {
          title: editingTitle,
          notes: editingNotes || undefined,
          tags,
          updatedAt: new Date().toISOString()
        })
      } else {
        // 标题为空，删除该提醒事项
        onDelete(editingId)
      }
      // 退出编辑态
      setEditingId(null)
      setEditingTitle('')
      setEditingNotes('')
    }
  }

  const cancelEditing = () => {
    if (editingId) {
      // 检查原始标题是否为空，如果为空则删除
      const originalReminder = reminders.find(r => r.id === editingId)
      if (originalReminder && !originalReminder.title.trim() && !(originalReminder.notes || '').trim()) {
        // 原始标题为空，删除该提醒事项
        onDelete(editingId)
      }
    }
    // 退出编辑态
    setEditingId(null)
    setEditingTitle('')
    setEditingNotes('')
  }

  return (
    <div className="h-full flex flex-col">
      {/* 滚动区域 - 设置最大高度和滚动 */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0" ref={scrollContainerRef}>
        {isDragDisabled ? (
          // 编辑态时禁用拖拽，只显示静态内容
          <div className="space-y-3 reminders-container">
            {getWeeklyReminders().map((dayData, index) => (
              <div
                key={dayData.dayKey}
                data-day-date={dayData.date.toISOString()}
                style={{
                  marginTop: '0px'
                }}
              >
                <DaySection
                  key={dayData.dayKey}
                  dayData={dayData}
                  reminders={reminders}
                  editingId={editingId}
                  editingTitle={editingTitle}
                  editingNotes={editingNotes}
                  insertPosition={insertPosition}
                  onToggle={onToggle}
                  onDelete={onDelete}
                  onUpdate={onUpdate}
                  onTagClick={onTagClick}
                  setEditingTitle={setEditingTitle}
                  setEditingNotes={setEditingNotes}
                  startEditing={startEditing}
                  saveEditing={saveEditing}
                  cancelEditing={cancelEditing}
                  onAddReminder={onAddReminder}
                  setInsertPosition={setInsertPosition}
                  selectedReminderIds={selectedReminderIds}
                  onReminderItemClick={handleReminderItemClick}
                  onReminderContextMenu={handleContextMenu}
                />
                {/* 在DaySection之间添加分割线，最后一个不添加 */}
                {index < getWeeklyReminders().length - 1 && (
                  <div className="h-px bg-gray-200 my-2"></div>
                )}
              </div>
            ))}
          </div>
        ) : (
          // 非编辑态时启用拖拽功能
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={reminders.map(reminder => reminder.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3 reminders-container">
                {getWeeklyReminders().map((dayData, index) => (
                  <div
                    key={dayData.dayKey}
                    data-day-date={dayData.date.toISOString()}
                    style={{
                      marginTop: '0px'
                    }}
                  >
                    <DaySection
                      key={dayData.dayKey}
                      dayData={dayData}
                      reminders={reminders}
                      editingId={editingId}
                      editingTitle={editingTitle}
                      editingNotes={editingNotes}
                      insertPosition={insertPosition}
                      onToggle={onToggle}
                      onDelete={onDelete}
                      onUpdate={onUpdate}
                      onTagClick={onTagClick}
                      setEditingTitle={setEditingTitle}
                      setEditingNotes={setEditingNotes}
                      startEditing={startEditing}
                      saveEditing={saveEditing}
                      cancelEditing={cancelEditing}
                      onAddReminder={onAddReminder}
                      setInsertPosition={setInsertPosition}
                      selectedReminderIds={selectedReminderIds}
                      onReminderItemClick={handleReminderItemClick}
                      onReminderContextMenu={handleContextMenu}
                    />
                    {/* 在DaySection之间添加分割线，最后一个不添加 */}
                    {index < getWeeklyReminders().length - 1 && (
                      <div className="h-px bg-gray-200 my-2"></div>
                    )}
                  </div>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
      
      {/* 右键菜单 */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeContextMenu}
          onMoveToToday={handleMoveToToday}
          onMoveToTomorrow={handleMoveToTomorrow}
          onMoveToFriday={handleMoveToFriday}
          onMoveToNextMonday={handleMoveToNextMonday}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
} 