'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Lock, AlertCircle } from 'lucide-react'

interface InviteCodeModalProps {
  isOpen: boolean
  onSubmit: (inviteCode: string) => Promise<void>
  error?: string | null
  isLoading?: boolean
}

export default function InviteCodeModal({ isOpen, onSubmit, error, isLoading }: InviteCodeModalProps) {
  const [inviteCode, setInviteCode] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // 当弹窗打开时，自动聚焦输入框
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // 重置状态
  useEffect(() => {
    if (!isOpen) {
      setInviteCode('')
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (inviteCode.trim()) {
      await onSubmit(inviteCode.trim())
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-900">请输入邀请码</h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <p className="text-gray-600 mb-4">
            请输入您的邀请码以访问应用。
          </p>

          <div className="mb-4">
            <input
              ref={inputRef}
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="请输入邀请码"
              disabled={isLoading}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              autoComplete="off"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md mb-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!inviteCode.trim() || isLoading}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? '验证中...' : '确认'}
          </button>
        </form>
      </div>
    </div>
  )
}

