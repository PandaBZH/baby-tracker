'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCareLogsForDate } from '@/app/dashboard/actions'
import { quickCheck, uncheckLog, deleteHistoryEntry } from '@/app/dashboard/actions'

interface Baby {
  id: string
  first_name: string
  birth_date: string | null
}

interface CareLog {
  id: string
  scheduled_date: string
  scheduled_time: string | null
  done_at: string | null
  fait: boolean
  quantity: number | null
  note: string | null
  care_schedules: {
    id: string
    default_unit: string | null
    default_quantity: number | null
    care_types: {
      id: string
      name: string
      icon: string | null
    } | null
  } | null
  care_schedule_times: {
    id: string
    label: string | null
  } | null
}

interface HistoryEntry {
  id: string
  type: 'feeding' | 'diaper' | 'bottle' | 'temperature'
  timestamp: string
  data: any
  table: 'feedings' | 'diaper_changes' | 'bottles' | 'temperatures'
}

export default function HomePage() {
  const supabase = createClient()
  const [baby, setBaby] = useState<Baby | null>(null)
  const [careLogs, setCareLogs] = useState<CareLog[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          redirect('/login')
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('family_id')
          .eq('id', user.id)
          .single()

        if (!profile?.family_id) {
          setError('Pas de famille')
          return
        }

        // Récupère le bébé
        const { data: babies } = await supabase
          .from('babies')
          .select('*')
          .eq('family_id', profile.family_id)
          .limit(1)

        if (!babies?.length) {
          setError('Aucun bébé')
          return
        }

        const babyData = babies[0]
        setBaby(babyData)

        // Récupère les soins planifiés du jour (ordre croissant)
        const logs = await getCareLogsForDate(babyData.id, today)
        setCareLogs(logs?.sort((a, b) => {
          const timeA = a.scheduled_time || '00:00'
          const timeB = b.scheduled_time || '00:00'
          return timeA.localeCompare(timeB)
        }) || [])

        // Récupère l'historique du jour (ordre décroissant)
        const { data: feedings } = await supabase
          .from('feedings')
          .select('*')
          .eq('baby_id', babyData.id)
          .gte('fed_at', `${today}T00:00:00`)
          .lte('fed_at', `${today}T23:59:59`)

        const { data: diapers } = await supabase
          .from('diaper_changes')
          .select('*')
          .eq('baby_id', babyData.id)
          .gte('changed_at', `${today}T00:00:00`)
          .lte('changed_at', `${today}T23:59:59`)

        const { data: bottles } = await supabase
          .from('bottles')
          .select('*')
          .eq('baby_id', babyData.id)
          .gte('given_at', `${today}T00:00:00`)
          .lte('given_at', `${today}T23:59:59`)

        const { data: temperatures } = await supabase
          .from('temperatures')
          .select('*')
          .eq('baby_id', babyData.id)
          .gte('measured_at', `${today}T00:00:00`)
          .lte('measured_at', `${today}T23:59:59`)

        // Combine et trie par timestamp décroissant
        const allHistory: HistoryEntry[] = [
          ...(feedings || []).map(f => ({
            id: f.id,
            type: 'feeding' as const,
            timestamp: f.fed_at,
            data: f,
            table: 'feedings' as const,
          })),
          ...(diapers || []).map(d => ({
            id: d.id,
            type: 'diaper' as const,
            timestamp: d.changed_at,
            data: d,
            table: 'diaper_changes' as const,
          })),
          ...(bottles || []).map(b => ({
            id: b.id,
            type: 'bottle' as const,
            timestamp: b.given_at,
            data: b,
            table: 'bottles' as const,
          })),
          ...(temperatures || []).map(t => ({
            id: t.id,
            type: 'temperature' as const,
            timestamp: t.measured_at,
            data: t,
            table: 'temperatures' as const,
          })),
        ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

        setHistory(allHistory)
      } catch (err) {
        console.error(err)
        setError('Erreur')
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [])

  if (loading) return <div className="p-8">Chargement...</div>
  if (!baby) return <div className="p-8">{error}</div>

  const handleQuickCheck = async (logId: string) => {
    await quickCheck(logId, null)
    const updated = careLogs.map(l =>
      l.id === logId ? { ...l, fait: true, done_at: new Date().toISOString() } : l
    )
    setCareLogs(updated)
  }

  const handleUncheck = async (logId: string) => {
    await uncheckLog(logId)
    const updated = careLogs.map(l =>
      l.id === logId ? { ...l, fait: false, done_at: null } : l
    )
    setCareLogs(updated)
  }

  const handleDeleteHistory = async (entryId: string, table: 'feedings' | 'diaper_changes' | 'bottles' | 'temperatures') => {
    if (!confirm('Supprimer cet enregistrement ?')) return

    setDeletingId(entryId)
    try {
      await deleteHistoryEntry(table, entryId)
      setHistory(history.filter(h => h.id !== entryId))
    } catch (err) {
      console.error(err)
      alert('Erreur lors de la suppression')
    } finally {
      setDeletingId(null)
    }
  }

  const formatTime = (time: string) => time?.slice(0, 5) || ''

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="border-b pb-4">
        <h1 className="text-4xl font-bold">👶 {baby.first_name}</h1>
        {baby.birth_date && (
          <p className="text-sm text-gray-600">
            Né le {new Date(baby.birth_date).toLocaleDateString('fr-FR')}
          </p>
        )}
      </div>

      {/* ⚡ DÉCLARATIONS RAPIDES */}
      <section className="space-y-3">
        <h2 className="font-bold text-lg">⚡ DÉCLARATIONS RAPIDES</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href={`/feedings/new?baby=${baby.id}&date=${today}`}
            className="p-4 bg-pink-100 border-2 border-pink-400 rounded-lg text-center font-bold hover:bg-pink-200 transition"
          >
            🤱 Tétée
          </Link>
          <Link
            href={`/diapers/new?baby=${baby.id}&date=${today}`}
            className="p-4 bg-yellow-100 border-2 border-yellow-400 rounded-lg text-center font-bold hover:bg-yellow-200 transition"
          >
            🧻 Couche
          </Link>
          <Link
            href={`/bottles/new?baby=${baby.id}&date=${today}`}
            className="p-4 bg-blue-100 border-2 border-blue-400 rounded-lg text-center font-bold hover:bg-blue-200 transition"
          >
            🍼 Biberon
          </Link>
          <Link
            href={`/temperatures/new?baby=${baby.id}&date=${today}`}
            className="p-4 bg-red-100 border-2 border-red-400 rounded-lg text-center font-bold hover:bg-red-200 transition"
          >
            🌡️ Temp.
          </Link>
        </div>
      </section>

      {/* 📋 SOINS PLANIFIÉS (ordre croissant) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg">📋 SOINS PLANIFIÉS</h2>
          <Link
            href={`/parametrage`}
            className="text-2xl hover:opacity-70 transition"
          >
            ⚙️
          </Link>
        </div>
        {careLogs.length > 0 ? (
          <ul className="space-y-2">
            {careLogs.map((log) => {
              const careType = log.care_schedules?.care_types
              const label = log.care_schedule_times?.label || careType?.name
              const unit = log.care_schedules?.default_unit || ''
              const quantityPrevue = log.care_schedules?.default_quantity

              return (
                <li
                  key={log.id}
                  className={`rounded-lg p-3 flex justify-between items-center ${
                    log.fait ? 'bg-green-50 border-2 border-green-300' : 'bg-white border-2 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <input
                      type="checkbox"
                      checked={log.fait}
                      onChange={() => log.fait ? handleUncheck(log.id) : handleQuickCheck(log.id)}
                      className="w-5 h-5 cursor-pointer"
                    />
                    <span className="text-2xl">{careType?.icon || '🛁'}</span>
                    <div>
                      <p className="font-medium">
                        {log.scheduled_time && (
                          <span className="text-gray-600 mr-2">{formatTime(log.scheduled_time)}</span>
                        )}
                        {label}
                      </p>
                      {quantityPrevue && (
                        <p className="text-sm text-gray-500">{quantityPrevue} {unit}</p>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-gray-500 italic">Aucun soin planifié</p>
        )}
      </section>

      {/* 📊 HISTORIQUE (ordre décroissant) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg">📊 HISTORIQUE</h2>
          <Link
            href={`/historique?baby=${baby.id}`}
            className="text-sm text-blue-600 hover:underline font-medium"
          >
            Voir tout →
          </Link>
        </div>
        {history.length > 0 ? (
          <ul className="space-y-2">
            {history.map((entry) => {
              const time = new Date(entry.timestamp).toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
              })

              let icon = '📝'
              let label = ''
              let note = ''

              if (entry.type === 'feeding') {
                icon = '🤱'
                const side = entry.data.side === 'gauche' ? 'gauche' : entry.data.side === 'droit' ? 'droit' : 'les deux'
                label = `Tétée (${side})`
                note = entry.data.note
              } else if (entry.type === 'diaper') {
                icon = '🧻'
                const types = []
                if (entry.data.pipi) types.push('💧 Pipi')
                if (entry.data.caca) types.push('💩 Caca')
                label = types.join(' • ') || 'Couche'
                note = entry.data.note
              } else if (entry.type === 'bottle') {
                icon = '🍼'
                label = `Biberon ${entry.data.quantity_ml}ml`
                note = entry.data.note
              } else if (entry.type === 'temperature') {
                icon = '🌡️'
                const typeLabels: Record<string, string> = {
                  frontal: 'Frontal',
                  aisselle: 'Aisselle',
                  rectal: 'Rectal',
                }
                label = `Température ${entry.data.temperature}°C (${typeLabels[entry.data.type]})`
                note = entry.data.note || ''
              }

              return (
                <li
                  key={`${entry.table}-${entry.id}`}
                  className="bg-white border border-gray-200 rounded-lg p-3 flex justify-between items-start"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <span className="text-xl mt-0.5">{icon}</span>
                    <div className="flex-1">
                      <p className="font-medium">{time}</p>
                      <p className="text-sm text-gray-600">{label}</p>
                      {note && (
                        <p className="text-xs text-gray-500 italic mt-1">
                          "{note}"
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteHistory(entry.id, entry.table)}
                    disabled={deletingId === entry.id}
                    className="text-red-500 hover:text-red-700 disabled:opacity-50 text-xl font-bold ml-2 flex-shrink-0"
                  >
                    ✕
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-gray-500 italic">Aucune entrée aujourd'hui</p>
        )}
      </section>
    </div>
  )
}