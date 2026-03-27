import { createClient } from '@supabase/supabase-js'

// You must add these environment variables in a .env file at the root of your project
// VITE_SUPABASE_URL=your_supabase_url
// VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nltdcgsmvppjlmafkkan.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_2BCTvVFQp2haxtK1ffjybg_AIZnroHQ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
