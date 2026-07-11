'use client'

import { useState } from 'react'
import { createCareSchedule, updateCareSchedule, CareScheduleInput } from './actions'

type Props = {
  babyId: string
  careTypes: any[]
  existing?: any
  onSaved: () => void
  onCancel: () => void
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

export default function ScheduleForm({ babyId, careTypes, existing, onSaved, onCancel }: Props) {
  const [careTypeId, setCareTypeId] = useState(existing?.care_type_id ?? careTypes[0]?.id ?? '')
  const [label, setLabel] = useState(existing?.label ?? '')
  const [quantitePrevue, setQuantitePrevue] = useState(existing?.quantite_prevue?.toString() ?? '')
  const [unite, setUnite] = useState(existing?.unite ?? '')
  const [frequenceType, setFrequenceType] = useState<'quotidien' | 'hebdomadaire' | 'ponctuel'>(
    existing?.frequence_type ?? 'quotidien'
  )
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(existing?.days_of_week ?? [])
  const [validFrom, setValidFrom] = useState(
    existing?.valid_from ?? new Date().toISOString().slice(0, 10)
  )
  const [validTo, setValidTo] = useState(existing?.valid_to ?? '')
  const [active, setActive] = useState(existing?.active ?? true)
  const [times, setTimes] = useState<string[]>(
    existing?.care_schedule_times
      ?.sort((a: any, b: any) => a.scheduled_time.localeCompare(b.scheduled_time))
      .map((t: any) => t.scheduled_time.slice(0, 5)) ?? ['08:00']
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!label.trim()) return setError('Le libellé est requis')
    if (times.length === 0) return setError('Au moins un horaire est requis')
    if (frequenceType === 'hebdomadaire' && daysOfWeek.length === 0)
      return setError('Sélectionnez au moins un jour de la semaine')

    setSaving(true)
    try {
      const input: CareScheduleInput = {
        id: existing?.id,
        baby_id: babyId,
        care_type_id: careTypeId,
        label: label.trim(),
        quantite_prevue: quantitePrevue ? parseFloat(quantitePrevue) : null,
        unite: unite.trim() || null,
        frequence_type: frequenceType,
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
        {existing ? 'Modifier le paramétrage' : 'Nouveau paramétrage'}
      </h2>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      <div>
        <label className="block text-sm font-medium mb-1">Type de soin</label>
        <select
          value={careTypeId}
          onChange={(e) => setCareTypeId(e.target.value)}
          className="w-full border rounded px-3 py-2"
        >
          {careTypes.map((ct) => (
            <option key={ct.id} value={ct.id}>{ct.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Libellé</label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Ex: Biberon du matin"
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
          onChange={(e) => setFrequenceType(e.target.value as any)}
          className="w-full border rounded px-3 py-2"
        >
          <option value="quotidien">Quotidien</option>
          <option value="hebdomadaire">Hebdomadaire (jours précis)</option>
          <option value="ponctuel">Ponctuel</option>
        </select>
      </div>

      {frequenceType === 'hebdomadaire' && (
        <div>
          <label className="block text-sm font-medium mb-1">Jours concernés</label>
          <div className="flex flex-wrap gap-2">
            {joursSemaine.map((j) => (
              <button
                type="button"
                key={j.value}
                onClick={() => toggleDay(j.value)}
                className={`px-3 py-1 rounded-full text-sm border ${
                  daysOfWeek.includes(j.value)
                    ? 'bg-blue-600 text-white border-blue-600'
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
            className="text-sm text-blue-600 hover:underline"
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
          <label className="block text-sm font-medium mb-1">Valide jusqu'au (optionnel)</label>
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
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border hover:bg-gray-100"
        >
          Annuler
        </button>
      </div>
    </form>
  )
}