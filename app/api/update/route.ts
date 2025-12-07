import { NextResponse } from 'next/server'
import { Reminder } from '@/types/reminder'
import { toDatabaseFormat, fromDatabaseFormat } from '@/utils/dbConverter'
import { getSupabaseClient } from '@/utils/supabaseClient'
import { checkCode } from '@/utils/checkCode'

export async function PUT(request: Request) {
  try {
    const res = checkCode(request)
    if (res) return res

    const supabase = getSupabaseClient()
    const body = await request.json()

    // 验证必需字段
    if (!body.id) {
      return NextResponse.json(
        { error: '缺少必需字段: id' },
        { status: 400 }
      )
    }

    // 准备更新的数据（将 camelCase 转换为 snake_case）
    const now = new Date().toISOString()
    const updateData: Partial<Reminder> = {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.completed !== undefined && { completed: body.completed }),
      ...(body.dueDate !== undefined && { dueDate: body.dueDate }),
      ...(body.priority !== undefined && { priority: body.priority }),
      ...(body.tags !== undefined && { tags: body.tags }),
      ...(body.rank !== undefined && { rank: body.rank }),
      updatedAt: now, // 总是更新 updatedAt
    }

    const dbUpdateData = toDatabaseFormat(updateData)

    // 更新数据到 Supabase
    const { data, error } = await supabase
      .from('reminders')
      .update(dbUpdateData)
      .eq('id', body.id)
      .select()
      .single()

    if (error) {
      console.error('Supabase 更新错误:', error)
      return NextResponse.json(
        { error: '更新提醒事项失败', details: error.message },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: '未找到要更新的提醒事项' },
        { status: 404 }
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

