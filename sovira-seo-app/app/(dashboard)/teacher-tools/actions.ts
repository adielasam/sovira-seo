'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'



// =============================================
// Upload & Parse Scheme of Work
// =============================================

export async function uploadSchemeOfWork(
  subject: string,
  classLevel: string,
  term: string,
  rawText: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  try {
    // 1. Insert the raw SOW record
    const { data: sow, error: sowError } = await supabase
      .from('scheme_of_work')
      .insert([{
        subject,
        class_level: classLevel,
        term,
        raw_text: rawText,
        uploaded_by: user.id,
      }])
      .select('id')
      .single()

    if (sowError) throw new Error(sowError.message)

    // 2. Use Groq AI to parse the raw text into weekly entries
    const systemPrompt = `You are a Nigerian education curriculum specialist who understands the NERDC Basic Education Curriculum and Senior Secondary Curriculum.

Parse the following Scheme of Work text into structured weekly entries.

Return ONLY a valid JSON array. Each entry must have these exact keys:
{
  "week_number": number (1-13),
  "topic": "Main topic for that week",
  "sub_topic": "Sub-topic if any, otherwise empty string",
  "objectives": "Learning objectives for the week",
  "content_summary": "Brief summary of content to be taught",
  "activities": "Teaching/learning activities",
  "resources": "Instructional materials needed"
}

RULES:
- Parse ALL weeks found in the text (typically 12-13 weeks per term).
- If a week is marked as "Revision" or "Examination", still include it.
- If information for a field is missing in the source text, use a sensible default or empty string.
- Return ONLY the JSON array. No explanation, no markdown, no backticks.`

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Subject: ${subject}\nClass: ${classLevel}\nTerm: ${term}\n\nScheme of Work Text:\n${rawText}` }
        ],
        temperature: 0.3,
        max_tokens: 4000,
      })
    })

    const groqData = await groqRes.json()
    if (!groqRes.ok) throw new Error(groqData?.error?.message || 'Groq API failed to parse SOW')

    const rawResponse = groqData.choices?.[0]?.message?.content || ''
    
    // Clean and parse JSON
    let entries: any[]
    try {
      const cleaned = rawResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      entries = JSON.parse(cleaned)
    } catch (parseErr) {
      throw new Error('AI could not parse the scheme of work text. Please check the format and try again.')
    }

    if (!Array.isArray(entries) || entries.length === 0) {
      throw new Error('No weekly entries were extracted. Please paste a valid Scheme of Work.')
    }

    // 3. Insert parsed entries
    const rows = entries.map((entry: any) => ({
      sow_id: sow.id,
      week_number: entry.week_number || 1,
      topic: entry.topic || 'Untitled',
      sub_topic: entry.sub_topic || '',
      objectives: entry.objectives || '',
      content_summary: entry.content_summary || '',
      activities: entry.activities || '',
      resources: entry.resources || '',
    }))

    const { error: entriesError } = await supabase
      .from('sow_weekly_entries')
      .insert(rows)

    if (entriesError) throw new Error(entriesError.message)

    revalidatePath('/teacher-tools')
    revalidatePath('/teacher-tools/upload')
    return { success: true, sowId: sow.id, weekCount: rows.length }
  } catch (error: any) {
    console.error('Error uploading SOW:', error)
    return { error: error.message || 'Failed to upload Scheme of Work' }
  }
}

// =============================================
// Get Available Schemes
// =============================================

export async function getAvailableSchemes() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', data: [] }

  const { data, error } = await supabase
    .from('scheme_of_work')
    .select('id, subject, class_level, term, created_at')
    .order('subject', { ascending: true })

  if (error) {
    console.error('Error fetching schemes:', error)
    return { error: error.message, data: [] }
  }

  return { data: data || [] }
}

// =============================================
// Get Weekly Entries for a SOW
// =============================================

export async function getWeeklyEntries(sowId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', data: [] }

  const { data, error } = await supabase
    .from('sow_weekly_entries')
    .select('*')
    .eq('sow_id', sowId)
    .order('week_number', { ascending: true })

  if (error) {
    console.error('Error fetching weekly entries:', error)
    return { error: error.message, data: [] }
  }

  return { data: data || [] }
}

// =============================================
// Generate Lesson Note
// =============================================

export async function generateLessonNote(
  entryId: string,
  subject: string,
  classLevel: string,
  term: string,
  weekNumber: number,
  topic: string,
  objectives: string,
  contentSummary: string,
  activities: string,
  resources: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  try {
    const systemPrompt = `You are an experienced, highly skilled Nigerian secondary school teacher with deep knowledge of the NERDC curriculum. Generate a DETAILED, COMPREHENSIVE lesson note that follows the Nigerian standard lesson plan format.

FORMAT THE LESSON NOTE EXACTLY LIKE THIS:

**LESSON NOTE**

**Subject:** ${subject}
**Class:** ${classLevel}
**Term:** ${term}
**Week:** ${weekNumber}
**Topic:** ${topic}
**Duration:** 40 minutes (double period: 80 minutes)

---

**BEHAVIORAL OBJECTIVES:**
By the end of the lesson, students should be able to:
(List 4-6 specific, measurable objectives using action verbs: define, explain, list, describe, compare, calculate, identify, demonstrate, etc.)

**PREVIOUS KNOWLEDGE:**
Students have been taught... (reference what they already know that connects to this topic)

**INSTRUCTIONAL MATERIALS:**
(List specific items: textbook name & chapter, charts, models, specimens, whiteboard, markers, real-world objects, etc.)

---

**PRESENTATION**

**Step 1 — Introduction (5 minutes):**
(Teacher's activity: Ask probing questions to test previous knowledge)
(Students' activity: Respond to questions)

**Step 2 — Explanation of [first sub-concept] (10 minutes):**
(Detailed teacher explanation with examples)
(Student interaction and note-taking)

**Step 3 — Explanation of [second sub-concept] (10 minutes):**
(Continue with next part of the topic)

**Step 4 — Worked Examples / Demonstration (8 minutes):**
(For science/math: show calculations. For arts/humanities: show case studies or textual analysis)

**Step 5 — Class Activity / Practice (5 minutes):**
(Students attempt exercises or discuss in groups)

---

**EVALUATION:**
(Write 5-8 questions the teacher can ask orally or write on the board to test understanding. Mix recall, comprehension, and application-level questions.)

**CONCLUSION / SUMMARY:**
(2-3 sentences wrapping up the lesson's key points)

**ASSIGNMENT:**
(A take-home task that reinforces the lesson — specific, clear, with instructions)

RULES:
- Make the content FACTUALLY ACCURATE and aligned with the NERDC curriculum for ${classLevel}.
- Use age-appropriate language for ${classLevel} students.
- Include REAL examples relevant to Nigerian students' daily lives.
- The lesson note should be detailed enough for another teacher to teach from it.
- Do NOT include any preamble like "Here is the lesson note" — just output the lesson note directly.`

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate a detailed lesson note for:\n\nTopic: ${topic}\nObjectives from SOW: ${objectives}\nContent Summary from SOW: ${contentSummary}\nSuggested Activities: ${activities}\nResources: ${resources}` }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      })
    })

    const groqData = await groqRes.json()
    if (!groqRes.ok) throw new Error(groqData?.error?.message || 'Groq API failed')

    const lessonNote = groqData.choices?.[0]?.message?.content || ''
    if (!lessonNote) throw new Error('No lesson note generated')

    return { success: true, lessonNote }
  } catch (error: any) {
    console.error('Error generating lesson note:', error)
    return { error: error.message || 'Failed to generate lesson note' }
  }
}

