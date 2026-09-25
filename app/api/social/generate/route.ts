import { NextResponse } from 'next/server'
import { google } from '@ai-sdk/google'
import { generateObject } from 'ai'
import { z } from 'zod'

const socialPostsSchema = z.object({
  twitter: z.string().describe("A catchy Twitter thread (can use newlines for thread spacing) or a single engaging tweet with hashtags."),
  linkedin: z.string().describe("A professional, insightful LinkedIn post with spacing and relevant business hashtags."),
  facebook: z.string().describe("A conversational, engaging Facebook update designed for comments and clicks.")
})

export async function POST(req: Request) {
  try {
    const { content } = await req.json()

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    const { object } = await generateObject({
      model: google('gemini-3.7-flash'),
      schema: socialPostsSchema,
      prompt: `You are an expert Social Media Manager. I will provide you with a blog post or an article snippet. Your job is to automatically generate 3 distinct social media posts to promote it.\n\nHere is the content:\n\n${content}`
    })

    return NextResponse.json(object)
  } catch (error: any) {
    console.error('Social Generation Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
