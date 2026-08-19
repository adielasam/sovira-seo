import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const envContent = fs.readFileSync('.env.local', 'utf8')
const env = {}
envContent.split('\n').forEach(line => {
  const [k, v] = line.split('=')
  if (k && v) env[k.trim()] = v.trim()
})

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  console.log('Signing up test user...')
  const email = `test_${Date.now()}@example.com`
  const { data, error } = await supabase.auth.signUp({
    email: email,
    password: 'password123'
  })

  if (error) {
    console.error('Signup error:', error)
    return
  }

  console.log('Signed up:', data.user.id)
  const session = data.session

  console.log('Fetching /api/affiliate from localhost...')
  try {
    const res = await fetch('http://localhost:3000/api/affiliate', {
      headers: {
        'Cookie': `sb-eootlprhrjyscnipmcqe-auth-token=${encodeURIComponent(JSON.stringify([session.access_token, session.refresh_token, null, null, null]))}`
      }
    })
    
    console.log('Status:', res.status)
    const text = await res.text()
    console.log('Response:', text)
  } catch (err) {
    console.error('Fetch error:', err)
  }
}

test()
