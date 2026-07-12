import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { NewDiaperForm } from './form'

export default async function NewDiaperPage() {
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
      <div className="max-w-md mx-auto p-6 text-center">
        <p className="text-red-500">Erreur : Aucune famille associée</p>
        <Link href="/" className="text-blue-500 hover:underline">
          Retour
        </Link>
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
      <div className="max-w-md mx-auto p-6 text-center">
        <p className="text-red-500">Erreur : Aucun bébé enregistré</p>
        <Link href="/parametrage" className="text-blue-500 hover:underline">
          Aller au paramétrage
        </Link>
      </div>
    )
  }

  const now = new Date()
  const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16)

  return <NewDiaperForm babyId={baby.id} localDateTime={localDateTime} />
}