// =============================================
// Save Lesson Note
// =============================================

export async function saveLessonNote(data: {
  sow_entry_id: string
  subject: string
  class_level: string
  term: string
  week_number: number
  topic: string
  lesson_note: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: inserted, error } = await supabase
    .from('teacher_lesson_notes')
    .insert([{ user_id: user.id, ...data }])
    .select('id')
    .single()

  if (error) {
    console.error('Error saving lesson note:', error)
    return { error: error.message }
  }

  // Log activity
  await supabase.from('activity_logs').insert([{
    user_id: user.id,
    action: 'Lesson Note Generated',
    details: { subject: data.subject, class: data.class_level, topic: data.topic }
  }])

  revalidatePath('/teacher-tools')
  return { success: true, id: inserted.id }
}

// =============================================
// Get Teacher's Saved Lesson Notes
// =============================================

export async function getTeacherLessonNotes() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', data: [] }

  const { data, error } = await supabase
    .from('teacher_lesson_notes')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('Error fetching lesson notes:', error)
    return { error: error.message, data: [] }
  }

  return { data: data || [] }
}

// =============================================
// Update Lesson Note
// =============================================

export async function updateLessonNote(id: string, lessonNote: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('teacher_lesson_notes')
    .update({ lesson_note: lessonNote })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error updating lesson note:', error)
    return { error: error.message }
  }

  revalidatePath('/teacher-tools')
  return { success: true }
}

