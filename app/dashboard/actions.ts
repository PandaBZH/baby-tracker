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
        care_types (id, name, icon)
      ),
      care_schedule_times (
        id,
        label
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
  doneAtIso: string,
  quantity: number | null,
  note: string | null
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase
    .from('care_logs')
    .update({
      fait: true,
      done_at: doneAtIso,
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

export async function deleteHistoryEntry(
  table: 'feedings' | 'diaper_changes' | 'bottles' | 'temperatures',
  entryId: string
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Non authentifié')
  }

  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', entryId)

  if (error) {
    console.error('Erreur suppression:', error)
    throw new Error('Impossible de supprimer')
  }

  revalidatePath('/')
}

// Ajoute ces fonctions à la fin de ton actions.ts existant

export async function getPlannedCareTypes(familyId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('care_schedules')
    .select('care_types(id, name, icon)')
    .eq('family_id', familyId)
    .neq('care_types', null)

  // Dédupliquer les soins
  const uniqueCares = Array.from(
    new Map(
      data?.map((schedule: any) => [
        schedule.care_types?.id,
        {
          id: schedule.care_types?.id,
          name: schedule.care_types?.name,
          icon: schedule.care_types?.icon,
        },
      ]) || []
    ).values()
  )

  return uniqueCares
}

export async function logPlannedCare(
  babyId: string,
  careId: string,
  date: string
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Non authentifié')

  const loggedAt = new Date(`${date}T12:00:00`).toISOString()

  const { error } = await supabase.from('planned_care_logs').insert({
    baby_id: babyId,
    care_id: careId,
    logged_at: loggedAt,
    created_by: user.id,
  })

  if (error) throw new Error(error.message)

  revalidatePath('/')
}

export async function removePlannedCareLog(
  babyId: string,
  careId: string,
  date: string
) {
  const supabase = await createClient()

  const startDate = new Date(date).toISOString()
  const endDate = new Date(
    new Date(date).getTime() + 24 * 60 * 60 * 1000
  ).toISOString()

  const { error } = await supabase
    .from('planned_care_logs')
    .delete()
    .eq('baby_id', babyId)
    .eq('care_id', careId)
    .gte('logged_at', startDate)
    .lt('logged_at', endDate)

  if (error) throw new Error(error.message)

  revalidatePath('/')
}

export async function getPlannedCareForDate(babyId: string, date: string) {
  const supabase = await createClient()

  const startDate = new Date(date).toISOString()
  const endDate = new Date(
    new Date(date).getTime() + 24 * 60 * 60 * 1000
  ).toISOString()

  const { data } = await supabase
    .from('planned_care_logs')
    .select('care_id')
    .eq('baby_id', babyId)
    .gte('logged_at', startDate)
    .lt('logged_at', endDate)

  return data?.map((log) => log.care_id) || []
}