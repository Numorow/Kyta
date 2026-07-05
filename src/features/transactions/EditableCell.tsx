import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'

// Move focus to the same column one row up/down. Cells tag themselves with
// data-cell="rowIndex:colId"; arrow keys jump between adjacent rows so the grid
// feels spreadsheet-like (brief §8.2).
function focusSibling(rowIndex: number, colId: string, delta: number) {
  const target = document.querySelector<HTMLElement>(
    `[data-cell="${rowIndex + delta}:${colId}"]`,
  )
  target?.focus()
}

type BaseProps = {
  rowIndex: number
  colId: string
  readOnly?: boolean
  className?: string
}

/** Text/number cell: click to edit, Enter/blur commits, Escape reverts. */
export function EditableInput({
  value,
  onCommit,
  type = 'text',
  align = 'left',
  rowIndex,
  colId,
  readOnly,
  className,
  render,
}: BaseProps & {
  value: string
  onCommit: (next: string) => void
  type?: 'text' | 'number' | 'date'
  align?: 'left' | 'right'
  render?: (value: string) => React.ReactNode
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      setDraft(value)
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing, value])

  const commit = () => {
    setEditing(false)
    if (draft !== value) onCommit(draft)
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commit()
      focusSibling(rowIndex, colId, 1)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setDraft(value)
      setEditing(false)
    }
  }

  if (readOnly) {
    return (
      <div className={cn('px-2 py-1.5 text-sm', align === 'right' && 'text-right', className)}>
        {render ? render(value) : value}
      </div>
    )
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
        step={type === 'number' ? '0.01' : undefined}
        className={cn(
          'w-full rounded-sm border border-ring bg-background px-2 py-1.5 text-sm outline-none',
          align === 'right' && 'text-right',
          className,
        )}
      />
    )
  }

  return (
    <button
      type="button"
      data-cell={`${rowIndex}:${colId}`}
      onFocus={() => setEditing(true)}
      onClick={() => setEditing(true)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          focusSibling(rowIndex, colId, 1)
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          focusSibling(rowIndex, colId, -1)
        }
      }}
      className={cn(
        'w-full cursor-text rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted focus:bg-muted focus:outline-none',
        align === 'right' && 'text-right',
        className,
      )}
    >
      {render ? render(value) : value || <span className="text-muted-foreground">—</span>}
    </button>
  )
}
