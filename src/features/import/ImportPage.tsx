import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { amountColorClass, formatDate, formatSignedMoney } from '@/lib/money'
import { cn } from '@/lib/utils'
import {
  applyMapping,
  detectMapping,
  parseCsv,
  DATE_FORMATS,
  type ImportMapping,
} from '@/lib/csv'
import { useAccounts } from '@/features/accounts/useAccounts'
import {
  useCommitImport,
  useDedupe,
  useImportMapping,
  useSaveImportMapping,
  type DedupeRow,
} from '@/features/import/useImport'

type Step = 'setup' | 'map' | 'review'

function ColumnSelect({
  value,
  onChange,
  columns,
}: {
  value: number
  onChange: (n: number) => void
  columns: string[]
}) {
  return (
    <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {columns.map((label, i) => (
          <SelectItem key={i} value={String(i)}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function ImportPage() {
  const navigate = useNavigate()
  const { data: accounts } = useAccounts()
  const [step, setStep] = useState<Step>('setup')
  const [accountId, setAccountId] = useState<string>('')
  const [filename, setFilename] = useState('')
  const [rows, setRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<ImportMapping | null>(null)
  const [reviewRows, setReviewRows] = useState<DedupeRow[]>([])
  const [included, setIncluded] = useState<Set<number>>(new Set())

  const savedMapping = useImportMapping(accountId)
  const saveMapping = useSaveImportMapping()
  const dedupe = useDedupe()
  const commit = useCommitImport()

  const columnLabels = useMemo(() => {
    const width = rows[0]?.length ?? 0
    return Array.from({ length: width }, (_, i) =>
      mapping?.hasHeader ? (rows[0]?.[i]?.trim() || `Column ${i + 1}`) : `Column ${i + 1}`,
    )
  }, [rows, mapping?.hasHeader])

  const previewRows = useMemo(() => {
    if (!mapping) return []
    return applyMapping(rows.slice(0, mapping.hasHeader ? 6 : 5), mapping)
  }, [rows, mapping])

  const handleFile = async (file: File) => {
    const text = await file.text()
    const parsed = parseCsv(text)
    if (parsed.length === 0) {
      toast.error('That file has no rows')
      return
    }
    setFilename(file.name)
    setRows(parsed)
    setMapping(savedMapping.data ?? detectMapping(parsed))
    setStep('map')
  }

  const goToReview = async () => {
    if (!mapping || !accountId) return
    const parsed = applyMapping(rows, mapping)
    try {
      const flagged = await dedupe.mutateAsync({ accountId, rows: parsed })
      setReviewRows(flagged)
      // Default: include every valid, non-duplicate row.
      setIncluded(
        new Set(flagged.flatMap((r, i) => (r.valid && !r.isDuplicate ? [i] : []))),
      )
      setStep('review')
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const doCommit = async () => {
    if (!mapping) return
    const selected = reviewRows.filter((_, i) => included.has(i))
    try {
      await saveMapping.mutateAsync({ accountId, mapping })
      const { count } = await commit.mutateAsync({ accountId, filename, rows: selected })
      toast.success(`Imported ${count} transaction${count === 1 ? '' : 's'}`)
      navigate('/transactions')
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const validCount = reviewRows.filter((r) => r.valid).length
  const dupCount = reviewRows.filter((r) => r.isDuplicate).length
  const invalidCount = reviewRows.length - validCount

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/transactions')}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-2xl font-semibold">Import CSV</h1>
      </div>

      {/* Step 1 — account + file */}
      {step === 'setup' && (
        <Card>
          <CardContent className="flex flex-col gap-4 p-6">
            <div className="flex flex-col gap-2">
              <Label>Import into account</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an account" />
                </SelectTrigger>
                <SelectContent>
                  {(accounts ?? []).map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="csv-file">CSV file</Label>
              <input
                id="csv-file"
                type="file"
                accept=".csv,text/csv"
                disabled={!accountId}
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground disabled:opacity-50"
              />
              {!accountId && (
                <p className="text-xs text-muted-foreground">Choose an account first.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2 — column mapping + preview */}
      {step === 'map' && mapping && (
        <>
          <Card>
            <CardContent className="flex flex-col gap-4 p-6">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label htmlFor="has-header">First row is a header</Label>
                <Switch
                  id="has-header"
                  checked={mapping.hasHeader}
                  onCheckedChange={(v) => setMapping({ ...mapping, hasHeader: v })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <Label>Date column</Label>
                  <ColumnSelect
                    value={mapping.dateCol}
                    columns={columnLabels}
                    onChange={(n) => setMapping({ ...mapping, dateCol: n })}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Date format</Label>
                  <Select
                    value={mapping.dateFormat}
                    onValueChange={(v) => setMapping({ ...mapping, dateFormat: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DATE_FORMATS.map((f) => (
                        <SelectItem key={f} value={f}>
                          {f}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Description column</Label>
                <ColumnSelect
                  value={mapping.descCol}
                  columns={columnLabels}
                  onChange={(n) => setMapping({ ...mapping, descCol: n })}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label>Amount columns</Label>
                <Select
                  value={mapping.amountMode}
                  onValueChange={(v) =>
                    setMapping({ ...mapping, amountMode: v as ImportMapping['amountMode'] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single signed column</SelectItem>
                    <SelectItem value="debit_credit">Separate debit / credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {mapping.amountMode === 'single' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <Label>Amount column</Label>
                    <ColumnSelect
                      value={mapping.amountCol}
                      columns={columnLabels}
                      onChange={(n) => setMapping({ ...mapping, amountCol: n })}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <Label htmlFor="invert" className="text-xs">
                      Debits are positive
                    </Label>
                    <Switch
                      id="invert"
                      checked={mapping.invertSingle}
                      onCheckedChange={(v) => setMapping({ ...mapping, invertSingle: v })}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <Label>Debit (out)</Label>
                    <ColumnSelect
                      value={mapping.debitCol}
                      columns={columnLabels}
                      onChange={(n) => setMapping({ ...mapping, debitCol: n })}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Credit (in)</Label>
                    <ColumnSelect
                      value={mapping.creditCol}
                      columns={columnLabels}
                      onChange={(n) => setMapping({ ...mapping, creditCol: n })}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Live preview */}
          <Card>
            <CardContent className="p-4">
              <p className="mb-2 text-sm font-medium text-muted-foreground">Preview</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr className="border-b">
                      <th className="py-1 text-left font-medium">Date</th>
                      <th className="py-1 text-left font-medium">Description</th>
                      <th className="py-1 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((r, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className={cn('py-1', !r.txn_date && 'text-destructive')}>
                          {r.txn_date ? formatDate(r.txn_date) : 'invalid'}
                        </td>
                        <td className="py-1">{r.description || '—'}</td>
                        <td
                          className={cn(
                            'py-1 text-right font-mono tabular-nums',
                            r.amount != null && amountColorClass(r.amount),
                          )}
                        >
                          {r.amount != null ? formatSignedMoney(r.amount) : 'invalid'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep('setup')}>
              Back
            </Button>
            <Button onClick={goToReview} disabled={dedupe.isPending}>
              Continue
            </Button>
          </div>
        </>
      )}

      {/* Step 3 — review + dedupe */}
      {step === 'review' && (
        <>
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge variant="secondary">{included.size} to import</Badge>
            {dupCount > 0 && <Badge variant="outline">{dupCount} likely duplicates</Badge>}
            {invalidCount > 0 && (
              <Badge variant="outline" className="text-destructive">
                {invalidCount} unparseable
              </Badge>
            )}
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="max-h-[55svh] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card text-xs text-muted-foreground">
                    <tr className="border-b">
                      <th className="w-10 py-2" />
                      <th className="px-2 py-2 text-left font-medium">Date</th>
                      <th className="px-2 py-2 text-left font-medium">Description</th>
                      <th className="px-2 py-2 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviewRows.map((r, i) => (
                      <tr
                        key={i}
                        className={cn('border-b last:border-0', !r.valid && 'opacity-40')}
                      >
                        <td className="py-1.5 text-center">
                          <input
                            type="checkbox"
                            className="size-4 accent-primary"
                            disabled={!r.valid}
                            checked={included.has(i)}
                            onChange={(e) => {
                              const next = new Set(included)
                              if (e.target.checked) next.add(i)
                              else next.delete(i)
                              setIncluded(next)
                            }}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          {r.txn_date ? formatDate(r.txn_date) : '—'}
                        </td>
                        <td className="px-2 py-1.5">
                          <span>{r.description || '—'}</span>
                          {r.isDuplicate && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              duplicate
                            </Badge>
                          )}
                        </td>
                        <td
                          className={cn(
                            'px-2 py-1.5 text-right font-mono tabular-nums',
                            r.amount != null && amountColorClass(r.amount),
                          )}
                        >
                          {r.amount != null ? formatSignedMoney(r.amount) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep('map')}>
              Back
            </Button>
            <Button onClick={doCommit} disabled={commit.isPending || included.size === 0}>
              <Upload className="size-4" />
              Import {included.size}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
