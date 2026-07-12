import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'

export default async function NewTemperaturePage({
  searchParams,
}: {
  searchParams: { baby?: string; date?: string }
}) {
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

  // Même logique que pour les tétées
  const now = new Date()
  const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16)

  async function createTemperature(formData: FormData) {
    'use server'

    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect('/login')
    }

    const temperature = formData.get('temperature') as string
    const type = formData.get('type') as string
    const measured_at = formData.get('measured_at') as string
    const note = formData.get('note') as string

    const { error } = await supabase.from('temperatures').insert({
      baby_id: baby.id,
      temperature: parseFloat(temperature),
      type,
      measured_at: new Date(measured_at).toISOString(),
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
        <h1 className="text-2xl font-bold">🌡️ Ajouter une température</h1>
        <Link href="/" className="text-gray-500 text-sm underline">
          ✕ Annuler
        </Link>
      </div>

      <form action={createTemperature} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Température (°C)</label>
          <input
            type="number"
            name="temperature"
            step="0.1"
            min="35"
            max="42"
            required
            placeholder="37.2"
            className="w-full border rounded-lg p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Type de mesure</label>
          <div className="grid grid-cols-3 gap-2">
            <label className="flex items-center justify-center border rounded-lg p-3 cursor-pointer has-[:checked]:bg-red-600 has-[:checked]:text-white transition">
                <input
                    type="radio"
                    name="type"
                    value="frontal"
                    required
                    defaultChecked
                    className="sr-only"
                />
            👶 Frontal
            </label>
            <label className="flex items-center justify-center border rounded-lg p-3 cursor-pointer has-[:checked]:bg-red-600 has-[:checked]:text-white transition">
              <input
                type="radio"
                name="type"
                value="aisselle"
                className="sr-only"
              />
              💪 Aisselle
            </label>
            <label className="flex items-center justify-center border rounded-lg p-3 cursor-pointer has-[:checked]:bg-red-600 has-[:checked]:text-white transition">
              <input
                type="radio"
                name="type"
                value="rectal"
                className="sr-only"
              />
              🫣 Rectal
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Heure de la mesure
          </label>
          <input
            type="datetime-local"
            name="measured_at"
            required
            defaultValue={localDateTime}
            className="w-full border rounded-lg p-2"
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
            placeholder="Ex: enfant fiévreux..."
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
            className="flex-1 bg-red-600 text-white rounded-lg py-2 font-medium"
          >
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  )
}