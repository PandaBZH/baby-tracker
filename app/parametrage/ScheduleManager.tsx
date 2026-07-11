'use client'

import { useState } from 'react'
import ScheduleForm from './ScheduleForm'
import {
  toggleCareScheduleActive,
  deleteCareSchedule,
} from './actions'

type Props = {
  baby: any
  careTypes: any[]
  initialSchedules: any[]
}

export default function ScheduleManager({ baby, careTypes, initialSchedules }: Props) {
  const [schedules, setSchedules] = useState(initialSchedules)
  const [showForm, setShowForm] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<any>(null)

  function handleCreated() {
    setShowForm(false)
    setEditingSchedule(null)
    window.location.reload() // simple pour l'instant, on optimisera après
  }

  async function handleToggle(id: string, active: boolean) {
    await toggleCareScheduleActive(id, !active)
    setSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, active: !active } : s))
    )
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce paramétrage ? Cette action est irréversible.')) return
    await deleteCareSchedule(id)
    setSchedules((prev) => prev.filter((s) => s.id !== id))
  }

  const frequenceLabel: Record<string, string> = {
    quotidien: 'Quotidien',
    hebdomadaire: 'Hebdomadaire',
    ponctuel: 'Ponctuel',
  }

  const joursLabel = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

  return (
    <div>
      <div className="mb-6">
        {!showForm && (
          <button
            onClick={() => { setEditingSchedule(null); setShowForm(true) }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            + Nouveau paramétrage
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-8 border rounded-lg p-4 bg-gray-50">
          <ScheduleForm
            babyId={baby.id}
            careTypes={careTypes}
            existing={editingSchedule}
            onSaved={handleCreated}
            onCancel={() => { setShowForm(false); setEditingSchedule(null) }}
          />
        </div>
      )}

      <div className="space-y-3">
        {schedules.length === 0 && (
          <p className="text-gray-500">Aucun paramétrage créé pour le moment.</p>
        )}

        {schedules.map((s) => (
          <div
            key={s.id}
            className={`border rounded-lg p-4 flex justify-between items-start ${
              s.active ? 'bg-white' : 'bg-gray-100 opacity-60'
            }`}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{s.label}</span>
                <span className="text-xs bg-gray-200 rounded px-2 py-0.5">
                  {s.care_types?.label}
                </span>
                <span className="text-xs text-gray-500">
                  {frequenceLabel[s.frequence_type]}
                </span>
              </div>

              <div className="text-sm text-gray-600 mt-1">
                {s.quantite_prevue && (
                  <span>{s.quantite_prevue} {s.unite} — </span>
                )}
                Horaires :{' '}
                {s.care_schedule_times
                  ?.sort((a: any, b: any) => a.scheduled_time.localeCompare(b.scheduled_time))
                  .map((t: any) => t.scheduled_time.slice(0, 5))
                  .join(', ')}
              </div>

              {s.frequence_type === 'hebdomadaire' && s.days_of_week && (
                <div className="text-sm text-gray-600">
                  Jours : {s.days_of_week.map((d: number) => joursLabel[d - 1]).join(', ')}
                </div>
              )}

              <div className="text-xs text-gray-400 mt-1">
                Depuis le {new Date(s.valid_from).toLocaleDateString('fr-FR')}
                {s.valid_to && ` jusqu'au ${new Date(s.valid_to).toLocaleDateString('fr-FR')}`}
              </div>
            </div>

            <div className="flex flex-col gap-2 items-end">
              <button
                onClick={() => { setEditingSchedule(s); setShowForm(true) }}
                className="text-sm text-blue-600 hover:underline"
              >
                Modifier
              </button>
              <button
                onClick={() => handleToggle(s.id, s.active)}
                className="text-sm text-gray-600 hover:underline"
              >
                {s.active ? 'Désactiver' : 'Activer'}
              </button>
              <button
                onClick={() => handleDelete(s.id)}
                className="text-sm text-red-600 hover:underline"
              >
                Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}