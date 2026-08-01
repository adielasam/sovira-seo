'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { toast } from 'react-hot-toast'

export function AuthMessages() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const message = searchParams.get('message')

  useEffect(() => {
    if (error) {
      toast.error(error, { duration: 5000 })
    }
    if (message) {
      toast.success(message, { duration: 5000 })
    }
  }, [error, message])

  return null
}
