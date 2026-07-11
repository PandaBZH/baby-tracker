import { getBabies } from '../parametrage/actions'
import { getCareLogsForDate } from './actions'
import DashboardClient from './DashboardClient'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const babies = await getBabies()
  const baby = babies?.[0]

  if (!baby) {
    return <div className="p-8">Aucun bébé enregistré.</div>
  }

  const params = await searchParams
  const date = params.date ?? new Date().toISOString().slice(0, 10)

  const logs = await getCareLogsForDate(baby.id, date)

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-8">
      <DashboardClient baby={baby} date={date} initialLogs={logs} />
    </div>
  )
}