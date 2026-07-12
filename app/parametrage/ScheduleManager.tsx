'use client'

import { useState } from 'react'
import Link from 'next/link'
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
  const [schedules, setSchedules] = useState(initialSchedules ?? [])
  const [showForm, setShowForm] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<any>(null)

  function handleCreated() {
    setShowForm(false)
    setEditingSchedule(null)
    window.location.reload()
  }

  async function handleToggleActive(id: string, active: boolean) {
    await toggleCareScheduleActive(id, !active)
    setSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, active: !active } : s))
    )
  }

  async function handleDelete(id: string) {
    await deleteCareSchedule(id)
    setSchedules((prev) => prev.filter((s) => s.id !== id))
  }

  const frequenceLabel: Record<string, string> = {
    quotidien: 'Quotidien',
    hebdomadaire: 'Hebdomadaire',
    ponctuel: 'Ponctuel',
  }

  return (
    <div>
      {/* En-tête avec bouton retour */}
      <div className="flex items-center justify-between mb-4">
        <Link href="/">← Retour à l'accueil</Link>
        {!showForm && (
          <button
            onClick={() => {
              setEditingSchedule(null)
              setShowForm(true)
            }}
            className="bg-purple-600 text-white px-4 py-2 rounded"
          >
            + Nouveau paramétrage
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-6 p-4 border rounded bg-gray-50">
          <ScheduleForm
            babyId={baby.id}
            careTypes={careTypes}
            existing={editingSchedule}
            onSaved={handleCreated}
            onCancel={() => {
              setShowForm(false)
              setEditingSchedule(null)
            }}
          />
        </div>
      )}

      <div className="space-y-3">
        {schedules.length === 0 && (
          <p className="text-gray-500 text-center py-8">Aucun soin planifié.</p>
        )}

        {schedules.map((s) => (
          <div
            key={s.id}
            className={`p-4 border rounded ${
              !s.active ? 'opacity-50' : ''
            }`}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{s.care_types?.name ?? '—'}</span>
                <span className="text-sm text-gray-500">
                  {frequenceLabel[s.frequence_type] ?? s.frequence_type}
                </span>
              </div>

              {/* Ligne quantité */}
              {s.default_quantity != null && (
                <p className="text-sm text-gray-600 mt-1">
                  Dose prévue : {s.default_quantity}
                  {s.default_unit ? ` ${s.default_unit}` : ''}
                </p>
              )}

              {/* Lignes d'horaires avec label + quantité par créneau */}
              <div className="text-sm text-gray-600 mt-1">
                {(s.care_schedule_times ?? []).length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {(s.care_schedule_times ?? [])
                      .filter((t: any) => t.time_of_day)
                      .sort((a: any, b: any) => a.time_of_day.localeCompare(b.time_of_day))
                      .map((t: any, idx: number) => (
                        <span key={idx}>
                          {t.time_of_day?.slice(0, 5) ?? ''}
                          {t.label ? ` — ${t.label}` : ''}
                          {t.quantity != null ? ` (${t.quantity}${s.default_unit ? ` ${s.default_unit}` : ''})` : ''}
                        </span>
                      ))}
                  </div>
                ) : (
                  <span>Aucun horaire</span>
                )}
              </div>

              {/* Dates de validité */}
              <div className="flex gap-4 text-xs text-gray-400 mt-1">
                <span>Du {s.valid_from}</span>
                {s.valid_to && <span>Au {s.valid_to}</span>}
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => {
                    setEditingSchedule(s)
                    setShowForm(true)
                  }}
                  className="text-blue-600 text-sm"
                >
                  Modifier
                </button>
                <button
                  onClick={() => handleToggleActive(s.id, s.active)}
                  className="text-yellow-600 text-sm"
                >
                  {s.active ? 'Désactiver' : 'Activer'}
                </button>
                <button
                  onClick={() => handleDelete(s.id)}
                  className="text-red-600 text-sm"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
