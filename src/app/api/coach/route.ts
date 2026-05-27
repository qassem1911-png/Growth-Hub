import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(req: Request) {
  try {
    const { action, userData, language } = await req.json()
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API Key not configured' }, { status: 500 })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    // Using gemini-1.5-flash for hyperpressure high-speed latency response
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const systemPrompt = `You are a Savage, Tactical Productivity Coach. You speak directly, brutally, and concisely. No emojis, no fluff, no 'Great job!'. You analyze the provided user data and give military-style commands. If they have overdue tasks, reprimand them. If they ask for a daily plan, give them a ruthless prioritized list. Always respond in the requested language: ${language || 'en'}.`

    const promptText = `
ACTION REQUESTED: ${action}

USER TELEMETRY DATA:
- Username: ${userData.username || 'MEMBER'}
- Rank: ${userData.rank || 'SILVER'}
- Total XP: ${userData.xp || 0}
- Active Goals Count: ${userData.capacity_used || 0}
- Live Goals Detail: ${JSON.stringify(userData.missions || [])}
- Critical Goals Detail: ${JSON.stringify(userData.critical_missions || [])}
- Completed Tasks Today Count: ${userData.completed_tasks_today || 0}

Analyze this telemetry and provide your savage, brutal commands. Let's go.
`

    const response = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: systemPrompt + '\n\n' + promptText }] }]
    })

    const text = response.response.text()
    return NextResponse.json({ response: text })
  } catch (error: any) {
    console.error('Coach API error:', error)
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 })
  }
}
