import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useArchiveCategory,
  useCategories,
  useCreateCategory,
  type Category,
  type CategoryKind,
} from '@/features/categories/useCategories'

const KIND_LABELS: Record<CategoryKind, string> = {
  income: 'Income',
  expense: 'Expense',
  transfer: 'Transfer',
}

function KindGroup({ kind, categories }: { kind: CategoryKind; categories: Category[] }) {
  const archive = useArchiveCategory()
  return (
    <Card>
      <CardContent className="p-4">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {KIND_LABELS[kind]}
        </h2>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 py-1 pl-3 pr-1.5 text-sm"
            >
              {c.name}
              <button
                aria-label={`Archive ${c.name}`}
                onClick={() => archive.mutate(c.id)}
                className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-destructive"
              >
                <X className="size-3.5" />
              </button>
            </span>
          ))}
          {categories.length === 0 && (
            <p className="text-sm text-muted-foreground">None yet.</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function CategoriesPage() {
  const { data: categories } = useCategories()
  const create = useCreateCategory()
  const [name, setName] = useState('')
  const [kind, setKind] = useState<CategoryKind>('expense')

  const add = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    create.mutate(
      { name: trimmed, kind },
      {
        onSuccess: () => {
          setName('')
          toast.success('Category added')
        },
        onError: (e) => toast.error((e as Error).message),
      },
    )
  }

  const byKind = (k: CategoryKind) => (categories ?? []).filter((c) => c.kind === k)

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/budgets">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">Categories</h1>
      </div>

      <Card>
        <CardContent className="flex items-end gap-2 p-4">
          <div className="flex-1">
            <Input
              placeholder="New category name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && add()}
            />
          </div>
          <Select value={kind} onValueChange={(v) => setKind(v as CategoryKind)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="transfer">Transfer</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={add} disabled={!name.trim()}>
            <Plus className="size-4" />
            Add
          </Button>
        </CardContent>
      </Card>

      <KindGroup kind="income" categories={byKind('income')} />
      <KindGroup kind="expense" categories={byKind('expense')} />
      <KindGroup kind="transfer" categories={byKind('transfer')} />
    </div>
  )
}
