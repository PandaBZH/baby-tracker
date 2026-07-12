import { getBabies, getCareSchedules, getCareTypes } from './actions'
import ScheduleManager from './ScheduleManager'
import GenerateActionsButton from './GenerateActionsButton'

export default async function ParametragePage() {
  const babies = await getBabies()
  const careTypes = await getCareTypes()

  const baby = babies?.[0]

  if (!baby) {
    return <p>Aucun bebe trouve.</p>
  }

  const schedules = await getCareSchedules(baby.id)

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">
          Parametrage des soins — {baby.first_name}
        </h1>
        <GenerateActionsButton />
      </div>
      <ScheduleManager
        baby={baby}
        careTypes={careTypes}
        initialSchedules={schedules ?? []}
      />
    </div>
  )
}