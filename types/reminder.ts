export interface Reminder {
  id: string
  title: string
  notes?: string
  completed: boolean
  dueDate?: string
  priority?: 'low' | 'medium' | 'high' // 暂时设为可选
  tags?: string[] // 新增：标签数组
  rank: number // 排序字段，rank 越小越靠前
  createdAt: string
  updatedAt: string
}

export interface List {
  id: string
  name: string
  color: string
  createdAt?: string
}

export interface ReminderFormData {
  title: string
  notes?: string
  dueDate?: string
  priority?: 'low' | 'medium' | 'high' // 暂时设为可选
  tags?: string[] // 新增：标签数组
  completed: boolean
} 