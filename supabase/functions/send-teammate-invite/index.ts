// supabase/functions/send-teammate-invite/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userError } = await anonClient.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ ok: false, error: 'Not authenticated.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const isPlatformAdmin = (userData.user.app_metadata as Record<string, unknown>)?.['is_platform_admin'] === true;
    if (!isPlatformAdmin) {
      return new Response(JSON.stringify({ ok: false, error: 'Not authorized.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { memberId } = await req.json();
    if (!memberId) {
      return new Response(JSON.stringify({ ok: false, error: 'memberId is required.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: member, error: memberError } = await adminClient
      .from('tenant_members')
      .select('id, email, tenant_id')
      .eq('id', memberId)
      .eq('status', 'invited')
      .single();
    if (memberError || !member) {
      return new Response(JSON.stringify({ ok: false, error: 'Teammate request not found or not in an invitable state.' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(member.email, {
      data: { tenant_member_id: member.id, tenant_id: member.tenant_id },
    });
    if (inviteError) {
      return new Response(JSON.stringify({ ok: false, error: inviteError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
