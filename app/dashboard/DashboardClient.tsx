'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { quickCheck, uncheckLog, deleteCareLog } from './actions'
import AdjustModal from './AdjustModal'

type Props = {
  baby: any
  date: string
  initialLogs: any[]
}

function formatDateFr(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function isLate(scheduledTime: string | null, date: string, fait: boolean) {
  if (fait || !scheduledTime) return false
  const now = new Date()
  const scheduledDateTime = new Date(`${date}T${scheduledTime}`)
  return scheduledDateTime < now
}

export default function DashboardClient({ baby, date, initialLogs }: Props) {
  const router = useRouter()
  const [logs, setLogs] = useState(initialLogs)
  const [adjustingLog, setAdjustingLog] = useState<any>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const isToday = date === new Date().toISOString().slice(0, 10)

  function goToDate(newDate: string) {
    router.push(`/dashboard?date=${newDate}`)
  }

  function getCareType(log: any) {
    return log.care_schedules?.care_types
  }

  function getUnit(log: any) {
    return log.care_schedules?.default_unit ?? ''
  }

  function getQuantitePrevue(log: any) {
    return log.care_schedules?.default_quantity ?? null
  }

  async function handleQuickCheck(log: any) {
    setLoadingId(log.id)
    try {
      const quantitePrevue = getQuantitePrevue(log)
      await quickCheck(log.id, quantitePrevue)
      setLogs((prev) =>
        prev.map((l) =>
          l.id === log.id
            ? { ...l, fait: true, done_at: new Date().toISOString(), quantity: quantitePrevue }
            : l
        )
      )
    } finally {
      setLoadingId(null)
    }
  }

  async function handleUncheck(log: any) {
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

  async function handleDelete(log: any) {
    if (!confirm('Supprimer cet enregistrement ?')) return
    setLoadingId(log.id)
    try {
      await deleteCareLog(log.id)
      setLogs((prev) => prev.filter((l) => l.id !== log.id))
    } finally {
      setLoadingId(null)
    }
  }

  function handleAdjusted(logId: string, updated: any) {
    setLogs((prev) => prev.map((l) => (l.id === logId ? { ...l, ...updated } : l)))
    setAdjustingLog(null)
  }

  return (
    <div>
      {/* Navigation date */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => goToDate(addDays(date, -1))}
          className="px-3 py-2 rounded-lg border hover:bg-gray-100"
        >
          ← Veille
        </button>

        <div className="text-center">
          <div className="font-semibold capitalize">{formatDateFr(date)}</div>
          {!isToday && (
            <button
              onClick={() => goToDate(new Date().toISOString().slice(0, 10))}
              className="text-xs text-blue-600 hover:underline"
            >
              Revenir à aujourd'hui
            </button>
          )}
        </div>

        <button
          onClick={() => goToDate(addDays(date, 1))}
          className="px-3 py-2 rounded-lg border hover:bg-gray-100"
        >
          Lendemain →
        </button>
      </div>

      {/* Liste des soins */}
      <div className="space-y-3">
        {logs.length === 0 && (
          <p className="text-gray-500 text-center py-8">
            Aucun soin planifié pour ce jour.
          </p>
        )}

        {logs.map((log) => {
          const careType = getCareType(log)
          const unit = getUnit(log)
          const quantitePrevue = getQuantitePrevue(log)
          const late = isLate(log.scheduled_time, log.scheduled_date, log.fait)

          return (
            <div
              key={log.id}
              className={`border rounded-lg p-4 flex items-center justify-between ${
                log.fait
                  ? 'bg-green-50 border-green-200'
                  : late
                  ? 'bg-red-50 border-red-200'
                  : 'bg-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-3 h-3 rounded-full ${
                    log.fait ? 'bg-green-500' : late ? 'bg-red-500' : 'bg-gray-300'
                  }`}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">
                      {careType?.icon} {careType?.name}
                    </span>
                    {log.scheduled_time && (
                      <span className="text-sm text-gray-500">
                        {log.scheduled_time.slice(0, 5)}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    {quantitePrevue ? `Prévu : ${quantitePrevue} ${unit}` : 'Prévu'}
                  </div>
                  {log.fait && (
                    <div className="text-sm text-green-700 mt-1">
                      ✓ Fait à{' '}
                      {log.done_at &&
                        new Date(log.done_at).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      {log.quantity != null && ` — ${log.quantity} ${unit}`}
                    </div>
                  )}
                  {late && !log.fait && (
                    <div className="text-sm text-red-600 mt-1">En retard</div>
                  )}
                  {log.note && (
                    <div className="text-xs text-gray-500 mt-1 italic">{log.note}</div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 items-center">
                {!log.fait ? (
                  <>
                    <button
                      onClick={() => handleQuickCheck(log)}
                      disabled={loadingId === log.id}
                      className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
                    >
                      ✓ Check
                    </button>
                    <button
                      onClick={() => setAdjustingLog(log)}
                      className="px-3 py-2 rounded-lg border text-sm hover:bg-gray-100"
                    >
                      Ajuster
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setAdjustingLog(log)}
                      className="px-3 py-2 rounded-lg border text-sm hover:bg-gray-100"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => handleUncheck(log)}
                      disabled={loadingId === log.id}
                      className="px-3 py-2 rounded-lg border text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                    >
                      Annuler
                    </button>
                  </>
                )}
                <button
                  onClick={() => handleDelete(log)}
                  disabled={loadingId === log.id}
                  className="px-2 py-2 rounded-lg border text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                  title="Supprimer"
                >
                  🗑️
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {adjustingLog && (
        <AdjustModal
          log={adjustingLog}
          unit={getUnit(adjustingLog)}
          onClose={() => setAdjustingLog(null)}
          onSaved={handleAdjusted}
        />
      )}
    </div>
  )
}