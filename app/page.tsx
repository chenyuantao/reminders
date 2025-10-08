'use client'

import { useState, useEffect, useMemo } from 'react'
import Sidebar from '@/components/Sidebar'
import ReminderList from '@/components/ReminderList'
import FileSelectionModal from '@/components/FileSelectionModal'
import { Reminder, List } from '@/types/reminder'
import { startOfWeek, addWeeks, isSameDay } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { FileStorageService } from '@/services/fileStorage'
import { extractTagsFromReminder, calculateAllTagStatistics } from '@/utils/tagExtractor'
import TagStats from '@/components/TagStats'

export default function Home() {
  const [selectedList, setSelectedList] = useState<string>('all')
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [lists, setLists] = useState<List[]>([])
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date())
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null)
  const [newlyCreatedReminderId, setNewlyCreatedReminderId] = useState<string | null>(null)
  const [showFileSelectionModal, setShowFileSelectionModal] = useState<boolean>(false)

  // 切换到上一周
  const goToPreviousWeek = () => {
    setCurrentWeek(prev => addWeeks(prev, -1))
  }

  // 切换到下一周
  const goToNextWeek = () => {
    setCurrentWeek(addWeeks(currentWeek, 1))
  }

  const goToCurrentWeek = () => {
    setCurrentWeek(new Date())
  }

  // 获取当前显示的标题
  const getCurrentTitle = () => {
    if (selectedList === 'all') {
      const year = currentWeek.getFullYear()
      const month = currentWeek.getMonth() + 1
      const dayOfMonth = currentWeek.getDate()
      const weekInMonth = Math.ceil(dayOfMonth / 7)
      return `Y${year}M${month}W${weekInMonth}`
    }
    return lists.find(list => list.id === selectedList)?.name || '提醒事项'
  }

  // 当selectedList改变时，重置为当前周
  useEffect(() => {
    if (selectedList === 'all') {
      setCurrentWeek(new Date())
    }
  }, [selectedList])

  useEffect(() => {
    // 初始化列表
    setLists([
      { id: 'all', name: '每周事项', color: '#007AFF' },
      { id: 'today', name: '今天', color: '#FF9500' },
      { id: 'scheduled', name: '未完成', color: '#5856D6' },
      { id: 'completed', name: '已完成', color: '#FF3B30' }
    ]);

    // 检查是否需要显示文件选择对话框
    checkFileSelectionNeeded()
  }, [])

  // 页面关闭时清理writable流
  useEffect(() => {
    const handleBeforeUnload = () => {
      FileStorageService.closePersistentWritable()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  // 监听粘贴事件，自动添加待办事项
  useEffect(() => {
    const handlePaste = async (event: ClipboardEvent) => {
      // 检查当前焦点元素是否为输入框
      const activeElement = document.activeElement
      const isInInputField = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.getAttribute('contenteditable') === 'true'
      )

      // 如果在输入框中，不处理粘贴事件
      if (isInInputField) {
        return
      }

      // 防止默认粘贴行为
      event.preventDefault()

      try {
        // 获取粘贴板内容
        const clipboardText = event.clipboardData?.getData('text/plain')
        
        if (clipboardText && clipboardText.trim()) {
          const today = new Date()
          
          // 创建新的提醒事项，标题为粘贴的内容
          const newReminder: Reminder = {
            id: Date.now().toString(),
            title: clipboardText.trim(),
            notes: '',
            dueDate: today.toISOString(),
            tags: [], // 标签会在后续的提取过程中自动添加
            completed: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }

          // 提取标签
          const tags = extractTagsFromReminder(newReminder.title, newReminder.notes)
          newReminder.tags = tags

          // 添加到提醒事项列表
          const updatedReminders = [...reminders, newReminder]
          setReminders(updatedReminders)

          // 保存数据
          FileStorageService.saveData(updatedReminders).catch(error => {
            console.error('保存数据失败:', error)
          })

          console.log('已自动添加粘贴内容到今天的待办事项:', clipboardText.trim())
        }
      } catch (error) {
        console.error('处理粘贴事件失败:', error)
      }
    }

    // 添加粘贴事件监听器
    document.addEventListener('paste', handlePaste)
    
    return () => {
      document.removeEventListener('paste', handlePaste)
    }
  }, [reminders]) // 依赖reminders数组以获取最新状态

  // 检查是否需要显示文件选择对话框
  const checkFileSelectionNeeded = async () => {
    try {
      // 检查是否有有效的文件访问权限
      const hasFileAccess = await FileStorageService.verifyFileAccess()
      
      if (!hasFileAccess) {
        // 没有有效的文件访问权限，显示文件选择对话框
        setShowFileSelectionModal(true)
        return
      }

      // 如果有文件访问权限，加载数据
      await loadDataAndFileInfo()
    } catch (error) {
      console.error('检查文件访问权限失败:', error)
      // 出错时也显示文件选择对话框
      setShowFileSelectionModal(true)
    }
  }

  // 加载数据和文件信息
  const loadDataAndFileInfo = async () => {
    try {
      // 首先尝试从localStorage加载数据作为备用
      const savedReminders = localStorage.getItem('reminders')
      if (savedReminders) {
        setReminders(JSON.parse(savedReminders))
      }

      // 检查文件访问权限
      const hasFileAccess = await FileStorageService.verifyFileAccess()

      if (hasFileAccess) {
        // 如果有文件访问权限，尝试从文件加载数据
        try {
          const data = await FileStorageService.loadData()
          if (data && data.length > 0) {
            setReminders(data)
          }
        } catch (error) {
          console.warn('从文件加载数据失败，使用localStorage数据:', error)
        }
      }

      // 更新文件路径显示
      const fileInfo = FileStorageService.getFileStorageInfo()
      setCurrentFilePath(fileInfo.filePath)
    } catch (error) {
      console.error('加载数据失败:', error)
      // 已经设置了localStorage数据，不需要额外处理
    }
  }

  // 处理文件选择
  const handleFileSelect = async (fileHandle: FileSystemFileHandle | null) => {
    try {
      if (fileHandle) {
        setCurrentFilePath(fileHandle.name)

        // 尝试从文件读取数据
        try {
          const data = await FileStorageService.readFromFile(fileHandle)
          setReminders(data || [])
          
          // 设置文件句柄时传递初始数据，这样会在创建持久化writable流时自动写入
          await FileStorageService.setFileHandle(fileHandle, data || [])
        } catch (error) {
          console.warn('从文件读取数据失败，使用空数据:', error)
          setReminders([])

          // 检查文件句柄兼容性
          try {
            const compatibility = FileStorageService.checkFileHandleCompatibility(fileHandle)
            console.log('文件句柄兼容性检查:', compatibility)

            if (!compatibility.canRead) {
              alert('此文件不支持读取，请选择其他文件或使用localStorage')
            }
          } catch (compatError) {
            console.warn('兼容性检查失败:', compatError)
          }
        }
      } else {
        // 清除文件读取
        FileStorageService.clearFileStorageInfo()
        setCurrentFilePath(null)

        // 回退到localStorage
        const savedReminders = localStorage.getItem('reminders')
        if (savedReminders) {
          setReminders(JSON.parse(savedReminders))
        }
      }
      
      // 关闭文件选择对话框
      setShowFileSelectionModal(false)
    } catch (error) {
      console.error('处理文件选择失败:', error)
    }
  }

  // 保存为本地文件
  const handleSaveAsFile = async () => {
    try {
      // 使用现代浏览器的 File System Access API
      if ('showSaveFilePicker' in window) {
        const fileHandle = await (window as any).showSaveFilePicker({
          suggestedName: `reminders_${new Date().toISOString().split('T')[0]}.json`,
          types: [
            {
              description: 'JSON Files',
              accept: {
                'application/json': ['.json']
              }
            }
          ]
        })

        if (fileHandle) {
          // 写入数据到新文件
          await FileStorageService.writeToFile(fileHandle, reminders)

          // 设置新文件为当前文件（这会创建持久化writable流，并写入初始数据）
          await FileStorageService.setFileHandle(fileHandle, reminders)
          setCurrentFilePath(fileHandle.name)

          console.log('数据已保存到文件:', fileHandle.name)
        }
      } else {
        // 回退到传统下载方式
        const dataStr = JSON.stringify(reminders, null, 2)
        const dataBlob = new Blob([dataStr], { type: 'application/json' })
        const url = URL.createObjectURL(dataBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = `reminders_${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        console.log('数据已下载为文件')
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        // 用户取消了保存，不需要显示错误
        return
      }
      console.error('保存文件失败:', error)
      alert('保存文件失败: ' + (error.message || '未知错误'))
    }
  }

  const addReminder = (insertPosition?: number, targetDate?: Date) => {
    // 当选择"每周事项"且没有指定日期时，设置为当前选择周的第一天
    let dueDate = targetDate
    if (selectedList === 'all' && !targetDate) {
      const startOfCurrentWeek = startOfWeek(currentWeek, { weekStartsOn: 1 })
      dueDate = startOfCurrentWeek
    }

    const newReminder: Reminder = {
      id: Date.now().toString(),
      title: '',
      notes: '',
      dueDate: dueDate ? dueDate.toISOString() : undefined,
      // priority: 'medium', // 暂时不写入priority数据
      tags: [], // 初始化为空数组
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    let updatedReminders: Reminder[]
    if (insertPosition !== undefined && insertPosition >= 0 && insertPosition <= reminders.length) {
      // 在指定位置插入
      updatedReminders = [
        ...reminders.slice(0, insertPosition),
        newReminder,
        ...reminders.slice(insertPosition)
      ]
    } else {
      // 在末尾添加
      updatedReminders = [...reminders, newReminder]
    }

    setReminders(updatedReminders)

    // 保存数据（优先保存到文件，失败则保存到localStorage）
    FileStorageService.saveData(updatedReminders).catch(error => {
      console.error('保存数据失败:', error)
    })

    // 返回新创建的提醒事项ID，用于立即进入编辑态
    return newReminder.id
  }

  const toggleReminder = (id: string) => {
    const updatedReminders = reminders.map(reminder =>
      reminder.id === id ? { ...reminder, completed: !reminder.completed, updatedAt: new Date().toISOString() } : reminder
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
      // 如果都是未完成，保持原有顺序
      return 0
    })
    setReminders(updatedReminders)
    FileStorageService.saveData(updatedReminders).catch(error => {
      console.error('保存数据失败:', error)
    })
  }

  const deleteReminder = (id: string) => {
    const updatedReminders = reminders.filter(reminder => reminder.id !== id)
    setReminders(updatedReminders)
    FileStorageService.saveData(updatedReminders).catch(error => {
      console.error('保存数据失败:', error)
    })
  }

  const updateReminder = (id: string, updates: Partial<Reminder>) => {
    // 如果更新了标题或备注，提取标签
    let tags = updates.tags
    if (updates.title !== undefined || updates.notes !== undefined) {
      const currentReminder = reminders.find(r => r.id === id)
      if (currentReminder) {
        const newTitle = updates.title !== undefined ? updates.title : currentReminder.title
        const newNotes = updates.notes !== undefined ? updates.notes : currentReminder.notes
        tags = extractTagsFromReminder(newTitle, newNotes)
      }
    }

    const updatedReminders = reminders.map(reminder =>
      reminder.id === id ? { ...reminder, ...updates, tags } : reminder
    )
    setReminders(updatedReminders)
    FileStorageService.saveData(updatedReminders).catch(error => {
      console.error('保存数据失败:', error)
    })
  }

  const reorderReminders = (newOrder: Reminder[]) => {
    setReminders(newOrder)
    FileStorageService.saveData(newOrder).catch(error => {
      console.error('保存数据失败:', error)
    })
  }

  // 批量移动提醒事项
  const handleBatchMove = (reminderIds: string[], targetDate: Date) => {
    const updatedReminders = reminders.map(reminder => 
      reminderIds.includes(reminder.id)
        ? { ...reminder, dueDate: targetDate.toISOString(), updatedAt: new Date().toISOString() }
        : reminder
    )
    setReminders(updatedReminders)
    FileStorageService.saveData(updatedReminders).catch(error => {
      console.error('保存数据失败:', error)
    })
  }

  // 批量删除提醒事项
  const handleBatchDelete = (reminderIds: string[]) => {
    const updatedReminders = reminders.filter(reminder => !reminderIds.includes(reminder.id))
    setReminders(updatedReminders)
    FileStorageService.saveData(updatedReminders).catch(error => {
      console.error('保存数据失败:', error)
    })
  }

  // 处理标签点击，创建带有相同标签的新事项
  const handleTagClick = (date: Date, tag: string) => {
    // 创建新的提醒事项
    const newReminder: Reminder = {
      id: Date.now().toString(),
      title: `#${tag} `,
      notes: '',
      completed: false,
      dueDate: date.toISOString(),
      tags: [tag], // 预填充标签
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    // 添加到提醒事项列表
    const updatedReminders = [...reminders, newReminder]
    setReminders(updatedReminders)
    FileStorageService.saveData(updatedReminders).catch(error => {
      console.error('保存数据失败:', error)
    })
    
    // 设置新创建的事项ID，用于立即进入编辑态
    setNewlyCreatedReminderId(newReminder.id)
    
    // 延迟清理，确保编辑状态能够正确触发
    setTimeout(() => {
      setNewlyCreatedReminderId(null)
    }, 100)
  }

  // 处理加载其它文件
  const handleLoadOtherFile = () => {
    console.log('📁 用户请求加载其它文件')
    setShowFileSelectionModal(true)
  }

  const getFilteredReminders = (
    filterSelectedList = selectedList
  ) => {
    if (filterSelectedList === 'all') {
      // 当选择"每周事项"时，根据当前选择的周来过滤
      const startOfCurrentWeek = startOfWeek(currentWeek, { weekStartsOn: 1 })
      const endOfCurrentWeek = new Date(startOfCurrentWeek)
      endOfCurrentWeek.setDate(endOfCurrentWeek.getDate() + 6)
      // endOfCurrentWeek 设置为 23:59:59
      endOfCurrentWeek.setHours(23, 59, 59, 999)

      return reminders.filter(reminder => {
        if (reminder.dueDate) {
          const dueDate = new Date(reminder.dueDate)
          return dueDate >= startOfCurrentWeek && dueDate <= endOfCurrentWeek
        }
        return false
      })
    }
    if (filterSelectedList === 'today') {
      const today = new Date()
      return reminders.filter(reminder =>
        reminder.dueDate && isSameDay(new Date(reminder.dueDate), today)
      )
    }
    if (filterSelectedList === 'scheduled') {
      return reminders.filter(reminder => reminder.dueDate)
    }
    if (filterSelectedList === 'completed') {
      return reminders.filter(reminder => reminder.completed)
    }
    return reminders
  }

  const filteredReminders = getFilteredReminders();
  // 优化：使用 useMemo 缓存标签统计数据，避免重复计算
  const tagStatistics = useMemo(() => {
    const allTagsStat = calculateAllTagStatistics(getFilteredReminders('scheduled'));
    const existedTags = new Set<string>();
    filteredReminders.forEach(reminder => {
      (reminder.tags || []).forEach(tag => {
        existedTags.add(tag);
      });
    });
    // allTagsStat中只保留 existedTags 中的标签
    Object.keys(allTagsStat.tagCounts).forEach(tag => {
      if (!existedTags.has(tag)) {
        delete allTagsStat.tagCounts[tag];
        delete allTagsStat.tagCompletionRates[tag];
        delete allTagsStat.tagCompletionStats[tag];
      }
    });
    return allTagsStat;
  }, [reminders, selectedList, currentWeek, filteredReminders])

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <Sidebar
        lists={lists}
        selectedList={selectedList}
        onSelectList={setSelectedList}
        onLoadOtherFile={handleLoadOtherFile}
        currentFilePath={currentFilePath || undefined}
      />

      <div className="flex-1 flex flex-col min-h-0">
        <header className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-0">
              <h1 className="text-2xl font-semibold text-gray-900" style={{
                minWidth: '170px'
              }}>
                {getCurrentTitle()}
              </h1>
              {selectedList === 'all' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={goToPreviousWeek}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                    title="上一周"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={goToNextWeek}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                    title="下一周"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  {(() => {
                    const today = new Date()
                    const isCurrentWeek = isSameDay(startOfWeek(currentWeek, { weekStartsOn: 1 }), startOfWeek(today, { weekStartsOn: 1 }))

                    if (!isCurrentWeek) {
                      return (
                        <button
                          onClick={goToCurrentWeek}
                          className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md border border-blue-200 hover:border-blue-300 transition-colors"
                          title="回到本周"
                        >
                          回到本周
                        </button>
                      )
                    }

                    return null
                  })()}
                </div>
              )}
            </div>

            {/* 标签统计显示 */}
            <TagStats
              {...tagStatistics}
            />
          </div>
        </header>

        <main className="flex-1 min-h-0">
          <ReminderList
            reminders={filteredReminders}
            onToggle={toggleReminder}
            onDelete={deleteReminder}
            onUpdate={updateReminder}
            onReorder={reorderReminders}
            onAddReminder={addReminder}
            onTagClick={handleTagClick}
            onBatchMove={handleBatchMove}
            onBatchDelete={handleBatchDelete}
            newlyCreatedReminderId={newlyCreatedReminderId}
            currentWeek={currentWeek}
            selectedList={selectedList}
          />
        </main>
      </div>

      {/* 文件选择模态框 */}
      <FileSelectionModal
        isOpen={showFileSelectionModal}
        onFileSelect={handleFileSelect}
        onClose={() => setShowFileSelectionModal(false)}
      />
    </div>
  )
} 