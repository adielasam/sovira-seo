import { NextResponse } from 'next/server'

export const maxDuration = 60 // Max duration for Vercel Hobby

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  
  // Verify Cron Secret
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sovira.com.ng'
  
  // We will trigger all sub-crons simultaneously
  const endpoints = [
    '/api/cron/abandoned-projects',
    '/api/cron/refresh-ranks',
    '/api/cron/auto-publish',
    '/api/cron/send-reports',
    '/api/cron/lifecycle-emails'
  ]

  const fetchPromises = endpoints.map(endpoint => 
    fetch(`${baseUrl}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET || ''}`
      }
    }).then(res => res.json().catch(() => ({}))).catch(err => ({ error: err.message }))
  )

  const results = await Promise.allSettled(fetchPromises)

  return NextResponse.json({
    success: true,
    message: 'Master cron triggered successfully',
    results
  })
}
