'use client'

import { useState } from 'react'
import Link from 'next/link'
import { quickCheck, uncheckLog, adjustCheck } from './actions'
import AdjustModal from './AdjustModal'
import DeleteButton from '@/components/DeleteButton'

interface CareScheduleTime {
  id: string
  time_of_day: string
  label: string | null
  quantity: number | null
  sort_order: number
}

interface CareType {
  id: string
  name: string
  icon: string | null
}

interface CareSchedule {
  id: string
  care_types: CareType | null
  default_quantity: number | null
  default_unit: string | null
  care_schedule_times?: CareScheduleTime[]
}

interface CareLog {
  id: string
  care_schedule_id: string
  baby_id: string
  scheduled_date: string
  scheduled_time: string | null
  done_at: string | null
  fait: boolean
  photo_url: string | null
  note: string | null
  created_by: string | null
  created_at: string
  quantity: number | null
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
  const [adjustingLog, setAdjustingLog] = useState<CareLog | null>(null)

  const handleQuickCheck = async (log: CareLog) => {
    setLoadingId(log.id)
    try {
      const defaultQty = log.care_schedules?.default_quantity ?? null
      await quickCheck(log.id, defaultQty)
      setLogs((prev) =>
        prev.map((l) =>
          l.id === log.id
            ? {
                ...l,
                fait: true,
                done_at: new Date().toISOString(),
                quantity: defaultQty,
              }
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
          l.id === log.id
            ? { ...l, fait: false, done_at: null, quantity: null }
            : l
        )
      )
    } finally {
      setLoadingId(null)
    }
  }

    const handleAdjust = async (
    logId: string,
    doneAtIso: string,
    newQuantity: number | null,
    note: string | null
    ) => {
    setLoadingId(logId)
    try {
        await adjustCheck(logId, doneAtIso, newQuantity, note)
        setLogs((prev) =>
        prev.map((l) =>
            l.id === logId
            ? { ...l, fait: true, done_at: doneAtIso, quantity: newQuantity, note }
            : l
        )
        )
        setAdjustingLog(null)
    } finally {
        setLoadingId(null)
    }
    }

  const formatTime = (time: string | null) => {
    if (!time) return ''
    return time.slice(0, 5)
  }

  const getUnit = (log: CareLog) => {
    return log.care_schedules?.default_unit || 'min'
  }

  return (
    <div className="space-y-8">
      {/* Déclarations rapides */}
      <section>
        <h2 className="font-semibold text-lg mb-3">⚡ Déclarations rapides</h2>
        <div className="grid grid-cols-3 gap-3">
          <Link
            href={`/feedings/new?baby=${baby.id}&date=${date}`}
            className="bg-white border border-gray-200 rounded-lg p-4 text-center hover:shadow-md transition"
          >
            🤱 Tétée
          </Link>
          <Link
            href={`/diapers/new?baby=${baby.id}&date=${date}`}
            className="bg-white border border-gray-200 rounded-lg p-4 text-center hover:shadow-md transition"
          >
            🧷 Couche
          </Link>
          <Link
            href={`/bottles/new?baby=${baby.id}&date=${date}`}
            className="bg-white border border-gray-200 rounded-lg p-4 text-center hover:shadow-md transition"
          >
            🍼 Biberon
          </Link>
        </div>
      </section>

      {/* Soins planifiés du jour */}
      <section>
        <h2 className="font-semibold text-lg mb-3">📅 Soins du jour</h2>
        {logs.length > 0 ? (
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className={`border rounded-lg p-3 flex items-center justify-between ${
                  log.fait ? 'bg-green-50 border-green-200' : 'bg-white'
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <input
                    type="checkbox"
                    checked={log.fait}
                    onChange={() =>
                      log.fait ? handleUncheck(log) : handleQuickCheck(log)
                    }
                    disabled={loadingId === log.id}
                    className="w-5 h-5 cursor-pointer"
                  />
                  <div>
                    <div className="font-medium">
                      {log.care_schedules?.care_types?.icon}{' '}
                      {log.care_schedules?.care_types?.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatTime(log.scheduled_time)}
                      {log.quantity !== null && ` • ${log.quantity} ${getUnit(log)}`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {log.fait && (
                    <button
                      onClick={() => setAdjustingLog(log)}
                      className="text-blue-500 text-sm px-2 hover:underline"
                    >
                      ✏️
                    </button>
                  )}
                  <DeleteButton table="care_logs" id={log.id} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">Aucun soin prévu aujourd'hui</p>
        )}
      </section>

      {/* Modal d'ajustement */}
      {adjustingLog && (
        <AdjustModal
            log={adjustingLog}
            unit={getUnit(adjustingLog)}
            onClose={() => setAdjustingLog(null)}
            onSaved={(logId, updates) =>
            handleAdjust(
                logId,
                updates.done_at ?? new Date().toISOString(),
                updates.quantity,
                updates.note ?? null
            )
            }
        />
        )}
    </div>
  )
}