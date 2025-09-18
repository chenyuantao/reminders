'use client'

import { useState, useRef } from 'react'
import { FolderOpen, FileText, AlertCircle } from 'lucide-react'
import { FileStorageService } from '@/services/fileStorage'

interface FileSelectorProps {
  onFileSelect: (fileHandle: FileSystemFileHandle | null) => void
  onSaveAsFile: () => void
  currentFilePath?: string
}

export default function FileSelector({ onFileSelect, onSaveAsFile, currentFilePath }: FileSelectorProps) {
    const [isSelecting, setIsSelecting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileSelect = async () => {
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
            } catch (err: any) {
                setError(err.message || '处理文件读取时出错')
            }
        }
    }

    const handleClearFile = () => {
        onFileSelect(null)
    }

    return (
        <div className="space-y-3">
            

            <div className="space-y-2">
                {
                    currentFilePath && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded-md">
                            <FileText className="w-4 h-4" />
                            <span className="truncate font-medium">{currentFilePath}</span>
                        </div>
                    )
                }
                <button
                    onClick={handleFileSelect}
                    disabled={isSelecting}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors disabled:opacity-50"
                >
                    <FolderOpen className="w-4 h-4" />
                    {isSelecting ? '读取中...' : '读取本地文件'}
                </button>

                <button
                    onClick={onSaveAsFile}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-green-600 hover:text-green-700 hover:bg-green-50 rounded-md transition-colors"
                >
                    <FileText className="w-4 h-4" />
                    保存为文件
                </button>
            </div>

            {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded-md">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}

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