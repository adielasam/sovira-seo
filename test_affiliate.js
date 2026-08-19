import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

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
        'Cookie': `sb-eootlprhrjyscnipmcqe-auth-token=${encodeURIComponent(JSON.stringify([session.access_token, session.refresh_token, session.provider_token, session.provider_refresh_token]))}`
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
