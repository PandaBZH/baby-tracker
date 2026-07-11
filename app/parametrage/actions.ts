'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type CareScheduleInput = {
  id?: string
  baby_id: string
  care_type_id: string
  label: string
  quantite_prevue: number | null
  unite: string | null
  frequence_type: 'quotidien' | 'hebdomadaire' | 'ponctuel'
  days_of_week: number[] | null
  valid_from: string
  valid_to: string | null
  active: boolean
  times: string[] // ["08:00", "12:00", ...]
}

export async function getCareTypes() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('care_types')
    .select('*')
    .order('label')

  if (error) throw new Error(error.message)
  return data
}

export async function getBabies() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('babies')
    .select('*')
    .order('first_name')

  if (error) throw new Error(error.message)
  return data
}

export async function getCareSchedules(babyId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('care_schedules')
    .select(`
      *,
      care_types (id, label, icon),
      care_schedule_times (id, scheduled_time)
    `)
    .eq('baby_id', babyId)
    .order('active', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

export async function createCareSchedule(input: CareScheduleInput) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: schedule, error: scheduleError } = await supabase
    .from('care_schedules')
    .insert({
      baby_id: input.baby_id,
      care_type_id: input.care_type_id,
      label: input.label,
      quantite_prevue: input.quantite_prevue,
      unite: input.unite,
      frequence_type: input.frequence_type,
      days_of_week: input.frequence_type === 'hebdomadaire' ? input.days_of_week : null,
      valid_from: input.valid_from,
      valid_to: input.valid_to,
      active: input.active,
      created_by: user?.id,
    })
    .select()
    .single()

  if (scheduleError) throw new Error(scheduleError.message)

  if (input.times.length > 0) {
    const timesToInsert = input.times.map((t) => ({
      care_schedule_id: schedule.id,
      scheduled_time: t,
    }))

    const { error: timesError } = await supabase
      .from('care_schedule_times')
      .insert(timesToInsert)

    if (timesError) throw new Error(timesError.message)
  }

  revalidatePath('/parametrage')
  return schedule
}

export async function updateCareSchedule(input: CareScheduleInput) {
  if (!input.id) throw new Error('ID manquant pour la mise à jour')
  const supabase = await createClient()

  const { error: scheduleError } = await supabase
    .from('care_schedules')
    .update({
      care_type_id: input.care_type_id,
      label: input.label,
      quantite_prevue: input.quantite_prevue,
      unite: input.unite,
      frequence_type: input.frequence_type,
      days_of_week: input.frequence_type === 'hebdomadaire' ? input.days_of_week : null,
      valid_from: input.valid_from,
      valid_to: input.valid_to,
      active: input.active,
    })
    .eq('id', input.id)

  if (scheduleError) throw new Error(scheduleError.message)

  // Remplacer les horaires : supprimer puis recréer (simple et fiable)
  const { error: deleteError } = await supabase
    .from('care_schedule_times')
    .delete()
    .eq('care_schedule_id', input.id)

  if (deleteError) throw new Error(deleteError.message)

  if (input.times.length > 0) {
    const timesToInsert = input.times.map((t) => ({
      care_schedule_id: input.id,
      scheduled_time: t,
    }))

    const { error: timesError } = await supabase
      .from('care_schedule_times')
      .insert(timesToInsert)

    if (timesError) throw new Error(timesError.message)
  }

  revalidatePath('/parametrage')
}

export async function toggleCareScheduleActive(id: string, active: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('care_schedules')
    .update({ active })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/parametrage')
}

export async function deleteCareSchedule(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('care_schedules')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/parametrage')
}