import { useMemo } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type Row,
  type RowSelectionState,
} from '@tanstack/react-table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { amountColorClass, formatDate, formatSignedMoney } from '@/lib/money'
import { cn } from '@/lib/utils'
import type { Category } from '@/features/categories/useCategories'
import { EditableInput } from '@/features/transactions/EditableCell'
import type { TransactionRow } from '@/features/transactions/useTransactions'
import { MemberAvatar } from '@/features/household/MemberAvatar'
import type { Member } from '@/features/household/useMembers'

function Checkbox({
  checked,
  indeterminate,
  onChange,
  label,
}: {
  checked: boolean
  indeterminate?: boolean
  onChange: (checked: boolean) => void
  label: string
}) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      checked={checked}
      ref={(el) => {
        if (el) el.indeterminate = !!indeterminate && !checked
      }}
      onChange={(e) => onChange(e.target.checked)}
      className="size-4 cursor-pointer accent-primary"
    />
  )
}

export function TransactionsGrid({
  rows,
  categories,
  rowSelection,
  onRowSelectionChange,
  onUpdate,
  members,
  showAdded,
}: {
  rows: TransactionRow[]
  categories: Category[]
  rowSelection: RowSelectionState
  onRowSelectionChange: (next: RowSelectionState) => void
  onUpdate: (id: string, patch: Partial<TransactionRow>) => void
  members: Member[]
  showAdded: boolean
}) {
  const columns = useMemo<ColumnDef<TransactionRow>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            label="Select all"
            checked={table.getIsAllRowsSelected()}
            indeterminate={table.getIsSomeRowsSelected()}
            onChange={(v) => table.toggleAllRowsSelected(v)}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            label="Select row"
            checked={row.getIsSelected()}
            onChange={(v) => row.toggleSelected(v)}
          />
        ),
        size: 36,
      },
      {
        accessorKey: 'txn_date',
        header: 'Date',
        cell: ({ row }) => (
          <EditableInput
            rowIndex={row.index}
            colId="txn_date"
            type="date"
            value={row.original.txn_date}
            onCommit={(v) => v && onUpdate(row.original.id, { txn_date: v })}
            render={(v) => formatDate(v)}
          />
        ),
        size: 120,
      },
      {
        accessorKey: 'description',
        header: 'Description',
        cell: ({ row }) => (
          <EditableInput
            rowIndex={row.index}
            colId="description"
            value={row.original.description ?? ''}
            onCommit={(v) => onUpdate(row.original.id, { description: v || null })}
          />
        ),
      },
      {
        accessorKey: 'category_id',
        header: 'Category',
        cell: ({ row }) => {
          const txn = row.original
          if (txn.type === 'transfer') {
            return <span className="px-2 text-xs text-muted-foreground">Transfer</span>
          }
          const options = categories.filter((c) => c.kind === txn.type)
          return (
            <Select
              value={txn.category_id ?? ''}
              onValueChange={(v) => onUpdate(txn.id, { category_id: v })}
            >
              <SelectTrigger className="h-8 border-transparent bg-transparent hover:bg-muted focus:bg-muted">
                <SelectValue placeholder="Uncategorised" />
              </SelectTrigger>
              <SelectContent>
                {options.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        },
        size: 170,
      },
      {
        id: 'account',
        header: 'Account',
        cell: ({ row }) => (
          <span className="px-2 text-sm text-muted-foreground">
            {row.original.accounts?.name ?? '—'}
          </span>
        ),
        size: 140,
      },
      ...(showAdded
        ? [
            {
              id: 'added_by',
              header: 'By',
              cell: ({ row }: { row: Row<TransactionRow> }) => {
                const by = row.original.created_by
                const m = by ? (members.find((x) => x.userId === by) ?? null) : null
                return (
                  <div className="px-2">
                    <MemberAvatar member={m} size="xs" />
                  </div>
                )
              },
              size: 52,
            } as ColumnDef<TransactionRow>,
          ]
        : []),
      {
        accessorKey: 'amount',
        header: () => <div className="text-right">Amount</div>,
        cell: ({ row }) => {
          const txn = row.original
          // Transfer legs must be edited/deleted as a pair to keep the net-zero
          // invariant, so their amount is read-only in the grid.
          if (txn.type === 'transfer') {
            return (
              <div
                className={cn(
                  'px-2 py-1.5 text-right font-mono text-sm tabular-nums',
                  amountColorClass(txn.amount),
                )}
              >
                {formatSignedMoney(txn.amount)}
              </div>
            )
          }
          return (
            <EditableInput
              rowIndex={row.index}
              colId="amount"
              type="number"
              align="right"
              className="font-mono tabular-nums"
              value={String(txn.amount)}
              onCommit={(v) => {
                const parsed = Number(v)
                if (!Number.isNaN(parsed)) {
                  // Keep sign consistent with type: expense out, income in.
                  const signed =
                    txn.type === 'expense' ? -Math.abs(parsed) : Math.abs(parsed)
                  onUpdate(txn.id, { amount: signed })
                }
              }}
              render={(v) => (
                <span className={amountColorClass(Number(v))}>
                  {formatSignedMoney(Number(v))}
                </span>
              )}
            />
          )
        },
        size: 130,
      },
    ],
    [categories, onUpdate, members, showAdded],
  )

  const table = useReactTable({
    data: rows,
    columns,
    state: { rowSelection },
    getRowId: (row) => row.id,
    enableRowSelection: true,
    onRowSelectionChange: (updater) => {
      onRowSelectionChange(
        typeof updater === 'function' ? updater(rowSelection) : updater,
      )
    },
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} style={{ width: header.getSize() }}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} className="p-1 align-middle">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
