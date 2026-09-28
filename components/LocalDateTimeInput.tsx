'use client'

import { useEffect, useState } from 'react'

type Props = {
  name: string
  id?: string
  required?: boolean
  className?: string
}

function formatLocalDateTime(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function LocalDateTimeInput({ name, id, required = false, className }: Props) {
  const [localValue, setLocalValue] = useState('')

  useEffect(() => {
    setLocalValue(formatLocalDateTime(new Date()))
  }, [])

  const isoValue = localValue ? new Date(localValue).toISOString() : ''

  return (
    <>
      <input
        type="datetime-local"
        id={id}
        value={localValue}
        onChange={(event) => setLocalValue(event.target.value)}
        required={required}
        className={className}
      />
      <input type="hidden" name={name} value={isoValue} />
    </>
  )
}
