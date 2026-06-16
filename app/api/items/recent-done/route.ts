import { NextResponse } from 'next/server'
import { Reminder } from '@/types/reminder'
import { fromDatabaseFormat } from '@/utils/dbConverter'
import { getSupabaseClient } from '@/utils/supabaseClient'
import { checkCode } from '@/utils/checkCode'

const DEFAULT_RANGE_MS = 7 * 24 * 60 * 60 * 1000

export async function GET(request: Request) {
    try {
        const res = checkCode(request)
        if (res) return res

        const url = new URL(request.url)
        const now = new Date()
        const toParam = url.searchParams.get('to')
        const fromParam = url.searchParams.get('from')

        const to = toParam ? new Date(toParam) : now
        const from = fromParam ? new Date(fromParam) : new Date(to.getTime() - DEFAULT_RANGE_MS)

        if (isNaN(from.getTime()) || isNaN(to.getTime())) {
            return NextResponse.json(
                { error: '时间参数无效', details: 'from / to 需为 ISO 8601 时间戳' },
                { status: 400 }
            )
        }

        const supabase = getSupabaseClient()

        const { data: reminders, error } = await supabase
            .from('reminders')
            .select('*')
            .eq('completed', true)
            .gte('updatedAt', from.toISOString())
            .lt('updatedAt', to.toISOString())
            .order('updatedAt', { ascending: false })
            .limit(500)

        if (error) {
            console.error('Supabase 查询错误:', error)
            return NextResponse.json(
                { error: '获取提醒事项失败', details: error.message },
                { status: 500 }
            )
        }

        const typedReminders: Reminder[] = (reminders || []).map((reminder: any) =>
            fromDatabaseFormat(reminder)
        )

        return NextResponse.json({
            success: true,
            range: { from: from.toISOString(), to: to.toISOString() },
            count: typedReminders.length,
            data: typedReminders,
        })
    } catch (error) {
        console.error('API 错误:', error)
        return NextResponse.json(
            { error: '服务器内部错误', details: error instanceof Error ? error.message : '未知错误' },
            { status: 500 }
        )
    }
}
