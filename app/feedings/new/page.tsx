import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'

export default async function NewFeedingPage() {
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
      <div className="p-6">
        <p className="text-red-600">Aucune famille associée.</p>
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
      <div className="p-6">
        <p>Aucun bébé enregistré.</p>
      </div>
    )
  }

  // Heure locale actuelle au format "HH:MM" pour préremplir le champ
  const now = new Date()
  const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16)

  async function createFeeding(formData: FormData) {
    'use server'

    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect('/login')
    }

    const side = formData.get('side') as string
    const fed_at = formData.get('fed_at') as string
    const duration_minutes = formData.get('duration_minutes') as string
    const note = formData.get('note') as string

    const { error } = await supabase.from('feedings').insert({
      baby_id: baby.id,
      side,
      fed_at: new Date(fed_at).toISOString(),
      duration_minutes: duration_minutes ? parseInt(duration_minutes) : null,
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">🍼 Ajouter une tétée</h1>
        <Link href="/" className="text-gray-500 text-sm underline">
          ✕ Annuler
        </Link>
      </div>

      <form action={createFeeding} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Sein</label>
          <div className="grid grid-cols-3 gap-2">
            <label className="flex items-center justify-center border rounded-lg p-3 cursor-pointer has-[:checked]:bg-blue-600 has-[:checked]:text-white transition">
              <input
                type="radio"
                name="side"
                value="gauche"
                required
                className="sr-only"
              />
              Gauche
            </label>
            <label className="flex items-center justify-center border rounded-lg p-3 cursor-pointer has-[:checked]:bg-blue-600 has-[:checked]:text-white transition">
              <input
                type="radio"
                name="side"
                value="droit"
                className="sr-only"
              />
              Droit
            </label>
            <label className="flex items-center justify-center border rounded-lg p-3 cursor-pointer has-[:checked]:bg-blue-600 has-[:checked]:text-white transition">
              <input
                type="radio"
                name="side"
                value="les_deux"
                className="sr-only"
              />
              Les deux
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Heure de la tétée
          </label>
          <input
            type="datetime-local"
            name="fed_at"
            required
            defaultValue={localDateTime}
            className="w-full border rounded-lg p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Durée (minutes) — optionnel
          </label>
          <input
            type="number"
            name="duration_minutes"
            min="0"
            className="w-full border rounded-lg p-2"
            placeholder="Ex: 15"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Note — optionnel
          </label>
          <textarea
            name="note"
            rows={2}
            className="w-full border rounded-lg p-2"
            placeholder="Ex: a bien tété, régurgitation..."
          />
        </div>

        <div className="flex gap-2">
          <Link
            href="/"
            className="flex-1 border border-gray-300 text-gray-700 text-center rounded-lg py-2 font-medium"
          >
            Annuler
          </Link>
          <button
            type="submit"
            className="flex-1 bg-blue-600 text-white rounded-lg py-2 font-medium"
          >
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  )
}