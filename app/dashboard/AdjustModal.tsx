'use client'

import { useState } from 'react'
import { adjustCheck } from './actions'

type Props = {
  log: any
  unit: string
  onClose: () => void
  onSaved: (logId: string, updated: any) => void
}

function toLocalDatetimeInputValue(isoOrNull: string | null, fallbackDate: string) {
  if (isoOrNull) {
    const d = new Date(isoOrNull)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`
  }
  const time = new Date().toTimeString().slice(0, 5)
  return `${fallbackDate}T${time}`
}

export default function AdjustModal({ log, unit, onClose, onSaved }: Props) {
  const [doneAt, setDoneAt] = useState(
    toLocalDatetimeInputValue(log.done_at, log.scheduled_date)
  )
  const [quantity, setQuantity] = useState<string>(
    log.quantity != null
      ? String(log.quantity)
      : log.care_schedules?.default_quantity != null
      ? String(log.care_schedules.default_quantity)
      : ''
  )
  const [note, setNote] = useState<string>(log.note ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      const doneAtIso = new Date(doneAt).toISOString()
      const quantityNum = quantity !== '' ? parseFloat(quantity) : null
      await adjustCheck(log.id, doneAtIso, quantityNum, note || null)
      onSaved(log.id, {
        fait: true,
        done_at: doneAtIso,
        quantity: quantityNum,
        note: note || null,
      })
    } finally {
      setSaving(false)
    }
  }

  const careType = log.care_schedules?.care_types

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
        <h3 className="font-semibold text-lg">
          Ajuster : {careType?.icon} {careType?.name}
        </h3>

        <div>
          <label className="block text-sm font-medium mb-1">Heure réelle</label>
          <input
            type="datetime-local"
            value={doneAt}
            onChange={(e) => setDoneAt(e.target.value)}
            className="w-full border rounded-lg p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Quantité {unit ? `(${unit})` : ''}
          </label>
          <input
            type="number"
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full border rounded-lg p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Note</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full border rounded-lg p-2"
            rows={3}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border hover:bg-gray-100"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}