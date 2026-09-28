'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { 
  getCareLogsForDate,
  quickCheck, 
  uncheckLog, 
  deleteHistoryEntry 
} from '@/app/dashboard/actions'

interface Baby {
  id: string
  first_name: string
  birth_date: string | null
}

interface Family {
  id: string
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
  type: 'feeding' | 'diaper' | 'bottle' | 'temperature' | 'checklist' | 'note'
  timestamp: string
  data: any
  table: 'feedings' | 'diaper_changes' | 'bottles' | 'temperatures' | 'care_logs' | 'notes'
  label?: string
  quantity?: number | null
  unit?: string | null
}


export default function HomePage() {
  const supabase = createClient()
  const [baby, setBaby] = useState<Baby | null>(null)
  const [family, setFamily] = useState<Family | null>(null)
  const [careLogs, setCareLogs] = useState<CareLog[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const getLocalDateKey = (date = new Date()) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const today = getLocalDateKey()

  // Fonction pour récupérer l'historique complet
  const fetchHistory = async (babyId: string) => {
    try {
      const { data: feedings } = await supabase
        .from('feedings')
        .select('*')
        .eq('baby_id', babyId)
        .gte('fed_at', `${today}T00:00:00`)
        .lte('fed_at', `${today}T23:59:59`)

      const { data: diapers } = await supabase
        .from('diaper_changes')
        .select('*')
        .eq('baby_id', babyId)
        .gte('changed_at', `${today}T00:00:00`)
        .lte('changed_at', `${today}T23:59:59`)

      const { data: bottles } = await supabase
        .from('bottles')
        .select('*')
        .eq('baby_id', babyId)
        .gte('given_at', `${today}T00:00:00`)
        .lte('given_at', `${today}T23:59:59`)

      const { data: temperatures } = await supabase
        .from('temperatures')
        .select('*')
        .eq('baby_id', babyId)
        .gte('measured_at', `${today}T00:00:00`)
        .lte('measured_at', `${today}T23:59:59`)

      const localDayStart = new Date(`${today}T00:00:00`).toISOString()
      const localDayEnd = new Date(`${today}T23:59:59.999`).toISOString()

      const { data: notes } = await supabase
        .from('notes')
        .select('*')
        .eq('baby_id', babyId)
        .gte('noted_at', localDayStart)
        .lte('noted_at', localDayEnd)

      const { data: checklistLogs } = await supabase
        .from('care_logs')
        .select(`
          id,
          done_at,
          note,
          quantity,
          care_schedules (
            default_unit,
            care_types (name, icon)
          )
        `)
        .eq('baby_id', babyId)
        .eq('scheduled_date', today)
        .eq('fait', true)
        .not('done_at', 'is', null)

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
        ...(notes || []).map(n => ({
          id: n.id,
          type: 'note' as const,
          timestamp: n.noted_at,
          data: n,
          table: 'notes' as const,
        })),
        ...(checklistLogs || []).map(log => ({
          id: log.id,
          type: 'checklist' as const,
          timestamp: log.done_at as string,
          data: log,
          table: 'care_logs' as const,
        })),
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

      setHistory(allHistory)
    } catch (err) {
      console.error('Erreur historique:', err)
    }
  }

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

        setFamily({ id: profile.family_id })

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

      // Récupère l'historique
      await fetchHistory(babyData.id)
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
  if (!baby || !family) return <div className="p-8">{error}</div>

  const handleQuickCheck = async (logId: string) => {
    try {
      await quickCheck(logId, null)
      const updated = careLogs.map(l =>
        l.id === logId ? { ...l, fait: true, done_at: new Date().toISOString() } : l
      )
      setCareLogs(updated)
      await fetchHistory(baby.id)
    } catch (err) {
      console.error(err)
      alert('Erreur lors du check')
    }
  }

  const handleUncheck = async (logId: string) => {
    try {
      await uncheckLog(logId)
      const updated = careLogs.map(l =>
        l.id === logId ? { ...l, fait: false, done_at: null } : l
      )
      setCareLogs(updated)
      await fetchHistory(baby.id)
    } catch (err) {
      console.error(err)
      alert('Erreur lors du uncheck')
    }
  }


  const handleDeleteHistory = async (entryId: string, table: 'feedings' | 'diaper_changes' | 'bottles' | 'temperatures' | 'notes') => {
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

  const todaysBottles = history.filter(entry => entry.type === 'bottle')
  const totalBottleMl = todaysBottles.reduce(
    (total, entry) => total + (Number(entry.data.quantity_ml) || 0),
    0
  )

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
          <Link
            href={`/notes/new?baby=${baby.id}&date=${today}`}
            className="col-span-2 p-4 bg-purple-100 border-2 border-purple-400 rounded-lg text-center font-bold hover:bg-purple-200 transition"
          >
            📝 Note
          </Link>
        </div>
      </section>

      {/* 🍼 TOTAL BIBERONS DU JOUR */}
      <section className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-2xl shadow-sm">
              🍼
            </div>
            <div>
              <p className="text-sm font-medium text-blue-700">Biberons aujourd'hui</p>
              <p className="text-3xl font-bold text-blue-950">{totalBottleMl} ml</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-blue-900">{todaysBottles.length}</p>
            <p className="text-xs text-blue-700">{todaysBottles.length > 1 ? 'biberons' : 'biberon'}</p>
          </div>
        </div>
      </section>

      {/* 📋 SOINS PLANIFIÉS (ordre croissant) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg">📋 A FAIRE AUJOURD'HUI</h2>
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
          <p className="text-gray-500 italic">Aucun tâche aujourd'hui</p>
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
              } else if (entry.type === 'note') {
                icon = '📝'
                label = entry.data.content || 'Note'
              } else if (entry.type === 'checklist') {
                const rawCareType = entry.data.care_schedules?.care_types
                const careType = Array.isArray(rawCareType) ? rawCareType[0] : rawCareType
                icon = careType?.icon || '✅'
                label = entry.data.note || careType?.name || 'Tâche réalisée'
                if (entry.data.quantity !== null && entry.data.quantity !== undefined) {
                  const unit = entry.data.care_schedules?.default_unit || ''
                  label += ` • ${entry.data.quantity}${unit ? ` ${unit}` : ''}`
                }
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
                      <p className={`text-sm text-gray-600 ${entry.type === 'note' ? 'whitespace-pre-wrap' : ''}`}>{label}</p>
                      {note && (
                        <p className="text-xs text-gray-500 italic mt-1">
                          "{note}"
                        </p>
                      )}
                    </div>
                  </div>
                  {entry.type !== 'checklist' && (
                    <button
                      onClick={() => handleDeleteHistory(entry.id, entry.table as 'feedings' | 'diaper_changes' | 'bottles' | 'temperatures' | 'notes')}
                      disabled={deletingId === entry.id}
                      className="text-red-500 hover:text-red-700 disabled:opacity-50 text-xl font-bold ml-2 flex-shrink-0"
                    >
                      ✕
                    </button>
                  )}
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
