'use client'

import { useState } from 'react'
import { createCareSchedule, updateCareSchedule, CareScheduleInput } from './actions'

type Props = {
  babyId: string
  careTypes: any[]
  existing?: any
  onSaved: () => void
  onCancel?: () => void
}

const joursSemaine = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
  { value: 7, label: 'Dimanche' },
]

export default function ScheduleForm({
  babyId,
  careTypes,
  existing,
  onSaved,
  onCancel,
}: Props) {
  const [careTypeId, setCareTypeId] = useState(existing?.care_type_id ?? careTypes?.[0]?.id ?? '')
  const [label, setLabel] = useState(
    existing?.care_schedule_times?.[0]?.label ?? existing?.label ?? ''
  )
  const [quantitePrevue, setQuantitePrevue] = useState(existing?.default_quantity ?? '')
  const [unite, setUnite] = useState(existing?.default_unit ?? '')
  const [frequenceType, setFrequenceType] = useState(
    existing?.frequence_type ?? 'quotidien'
  )
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(
    existing?.days_of_week ?? []
  )
  const [validFrom, setValidFrom] = useState(
    existing?.valid_from ?? new Date().toISOString().split('T')[0]
  )
  const [validTo, setValidTo] = useState(existing?.valid_to ?? '')
  const [active, setActive] = useState(existing?.active ?? true)
  const [error, setError] = useState<string | null>(null)
  const [times, setTimes] = useState(
    (existing?.care_schedule_times ?? [])
      .map((t: any) => t.time_of_day?.slice(0, 5) ?? '')
      .filter(Boolean)
  )
  const [saving, setSaving] = useState(false)

  function addTime() {
    setTimes([...times, '12:00'])
  }

  function updateTime(index: number, value: string) {
    const newTimes = [...times]
    newTimes[index] = value
    setTimes(newTimes)
  }

  function removeTime(index: number) {
    setTimes(times.filter((_, i) => i !== index))
  }

  function toggleDay(day: number) {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!careTypeId) {
      setError('Veuillez sélectionner un type de soin.')
      return
    }
    if (!label.trim()) {
      setError('Veuillez saisir un libellé.')
      return
    }
    if (times.length === 0) {
      setError('Veuillez ajouter au moins un horaire.')
      return
    }

    setSaving(true)
    try {
      const input: CareScheduleInput = {
        id: existing?.id,
        baby_id: babyId,
        care_type_id: careTypeId,
        label: label.trim(),
        quantite_prevue: quantitePrevue !== '' ? Number(quantitePrevue) : null,
        unite: unite.trim() || null,
        frequence_type: frequenceType as CareScheduleInput['frequence_type'],
        days_of_week: frequenceType === 'hebdomadaire' ? daysOfWeek : null,
        valid_from: validFrom,
        valid_to: validTo || null,
        active,
        times: times.sort(),
      }

      if (existing) {
        await updateCareSchedule(input)
      } else {
        await createCareSchedule(input)
      }
      onSaved()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="font-semibold text-lg">
        {existing ? 'Modifier le soin planifié' : 'Nouveau soin planifié'}
      </h2>

      {error && (
        <p className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</p>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Type de soin</label>
        <select
          value={careTypeId}
          onChange={(e) => setCareTypeId(e.target.value)}
          className="w-full border rounded px-3 py-2"
        >
          <option value="">— Sélectionner —</option>
          {careTypes.map((ct) => (
            <option key={ct.id} value={ct.id}>
              {ct.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Libellé du soin</label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Ex: Biberon du matin, Vitamine D"
          className="w-full border rounded px-3 py-2"
        />
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Quantité prévue</label>
          <input
            type="number"
            step="0.1"
            value={quantitePrevue}
            onChange={(e) => setQuantitePrevue(e.target.value)}
            placeholder="Ex: 120"
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Unité</label>
          <input
            type="text"
            value={unite}
            onChange={(e) => setUnite(e.target.value)}
            placeholder="Ex: ml, dose, goutte"
            className="w-full border rounded px-3 py-2"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Fréquence</label>
        <select
          value={frequenceType}
          onChange={(e) => setFrequenceType(e.target.value)}
          className="w-full border rounded px-3 py-2"
        >
          <option value="quotidien">Quotidien</option>
          <option value="ponctuel">Ponctuel</option>
          <option value="hebdomadaire">Hebdomadaire</option>
        </select>
      </div>

      {frequenceType === 'hebdomadaire' && (
        <div>
          <label className="block text-sm font-medium mb-1">Jours de la semaine</label>
          <div className="flex flex-wrap gap-2">
            {joursSemaine.map((j) => (
              <button
                type="button"
                key={j.value}
                onClick={() => toggleDay(j.value)}
                className={`px-3 py-1 rounded border text-sm ${
                  daysOfWeek.includes(j.value)
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-gray-700'
                }`}
              >
                {j.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Horaires</label>
        <div className="space-y-2">
          {times.map((t, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                type="time"
                value={t}
                onChange={(e) => updateTime(i, e.target.value)}
                className="border rounded px-3 py-2"
              />
              {times.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeTime(i)}
                  className="text-red-600 text-sm"
                >
                  Retirer
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addTime}
            className="text-purple-600 text-sm"
          >
            + Ajouter un horaire
          </button>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Valide à partir du</label>
          <input
            type="date"
            value={validFrom}
            onChange={(e) => setValidFrom(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Valide jusqu'au</label>
          <input
            type="date"
            value={validTo}
            onChange={(e) => setValidTo(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="active"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
        />
        <label htmlFor="active" className="text-sm">Actif</label>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="bg-purple-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {saving ? 'Enregistrement…' : existing ? 'Mettre à jour' : 'Créer'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded"
          >
            Annuler
          </button>
        )}
      </div>
    </form>
  )
}
