'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

export default function Home() {
  const [status, setStatus] = useState('Testing connection...')

  useEffect(() => {
    const testConnection = async () => {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        // Test: get user session (no table needed)
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          setStatus(`❌ Error: ${error.message}`)
        } else {
          setStatus('✅ Supabase Connected!')
        }
      } catch (err: any) {
        setStatus(`❌ Error: ${err.message}`)
      }
    }

    testConnection()
  }, [])

  return (
    <main className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">BS-PASS</h1>
        <p className="text-lg">{status}</p>
      </div>
    </main>
  )
}
