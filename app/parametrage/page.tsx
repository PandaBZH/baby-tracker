import { getBabies, getCareSchedules, getCareTypes } from './actions'
import ScheduleManager from './ScheduleManager'

export default async function ParametragePage() {
  const babies = await getBabies()
  const careTypes = await getCareTypes()

  // Pour l'instant on prend le premier bébé (à adapter si multi-bébé actif)
  const baby = babies?.[0]
  const schedules = baby ? await getCareSchedules(baby.id) : []

  if (!baby) {
    return <div className="p-8">Aucun bébé enregistré.</div>
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8">
      <h1 className="text-2xl font-bold mb-6">
        Paramétrage des soins — {baby.first_name}
      </h1>
      <ScheduleManager
        baby={baby}
        careTypes={careTypes}
        initialSchedules={schedules}
      />
    </div>
  )
}