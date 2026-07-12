'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { 
  getCareLogsForDate,
  getPlannedCareTypes,
  getPlannedCareForDate,
  logPlannedCare,
  removePlannedCareLog,
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

interface CareType {
  id: string
  name: string
  icon: string | null
}

interface HistoryEntry {
  id: string
  type: 'feeding' | 'diaper' | 'bottle' | 'temperature' | 'planned_care'
  timestamp: string
  data: any
  table: 'feedings' | 'diaper_changes' | 'bottles' | 'temperatures' | 'planned_care_logs'
  label?: string
  quantity?: number | null
  unit?: string | null
}

interface PlannedCareLogRow {
  id: string
  logged_at: string
  care_schedules: {
    id: string
    label: string | null
    default_quantity: number | null
    default_unit: string | null
    care_types: Array<{
      id: string
      name: string
      icon: string | null
    }>
  } | null
}

export default function HomePage() {
  const supabase = createClient()
  const [baby, setBaby] = useState<Baby | null>(null)
  const [family, setFamily] = useState<Family | null>(null)
  const [careLogs, setCareLogs] = useState<CareLog[]>([])
  const [plannedCares, setPlannedCares] = useState<CareType[]>([])
  const [checkedPlannedCares, setCheckedPlannedCares] = useState<string[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [newCareName, setNewCareName] = useState('')
  const [showAddCareForm, setShowAddCareForm] = useState(false)

  const today = new Date().toISOString().split('T')[0]

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

      const { data: plannedCareLogsData } = await supabase
        .from('planned_care_logs')
        .select(`
          id,
          logged_at,
          care_schedules!inner(
            id,
            default_quantity,
            default_unit,
            care_types!inner(
              id,
              name,
              icon
            )
          )
        `)
        .eq('baby_id', babyId)
        .gte('logged_at', `${today}T00:00:00`)
        .lte('logged_at', `${today}T23:59:59`)

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
        ...((plannedCareLogsData as PlannedCareLogRow[] | null) || []).map(pc => {
          const careType = pc.care_schedules?.care_types?.[0]
          const label = pc.care_schedules?.label || careType?.name || 'Soin'

          return {
            id: pc.id,
            type: 'planned_care' as const,
            timestamp: pc.logged_at,
            data: pc,
            table: 'planned_care_logs' as const,
            label,
            quantity: pc.care_schedules?.default_quantity,
            unit: pc.care_schedules?.default_unit,
          }
        }),
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

        // Récupère les types de soins disponibles
        const careTypes = await getPlannedCareTypes(profile.family_id)
        setPlannedCares(careTypes)

        // Récupère les soins planifiés cochés pour aujourd'hui
        const checkedCares = await getPlannedCareForDate(babyData.id, today)
        setCheckedPlannedCares(checkedCares)

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

  const handleTogglePlannedCare = async (careId: string) => {
    try {
      if (checkedPlannedCares.includes(careId)) {
        // Décocher
        await removePlannedCareLog(baby.id, careId, today)
        setCheckedPlannedCares(checkedPlannedCares.filter(id => id !== careId))
      } else {
        // Cocher
        await logPlannedCare(baby.id, careId, today)
        setCheckedPlannedCares([...checkedPlannedCares, careId])
      }
      await fetchHistory(baby.id)
    } catch (err) {
      console.error(err)
      alert('Erreur lors du toggle')
    }
  }

  const handleDeleteHistory = async (entryId: string, table: 'feedings' | 'diaper_changes' | 'bottles' | 'temperatures' | 'planned_care_logs') => {
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

      {/* 🛁 SOINS GÉNÉRAUX (généraliste) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <span>🛁 Soins généraux</span>
            <span className="text-sm text-gray-500">⚙️</span>
          </h2>
        </div>
        {plannedCares.length > 0 ? (
          <div className="space-y-2">
            {plannedCares.map((care) => (
              <label
                key={care.id}
                className={`rounded-lg p-3 flex items-center gap-3 cursor-pointer transition ${
                  checkedPlannedCares.includes(care.id)
                    ? 'bg-green-50 border-2 border-green-300'
                    : 'bg-white border-2 border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checkedPlannedCares.includes(care.id)}
                  onChange={() => handleTogglePlannedCare(care.id)}
                  className="w-5 h-5 cursor-pointer"
                />
                <span className="text-2xl">{care.icon || '✓'}</span>
                <span className="font-medium flex-1">{care.name}</span>
              </label>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 italic">Aucun soin configuré</p>
        )}

        {/* Bouton ajouter soin ad hoc */}
        {!showAddCareForm ? (
          <button
            onClick={() => setShowAddCareForm(true)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium mt-3"
          >
            + Ajouter un soin ad hoc
          </button>
        ) : (
          <div className="border rounded-lg p-3 mt-3 bg-blue-50 space-y-2">
            <input
              type="text"
              value={newCareName}
              onChange={(e) => setNewCareName(e.target.value)}
              placeholder="Ex: Coupe d'ongles, Nettoyage nez..."
              className="w-full border rounded-lg p-2 text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  // TODO: Implémenter la sauvegarde du soin ad hoc
                  setShowAddCareForm(false)
                  setNewCareName('')
                }}
                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                ✓ Ajouter
              </button>
              <button
                onClick={() => {
                  setShowAddCareForm(false)
                  setNewCareName('')
                }}
                className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
              >
                ✕
              </button>
            </div>
          </div>
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
              } else if (entry.type === 'planned_care') {
                icon = '✓'
                label = entry.label || 'Soin'
                if (entry.quantity) {
                  label += ` ${entry.quantity} ${entry.unit || ''}`
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
                      <p className="text-sm text-gray-600">{label}</p>
                      {note && (
                        <p className="text-xs text-gray-500 italic mt-1">
                          "{note}"
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteHistory(entry.id, entry.table as any)}
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