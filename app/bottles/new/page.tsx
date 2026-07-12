'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'

export default async function NewBottlePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.family_id) {
    return (
      <div className="max-w-md mx-auto p-6">
        <p className="text-red-600">Aucun compte famille associé.</p>
      </div>
    )
  }

  const { data: babies } = await supabase
    .from('babies')
    .select('*')
    .eq('family_id', profile.family_id)

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

  // Pré-remplit l'heure actuelle (format datetime-local)
  const now = new Date()
  const pad = (n: number) => n.toString().padStart(2, '0')
  const localDateTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`

  async function createBottle(formData: FormData) {
    'use server'

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
      throw new Error('Aucune famille associée')
    }

    const { data: babies } = await supabase
      .from('babies')
      .select('id')
      .eq('family_id', profile.family_id)

    const baby = babies?.[0]

    if (!baby) {
      throw new Error('Aucun bébé associé')
    }

    const given_at = formData.get('given_at') as string
    const quantity_ml = formData.get('quantity_ml') as string
    const note = formData.get('note') as string

    const { error } = await supabase.from('bottles').insert({
      baby_id: baby.id,
      given_at: new Date(given_at).toISOString(),
      quantity_ml: quantity_ml ? parseInt(quantity_ml, 10) : null,
      note: note || null,
      created_by: user.id,
    })

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath('/')
    redirect('/')
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold">🍼 Nouveau biberon</h1>
        <Link href="/" className="text-gray-500 hover:text-gray-700">
          ✕ Annuler
        </Link>
      </div>

      <form action={createBottle} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quantité (ml) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="quantity_ml"
            required
            min="0"
            step="10"
            className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Ex: 120"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Heure du biberon
          </label>
          <input
            type="datetime-local"
            name="given_at"
            required
            defaultValue={localDateTime}
            className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Note — optionnel
          </label>
          <textarea
            name="note"
            rows={3}
            className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Lait, marque, observations..."
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Link
            href="/"
            className="flex-1 text-center px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Annuler
          </Link>
          <button
            type="submit"
            className="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  )
}