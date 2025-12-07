'use client'

import { useState, useEffect, useRef } from 'react'
import { Trash2, Plus, Clock } from 'lucide-react'
import { Reminder } from '@/types/reminder'
import { format, startOfWeek, addDays, isSameDay } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { extractTagsFromReminder } from '@/utils/tagExtractor'
import { MutationService } from '@/services/mutationService'
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
  DragOverEvent,
  DragStartEvent,
  useDroppable,
  DragOverlay,
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

function DayHeader({ dayName, date, onAddClick, completedCount }: DayHeaderProps & { completedCount?: number }) {
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
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          今天
          {Boolean(completedCount && completedCount > 0) && (
            <span className="text-xs text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">✓ {completedCount}</span>
          )}
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
      <h3 className="text-sm text-gray-500 flex items-center gap-2">
        {text}
        {Boolean(completedCount && completedCount > 0) && (
          <span className="text-xs text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">✓ {completedCount}</span>
        )}
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
  orderedIds?: string[]
  activeId?: string | null
  containerId?: string
  hideCompleted?: boolean
  selectedList: string
  editingId: string | null
  editingTitle: string
  editingNotes: string
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onUpdate: (id: string, updates: Partial<Reminder>) => void
  onTagClick: (date: Date, tag: string) => void
  setEditingTitle: (title: string) => void
  setEditingNotes: (notes: string) => void
  startEditing: (reminder: Reminder) => void
  saveEditing: () => void
  cancelEditing: () => void
  onAddReminder: (targetDate?: Date, targetRank?: number) => Reminder | null
  selectedReminderIds: Set<string>
  onReminderItemClick: (reminderId: string, event: React.MouseEvent) => void
  onReminderContextMenu: (reminderId: string, event: React.MouseEvent) => void
}

function DaySection({
  dayData,
  reminders,
  orderedIds,
  activeId,
  containerId,
  hideCompleted,
  selectedList,
  editingId,
  editingTitle,
  editingNotes,
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
  selectedReminderIds,
  onReminderItemClick,
  onReminderContextMenu
}: DaySectionProps) {
  // 处理添加按钮点击
  const handleAddClick =  () => {
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

    // 计算目标 rank 值：基于该日期中最后一个提醒事项的 rank
    let targetRank: number | undefined
    if (dayData.reminders.length > 0) {
      // 找到该日期中 rank 最大的提醒事项
      const maxRankReminder = dayData.reminders.reduce((max, r) => {
        return (r.rank || 0) > (max.rank || 0) ? r : max
      })
      // 在其基础上 +1，插入到该日期的最后
      targetRank = (maxRankReminder.rank || 0) + 1
    }
    // 如果没有该日期的提醒事项，targetRank 为 undefined，让 addReminder 自动计算

    // 直接创建新的提醒事项并进入编辑态
    const newReminder = onAddReminder(dayData.date, targetRank);
    if (newReminder) {
      // 立即进入编辑态
      startEditing(newReminder)
    }
  }

  // 使日期容器本身成为 droppable，以支持空日期接收
  const { setNodeRef: setContainerDroppableRef } = useDroppable({ id: containerId || `container-${dayData.date.toISOString().slice(0, 10)}` })

  return (
    <div key={dayData.dayKey} className="space-y-2" ref={setContainerDroppableRef}>
      {/* 日期标题 */}
      <DayHeader
        dayName={dayData.dayName}
        date={dayData.date}
        onAddClick={handleAddClick}
        completedCount={hideCompleted ? reminders.filter(r => r.dueDate && isSameDay(new Date(r.dueDate), dayData.date) && r.completed).length : 0}
      />

      {/* 该日期的提醒事项 */}
      <div className="space-y-1" style={{
        display: (orderedIds ? orderedIds.length : dayData.reminders.length) > 0 ? 'block' : 'none',
        marginLeft: '8px'
      }}>
        {(orderedIds
          ? orderedIds
            .map(id => reminders.find(r => r.id === id))
            .filter((r): r is Reminder => !!r)
          : dayData.reminders)
          .filter(r => !(hideCompleted && (selectedList === 'all' || selectedList === 'today') && r.completed))
          .map((reminder, index) => (
            <div key={reminder.id}>
              <SortableReminderItem
                reminder={reminder}
                activeId={activeId || undefined}
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
              {index < ((orderedIds ? orderedIds.length : dayData.reminders.length) - 1) && (
                <div className="h-px bg-gray-200 mx-5 my-1"></div>
              )}
            </div>
          ))}
      </div>

      {/* 添加按钮 */}
      {(((orderedIds ? orderedIds.length : dayData.reminders.length) > 0) || isSameDay(dayData.date, new Date())) && (isSameDay(dayData.date, new Date()) || dayData.date > new Date()) && (
        <AddReminderButton
          onClick={handleAddClick}
          variant={
            ((orderedIds ? orderedIds.length : dayData.reminders.length) > 0) ? 'secondary' : 'primary'
          }
        >
          <Plus className="w-4 h-4 mr-1" />
          <span className="text-sm">{
            ((orderedIds ? orderedIds.length : dayData.reminders.length) > 0) ? '添加更多' : '添加提醒事项'
          }</span>
        </AddReminderButton>
      )}
    </div>
  )
}

