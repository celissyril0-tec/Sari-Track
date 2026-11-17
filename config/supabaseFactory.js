const { createClient } = require('@supabase/supabase-js');

function createSupabaseClient(accessToken) {
    return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        },
        global: accessToken
            ? { headers: { Authorization: `Bearer ${accessToken}` } }
            : {}
        });
}

module.exports = { createSupabaseClient };
