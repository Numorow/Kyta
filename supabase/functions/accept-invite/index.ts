// Redeems a household_invites.token into a household_members row.
// Runs with the service-role key because the invitee isn't a household
// member yet, so the normal RLS policies on household_members have nothing
// to let them through on — this function is the one deliberate bypass.
import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { token } = await req.json().catch(() => ({ token: null }))
  if (!token || typeof token !== 'string') {
    return new Response(JSON.stringify({ error: 'Missing invite token' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Identify the caller from their own JWT (anon key + their Authorization header).
  const callerClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  })
  const {
    data: { user },
    error: userError,
  } = await callerClient.auth.getUser()
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const { data: invite, error: inviteError } = await admin
    .from('household_invites')
    .select('id, household_id, email, accepted_at, expires_at')
    .eq('token', token)
    .maybeSingle()

  if (inviteError || !invite) {
    return new Response(JSON.stringify({ error: 'Invite not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  if (invite.accepted_at) {
    return new Response(JSON.stringify({ error: 'Invite already accepted' }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return new Response(JSON.stringify({ error: 'Invite expired' }), {
      status: 410,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  if (invite.email.toLowerCase() !== user.email?.toLowerCase()) {
    return new Response(
      JSON.stringify({ error: 'This invite was sent to a different email address' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const { error: memberError } = await admin.from('household_members').insert({
    household_id: invite.household_id,
    user_id: user.id,
    role: 'member',
  })
  if (memberError) {
    // Most likely already a member of this household (primary key conflict) — treat as success.
    if (memberError.code !== '23505') {
      return new Response(JSON.stringify({ error: memberError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  await admin
    .from('household_invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id)

  return new Response(JSON.stringify({ household_id: invite.household_id }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
