import { RouterProvider } from 'react-router-dom'
import { QueryProvider } from '@/app/QueryProvider'
import { ThemeProvider } from '@/app/ThemeProvider'
import { router } from '@/app/router'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/features/auth/AuthProvider'

function App() {
  return (
    <ThemeProvider>
      <QueryProvider>
        <AuthProvider>
          <RouterProvider router={router} />
          <Toaster />
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  )
}

export default App
