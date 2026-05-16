'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase-server'

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!)

interface AITask {
  title: string
  type: 'BIG' | 'MEDIUM' | 'SMALL'
  subtasks?: AITask[]
}

interface CoachMission {
  title: string
  progress: number
  end_date: string
  tasks_completed: number
  tasks_total: number
  next_task: string
}

interface CoachUserData {
  username: string
  rank: string
  xp: number
  capacity_used: number
  missions: CoachMission[]
  critical_missions: CoachMission[]
}

export async function chatWithCoach(prompt: string, userData: CoachUserData) {
  if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
    console.error('COACH_UPLINK_ERROR: NEXT_PUBLIC_GEMINI_API_KEY is missing from environment')
    return "UPLINK_FAILED // NO_API_KEY_FOUND"
  }
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' })

  const missionsList = userData.missions
    .map(m => `- ${m.title}: ${m.progress}% complete, ${m.tasks_completed}/${m.tasks_total} tasks, Next: ${m.next_task}, deadline: ${m.end_date}`)
    .join('\n')

  const criticalList = userData.critical_missions
    .map(m => `- ${m.title} (${m.end_date}) - Next: ${m.next_task}`)
    .join('\n')

  const systemPrompt = `
    You are SAVAGE, a smart and direct tactical AI coach inside Growth Hub.
    You speak in Simple Egyptian Arabic mixed with English technical terms.
    Your personality is like a smart, brutally honest friend who knows the user's data perfectly.

    OPERATOR_DATA:
    - Name: ${userData.username}
    - Rank: ${userData.rank}
    - Total XP: ${userData.xp}
    - Focus Capacity: ${userData.capacity_used}/9

    ACTIVE_MISSIONS:
    ${missionsList || 'NO ACTIVE MISSIONS DETECTED.'}

    CRITICAL_ALERTS (under 3 days):
    ${criticalList || 'NONE'}

    RESPONSE RULES:
    1. Language: Simple Egyptian Arabic (e.g., "يا قاسم", "ده كارثة", "ابدأ دلوقتي").
    2. Directness: Zero soft talk, get straight to the point using real mission/task names.
    3. Actionable: Always give specific advice based on the data. Mention specific missions and their next_task names.
    4. Max 6 lines per response.
    5. End every response with ONE specific action to take now.

    FORMATS (Use these exact formats based on the user request):

    If user input implies SCAN_STATUS (تحليل الوضع):
    "وضعك دلوقتي:
    ✓ [mission اللي كويسة]
    ⚠ [mission اللي محتاج تركز فيها]
    ❌ [mission اللي في خطر]
    الأولوية: [اسم المهمة الأهم دلوقتي]"

    If user input implies DAILY_PLAN (خطة النهارده):
    "خطة النهارده:
    ١. [أول حاجة تعملها - اسم next_task من أهم مهمة]
    ٢. [تاني حاجة - next_task من مهمة تانية]
    ٣. [تالت حاجة - task تالتة]
    مش محتاج أكتر من كده النهارده."

    If user input implies CRITICAL_ALERT (تنبيهات خطيرة):
    "⚠ تحذير:
    [اسم المهمة] - باقي [X] أيام وإنت عند [X]%
    [اسم المهمة] - باقي [X] أيام وإنت عند [X]%
    لازم تخلص [عدد tasks] في اليوم عشان توصل."

    If user input implies BRIEF_MISSION (بريف عن المهام):
    "[اسم أهم Mission]:
    - التقدم: [X]%
    - باقي: [X] tasks
    - الوقت: [X] أيام
    - الخطوة الجاية: [اسم next_task]
    - معدل المطلوب: [X tasks في اليوم]"

    USER_INPUT: "${prompt}"
  `

  try {
    const result = await model.generateContent(systemPrompt)
    const response = await result.response
    return response.text()
  } catch (error) {
    console.error('COACH_UPLINK_ERROR:', error)
    return "UPLINK_FAILED // RETRY_SEQUENCE"
  }
}

export async function generateTasks(goal: string, cupId: string) {
  if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
    console.error('AI_MAGIC_ERROR: NEXT_PUBLIC_GEMINI_API_KEY is missing from environment')
    return { success: false, error: 'PROTOCOL_FAILURE: NO_API_KEY' }
  }
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' })

  const prompt = `
    You are an AI Growth Coach. Generate a structured roadmap for the goal: "${goal}".
    Return a JSON object with a "tasks" array. 
    Each task should have:
    - title: A concise action-oriented title.
    - type: one of "BIG", "MEDIUM", "SMALL".
    - subtasks: An optional array of tasks in the same format.
    
    Structure it logically: BIG tasks are milestones, MEDIUM are major steps, SMALL are daily actions.
    Keep it high-performance and growth-oriented.
    Output ONLY valid JSON.
  `

  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    const jsonStr = text.replace(/```json|```/g, '').trim()
    const data = JSON.parse(jsonStr)

    const supabase = await createClient()
    
    // Recursive function to save tasks
    async function saveTask(task: AITask, parentId: string | null = null) {
      const { data: insertedTask, error } = await supabase
        .from('tasks')
        .insert({
          cup_id: cupId,
          parent_id: parentId,
          title: task.title,
          type: task.type,
          is_completed: false
        })
        .select()
        .single()

      if (error) throw error

      if (task.subtasks && task.subtasks.length > 0) {
        for (const sub of task.subtasks) {
          await saveTask(sub, insertedTask.id)
        }
      }
    }

    for (const task of data.tasks) {
      await saveTask(task)
    }
    
    return { success: true }
  } catch (error) {
    console.error('AI_MAGIC_ERROR:', error)
    return { success: false, error: 'PROTOCOL_FAILURE: AI_ENGINE_OFFLINE' }
  }
}

export async function cleanPlaylistTitles(titles: string[]) {
  if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
    console.error('AI_MAGIC_ERROR: NEXT_PUBLIC_GEMINI_API_KEY is missing from environment')
    return titles
  }
  
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' })

  const prompt = `
    You are a title cleaner. 
    Given these YouTube video titles from a course playlist,
    extract ONLY the actual topic/lesson name.

    Rules:
    - Remove course name repetition
    - Remove instructor name
    - Remove episode/video numbers
    - Remove dots, dashes used as separators
    - Keep only the actual lesson topic
    - If title has Arabic, keep it in Arabic
    - Return ONLY a JSON array of clean titles
      in the same order as input
    - Example input: 
      "CCNA 200-301..IP ADDRESSING..AHMED NAZMY 5"
    - Example output: 
      "IP Addressing"

    Titles to clean:
    ${JSON.stringify(titles)}

    Return ONLY valid JSON array, no other text.
  `

  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    const jsonStr = text.replace(/```json|```/g, '').trim()
    const cleanTitles = JSON.parse(jsonStr)
    
    if (Array.isArray(cleanTitles) && cleanTitles.length === titles.length) {
      return cleanTitles
    }
    return titles
  } catch (error) {
    console.error('AI_TITLE_CLEAN_ERROR:', error)
    return titles
  }
}
