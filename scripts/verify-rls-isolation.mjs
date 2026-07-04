// Proves household RLS isolation through the REAL client path (anon key +
// user session), not a superuser SQL connection — a superuser bypasses RLS
// entirely, so that would prove nothing.
//
// Requires two already-confirmed household member accounts (any Postgres
// role with sufficient privilege — e.g. via the Supabase SQL editor: `update
// auth.users set email_confirmed_at = now() where email = '...'`; or disable
// "Confirm email" in Auth settings; or sign up + click the confirmation link).
// Each account must have no household yet (a fresh signup).
//
// Usage:
//   VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... \
//   USER_A_EMAIL=... USER_A_PASSWORD=... \
//   USER_B_EMAIL=... USER_B_PASSWORD=... \
//   node scripts/verify-rls-isolation.mjs

import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY
const userA = { email: process.env.USER_A_EMAIL, password: process.env.USER_A_PASSWORD }
const userB = { email: process.env.USER_B_EMAIL, password: process.env.USER_B_PASSWORD }

for (const [name, value] of Object.entries({ url, anonKey, ...userA, ...userB })) {
  if (!value) {
    console.error(`Missing required env var for: ${name}`)
    process.exit(1)
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(`FAIL: ${message}`)
  console.log(`  ok: ${message}`)
}

async function signInAndCreateHousehold(creds, householdName) {
  const client = createClient(url, anonKey)
  const { data, error } = await client.auth.signInWithPassword(creds)
  if (error) throw new Error(`Sign-in failed for ${creds.email}: ${error.message}`)

  const { data: householdId, error: rpcError } = await client.rpc('create_household', {
    household_name: householdName,
  })
  if (rpcError) throw new Error(`create_household failed for ${creds.email}: ${rpcError.message}`)

  return { client, userId: data.user.id, householdId }
}

async function main() {
  console.log('Signing in as user A and user B, creating one household each...')
  const a = await signInAndCreateHousehold(userA, `RLS test household A ${Date.now()}`)
  const b = await signInAndCreateHousehold(userB, `RLS test household B ${Date.now()}`)
  assert(a.householdId !== b.householdId, 'the two households have different ids')

  console.log('Checking household A cannot see household B...')
  const { data: aHouseholds, error: aErr } = await a.client.from('households').select('id')
  if (aErr) throw aErr
  assert(
    aHouseholds.some((h) => h.id === a.householdId),
    "A's household list includes A's own household",
  )
  assert(
    !aHouseholds.some((h) => h.id === b.householdId),
    "A's household list does NOT include B's household",
  )

  const { data: aMembersOfB } = await a.client
    .from('household_members')
    .select('user_id')
    .eq('household_id', b.householdId)
  assert((aMembersOfB ?? []).length === 0, "A cannot read B's household_members rows")

  console.log('Checking household B cannot see household A (symmetric case)...')
  const { data: bHouseholds, error: bErr } = await b.client.from('households').select('id')
  if (bErr) throw bErr
  assert(
    bHouseholds.some((h) => h.id === b.householdId),
    "B's household list includes B's own household",
  )
  assert(
    !bHouseholds.some((h) => h.id === a.householdId),
    "B's household list does NOT include A's household",
  )

  const { data: bMembersOfA } = await b.client
    .from('household_members')
    .select('user_id')
    .eq('household_id', a.householdId)
  assert((bMembersOfA ?? []).length === 0, "B cannot read A's household_members rows")

  console.log('\nPASS: household RLS isolation holds in both directions.')
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
