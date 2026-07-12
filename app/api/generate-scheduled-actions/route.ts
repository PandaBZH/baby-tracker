// app/api/generate-scheduled-actions/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    // Get all care_schedule_times with their schedules
    const { data: times, error: timesError } = await supabase
      .from('care_schedule_times')
      .select(`
        *,
        care_schedules (
          id,
          baby_id,
          active
        )
      `)

    if (timesError) throw timesError

    const today = new Date().toISOString().split('T')[0]

    // Create care_logs for today
    const logsToCreate = times
      ?.filter((time: any) => time.care_schedules?.active)
      .map((time: any) => ({
        care_schedule_id: time.care_schedule_id,
        baby_id: time.care_schedules.baby_id,
        scheduled_date: today,
        scheduled_time: time.time_of_day,
        fait: false,
        quantity: time.quantity,
        note: time.label || null,
      })) || []

    if (logsToCreate.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No actions to create',
        created: 0,
      })
    }

    // Insert the logs
    const { error: insertError } = await supabase
      .from('care_logs')
      .insert(logsToCreate)

    if (insertError) throw insertError

    return NextResponse.json({
      success: true,
      created: logsToCreate.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}