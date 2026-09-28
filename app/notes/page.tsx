'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { LocalDateTimeInput } from '@/components/LocalDateTimeInput'
import { SubmitButton } from '@/components/SubmitButton'

export default async function NewNotePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id')
    .eq('id', user.id)
    .single()

  if (!profile?.family_id) {
    return (
      <div className="max-w-md mx-auto p-6">
        <p className="text-red-600">Aucun compte famille associé.</p>
      </div>
    )
  }

  const { data: babies } = await supabase
    .from('babies')
    .select('id')
    .eq('family_id', profile.family_id)
    .limit(1)

  const baby = babies?.[0]

  if (!baby) {
    return (
      <div className="max-w-md mx-auto p-6">
        <p>Aucun bébé enregistré.</p>
        <Link href="/babies/new" className="text-blue-600 underline mt-2 inline-block">
          Ajouter un bébé
        </Link>
      </div>
    )
  }

  async function createNote(formData: FormData) {
    'use server'

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const { data: profile } = await supabase
      .from('profiles')
      .select('family_id')
      .eq('id', user.id)
      .single()

    if (!profile?.family_id) throw new Error('Aucune famille associée')

    const { data: babies } = await supabase
      .from('babies')
      .select('id')
      .eq('family_id', profile.family_id)
      .limit(1)

    const baby = babies?.[0]
    if (!baby) throw new Error('Aucun bébé associé')

    const content = String(formData.get('content') || '').trim()
    const notedAt = String(formData.get('noted_at') || '')

    if (!content) throw new Error('La note ne peut pas être vide')
    if (!notedAt) throw new Error('La date de la note est obligatoire')

    const { error } = await supabase.from('notes').insert({
      baby_id: baby.id,
      content,
      noted_at: notedAt,
      created_by: user.id,
    })

    if (error) throw new Error(error.message)

    revalidatePath('/')
    revalidatePath('/historique')
    redirect('/')
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold">📝 Nouvelle note</h1>
        <Link href="/" className="text-gray-500 hover:text-gray-700">
          ✕ Annuler
        </Link>
      </div>

      <form action={createNote} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Note <span className="text-red-500">*</span>
          </label>
          <textarea
            name="content"
            required
            autoFocus
            rows={5}
            className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            placeholder="Ex : Bébé très calme après le bain, rendez-vous pédiatre, observation particulière..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date et heure
          </label>
          <LocalDateTimeInput
            name="noted_at"
            required
            className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Link
            href="/"
            className="flex-1 text-center px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Annuler
          </Link>
          <SubmitButton
            className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:hover:bg-purple-600"
          />
        </div>
      </form>
    </div>
  )
}
