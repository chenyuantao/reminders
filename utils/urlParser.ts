/**
 * URL识别和解析工具函数
 * 用于识别文本中的URL并提供链接功能
 */

// URL正则表达式，匹配http(s)、ftp、www等常见URL格式
const URL_REGEX = /((?:https?|ftp):\/\/[^\s/$.?#].[^\s]*|www\.[^\s/$.?#].[^\s]*|[^\s]*\.[a-z]{2,}(?:\/[^\s]*)?)/gi

// 更严格的URL正则表达式，减少误匹配
const STRICT_URL_REGEX = /((?:https?|ftp):\/\/(?:[-\w.])+(?:\:[0-9]+)?(?:\/(?:[\w._~!$&'()*+,;=:@-]|%[0-9a-f]{2})*)*(?:\?(?:[\w._~!$&'()*+,;=:@/?-]|%[0-9a-f]{2})*)?(?:#(?:[\w._~!$&'()*+,;=:@/?-]|%[0-9a-f]{2})*)?|www\.(?:[-\w.])+(?:\:[0-9]+)?(?:\/(?:[\w._~!$&'()*+,;=:@-]|%[0-9a-f]{2})*)*(?:\?(?:[\w._~!$&'()*+,;=:@/?-]|%[0-9a-f]{2})*)?(?:#(?:[\w._~!$&'()*+,;=:@/?-]|%[0-9a-f]{2})*)?)/gi

export interface TextSegment {
  type: 'text' | 'url'
  content: string
  url?: string // 对于URL类型，提供完整的可点击URL
}

/**
 * 解析文本，识别其中的URL并返回文本段落数组
 */
export function parseTextWithUrls(text: string): TextSegment[] {
  if (!text) return []

  const segments: TextSegment[] = []
  let lastIndex = 0

  // 使用正则表达式查找所有URL
  let match
  STRICT_URL_REGEX.lastIndex = 0 // 重置正则表达式状态

  while ((match = STRICT_URL_REGEX.exec(text)) !== null) {
    const matchedUrl = match[0]
    const matchStart = match.index
    const matchEnd = matchStart + matchedUrl.length

    // 添加URL前面的普通文本
    if (matchStart > lastIndex) {
      segments.push({
        type: 'text',
        content: text.slice(lastIndex, matchStart)
      })
    }

    // 处理URL，确保有协议前缀
    let fullUrl = matchedUrl
    if (!matchedUrl.match(/^https?:\/\//i)) {
      if (matchedUrl.startsWith('www.')) {
        fullUrl = `https://${matchedUrl}`
      } else if (matchedUrl.includes('.')) {
        // 简单的域名形式，添加https://前缀
        fullUrl = `https://${matchedUrl}`
      }
    }

    // 添加URL段落
    segments.push({
      type: 'url',
      content: matchedUrl,
      url: fullUrl
    })

    lastIndex = matchEnd
  }

  // 添加最后剩余的普通文本
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.slice(lastIndex)
    })
  }

  return segments
}

/**
 * 验证URL是否有效
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * 安全地打开URL，在新标签页中打开
 */
export function safeOpenUrl(url: string): void {
  if (!isValidUrl(url)) {
    console.warn('无效的URL:', url)
    return
  }

  // 在新标签页中打开，并设置安全属性
  const link = document.createElement('a')
  link.href = url
  link.target = '_blank'
  link.rel = 'noopener noreferrer' // 安全属性，防止新页面访问原页面
  link.click()
}