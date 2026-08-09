const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const k = parts.shift().trim();
    const v = parts.join('=').trim().replace(/['"]/g, '');
    acc[k] = v;
  }
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

supabase.from('content_generations')
  .select('id, topic, content_type, tone, created_at')
  .order('created_at', { ascending: false })
  .limit(200)
  .then(res => {
    fs.writeFileSync('rexestate_db.json', JSON.stringify(res.data, null, 2));
    console.log('done');
  }).catch(e => console.error(e));
