import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://eootlprhrjyscnipmcqe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvb3RscHJocmp5c2NuaXBtY3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzOTQ4NDQsImV4cCI6MjA5Nzk3MDg0NH0.JF42iNcV_gh9X0IJuJj26TF-FkiAqZlurLC8acR-wjY'
)

async function test() {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('content')
    .eq('slug', 'write-like-pro-using-sovira-ai')

  console.log('Error:', error)
  if (data && data.length > 0) {
    console.log('Content preview:', data[0].content.substring(0, 500))
    console.log('Content contains nbsp?', data[0].content.includes('&nbsp;'))
    console.log('Content character codes:', data[0].content.substring(0, 50).split('').map(c => c.charCodeAt(0)))
  }
}
test()
