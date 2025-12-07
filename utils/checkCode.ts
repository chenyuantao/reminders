import { NextResponse } from 'next/server'

export const checkCode = (request: Request) => {
    // 从查询参数获取邀请码 或者从 cookie中获取
    const url = new URL(request.url)
    const inviteCodeUrl = url.searchParams.get('inviteCode')
    const cookie = request.headers.get('Cookie')
    const cookieInviteCode = cookie?.split(';').find(c => c.trim().startsWith('reminder_invite_code='))?.split('=')[1]
    const inviteCode = inviteCodeUrl || cookieInviteCode
    if (!inviteCode) {
        return NextResponse.json(
            { error: '缺少邀请码', details: '请提供邀请码参数' },
            { status: 401 }
        )
    }
    if (inviteCode !== process.env.CODE) {
        return NextResponse.json(
            { error: '邀请码无效', details: '您提供的邀请码不正确，无法访问应用' },
            { status: 403 }
        )
    }
    return null
}