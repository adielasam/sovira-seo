import { createClient } from '@supabase/supabase-js'

const url = 'https://eootlprhrjyscnipmcqe.supabase.co'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvb3RscHJocmp5c2NuaXBtY3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzOTQ4NDQsImV4cCI6MjA5Nzk3MDg0NH0.JF42iNcV_gh9X0IJuJj26TF-FkiAqZlurLC8acR-wjY'
const supabase = createClient(url, key)

async function run() {
  console.log('Testing SELECT with relation...')
  const { data, error } = await supabase
    .from('activity_logs')
    .select(`*, user_profiles ( email )`)
    .limit(5)
  console.log('SELECT data:', data)
  console.log('SELECT error:', error)
}

run()
