'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getCareLogsForDate(babyId: string, date: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('care_logs')
    .select(`
      *,
      care_schedules (
        id,
        default_unit,
        default_quantity,
        care_types ( id, name, icon )
      )
    `)
    .eq('baby_id', babyId)
    .eq('scheduled_date', date)
    .order('scheduled_time', { ascending: true })

  if (error) throw new Error(error.message)
  return data
}

export async function quickCheck(logId: string, quantityPrevue: number | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase
    .from('care_logs')
    .update({
      fait: true,
      done_at: new Date().toISOString(),
      quantity: quantityPrevue,
      created_by: user?.id,
    })
    .eq('id', logId)

  if (error) throw new Error(error.message)
  revalidatePath('/')
}

export async function adjustCheck(
  logId: string,
  quantity: number | null,
  note: string | null
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase
    .from('care_logs')
    .update({
      fait: true,
      done_at: new Date().toISOString(),
      quantity,
      note,
      created_by: user?.id,
    })
    .eq('id', logId)

  if (error) throw new Error(error.message)
  revalidatePath('/')
}

export async function uncheckLog(logId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('care_logs')
    .update({
      fait: false,
      done_at: null,
      quantity: null,
    })
    .eq('id', logId)

  if (error) throw new Error(error.message)
  revalidatePath('/')
}

export async function deleteCareLog(logId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('care_logs').delete().eq('id', logId)
  if (error) throw new Error(error.message)
  revalidatePath('/')
}