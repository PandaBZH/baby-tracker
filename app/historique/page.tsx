'use client'

import { useEffect, useState, useMemo, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { deleteHistoryEntry } from '@/app/dashboard/actions'

interface HistoryEntry {
  id: string
  type: 'feeding' | 'diaper' | 'bottle' | 'temperature'
  timestamp: string
  data: any
  table: 'feedings' | 'diaper_changes' | 'bottles' | 'temperatures'
}

const FILTERS = [
  { type: 'feeding' as const, label: '🤱 Tétée', color: 'pink' },
  { type: 'diaper' as const, label: '🧻 Couche', color: 'yellow' },
  { type: 'bottle' as const, label: '🍼 Biberon', color: 'blue' },
  { type: 'temperature' as const, label: '🌡️ Temp.', color: 'red' },
]

function HistoriquePageContent() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const router = useRouter()
  const babyId = searchParams.get('baby')

  const [babyName, setBabyName] = useState<string>('')
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set())

  useEffect(() => {
    const init = async () => {
      if (!babyId) {
        setError('Bébé non spécifié')
        setLoading(false)
        return
      }

      try {
        const { data: baby } = await supabase
          .from('babies')
          .select('first_name')
          .eq('id', babyId)
          .single()

        setBabyName(baby?.first_name || '')

        const { data: feedings } = await supabase
          .from('feedings')
          .select('*')
          .eq('baby_id', babyId)
          .order('fed_at', { ascending: false })

        const { data: diapers } = await supabase
          .from('diaper_changes')
          .select('*')
          .eq('baby_id', babyId)
          .order('changed_at', { ascending: false })

        const { data: bottles } = await supabase
          .from('bottles')
          .select('*')
          .eq('baby_id', babyId)
          .order('given_at', { ascending: false })

        const { data: temperatures } = await supabase
          .from('temperatures')
          .select('*')
          .eq('baby_id', babyId)
          .order('measured_at', { ascending: false })

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
        setError('Erreur de chargement')
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [babyId])

  const toggleFilter = (type: string) => {
    setActiveFilters(prev => {
      const next = new Set(prev)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }

  const filteredHistory = useMemo(() => {
    if (activeFilters.size === 0) return history
    return history.filter(entry => activeFilters.has(entry.type))
  }, [history, activeFilters])

  // Groupement par jour
  const groupedByDay = useMemo(() => {
    const groups: Record<string, HistoryEntry[]> = {}
    filteredHistory.forEach(entry => {
      const day = new Date(entry.timestamp).toISOString().slice(0, 10)
      if (!groups[day]) groups[day] = []
      groups[day].push(entry)
    })
    return groups
  }, [filteredHistory])

  const handleDelete = async (
    entryId: string,
    table: 'feedings' | 'diaper_changes' | 'bottles' | 'temperatures'
  ) => {
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

  const formatDayLabel = (day: string) => {
    const date = new Date(day + 'T00:00:00')
    const today = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

    if (day === today) return "Aujourd'hui"
    if (day === yesterday) return 'Hier'
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  if (loading) return <div className="p-8">Chargement...</div>
  if (error) return <div className="p-8 text-red-600">{error}</div>

  return (
    <div className="p-4 sm:p-8 max-w-2xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">📊 Historique complet</h1>
          {babyName && <p className="text-sm text-gray-600">{babyName}</p>}
        </div>
        <button
          onClick={() => router.back()}
          className="text-sm text-blue-600 hover:underline whitespace-nowrap"
        >
          ← Retour
        </button>
      </div>

      {/* Filtres cumulatifs */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-600">Filtrer par type :</p>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(filter => {
            const isActive = activeFilters.has(filter.type)
            return (
              <button
                key={filter.type}
                onClick={() => toggleFilter(filter.type)}
                className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition ${
                  isActive
                    ? `bg-${filter.color}-100 border-${filter.color}-500 text-${filter.color}-800`
                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
                style={
                  isActive
                    ? {
                        backgroundColor:
                          filter.color === 'pink' ? '#fce7f3' :
                          filter.color === 'yellow' ? '#fef9c3' :
                          filter.color === 'blue' ? '#dbeafe' :
                          '#fee2e2',
                        borderColor:
                          filter.color === 'pink' ? '#ec4899' :
                          filter.color === 'yellow' ? '#eab308' :
                          filter.color === 'blue' ? '#3b82f6' :
                          '#ef4444',
                      }
                    : undefined
                }
              >
                {filter.label}
              </button>
            )
          })}
          {activeFilters.size > 0 && (
            <button
              onClick={() => setActiveFilters(new Set())}
              className="px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-700 underline"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Liste groupée par jour */}
      {Object.keys(groupedByDay).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedByDay).map(([day, entries]) => (
            <section key={day} className="space-y-2">
              <h3 className="font-bold text-gray-700 sticky top-0 bg-gray-50 py-1 capitalize">
                {formatDayLabel(day)}
              </h3>
              <ul className="space-y-2">
                {entries.map(entry => {
                  const time = new Date(entry.timestamp).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })

                  let icon = '📝'
                  let label = ''
                  let note = ''

                  if (entry.type === 'feeding') {
                    icon = '🤱'
                    const side =
                      entry.data.side === 'gauche' ? 'gauche' :
                      entry.data.side === 'droit' ? 'droit' : 'les deux'
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
                            <p className="text-xs text-gray-500 italic mt-1">"{note}"</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(entry.id, entry.table)}
                        disabled={deletingId === entry.id}
                        className="text-red-500 hover:text-red-700 disabled:opacity-50 text-xl font-bold ml-2 flex-shrink-0"
                      >
                        ✕
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 italic">Aucune entrée trouvée</p>
      )}
    </div>
  )
}

export default function HistoriquePage() {
  return (
    <Suspense fallback={<div className="p-8">Chargement...</div>}>
      <HistoriquePageContent />
    </Suspense>
  )
}