'use client'

import { useTransition } from 'react'
import { deleteEntry } from '@/app/actions/delete-entry'

type EntryType = 'feedings' | 'diaper_changes' | 'bottles' | 'care_logs'

export default function DeleteButton({
  table,
  id,
}: {
  table: EntryType
  id: string
}) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (confirm('Supprimer cet enregistrement ?')) {
      startTransition(() => {
        deleteEntry(table, id)
      })
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="text-red-500 text-sm px-2 disabled:opacity-40"
      aria-label="Supprimer"
    >
      {isPending ? '...' : '🗑️'}
    </button>
  )
}