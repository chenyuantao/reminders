import { createClient } from '@supabase/supabase-js'

/**
 * 创建 Supabase 客户端
 * @returns Supabase 客户端实例
 * @throws 如果缺少必需的环境变量则抛出错误
 */
export function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('缺少 Supabase 环境变量: SUPABASE_URL 或 SUPABASE_ANON_KEY')
  }

  return createClient(supabaseUrl, supabaseAnonKey)
}

