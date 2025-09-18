'use client'

import { useState, useEffect, useRef } from 'react'
import { format, addDays, startOfWeek, addWeeks } from 'date-fns'

interface ContextMenuProps {
  x: number
  y: number
  onClose: () => void
  onMoveToToday: () => void
  onMoveToTomorrow: () => void
  onMoveToFriday: () => void
  onMoveToNextMonday: () => void
  onDelete: () => void
}

export default function ContextMenu({
  x,
  y,
  onClose,
  onMoveToToday,
  onMoveToTomorrow,
  onMoveToFriday,
  onMoveToNextMonday,
  onDelete
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  return (
    <div
      ref={menuRef}
      data-context-menu="true"
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[160px]"
      style={{ left: x, top: y }}
    >
      <button
        onClick={onMoveToToday}
        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors"
      >
        挪到今天
      </button>
      <button
        onClick={onMoveToTomorrow}
        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors"
      >
        挪到明天
      </button>
      <button
        onClick={onMoveToFriday}
        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors"
      >
        挪到周五
      </button>
      <button
        onClick={onMoveToNextMonday}
        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors"
      >
        挪到下周一
      </button>
      <div className="border-t border-gray-200 my-1"></div>
      <button
        onClick={onDelete}
        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
      >
        删除
      </button>
    </div>
  )
} 