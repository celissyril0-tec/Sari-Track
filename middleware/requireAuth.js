const { createSupabaseClient } = require('../config/supabaseFactory');

async function requireAuth(req, res, next) {
    try {
        const header = req.headers.authorization || '';
        const token = header.startsWith('Bearer ') ? header.slice(7) : null;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Please log in first (missing token).'
            });
        }
    
        const supabase = createSupabaseClient(token);
        const { data, error } = await supabase.auth.getUser(token);

        if (error || !data.user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token, please log in again.'
            });
        }

        req.user = data.user;
        req.supabase = supabase;
        next();
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Internal server error during authentication.',
            error: err.message
        });
    }
}

module.exports = requireAuth;