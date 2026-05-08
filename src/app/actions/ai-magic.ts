'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase-server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

interface AITask {
  title: string
  type: 'BIG' | 'MEDIUM' | 'SMALL'
  subtasks?: AITask[]
}

export async function generateTasks(goal: string, cupId: string) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

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
