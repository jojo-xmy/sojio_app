/**
 * 浏览器端 Supabase 客户端（anon 公钥 + 项目 URL）。
 *
 * 在开发者工具里能看到 NEXT_PUBLIC_* 是预期行为：Next.js 会把它们打进前端包，
 * 浏览器必须用它们才能直连 Supabase。安全不依赖「藏起」anon key，而依赖：
 * - 数据库 Row Level Security (RLS)
 * - 用户登录后的 JWT（由 Supabase Auth 签发）
 *
 * 切勿把 service_role 密钥放进 NEXT_PUBLIC_* 或在此文件中引用——那会真正泄露管理员权限。
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}

if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)