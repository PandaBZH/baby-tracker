'use client'

import { useFormStatus } from 'react-dom'

interface SubmitButtonProps {
  className?: string
  idleLabel?: string
  pendingLabel?: string
}

export function SubmitButton({
  className = '',
  idleLabel = 'Enregistrer',
  pendingLabel = 'Enregistrement...',
}: SubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className={`${className} disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {pending ? pendingLabel : idleLabel}
    </button>
  )
}
