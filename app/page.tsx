import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import DeleteButton from '@/components/DeleteButton'
import DashboardClient from '@/components/DashboardClient'
import { getCareLogsForDate } from '@/app/dashboard/actions'

export default async function DashboardPage() {
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
          Aucun profil ou famille associée. Contacte l'administrateur.
        </p>
      </div>
    )
  }

  const today = new Date().toISOString().split('T')[0]
  const startOfDay = `${today}T00:00:00`
  const endOfDay = `${today}T23:59:59`

  const { data: babies } = await supabase
    .from('babies')
    .select('*')
    .eq('family_id', profile.family_id)

  const baby = babies?.[0]

  if (!baby) {
    return (
      <div className="p-6">
        <p>Aucun bébé enregistré pour l'instant.</p>
        <Link href="/babies/new" className="text-blue-600 underline">
          Ajouter un bébé
        </Link>
      </div>
    )
  }

  const [{ data: feedings }, { data: diapers }, { data: bottles }, careLogs] =
    await Promise.all([
      supabase
        .from('feedings')
        .select('*')
        .eq('baby_id', baby.id)
        .gte('fed_at', startOfDay)
        .lte('fed_at', endOfDay)
        .order('fed_at', { ascending: false }),
      supabase
        .from('diaper_changes')
        .select('*')
        .eq('baby_id', baby.id)
        .gte('changed_at', startOfDay)
        .lte('changed_at', endOfDay)
        .order('changed_at', { ascending: false }),
      supabase
        .from('bottles')
        .select('*')
        .eq('baby_id', baby.id)
        .gte('given_at', startOfDay)
        .lte('given_at', endOfDay)
        .order('given_at', { ascending: false }),
      getCareLogsForDate(baby.id, today),
    ])

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    })

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">👶 {baby.first_name}</h1>
          <p className="text-gray-500 text-sm">
            {new Date().toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </p>
        </div>
        <form action="/api/auth/signout" method="post">
          <button className="text-sm text-gray-500 underline">
            Déconnexion
          </button>
        </form>
      </header>

      {/* Boutons d'ajout rapide */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/feedings/new"
          className="bg-pink-100 rounded-xl p-4 text-center font-medium shadow-sm"
        >
          🤱 Tétée
        </Link>
        <Link
          href="/diapers/new"
          className="bg-yellow-100 rounded-xl p-4 text-center font-medium shadow-sm"
        >
          🧷 Couche
        </Link>
        <Link
          href="/bottles/new"
          className="bg-blue-100 rounded-xl p-4 text-center font-medium shadow-sm"
        >
          🍼 Biberon
        </Link>
        <Link
          href="/care/today"
          className="bg-green-100 rounded-xl p-4 text-center font-medium shadow-sm"
        >
          🛁 Soins du jour
        </Link>
      </div>

      {/* Tétées */}
      <section>
        <h2 className="font-semibold text-lg mb-2">🤱 Tétées</h2>
        {feedings && feedings.length > 0 ? (
          <ul className="space-y-1">
            {feedings.map((f) => (
              <li
                key={f.id}
                className="bg-white rounded-lg p-3 shadow-sm flex justify-between items-center"
              >
                <span>
                  <span className="font-medium">{formatTime(f.fed_at)}</span>{' '}
                  — {f.side.replace('_', ' ')}
                  {f.duration_minutes ? ` (${f.duration_minutes} min)` : ''}
                </span>
                <DeleteButton table="feedings" id={f.id} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400 text-sm">Aucune tétée aujourd'hui</p>
        )}
      </section>

      {/* Biberons */}
      <section>
        <h2 className="font-semibold text-lg mb-2">🍼 Biberons</h2>
        {bottles && bottles.length > 0 ? (
          <ul className="space-y-1">
            {bottles.map((b) => (
              <li
                key={b.id}
                className="bg-white rounded-lg p-3 shadow-sm flex justify-between items-center"
              >
                <span>
                  <span className="font-medium">{formatTime(b.given_at)}</span>{' '}
                  — {b.quantity_ml ?? '?'} ml
                </span>
                <DeleteButton table="bottles" id={b.id} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400 text-sm">Aucun biberon aujourd'hui</p>
        )}
      </section>

      {/* Couches */}
      <section>
        <h2 className="font-semibold text-lg mb-2">🧷 Couches</h2>
        {diapers && diapers.length > 0 ? (
          <ul className="space-y-1">
            {diapers.map((d) => (
              <li
                key={d.id}
                className="bg-white rounded-lg p-3 shadow-sm flex justify-between items-center"
              >
                <span>
                  <span className="font-medium">{formatTime(d.changed_at)}</span>{' '}
                  — {d.pipi ? '💧 Pipi ' : ''}
                  {d.caca ? '💩 Caca' : ''}
                  {!d.pipi && !d.caca ? 'Changement' : ''}
                </span>
                <DeleteButton table="diaper_changes" id={d.id} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400 text-sm">Aucune couche aujourd'hui</p>
        )}
      </section>

      {/* Soins du jour — nouveau composant */}
      <section>
        <h2 className="font-semibold text-lg mb-2">🛁 Soins du jour</h2>
        <DashboardClient baby={baby} date={today} initialLogs={careLogs} />
      </section>
    </div>
  )
}