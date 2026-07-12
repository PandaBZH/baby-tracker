'use client'

import { useState } from 'react'
import { createDiaper } from './actions'
import Link from 'next/link'

interface NewDiaperFormProps {
  babyId: string
  localDateTime: string
}

export function NewDiaperForm({ babyId, localDateTime }: NewDiaperFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [pipi, setPipi] = useState(false)
  const [caca, setCaca] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const formData = new FormData(e.currentTarget)
      formData.append('babyId', babyId)
      await createDiaper(formData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Nouvelle couche</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="givenAt" className="block text-sm font-medium mb-2">
            Date et heure
          </label>
          <input
            type="datetime-local"
            id="givenAt"
            name="givenAt"
            defaultValue={localDateTime}
            required
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">Type de couche</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setPipi(!pipi)}
              name="pipi"
              value={pipi ? 'on' : 'off'}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                pipi
                  ? 'bg-yellow-400 text-white shadow-md ring-2 ring-yellow-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              💧 Pipi
            </button>
            <button
              type="button"
              onClick={() => setCaca(!caca)}
              name="caca"
              value={caca ? 'on' : 'off'}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                caca
                  ? 'bg-amber-700 text-white shadow-md ring-2 ring-amber-900'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              💩 Caca
            </button>
          </div>
          {/* Hidden inputs pour soumettre les valeurs */}
          <input type="hidden" name="pipi" value={pipi ? 'on' : 'off'} />
          <input type="hidden" name="caca" value={caca ? 'on' : 'off'} />
        </div>

        <div>
          <label htmlFor="note" className="block text-sm font-medium mb-2">
            Notes (optionnel)
          </label>
          <textarea
            id="note"
            name="note"
            className="w-full px-3 py-2 border rounded-lg"
            rows={3}
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white py-2 rounded-lg font-medium"
          >
            {isLoading ? 'Enregistrement...' : 'Enregistrer'}
          </button>
          <Link
            href="/"
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 rounded-lg font-medium text-center"
          >
            Annuler
          </Link>
        </div>
      </form>
    </div>
  )
}