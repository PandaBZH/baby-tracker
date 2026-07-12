interface HistoryItemProps {
  id: string
  type: 'bottle' | 'breastfeeding' | 'diaper'
  time: string
  details: string // ex: "150ml", "Gauche", "Pipi • Caca"
  note?: string | null
  onDelete: (id: string) => void
  isDeleting?: boolean
}

export function HistoryItem({
  id,
  type,
  time,
  details,
  note,
  onDelete,
  isDeleting = false,
}: HistoryItemProps) {
  const icons: Record<string, string> = {
    bottle: '🍼',
    breastfeeding: '🤱',
    diaper: '🧷',
  }

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icons[type]}</span>
          <div>
            <div className="font-medium">{time}</div>
            <div className="text-sm text-gray-600">{details}</div>
            {note && <div className="text-xs text-gray-500 mt-1 italic">"{note}"</div>}
          </div>
        </div>
      </div>
      <button
        onClick={() => {
          if (confirm('Supprimer cet enregistrement ?')) {
            onDelete(id)
          }
        }}
        disabled={isDeleting}
        className="text-red-500 hover:text-red-700 disabled:opacity-50 ml-2 text-xl font-bold"
      >
        ✕
      </button>
    </div>
  )
}