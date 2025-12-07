import { NextResponse } from 'next/server'
import { Reminder } from '@/types/reminder'
import { fromDatabaseFormat } from '@/utils/dbConverter'
import { getSupabaseClient } from '@/utils/supabaseClient'

export async function GET() {
    try {
        const supabase = getSupabaseClient()

        // 从 Supabase 获取所有 reminders，按 rank 排序
        const { data: reminders, error } = await supabase
            .from('reminders')
            .select('*')
            .limit(1000);

        if (error) {
            console.error('Supabase 查询错误:', error)
            return NextResponse.json(
                { error: '获取提醒事项失败', details: error.message },
                { status: 500 }
            )
        }

        // 确保返回的数据符合 Reminder 类型
        const typedReminders: Reminder[] = (reminders || []).map((reminder: any) => 
            fromDatabaseFormat(reminder)
        )

        return NextResponse.json({
            success: true,
            data: typedReminders,
            count: typedReminders.length,
        })
    } catch (error) {
        console.error('API 错误:', error)
        return NextResponse.json(
            { error: '服务器内部错误', details: error instanceof Error ? error.message : '未知错误' },
            { status: 500 }
        )
    }
}

