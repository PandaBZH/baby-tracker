import Image from 'next/image'

interface Baby {
  id: string
  first_name: string
  last_name?: string
  birth_date: string
  photo_url?: string
}

export default function BabyCard({ baby }: { baby: Baby }) {
  const age = calculateAge(baby.birth_date)

  return (
    <div className="p-4 bg-gradient-to-br from-pink-100 to-blue-100">
      <div className="flex items-center gap-4">
        {baby.photo_url ? (
          <Image
            src={baby.photo_url}
            alt={baby.first_name}
            width={80}
            height={80}
            className="w-20 h-20 rounded-full object-cover"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-gray-300 flex items-center justify-center text-2xl">
            👶
          </div>
        )}

        <div>
          <h3 className="text-xl font-bold text-gray-800">
            {baby.first_name} {baby.last_name || ''}
          </h3>
          <p className="text-gray-600 text-sm">{age}</p>
          <p className="text-gray-500 text-xs">
            Né le {new Date(baby.birth_date).toLocaleDateString('fr-FR')}
          </p>
        </div>
      </div>
    </div>
  )
}

function calculateAge(birthDate: string): string {
  const today = new Date()
  const birth = new Date(birthDate)
  
  let months = today.getMonth() - birth.getMonth()
  let years = today.getFullYear() - birth.getFullYear()
  
  if (months < 0) {
    years--
    months += 12
  }

  if (years === 0) {
    if (months === 0) {
      const days = Math.floor(
        (today.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24)
      )
      return `${days} jour${days > 1 ? 's' : ''}`
    }
    return `${months} mois`
  }

  return `${years} an${years > 1 ? 's' : ''} et ${months} mois`
}