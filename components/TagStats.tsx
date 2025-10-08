'use client'

import CircularProgress from './CircularProgress'

interface TagStatsProps {
  tagCounts: Record<string, number>
  tagCompletionRates: Record<string, number>
  tagCompletionStats: Record<string, { total: number; completed: number }>
  className?: string
  activeHashtagFilters?: Set<string>
  onHashtagClick?: (tag: string) => void
}

export default function TagStats({ 
  tagCounts, 
  tagCompletionRates, 
  tagCompletionStats, 
  className = '',
  activeHashtagFilters = new Set(),
  onHashtagClick
}: TagStatsProps) {
  if (Object.keys(tagCounts).length === 0) {
    return null
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex items-center gap-2">
        {Object.entries(tagCounts).map(([tag, count]) => {
          const completionRate = tagCompletionRates[tag] || 0
          const stats = tagCompletionStats[tag] || { total: 0, completed: 0 }
          const isActive = activeHashtagFilters.has(tag)
          
          return (
            <div
              key={tag}
              className={`flex items-center gap-2 px-2 py-1 rounded-md shadow-sm transition-all duration-200 hover:scale-105 cursor-pointer ${
                isActive 
                  ? 'bg-blue-100 border-2 border-blue-500 shadow-md' 
                  : 'bg-white border border-gray-200 hover:shadow-md'
              }`}
              title={`${tag}: ${stats.completed}/${stats.total}个任务，完成率 ${Math.round(completionRate)}%${isActive ? ' (已激活筛选)' : ' (点击激活筛选)'}`}
              onClick={() => onHashtagClick?.(tag)}
            >
              <CircularProgress
                percentage={completionRate}
                size={28}
                strokeWidth={3}
                color={completionRate === 100 ? '#10B981' : completionRate >= 80 ? '#3B82F6' : completionRate >= 50 ? '#F59E0B' : '#EF4444'}
                showText={false}
              />
              <div className="flex flex-col items-start min-w-0">
                <span className={`text-xs font-medium truncate max-w-32 ${
                  isActive ? 'text-blue-700' : 'text-gray-700'
                }`}>
                  #{tag}
                </span>
                <span className={`text-xs font-mono ${
                  isActive ? 'text-blue-600' : 'text-gray-500'
                }`}>
                  {stats.completed}/{stats.total}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
} 