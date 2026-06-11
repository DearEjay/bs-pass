'use client'

import { UndoToastContainer } from './UndoToastContainer'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <UndoToastContainer />
    </>
  )
}
