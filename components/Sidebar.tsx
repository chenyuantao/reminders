'use client'

import { List, Calendar, Flag, CheckCircle } from 'lucide-react'
import { List as ListType } from '@/types/reminder'
import FileSelector from './FileSelector'

interface SidebarProps {
  lists: ListType[]
  selectedList: string
  onSelectList: (listId: string) => void
  onFileSelect: (fileHandle: FileSystemFileHandle | null) => void
  onSaveAsFile: () => void
  currentFilePath?: string
}

const getIcon = (listId: string) => {
  switch (listId) {
    case 'all':
      return <List className="w-5 h-5" />
    case 'today':
      return <Calendar className="w-5 h-5" />
    case 'scheduled':
      return <Calendar className="w-5 h-5" />
    case 'completed':
      return <Flag className="w-5 h-5" />
    default:
      return <CheckCircle className="w-5 h-5" />
  }
}

export default function Sidebar({ lists, selectedList, onSelectList, onFileSelect, onSaveAsFile, currentFilePath }: SidebarProps) {
  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col" style={{
      width: '13rem',
    }}>
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">提醒事项</h2>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {lists.map((list) => (
          <button
            key={list.id}
            onClick={() => onSelectList(list.id)}
            className={`sidebar-item w-full text-left ${selectedList === list.id ? 'active' : 'text-gray-700'
              }`}
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: list.color }}
            />
            {getIcon(list.id)}
            <span className="flex-1">{list.name}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <FileSelector
          onFileSelect={onFileSelect}
          onSaveAsFile={onSaveAsFile}
          currentFilePath={currentFilePath}
        />
      </div>
    </div>
  )
} 