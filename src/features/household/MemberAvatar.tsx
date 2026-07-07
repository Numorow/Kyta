import { cn } from '@/lib/utils'
import { MEMBER_COLORS, type Member } from '@/features/household/useMembers'

/** A small coloured initials chip identifying a household member. */
export function MemberAvatar({
  member,
  size = 'sm',
  showName = false,
  youAsYou = true,
  className,
}: {
  member?: Member | null
  size?: 'xs' | 'sm'
  showName?: boolean
  youAsYou?: boolean // label the current user "You" rather than their name
  className?: string
}) {
  if (!member) {
    return showName ? <span className="text-xs text-muted-foreground">—</span> : null
  }
  const dim = size === 'xs' ? 'size-5 text-[10px]' : 'size-6 text-xs'
  const label = youAsYou && member.isYou ? 'You' : member.name
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-full font-medium text-white',
          dim,
        )}
        style={{ backgroundColor: MEMBER_COLORS[member.colorIndex] }}
        title={member.name}
      >
        {member.initials}
      </span>
      {showName && <span className="truncate text-sm">{label}</span>}
    </span>
  )
}
