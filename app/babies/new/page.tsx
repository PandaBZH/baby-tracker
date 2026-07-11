import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export default async function NewBabyPage() {
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
        <p className="text-red-600">
          Aucune famille associée à ton profil. Contacte l'administrateur.
        </p>
      </div>
    )
  }

  async function createBaby(formData: FormData) {
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

    const first_name = formData.get('first_name') as string
    const birth_date = formData.get('birth_date') as string

    const { error } = await supabase.from('babies').insert({
      family_id: profile.family_id,
      first_name,
      birth_date: birth_date || null,
    })

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath('/')
    redirect('/')
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">👶 Ajouter un bébé</h1>

      <form action={createBaby} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Prénom</label>
          <input
            type="text"
            name="first_name"
            required
            className="w-full border rounded-lg p-2"
            placeholder="Ex: Léo"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Date de naissance
          </label>
          <input
            type="date"
            name="birth_date"
            className="w-full border rounded-lg p-2"
          />
        </div>

        <button
          type="submit"
          className="bg-blue-600 text-white rounded-lg px-4 py-2 w-full font-medium"
        >
          Ajouter
        </button>
      </form>
    </div>
  )
}