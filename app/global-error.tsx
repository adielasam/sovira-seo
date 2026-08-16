'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global Error caught:', error)
  }, [error])

  return (
    <html>
      <body style={{ backgroundColor: '#0f172a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
        <div style={{ backgroundColor: '#1e293b', padding: '2rem', borderRadius: '1rem', color: 'white', maxWidth: '600px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Critical App Error</h2>
          <p style={{ color: '#ef4444', backgroundColor: '#450a0a', padding: '1rem', borderRadius: '0.5rem', marginBottom: '2rem', wordBreak: 'break-all', textAlign: 'left', fontFamily: 'monospace' }}>
            {error.message || 'Unknown error'}
            <br />
            {error.stack || ''}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', fontSize: '1rem', cursor: 'pointer' }}
          >
            Force Reload
          </button>
        </div>
      </body>
    </html>
  )
}
