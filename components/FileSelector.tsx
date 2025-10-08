'use client'

import { useState, useRef } from 'react'
import { FolderOpen, FileText, AlertCircle } from 'lucide-react'
import { FileStorageService } from '@/services/fileStorage'

interface FileSelectorProps {
  onLoadOtherFile: () => void
  currentFilePath?: string
}

export default function FileSelector({ onLoadOtherFile, currentFilePath }: FileSelectorProps) {

    return (
        <div className="space-y-3">
            <div className="space-y-2">
                {currentFilePath && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded-md">
                        <FileText className="w-4 h-4" />
                        <span className="truncate font-medium">{currentFilePath}</span>
                    </div>
                )}
                
                <button
                    onClick={onLoadOtherFile}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                >
                    <FolderOpen className="w-4 h-4" />
                    加载其它文件
                </button>
            </div>
        </div>
    )
} 