import { useMemo, useState } from 'react'
import { ArrowLeftRight, Plus, Search, Trash2 } from 'lucide-react'
import type { RowSelectionState } from '@tanstack/react-table'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAccounts } from '@/features/accounts/useAccounts'
import { useCategories } from '@/features/categories/useCategories'
import { TransactionFormDialog } from '@/features/transactions/TransactionFormDialog'
import { TransferFormDialog } from '@/features/transactions/TransferFormDialog'
import { TransactionsGrid } from '@/features/transactions/TransactionsGrid'
import {
  useDeleteTransactions,
  useTransactions,
  useUpdateTransaction,
  type TransactionFilters,
  type TransactionRow,
} from '@/features/transactions/useTransactions'

const ALL = '__all__'

export function TransactionsPage() {
  const { data: accounts } = useAccounts()
  const { data: categories } = useCategories()
  const [addingTxn, setAddingTxn] = useState(false)
  const [addingTransfer, setAddingTransfer] = useState(false)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const [search, setSearch] = useState('')
  const [accountId, setAccountId] = useState<string>(ALL)
  const [typeFilter, setTypeFilter] = useState<string>(ALL)
  const [uncategorisedOnly, setUncategorisedOnly] = useState(false)

  const filters: TransactionFilters = useMemo(
    () => ({
      search: search.trim() || undefined,
      accountId: accountId === ALL ? undefined : accountId,
      type: typeFilter === ALL ? undefined : (typeFilter as TransactionFilters['type']),
      uncategorisedOnly: uncategorisedOnly || undefined,
    }),
    [search, accountId, typeFilter, uncategorisedOnly],
  )

  const { data: rows, isLoading } = useTransactions(filters)
  const updateTransaction = useUpdateTransaction()
  const deleteTransactions = useDeleteTransactions()

  const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id])

  const handleUpdate = (id: string, patch: Partial<TransactionRow>) => {
    updateTransaction.mutate(
      { id, patch },
      { onError: (err) => toast.error((err as Error).message) },
    )
  }

  const handleDelete = () => {
    if (!rows || selectedIds.length === 0) return
    // Deleting one leg of a transfer would break its net-zero pairing, so pull
    // in the sibling legs of any selected transfer.
    const groupsToDelete = new Set(
      rows
        .filter((r) => selectedIds.includes(r.id) && r.transfer_group_id)
        .map((r) => r.transfer_group_id as string),
    )
    const ids = new Set(selectedIds)
    for (const r of rows) {
      if (r.transfer_group_id && groupsToDelete.has(r.transfer_group_id)) ids.add(r.id)
    }
    deleteTransactions.mutate([...ids], {
      onSuccess: () => {
        setRowSelection({})
        toast.success('Deleted')
      },
      onError: (err) => toast.error((err as Error).message),
    })
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Transactions</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAddingTransfer(true)}>
            <ArrowLeftRight className="size-4" />
            Transfer
          </Button>
          <Button onClick={() => setAddingTxn(true)}>
            <Plus className="size-4" />
            Add
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-40 flex-1">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={accountId} onValueChange={setAccountId}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Account" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All accounts</SelectItem>
            {(accounts ?? []).map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All types</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
            <SelectItem value="transfer">Transfer</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant={uncategorisedOnly ? 'default' : 'outline'}
          onClick={() => setUncategorisedOnly((v) => !v)}
        >
          Uncategorised
        </Button>
      </div>

      {/* Bulk-action bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border bg-muted/50 px-3 py-2">
          <span className="text-sm">{selectedIds.length} selected</span>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="size-4" />
            Delete
          </Button>
        </div>
      )}

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : !rows || rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          No transactions yet. Add one, record a transfer, or import a CSV.
        </div>
      ) : (
        <TransactionsGrid
          rows={rows}
          categories={categories ?? []}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          onUpdate={handleUpdate}
        />
      )}

      <TransactionFormDialog open={addingTxn} onOpenChange={setAddingTxn} />
      <TransferFormDialog open={addingTransfer} onOpenChange={setAddingTransfer} />
    </div>
  )
}
