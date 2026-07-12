'use client'

import Link from 'next/link'

export default function AddBabyButton() {
  return (
    <Link
      href="/baby/new"
      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-medium"
    >
      ➕ Ajouter un bébé
    </Link>
  )
}