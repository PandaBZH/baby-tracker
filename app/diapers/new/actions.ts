'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createDiaper(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Non authentifié')
  }

  const babyId = formData.get('babyId') as string
  const givenAt = formData.get('givenAt') as string
  const pipi = formData.get('pipi') === 'on'
  const caca = formData.get('caca') === 'on'
  const note = formData.get('note') as string | null

  if (!givenAt || !babyId) {
    throw new Error('Données manquantes')
  }

  // Insérer directement dans diaper_changes
  const { error: insertError } = await supabase.from('diaper_changes').insert([
    {
      baby_id: babyId,
      pipi,
      caca,
      changed_at: new Date(givenAt).toISOString(),
      note: note || null,
      created_by: user.id,
    },
  ])

  if (insertError) {
    console.error('Erreur insertion:', insertError)
    throw new Error(insertError.message)
  }

  revalidatePath('/')
  redirect('/')
}