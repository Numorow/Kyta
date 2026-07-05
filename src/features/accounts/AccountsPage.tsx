import { useState } from 'react'
import { MoreVertical, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Switch } from '@/components/ui/switch'
import { formatMoney } from '@/lib/money'
import { SUBTYPE_LABELS, type AccountSubtype } from '@/features/accounts/constants'
import { AccountFormDialog } from '@/features/accounts/AccountFormDialog'
import {
  useAccounts,
  useArchiveAccount,
  useUpdateAccount,
  type AccountWithBalance,
} from '@/features/accounts/useAccounts'

function AccountRow({ account }: { account: AccountWithBalance }) {
  const [editing, setEditing] = useState(false)
  const updateAccount = useUpdateAccount()
  const archiveAccount = useArchiveAccount()

  return (
    <>
      <div className="flex items-center gap-3 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium">{account.name}</p>
            {account.balance_mode === 'statement' && (
              <Badge variant="secondary" className="text-xs">
                Statement
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {SUBTYPE_LABELS[account.subtype as AccountSubtype]}
            {account.institution ? ` · ${account.institution}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-sm tabular-nums">
            {/* Liabilities are stored negative (debt); show the magnitude owed. */}
            {formatMoney(account.class === 'liability' ? Math.abs(account.balance) : account.balance)}
          </span>
          <div className="flex items-center gap-1" title="Include in net worth">
            <Switch
              checked={account.include_in_net_worth}
              onCheckedChange={(checked) =>
                updateAccount.mutate({ id: account.id, patch: { include_in_net_worth: checked } })
              }
              aria-label="Include in net worth"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setEditing(true)}>Edit</DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => archiveAccount.mutate(account.id)}
              >
                Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <AccountFormDialog open={editing} onOpenChange={setEditing} account={account} />
    </>
  )
}

function AccountGroup({
  title,
  accounts,
  total,
}: {
  title: string
  accounts: AccountWithBalance[]
  total: number
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-1 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </h2>
          <span className="font-mono text-sm font-semibold tabular-nums">
            {formatMoney(total)}
          </span>
        </div>
        <div className="divide-y">
          {accounts.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">No {title.toLowerCase()} yet.</p>
          ) : (
            accounts.map((a) => <AccountRow key={a.id} account={a} />)
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function AccountsPage() {
  const { data: accounts, isLoading } = useAccounts()
  const [adding, setAdding] = useState(false)

  const assets = accounts?.filter((a) => a.class === 'asset') ?? []
  const liabilities = accounts?.filter((a) => a.class === 'liability') ?? []
  const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0)
  // Liability balances are negative (debt); |sum| is the amount owed, and net
  // position is a plain sum of every balance (assets + negative liabilities).
  const totalLiabilities = Math.abs(liabilities.reduce((sum, a) => sum + a.balance, 0))
  const netPosition = totalAssets - totalLiabilities

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Accounts</h1>
          <p className="text-sm text-muted-foreground">
            Net position: {formatMoney(netPosition)}
          </p>
        </div>
        <Button onClick={() => setAdding(true)}>
          <Plus className="size-4" />
          Add
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <>
          <AccountGroup title="Assets" accounts={assets} total={totalAssets} />
          <AccountGroup title="Liabilities" accounts={liabilities} total={totalLiabilities} />
        </>
      )}

      <AccountFormDialog open={adding} onOpenChange={setAdding} />
    </div>
  )
}
