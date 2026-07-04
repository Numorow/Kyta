const KEY = 'household-finance-pending-invite-token'

export function setPendingInvite(token: string) {
  sessionStorage.setItem(KEY, token)
}

export function consumePendingInvite(): string | null {
  const token = sessionStorage.getItem(KEY)
  if (token) sessionStorage.removeItem(KEY)
  return token
}
