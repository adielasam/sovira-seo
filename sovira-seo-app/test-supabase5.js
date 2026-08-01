import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabase = createClient(
  'https://eootlprhrjyscnipmcqe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvb3RscHJocmp5c2NuaXBtY3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzOTQ4NDQsImV4cCI6MjA5Nzk3MDg0NH0.JF42iNcV_gh9X0IJuJj26TF-FkiAqZlurLC8acR-wjY'
)

async function test() {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('content')
    .eq('slug', 'write-like-pro-using-sovira-ai')

  if (data && data.length > 0) {
    fs.writeFileSync('post-content.html', data[0].content)
    console.log('Saved to post-content.html')
  }
}
test()
