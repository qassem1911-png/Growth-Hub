import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false
      }
    })

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, xp')
      .order('xp', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Error fetching top XP user:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, topUser: data })
  } catch (err: any) {
    console.error('Top XP API Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
