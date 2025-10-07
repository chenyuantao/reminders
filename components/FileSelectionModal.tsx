'use client'

import { useState, useRef } from 'react'
import { X, FolderOpen, FileText, Plus, AlertCircle } from 'lucide-react'
import { FileStorageService } from '@/services/fileStorage'

interface FileSelectionModalProps {
  isOpen: boolean
  onFileSelect: (fileHandle: FileSystemFileHandle | null) => void
  onClose: () => void
}

export default function FileSelectionModal({ isOpen, onFileSelect, onClose }: FileSelectionModalProps) {
  const [isSelecting, setIsSelecting] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleOpenExistingFile = async () => {
    try {
      setIsSelecting(true)
      setError(null)

      // 使用现代浏览器的 File System Access API
      if ('showOpenFilePicker' in window) {
        const [fileHandle] = await (window as any).showOpenFilePicker({
          types: [
            {
              description: 'JSON Files',
              accept: {
                'application/json': ['.json']
              }
            },
            {
              description: 'Text Files',
              accept: {
                'text/plain': ['.txt']
              }
            }
          ],
          multiple: false
        })

        if (fileHandle) {
          // 检查文件句柄的兼容性
          try {
            const compatibility = FileStorageService.checkFileHandleCompatibility(fileHandle)
            console.log('文件句柄兼容性:', compatibility)

            if (!compatibility.canWrite) {
              setError('此文件不支持写入，将使用只读模式')
            }
          } catch (error) {
            console.warn('检查文件兼容性失败:', error)
          }

          onFileSelect(fileHandle)
          onClose()
        }
      } else {
        // 回退到传统的文件输入
        fileInputRef.current?.click()
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // 用户取消了选择，不需要显示错误
        return
      }
      setError(err.message || '读取文件时出错')
    } finally {
      setIsSelecting(false)
    }
  }

  const handleCreateNewFile = async () => {
    try {
      setIsCreating(true)
      setError(null)

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
          // 创建空的数据文件
          const emptyData: any[] = []
          await FileStorageService.writeToFile(fileHandle, emptyData)
          
          onFileSelect(fileHandle)
          onClose()
        }
      } else {
        // 回退到传统下载方式
        const emptyData: any[] = []
        const dataStr = JSON.stringify(emptyData, null, 2)
        const dataBlob = new Blob([dataStr], { type: 'application/json' })
        const url = URL.createObjectURL(dataBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = `reminders_${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        // 对于传统方式，我们无法获得文件句柄，所以传递null
        onFileSelect(null)
        onClose()
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // 用户取消了保存，不需要显示错误
        return
      }
      setError(err.message || '创建文件时出错')
    } finally {
      setIsCreating(false)
    }
  }

  const handleTraditionalFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      try {
        // 对于传统文件输入，我们创建一个模拟的 FileSystemFileHandle
        const mockFileHandle = {
          name: file.name,
          kind: 'file' as const,
          async getFile() {
            return file
          },
          async createWritable() {
            // 这里我们无法直接写入文件，所以会回退到 localStorage
            throw new Error('传统文件输入不支持写入，将使用本地存储')
          }
        } as any

        onFileSelect(mockFileHandle)
        onClose()
      } catch (err: any) {
        setError(err.message || '处理文件读取时出错')
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">选择文件</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-gray-600 mb-6">
            请选择要使用的文件，或者创建一个新文件来存储您的提醒事项。
          </p>

          <div className="space-y-3">
            <button
              onClick={handleOpenExistingFile}
              disabled={isSelecting}
              className="flex items-center gap-3 w-full px-4 py-3 text-left text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors disabled:opacity-50"
            >
              <FolderOpen className="w-5 h-5 text-blue-600" />
              <div>
                <div className="font-medium">打开已有文件</div>
                <div className="text-sm text-gray-500">
                  {isSelecting ? '正在选择文件...' : '选择本地存储的提醒事项文件'}
                </div>
              </div>
            </button>

            <button
              onClick={handleCreateNewFile}
              disabled={isCreating}
              className="flex items-center gap-3 w-full px-4 py-3 text-left text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors disabled:opacity-50"
            >
              <Plus className="w-5 h-5 text-green-600" />
              <div>
                <div className="font-medium">创建新文件</div>
                <div className="text-sm text-gray-500">
                  {isCreating ? '正在创建文件...' : '创建新的提醒事项文件'}
                </div>
              </div>
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md mt-4">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
        </div>
      </div>

      {/* 隐藏的传统文件输入，用于不支持 File System Access API 的浏览器 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.txt"
        onChange={handleTraditionalFileSelect}
        className="hidden"
      />
    </div>
  )
}
