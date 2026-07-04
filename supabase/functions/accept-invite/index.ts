// Redeems a household_invites.token into a household_members row.
// Runs with the service-role key because the invitee isn't a household
// member yet, so the normal RLS policies on household_members have nothing
// to let them through on — this function is the one deliberate bypass.
import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Edge Functions don't get browser CORS handling for free — without an
// explicit OPTIONS response the preflight fails and the browser never
// sends the real POST at all.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return json({ error: 'Missing Authorization header' }, 401)
  }

  const { token } = await req.json().catch(() => ({ token: null }))
  if (!token || typeof token !== 'string') {
    return json({ error: 'Missing invite token' }, 400)
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
    return json({ error: 'Not authenticated' }, 401)
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const { data: invite, error: inviteError } = await admin
    .from('household_invites')
    .select('id, household_id, email, accepted_at, expires_at')
    .eq('token', token)
    .maybeSingle()

  if (inviteError || !invite) {
    return json({ error: 'Invite not found' }, 404)
  }
  if (invite.accepted_at) {
    return json({ error: 'Invite already accepted' }, 409)
  }
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return json({ error: 'Invite expired' }, 410)
  }
  if (invite.email.toLowerCase() !== user.email?.toLowerCase()) {
    return json({ error: 'This invite was sent to a different email address' }, 403)
  }

  const { error: memberError } = await admin.from('household_members').insert({
    household_id: invite.household_id,
    user_id: user.id,
    role: 'member',
  })
  if (memberError) {
    // Most likely already a member of this household (primary key conflict) — treat as success.
    if (memberError.code !== '23505') {
      return json({ error: memberError.message }, 500)
    }
  }

  await admin
    .from('household_invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id)

  return json({ household_id: invite.household_id }, 200)
})
