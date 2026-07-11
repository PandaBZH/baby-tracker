'use client'

import { useState } from 'react'
import { quickCheck, adjustCheck, uncheckLog } from '@/app/dashboard/actions'

type CareType = {
  id: string
  name: string
  icon: string | null
}

type CareSchedule = {
  id: string
  default_unit: string | null
  default_quantity: number | null
  care_types: CareType | null
}

type CareLog = {
  id: string
  scheduled_date: string
  scheduled_time: string | null
  done_at: string | null
  fait: boolean
  quantity: number | null
  note: string | null
  care_schedules: CareSchedule | null
}

type Baby = {
  id: string
  first_name: string
}

type Props = {
  baby: Baby
  date: string
  initialLogs: CareLog[]
}

export default function DashboardClient({ baby, date, initialLogs }: Props) {
  const [logs, setLogs] = useState<CareLog[]>(initialLogs)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [modalLog, setModalLog] = useState<CareLog | null>(null)

  const handleQuickCheck = async (log: CareLog) => {
    setLoadingId(log.id)
    try {
      const defaultQty = log.care_schedules?.default_quantity ?? null
      await quickCheck(log.id, defaultQty)
      setLogs((prev) =>
        prev.map((l) =>
          l.id === log.id
            ? { ...l, fait: true, done_at: new Date().toISOString(), quantity: defaultQty }
            : l
        )
      )
    } finally {
      setLoadingId(null)
    }
  }

  const handleUncheck = async (log: CareLog) => {
    setLoadingId(log.id)
    try {
      await uncheckLog(log.id)
      setLogs((prev) =>
        prev.map((l) =>
          l.id === log.id ? { ...l, fait: false, done_at: null, quantity: null } : l
        )
      )
    } finally {
      setLoadingId(null)
    }
  }

  const formatTime = (time: string | null) => {
    if (!time) return ''
    return time.slice(0, 5)
  }

  if (!logs || logs.length === 0) {
    return <p className="text-gray-400 text-sm">Aucun soin prévu aujourd'hui</p>
  }

  return (
    <>
      <ul className="space-y-2">
        {logs.map((log) => {
          const careType = log.care_schedules?.care_types
          const unit = log.care_schedules?.default_unit ?? ''

          return (
            <li
              key={log.id}
              className={`rounded-lg p-3 shadow-sm flex justify-between items-center ${
                log.fait ? 'bg-green-50' : 'bg-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{careType?.icon ?? '🛁'}</span>
                <div>
                  <p className="font-medium">
                    {careType?.name ?? 'Soin'}
                    {log.scheduled_time && (
                      <span className="text-gray-400 text-sm ml-2">
                        {formatTime(log.scheduled_time)}
                      </span>
                    )}
                  </p>
                  {log.fait && log.quantity != null && (
                    <p className="text-sm text-gray-500">
                      {log.quantity} {unit}
                    </p>
                  )}
                  {log.note && (
                    <p className="text-sm text-gray-400 italic">{log.note}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {log.fait ? (
                  <>
                    <button
                      onClick={() => setModalLog(log)}
                      className="text-sm text-blue-600 underline"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => handleUncheck(log)}
                      disabled={loadingId === log.id}
                      className="text-sm text-gray-500 underline disabled:opacity-50"
                    >
                      Annuler
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleQuickCheck(log)}
                    disabled={loadingId === log.id}
                    className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700 disabled:opacity-50"
                  >
                    {loadingId === log.id ? '...' : '✓ Fait'}
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {modalLog && (
        <AdjustModal
          log={modalLog}
          onClose={() => setModalLog(null)}
          onSave={(updated) => {
            setLogs((prev) =>
              prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l))
            )
            setModalLog(null)
          }}
        />
      )}
    </>
  )
}

function AdjustModal({
  log,
  onClose,
  onSave,
}: {
  log: CareLog
  onClose: () => void
  onSave: (updated: Partial<CareLog> & { id: string }) => void
}) {
  const [quantity, setQuantity] = useState<string>(
    log.quantity != null ? String(log.quantity) : ''
  )
  const [note, setNote] = useState(log.note ?? '')
  const [saving, setSaving] = useState(false)

  const unit = log.care_schedules?.default_unit ?? ''

  const handleSave = async () => {
    setSaving(true)
    try {
      const parsedQuantity = quantity === '' ? null : parseFloat(quantity)
      await adjustCheck(log.id, parsedQuantity, note)
      onSave({ id: log.id, quantity: parsedQuantity, note })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-4 w-full max-w-sm space-y-4">
        <h3 className="font-semibold text-lg">
          {log.care_schedules?.care_types?.name ?? 'Soin'}
        </h3>

        <div>
          <label className="block text-sm font-medium mb-1">
            Quantité {unit && `(${unit})`}
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