interface ReminderListProps {
  reminders: Reminder[]
  onToggle: (id: string) => void | Promise<void>
  onDelete: (id: string) => void | Promise<void>
  onUpdate: (id: string, updates: Partial<Reminder>) => void | Promise<void>
  onReorder: (reminders: Reminder[]) => void | Promise<void>
  onAddReminder: (targetDate?: Date, targetRank?: number) => Reminder | null
  onTagClick: (date: Date, tag: string) => void | Promise<void>
  onBatchMove: (reminderIds: string[], targetDate: Date) => void | Promise<void>
  onBatchDelete: (reminderIds: string[]) => void | Promise<void>
  onEditingChange?: (editingId: string | null) => void
  newlyCreatedReminderId?: string | null
  currentWeek?: Date
  selectedList: string
  hideCompleted?: boolean
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
  activeId,
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
  activeId?: string
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

  // 用于跟踪是否按下了ESC键，以便在onBlur时不保存
  const [isEscapePressed, setIsEscapePressed] = useState(false)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // 当该提醒事项处于编辑态时，添加全局ESC键监听器
  useEffect(() => {
    if (editingId === reminder.id) {
      const handleGlobalKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          // 标记ESC被按下，防止onBlur保存内容
          setIsEscapePressed(true)
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

  // 重置ESC标志当进入编辑模式时
  useEffect(() => {
    if (editingId === reminder.id) {
      setIsEscapePressed(false)
    }
  }, [editingId === reminder.id])

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

  const isActiveDragging = !!activeId && activeId === reminder.id

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        visibility: isActiveDragging ? 'hidden' as const : undefined,
      }}
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
          if (e.shiftKey || e.ctrlKey || e.metaKey) {
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
                  setIsEscapePressed(true)
                  cancelEditing()
                }
                if (e.key === 'Enter') {
                  saveEditing()
                }
              }}
              onBlur={() => {
                // 只有在没有按ESC的情况下才保存
                if (!isEscapePressed) {
                  setTimeout(() => {
                    saveEditing()
                  }, 100) // 稍微延迟，以允许焦点转移到textarea
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
                  setIsEscapePressed(true)
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
              onBlur={() => {
                // 只有在没有按ESC的情况下才保存
                if (!isEscapePressed) {
                  setTimeout(() => {
                    saveEditing()
                  }, 100) // 稍微延迟，以允许焦点转移
                }
              }}
              onCompositionEndCapture={(e) => {
                // 中文输入法组合输入完成时，更新备注
                e.stopPropagation()
                e.preventDefault()
                setEditingNotes((e.target as HTMLTextAreaElement).value)
              }}
              placeholder="添加备注（可选），点击空白保存，Ctrl/Cmd+Enter 换行，ESC 取消"
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
                className={`text-sm whitespace-normal flex-1 min-w-0 ${reminder.completed ? 'line-through text-gray-500' : 'text-gray-900'
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
  onEditingChange,
  newlyCreatedReminderId,
  currentWeek,
  selectedList,
  hideCompleted
}: ReminderListProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [editingNotes, setEditingNotes] = useState('')
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // 多选状态管理
  const [selectedReminderIds, setSelectedReminderIds] = useState<Set<string>>(new Set())
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    reminderId: string
  } | null>(null)

  // dnd 多容器状态
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeContainerId, setActiveContainerId] = useState<string | null>(null)
  const [containers, setContainers] = useState<Record<string, string[]>>({})

  // 生成容器ID（按天）
  const getContainerIdByDate = (date: Date) => `container-${date.toISOString().slice(0, 10)}`

  // 从当前视图数据生成基础容器映射
  const buildContainersFromWeekly = () => {
    const weekly = getWeeklyReminders()
    const map: Record<string, string[]> = {}
    weekly.forEach(day => {
      const id = getContainerIdByDate(day.date)
      map[id] = day.reminders.map(r => r.id)
    })
    return map
  }

  // 当reminders/当前周/列表变化时，刷新容器（非拖拽时）
  useEffect(() => {
    if (!activeId) {
      setContainers(buildContainersFromWeekly())
    }
  }, [reminders, selectedList, currentWeek])

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
      // 单选模式 - 如果点击的是已经激活且唯一选中的item，不做任何操作
      if (selectedReminderIds.size === 1 && selectedReminderIds.has(reminderId)) {
        event.preventDefault()
        event.stopPropagation()
        return;
      }
      // 否则设置选中状态 - 不阻止事件传播，让内容区域可以正常进入编辑态
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
      let todayReminders = reminders.filter(reminder => {
        if (reminder.dueDate) {
          return isSameDay(new Date(reminder.dueDate), today)
        }
        return false
      })
      if (hideCompleted) {
        todayReminders = todayReminders.filter(r => !r.completed)
      }

      // 获取今天是周几
      const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
      const dayOfWeek = weekDays[today.getDay()]

      // 使用统一的排序函数
      todayReminders = MutationService.sortReminders(todayReminders)

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
        .map(([dateKey, data], index) => {
          // 使用统一的排序函数
          data.reminders = MutationService.sortReminders(data.reminders)
          return {
            dayName: format(data.date, 'MM/dd'),
            date: data.date,
            reminders: data.reminders,
            dayKey: `scheduled-${index}`
          }
        })
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
        .map(([dateKey, data], index) => {
          // 使用统一的排序函数
          data.reminders = MutationService.sortReminders(data.reminders)
          return {
            dayName: format(data.date, 'MM/dd'),
            date: data.date,
            reminders: data.reminders,
            dayKey: `completed-${index}`
          }
        })
    }

    // 其他情况按周分类显示（每周事项、已标记等）
    const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
    // 使用传入的 currentWeek，如果没有则使用当前日期
    const baseDate = currentWeek || new Date()
    const startOfCurrentWeek = startOfWeek(baseDate, { weekStartsOn: 1 }) // 周一开始

    const weeklyData = weekDays.map((dayName, index) => {
      const dayDate = addDays(startOfCurrentWeek, index)
      let dayReminders = reminders.filter(reminder => {
        if (reminder.dueDate) {
          return isSameDay(new Date(reminder.dueDate), dayDate)
        }
        return false
      })
      if (hideCompleted && selectedList !== 'completed') {
        dayReminders = dayReminders.filter(r => !r.completed)
      }

      // 使用统一的排序函数
      dayReminders = MutationService.sortReminders(dayReminders)

      return {
        dayName,
        date: dayDate,
        reminders: dayReminders,
        dayKey: `day-${index}`
      }
    })

    return weeklyData
  }


  // 拖拽传感器配置 - 保持现有长按启动
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 100,
        tolerance: 8,
      },
      disabled: editingId !== null,
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      disabled: editingId !== null,
    })
  )

  // 在编辑态时完全禁用拖拽功能
  const isDragDisabled = editingId !== null

  // 查找某个item所属容器ID
  const findContainerOfItem = (id: string | null): string | null => {
    if (!id) return null
    for (const [cid, items] of Object.entries(containers)) {
      if (items.includes(id)) return cid
    }
    return null
  }

  // 拖拽开始
  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id)
    setActiveId(id)
    setActiveContainerId(findContainerOfItem(id))
  }

  // 拖拽悬停（预览）
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!active || !over) return
    const activeIdStr = String(active.id)
    const overIdStr = String(over.id)

    const origin = findContainerOfItem(activeIdStr)
    const destination = overIdStr.startsWith('container-') ? overIdStr : findContainerOfItem(overIdStr)

    if (!origin || !destination) return

    if (origin === destination) {
      // 同容器排序预览
      const overIndex = containers[origin].indexOf(overIdStr)
      const activeIndex = containers[origin].indexOf(activeIdStr)
      if (overIndex === -1 || activeIndex === -1 || overIndex === activeIndex) return
      setContainers(prev => ({
        ...prev,
        [origin]: arrayMove(prev[origin], activeIndex, overIndex)
      }))
    } else {
      // 跨容器移动预览
      setContainers(prev => {
        const next = { ...prev }
        const originItems = [...(next[origin] || [])]
        const destItems = [...(next[destination] || [])]
        const activeIndex = originItems.indexOf(activeIdStr)
        if (activeIndex === -1) return prev
        originItems.splice(activeIndex, 1)
        let insertIndex = destItems.length
        const overIndex = destItems.indexOf(overIdStr)
        if (overIndex !== -1) insertIndex = overIndex
        destItems.splice(insertIndex, 0, activeIdStr)
        next[origin] = originItems
        next[destination] = destItems
        return next
      })
    }
  }

  // 拖拽结束（持久化）
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    const activeIdStr = active ? String(active.id) : null
    const overIdStr = over ? String(over.id) : null

    // 注意：不要立即清除 activeId，以避免在重排前项恢复可见引发闪烁/回弹

    if (!activeIdStr || !overIdStr) {
      setContainers(buildContainersFromWeekly())
      setActiveId(null)
      return
    }

    const origin = findContainerOfItem(activeIdStr)
    const destination = overIdStr.startsWith('container-') ? overIdStr : findContainerOfItem(overIdStr)

    if (!origin || !destination) {
      setContainers(buildContainersFromWeekly())
      setActiveId(null)
      return
    }

    const weekly = getWeeklyReminders()
    const orderOfContainers = weekly.map(d => d.date).map(getContainerIdByDate)

    const idToReminder = new Map(reminders.map(r => [r.id, r]))
    const newList: Reminder[] = []
    orderOfContainers.forEach(cid => {
      const ids = containers[cid] || []
      ids.forEach(id => {
        const r = idToReminder.get(id)
        if (r) newList.push(r)
      })
    })

    const dest = weekly.find(d => getContainerIdByDate(d.date) === destination)
    if (dest) {
      const targetIso = dest.date.toISOString()
      const updated = newList.map(r => r.id === activeIdStr ? { ...r, dueDate: targetIso, updatedAt: new Date().toISOString() } : r)
      onReorder(updated)
    } else {
      onReorder(newList)
    }

    setContainers(buildContainersFromWeekly())
    // 现在容器已按最终状态重建，安全清除 activeId，避免回弹动画
    setActiveId(null)
  }

  const startEditing = (reminder: Reminder) => {
    setEditingId(reminder.id)
    setEditingTitle(reminder.title)
    setEditingNotes(reminder.notes || '')
    onEditingChange?.(reminder.id)
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
      // 如果此时焦点在当前编辑的 reminder 的输入框上，则不退出编辑
      const activeElement = document.activeElement
      if (activeElement) {
        const reminderItem = activeElement.closest('[data-reminder-id]')
        if (reminderItem && (activeElement.tagName.toLowerCase() === 'textarea' || activeElement.tagName.toLowerCase() === 'input')) {
          // 焦点在当前编辑的 reminder 的输入框上，不退出编辑
          return
        }
      }
      setEditingId(null)
      setEditingTitle('')
      setEditingNotes('')
      onEditingChange?.(null)
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
    onEditingChange?.(null)
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
                  selectedList={selectedList}
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
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="space-y-3 reminders-container">
              {getWeeklyReminders().map((dayData, index) => {
                const containerId = getContainerIdByDate(dayData.date)
                const items = containers[containerId] || dayData.reminders.map(r => r.id)
                return (
                  <div
                    key={dayData.dayKey}
                    data-day-date={dayData.date.toISOString()}
                    style={{ marginTop: '0px' }}
                  >
                    <SortableContext items={items} strategy={verticalListSortingStrategy}>
                      <DaySection
                        key={dayData.dayKey}
                        dayData={dayData}
                        reminders={reminders}
                        orderedIds={items}
                        activeId={activeId}
                        containerId={containerId}
                        hideCompleted={hideCompleted}
                        selectedList={selectedList}
                        editingId={editingId}
                        editingTitle={editingTitle}
                        editingNotes={editingNotes}
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
                        selectedReminderIds={selectedReminderIds}
                        onReminderItemClick={handleReminderItemClick}
                        onReminderContextMenu={handleContextMenu}
                      />
                    </SortableContext>
                    {index < getWeeklyReminders().length - 1 && (
                      <div className="h-px bg-gray-200 my-2"></div>
                    )}
                  </div>
                )
              })}
            </div>

            <DragOverlay dropAnimation={null}>
              {activeId ? (() => {
                const r = reminders.find(x => x.id === activeId)
                if (!r) return null
                return (
                  <div className="p-3 bg-white rounded-lg shadow-xl border border-gray-200">
                    <div className="text-sm text-gray-900 break-words">{r.title || '(未命名)'}</div>
                    {r.notes ? (
                      <div className="text-xs text-gray-500 mt-1 break-words">{r.notes}</div>
                    ) : null}
                  </div>
                )
              })() : null}
            </DragOverlay>
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