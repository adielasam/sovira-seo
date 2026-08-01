const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://eootlprhrjyscnipmcqe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvb3RscHJocmp5c2NuaXBtY3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzOTQ4NDQsImV4cCI6MjA5Nzk3MDg0NH0.JF42iNcV_gh9X0IJuJj26TF-FkiAqZlurLC8acR-wjY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('blog_posts').select('*').limit(1);
  if (error) {
    console.error('Supabase Error:', error);
  } else {
    console.log('Success:', data);
  }
}
test();
