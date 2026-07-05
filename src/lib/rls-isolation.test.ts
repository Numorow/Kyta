// Household RLS isolation, proven through the REAL client path (anon key + user
// session) — a superuser/pgTAP connection bypasses RLS and would prove nothing.
// This mirrors scripts/verify-rls-isolation.mjs and extends it to the tables
// added since (goals, goal_contributions) plus a few existing ones.
//
// Gated on credentials so the default `npm test` stays green and offline. To
// run it, provide two already-confirmed accounts that each have NO household
// yet, and point at a throwaway/test project:
//
//   VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... \
//   USER_A_EMAIL=... USER_A_PASSWORD=... \
//   USER_B_EMAIL=... USER_B_PASSWORD=... \
//   npx vitest run src/lib/rls-isolation.test.ts
//
// Note: it creates a fresh household per run and cannot delete the household as
// anon (no delete policy), so empty test households accumulate — clean them up
// manually or run against a disposable project.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY
const userA = { email: process.env.USER_A_EMAIL, password: process.env.USER_A_PASSWORD }
const userB = { email: process.env.USER_B_EMAIL, password: process.env.USER_B_PASSWORD }

const hasCreds = Boolean(
  url && anonKey && userA.email && userA.password && userB.email && userB.password,
)

async function signInAndCreateHousehold(creds: { email?: string; password?: string }, name: string) {
  const client = createClient(url as string, anonKey as string)
  const { error } = await client.auth.signInWithPassword({
    email: creds.email as string,
    password: creds.password as string,
  })
  if (error) throw new Error(`Sign-in failed for ${creds.email}: ${error.message}`)
  const { data: householdId, error: rpcError } = await client.rpc('create_household', {
    household_name: name,
  })
  if (rpcError) throw new Error(`create_household failed for ${creds.email}: ${rpcError.message}`)
  return { client, householdId: householdId as unknown as string }
}

describe.skipIf(!hasCreds)('household RLS isolation (live)', () => {
  const stamp = Date.now()
  let a: Awaited<ReturnType<typeof signInAndCreateHousehold>>
  let b: Awaited<ReturnType<typeof signInAndCreateHousehold>>
  // Row ids A seeds in its own household; B must not be able to read any of them.
  const seeded: Record<string, string> = {}

  beforeAll(async () => {
    a = await signInAndCreateHousehold(userA, `RLS test household A ${stamp}`)
    b = await signInAndCreateHousehold(userB, `RLS test household B ${stamp}`)

    const goal = await a.client
      .from('goals')
      .insert({ household_id: a.householdId, name: 'RLS goal', target_amount: 100 })
      .select('id')
      .single()
    if (goal.error) throw goal.error
    seeded.goal = goal.data.id

    const contribution = await a.client
      .from('goal_contributions')
      .insert({ household_id: a.householdId, goal_id: seeded.goal, amount: 25 })
      .select('id')
      .single()
    if (contribution.error) throw contribution.error
    seeded.contribution = contribution.data.id

    const snapshot = await a.client
      .from('balance_snapshots')
      .insert({
        household_id: a.householdId,
        snapshot_date: '2000-01-01',
        total_assets: 0,
        total_liabilities: 0,
        net_worth: 0,
      })
      .select('id')
      .single()
    if (snapshot.error) throw snapshot.error
    seeded.snapshot = snapshot.data.id

    const payslip = await a.client
      .from('payslips')
      .insert({ household_id: a.householdId, pay_date: '2000-01-01', gross: 0, net: 0 })
      .select('id')
      .single()
    if (payslip.error) throw payslip.error
    seeded.payslip = payslip.data.id
  }, 30_000)

  afterAll(async () => {
    // Best-effort cleanup of the seeded data rows (FOR ALL lets a member delete
    // its own). The households themselves can't be deleted as anon and remain.
    if (!a) return
    await a.client.from('goal_contributions').delete().eq('id', seeded.contribution)
    await a.client.from('goals').delete().eq('id', seeded.goal)
    await a.client.from('balance_snapshots').delete().eq('id', seeded.snapshot)
    await a.client.from('payslips').delete().eq('id', seeded.payslip)
  })

  it('gives the two users distinct households', () => {
    expect(a.householdId).toBeTruthy()
    expect(b.householdId).toBeTruthy()
    expect(a.householdId).not.toBe(b.householdId)
  })

  it("B's household list excludes A's household", async () => {
    const { data, error } = await b.client.from('households').select('id')
    expect(error).toBeNull()
    expect((data ?? []).some((h) => h.id === a.householdId)).toBe(false)
    expect((data ?? []).some((h) => h.id === b.householdId)).toBe(true)
  })

  it("B cannot read A's household_members", async () => {
    const { data } = await b.client
      .from('household_members')
      .select('user_id')
      .eq('household_id', a.householdId)
    expect((data ?? []).length).toBe(0)
  })

  it.each([
    ['goals', () => seeded.goal],
    ['goal_contributions', () => seeded.contribution],
    ['balance_snapshots', () => seeded.snapshot],
    ['payslips', () => seeded.payslip],
  ] as const)("B cannot read A's %s", async (table, id) => {
    const { data } = await b.client.from(table).select('id').eq('id', id())
    expect((data ?? []).length).toBe(0)
  })
})
