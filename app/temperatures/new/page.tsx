'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function NewTemperaturePage({
  searchParams,
}: {
  searchParams: { baby?: string; date?: string }
}) {
  const [temperature, setTemperature] = useState(37.0)
  const [type, setType] = useState('frontal')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  const now = new Date()
  const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16)
  const [measuredAt, setMeasuredAt] = useState(localDateTime)

  const increaseTemp = () => {
    setTemperature(prev => parseFloat((prev + 0.1).toFixed(1)))
  }

  const decreaseTemp = () => {
    setTemperature(prev => parseFloat((prev - 0.1).toFixed(1)))
  }

  async function createTemperature(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        window.location.href = '/login'
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!profile || !profile.family_id) {
        throw new Error('Aucune famille associée')
      }

      const { data: babies } = await supabase
        .from('babies')
        .select('*')
        .eq('family_id', profile.family_id)

      const baby = babies?.[0]

      if (!baby) {
        throw new Error('Aucun bébé enregistré')
      }

      const { error } = await supabase.from('temperatures').insert({
        baby_id: baby.id,
        temperature,
        type,
        measured_at: new Date(measuredAt).toISOString(),
        note: note || null,
        created_by: user.id,
      })

      if (error) throw error

      // Redirection simple au lieu de revalidatePath
      window.location.href = '/'
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur lors de l\'enregistrement')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">🌡️ Ajouter une température</h1>
        <Link href="/" className="text-gray-500 text-sm underline">
          ✕ Annuler
        </Link>
      </div>

      <form onSubmit={createTemperature} className="space-y-4">
        {/* Température avec +/- */}
        <div>
          <label className="block text-sm font-medium mb-3">Température (°C)</label>
          <div className="flex items-center justify-center gap-4 bg-red-100 p-4 rounded-lg">
            <button
              type="button"
              onClick={decreaseTemp}
              className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold text-xl hover:bg-red-600 disabled:opacity-50"
              disabled={temperature <= 35}
            >
              −
            </button>
            <div className="text-4xl font-bold w-24 text-center">
              {temperature.toFixed(1)}
            </div>
            <button
              type="button"
              onClick={increaseTemp}
              className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold text-xl hover:bg-red-600 disabled:opacity-50"
              disabled={temperature >= 42}
            >
              +
            </button>
          </div>
        </div>

        {/* Type de mesure */}
        <div>
          <label className="block text-sm font-medium mb-2">Type de mesure</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'frontal', label: '👶 Frontal' },
              { value: 'aisselle', label: '💪 Aisselle' },
              { value: 'rectal', label: '🫣 Rectal' },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setType(opt.value)}
                className={`border rounded-lg p-3 font-medium transition ${
                  type === opt.value
                    ? 'bg-red-600 text-white border-red-600'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Heure */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Heure de la mesure
          </label>
          <input
            type="datetime-local"
            value={measuredAt}
            onChange={(e) => setMeasuredAt(e.target.value)}
            required
            className="w-full border rounded-lg p-2"
          />
        </div>

        {/* Note */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Note — optionnel
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full border rounded-lg p-2"
            placeholder="Ex: enfant fiévreux..."
          />
        </div>

        {/* Boutons */}
        <div className="flex gap-2">
          <Link
            href="/"
            className="flex-1 border border-gray-300 text-gray-700 text-center rounded-lg py-2 font-medium"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-red-600 text-white rounded-lg py-2 font-medium disabled:opacity-50"
          >
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  )
}