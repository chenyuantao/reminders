import { NextResponse } from 'next/server'
import { getSupabaseClient } from '@/utils/supabaseClient'

export async function DELETE(request: Request) {
  try {
    const supabase = getSupabaseClient()
    
    // 从 URL 查询参数获取 id
    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: '缺少必需字段: id（请通过查询参数提供，例如: ?id=xxx）' },
        { status: 400 }
      )
    }

    // 从 Supabase 删除数据
    const { data, error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Supabase 删除错误:', error)
      return NextResponse.json(
        { error: '删除提醒事项失败', details: error.message },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: '未找到要删除的提醒事项' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '提醒事项已成功删除',
      data: { id },
    })
  } catch (error) {
    console.error('API 错误:', error)
    return NextResponse.json(
      { error: '服务器内部错误', details: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    )
  }
}

