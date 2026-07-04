import { Button } from '@/components/ui/button'

function App() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background text-foreground">
      <h1 className="text-2xl font-semibold">Household Finance</h1>
      <p className="text-muted-foreground">
        Foundations (routing, auth, theme) land in Milestone 1.
      </p>
      <Button>shadcn/ui is wired up</Button>
    </div>
  )
}

export default App
