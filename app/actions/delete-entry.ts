'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

type EntryType = 'feedings' | 'diaper_changes' | 'bottles' | 'care_logs'

export async function deleteEntry(table: EntryType, id: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Non authentifié')
  }

  const { error } = await supabase.from(table).delete().eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/')
}