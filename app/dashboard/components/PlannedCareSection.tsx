// app/dashboard/components/PlannedCareSection.tsx

'use client'

import { useState, useEffect } from 'react'
import { 
  logPlannedCare, 
  removePlannedCareLog, 
  getPlannedCareForDate,
  getPlannedCareTypes
} from '@/app/dashboard/actions'

interface CareType {
  id: string
  name: string
  icon: string
}

interface PlannedCareSectionProps {
  babyId: string
  familyId: string
  date: string
}

export default function PlannedCareSection({ 
  babyId, 
  familyId, 
  date 
}: PlannedCareSectionProps) {
  const [cares, setCares] = useState<CareType[]>([])
  const [checkedCares, setCheckedCares] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newCareName, setNewCareName] = useState('')

  // Charger les soins au montage
  useEffect(() => {
    async function loadData() {
      try {
        const caresData = await getPlannedCareTypes(familyId)
        setCares(caresData as CareType[])

        const checkedData = await getPlannedCareForDate(babyId, date)
        setCheckedCares(checkedData)
      } catch (error) {
        console.error('Erreur:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [babyId, familyId, date])

  const handleToggleCare = async (careId: string, isChecked: boolean) => {
    try {
      if (isChecked) {
        await logPlannedCare(babyId, careId, date)
        setCheckedCares([...checkedCares, careId])
      } else {
        await removePlannedCareLog(babyId, careId, date)
        setCheckedCares(checkedCares.filter(c => c !== careId))
      }
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur lors de la mise à jour')
    }
  }

  const handleAddCustomCare = async () => {
    if (!newCareName.trim()) return

    try {
      // Ajouter comme soin ad hoc avec un ID temporaire
      const tempId = `custom_${Date.now()}`
      await logPlannedCare(babyId, tempId, date)
      setCheckedCares([...checkedCares, tempId])
      setNewCareName('')
      setShowAddForm(false)
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur lors de l\'ajout')
    }
  }

  if (loading) {
    return <div className="text-gray-500">Chargement...</div>
  }

  return (
    <section className="border rounded-lg p-4 bg-white">
      <h2 className="font-semibold text-lg mb-4">📋 Soins planifiés</h2>

      {/* Soins de la famille */}
      {cares.length > 0 && (
        <div className="space-y-2 mb-4">
          {cares.map(care => (
            <label
              key={care.id}
              className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition"
            >
              <input
                type="checkbox"
                checked={checkedCares.includes(care.id)}
                onChange={(e) => handleToggleCare(care.id, e.target.checked)}
                className="w-5 h-5 rounded"
              />
              <span className="text-lg">{care.icon}</span>
              <span className="font-medium">{care.name}</span>
            </label>
          ))}
        </div>
      )}

      {cares.length === 0 && (
        <p className="text-sm text-gray-500 mb-4">Aucun soin planifié configuré</p>
      )}

      {/* Bouton ajouter soin ad hoc */}
      {!showAddForm ? (
        <button
          onClick={() => setShowAddForm(true)}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium mt-3"
        >
          + Ajouter un soin ad hoc
        </button>
      ) : (
        <div className="border rounded-lg p-3 mt-3 bg-blue-50 space-y-2">
          <input
            type="text"
            value={newCareName}
            onChange={(e) => setNewCareName(e.target.value)}
            placeholder="Ex: Coupe d'ongles..."
            className="w-full border rounded-lg p-2 text-sm"
            onKeyDown={(e) => e.key === 'Enter' && handleAddCustomCare()}
          />
          <div className="flex gap-2">
            <button
              onClick={handleAddCustomCare}
              className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
            >
              ✓ Ajouter
            </button>
            <button
              onClick={() => {
                setShowAddForm(false)
                setNewCareName('')
              }}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </section>
  )
}