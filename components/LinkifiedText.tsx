'use client'

import React from 'react'
import { parseTextWithUrls, safeOpenUrl } from '@/utils/urlParser'

interface LinkifiedTextProps {
  text: string
  className?: string
  linkClassName?: string
  showIcon?: boolean
}

/**
 * 可点击链接文本组件
 * 自动识别文本中的URL并将其转换为可点击的链接
 */
export default function LinkifiedText({ 
  text, 
  className = '', 
  linkClassName = '',
  showIcon = true 
}: LinkifiedTextProps) {
  if (!text) return null

  const segments = parseTextWithUrls(text)

  // 如果没有找到URL，直接返回普通文本
  if (segments.length === 0 || segments.every(segment => segment.type === 'text')) {
    return <span className={className}>{text}</span>
  }

  return (
    <span className={className}>
      {segments.map((segment, index) => {
        if (segment.type === 'text') {
          return <span key={index}>{segment.content}</span>
        }

        // URL段落，渲染为可点击链接
        return (
          <span
            key={index}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (segment.url) {
                safeOpenUrl(segment.url)
              }
            }}
            className={`text-blue-600 hover:text-blue-800 underline cursor-pointer transition-colors break-all ${linkClassName}`}
            title={`点击打开: ${segment.url}`}
            style={{
              wordBreak: 'break-all',
              overflowWrap: 'break-word',
              hyphens: 'auto'
            }}
          >
            {segment.content}
          </span>
        )
      })}
    </span>
  )
}

/**
 * 简化版本的链接文本组件，不显示图标
 */
export function SimpleLinkifiedText({ text, className = '', linkClassName = '' }: Omit<LinkifiedTextProps, 'showIcon'>) {
  return (
    <LinkifiedText 
      text={text} 
      className={className} 
      linkClassName={linkClassName} 
      showIcon={false} 
    />
  )
}