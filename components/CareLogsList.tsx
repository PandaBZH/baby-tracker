import { createClient } from '@/lib/supabase/server'

interface CareLogs {
  id: string
  baby_id: string
  care_schedule: {
    care_type: {
      name: string
      icon?: string
    }
  }
  done_at: string
  note?: string
}

export default async function CareLogsList({
  babyIds,
  date,
}: {
  babyIds: string[]
  date: string
}) {
  const supabase = await createClient()

  const { data: logs, error } = await supabase
    .from('care_logs')
    .select(
      `
      id,
      baby_id,
      done_at,
      note,
      care_schedule(
        care_type(name, icon)
      ),
      babies(first_name)
    `
    )
    .in('baby_id', babyIds)
    .gte('done_at', `${date}T00:00:00`)
    .lte('done_at', `${date}T23:59:59`)
    .order('done_at', { ascending: false })

  if (error) {
    console.error('Erreur logs:', error)
    return <p className="text-red-500">Erreur lors du chargement</p>
  }

  if (!logs || logs.length === 0) {
    return <p className="text-gray-500 text-center py-8">Aucune activité enregistrée aujourd'hui</p>
  }

  const iconMap: { [key: string]: string } = {
    Biberon: '🍼',
    Sein: '👶',
    Couche: '🧷',
    Sommeil: '😴',
    Température: '🌡️',
    Vaccin: '💉',
  }

  return (
    <div className="space-y-2">
      {logs.map((log: any) => (
        <div
          key={log.id}
          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">
              {iconMap[log.care_schedule?.care_type?.name] || '📝'}
            </span>
            <div>
              <p className="font-medium text-gray-800">
                {log.babies?.first_name} - {log.care_schedule?.care_type?.name}
              </p>
              {log.note && (
                <p className="text-sm text-gray-600">{log.note}</p>
              )}
            </div>
          </div>
          <span className="text-sm text-gray-500">
            {new Date(log.done_at).toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      ))}
    </div>
  )
}