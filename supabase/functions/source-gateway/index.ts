import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
import { createSourceHandler } from '../_shared/sources/handler.ts';

const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
Deno.serve(createSourceHandler({
  async authenticate(token: string) {
    // Ask Auth to verify the JWT; never decode/trust a caller-provided identity.
    const { data, error } = await client.auth.getUser(token);
    return error || !data.user ? null : data.user.id;
  },
  async rpc(name: string, args: Record<string, unknown>) {
    const { data, error } = await client.rpc(name, args);
    if (error) throw error;
    return data;
  },
}));