// =============================================
// Delete Lesson Note
// =============================================

export async function deleteLessonNote(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('teacher_lesson_notes')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error deleting lesson note:', error)
    return { error: error.message }
  }

  revalidatePath('/teacher-tools')
  return { success: true }
}

// =============================================
// Generate Questions from Lesson Note
// =============================================

export async function generateQuestions(
  lessonNoteId: string,
  lessonNoteText: string,
  subject: string,
  classLevel: string,
  topic: string,
  questionType: 'objective' | 'theory' | 'mixed'
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  try {
    let typeInstruction = ''
    if (questionType === 'objective') {
      typeInstruction = `Generate 20 multiple choice (objective) questions.
Each question must have options A, B, C, and D.
Mark the correct answer clearly like: **Answer: B**
Number each question.`
    } else if (questionType === 'theory') {
      typeInstruction = `Generate 10 theory/essay questions.
For each question, provide a detailed model answer.
Number each question.
Include a mix of: define, explain, discuss, compare, list, describe question types.`
    } else {
      typeInstruction = `Generate a MIXED set:
- Section A: 10 multiple choice (objective) questions with options A-D and marked answers.
- Section B: 5 theory/essay questions with detailed model answers.
Number each section separately.`
    }

    const systemPrompt = `You are an experienced Nigerian secondary school examination setter for ${subject} at the ${classLevel} level.

Based STRICTLY on the lesson note provided below, generate test questions.

${typeInstruction}

RULES:
- Questions must test ONLY content covered in the provided lesson note — do not introduce outside material.
- Difficulty should be appropriate for ${classLevel} Nigerian students.
- For objective questions, make distractors (wrong options) plausible but clearly incorrect.
- For theory questions, model answers should be comprehensive enough for a marking guide.
- Format the output cleanly with proper numbering and spacing.
- Do NOT include any preamble — just output the questions directly.`

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Topic: ${topic}\n\nLesson Note:\n${lessonNoteText}` }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      })
    })

    const groqData = await groqRes.json()
    if (!groqRes.ok) throw new Error(groqData?.error?.message || 'Groq API failed')

    const questions = groqData.choices?.[0]?.message?.content || ''
    if (!questions) throw new Error('No questions generated')

    // Save to DB
    const { error: saveError } = await supabase
      .from('teacher_questions')
      .insert([{
        user_id: user.id,
        lesson_note_id: lessonNoteId,
        question_type: questionType,
        questions,
      }])

    if (saveError) console.error('Error saving questions:', saveError)

    return { success: true, questions }
  } catch (error: any) {
    console.error('Error generating questions:', error)
    return { error: error.message || 'Failed to generate questions' }
  }
}

// =============================================
// Delete Scheme of Work (Admin)
// =============================================

export async function deleteSchemeOfWork(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Cascade will delete weekly entries
  const { error } = await supabase
    .from('scheme_of_work')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting SOW:', error)
    return { error: error.message }
  }

  revalidatePath('/teacher-tools')
  revalidatePath('/teacher-tools/upload')
  return { success: true }
}
