'use client'

import { useState } from 'react'

export default function GenerateActionsButton() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleGenerate = async () => {
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/generate-scheduled-actions', {
        method: 'POST',
      })
      const data = await response.json()

      if (data.success) {
        setMessage('Actions creees pour aujourd hui')
      } else {
        setMessage('Erreur lors de la creation des actions')
      }
    } catch (error) {
      setMessage('Erreur: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 transition"
      >
        {loading ? 'Generation...' : 'Generer les actions du jour'}
      </button>
      {message && (
        <p className={`text-sm ${message.includes('creees') ? 'text-green-600' : 'text-red-600'}`}>
          {message}
        </p>
      )}
    </div>
  )
}