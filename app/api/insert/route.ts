import { NextResponse } from 'next/server'
import { Reminder } from '@/types/reminder'
import { randomUUID } from 'crypto'
import { toDatabaseFormat, fromDatabaseFormat } from '@/utils/dbConverter'
import { getSupabaseClient } from '@/utils/supabaseClient'
import { checkCode } from '@/utils/checkCode'

export async function POST(request: Request) {
  try {
    const res = checkCode(request)
    if (res) return res

    const supabase = getSupabaseClient()
    const body = await request.json()

    // 准备插入的数据（将 camelCase 转换为 snake_case）
    const now = new Date().toISOString()
    const reminderData: Partial<Reminder> = {
      id: body.id || randomUUID(),
      title: body.title || '',
      notes: body.notes,
      completed: body.completed ?? false,
      dueDate: body.dueDate,
      priority: body.priority,
      tags: body.tags,
      rank: body.rank ?? 0,
      createdAt: body.createdAt || now,
      updatedAt: body.updatedAt || now,
    }
    
    const insertData = toDatabaseFormat(reminderData)

    // 插入数据到 Supabase
    const { data, error } = await supabase
      .from('reminders')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Supabase 插入错误:', error)
      return NextResponse.json(
        { error: '创建提醒事项失败', details: error.message },
        { status: 500 }
      )
    }

    // 转换返回的数据格式（snake_case 转 camelCase）
    const reminder = fromDatabaseFormat(data)

    return NextResponse.json({
      success: true,
      data: reminder,
    })
  } catch (error) {
    console.error('API 错误:', error)
    return NextResponse.json(
      { error: '服务器内部错误', details: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    )
  }
}

