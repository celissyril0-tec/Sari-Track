const express = require('express');
const { createSupabaseClient } = require('../config/supabaseFactory');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.post('/signup', async (req, res) => {
    try {
        const { email, password, seller_name, store_name } = req.body;

        if (!email || !password || !seller_name || !store_name) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: email, password, seller_name, and store_name.'
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters long.'
            });
        }

        const supabase = createSupabaseClient();

        const { data, error } = await supabase.auth.signUp({ email, password });

        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Could not create account.',
                error: error.message
            });
        }

        const { error: profileError } = await supabase
            .from('profiles')
            .insert({
                id: data.user.id,
                seller_name,
                store_name,
                email
            });

        if (profileError) {
            return res.status(400).json({
                success: false,
                message: 'Could not create user profile.',
                error: profileError.message
            });
        }

        res.status(201).json({
            success: true,
            message: 'Account created successfully. Please check your email to confirm your account.',
            user: { id: data.user.id, email }
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Internal server error during signup.',
            error: err.message
        });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: email and password.'
            });
        }

        const supabase = createSupabaseClient();
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.',
                error: error.message
            });
        }

        res.json({
            success: true,
            message: 'Logged in successfully.',
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            user: { id: data.user.id, email: data.user.email }
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Internal server error during login.',
            error: err.message
        });
    }
});

router.get('/profile', requireAuth, async (req, res) => {
    try {
        const { data, error } = await req.supabase
            .from('profiles')
            .select('*')
            .eq('id', req.user.id)
            .single();
        
        if (error) {
            return res.status(404).json({
                success: false,
                message: 'Profile not found.',
                error: error.message
            });
        }

        res.json({ success: true, profile: data });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Internal server error while fetching profile.',
            error: err.message
        });
    }
});

module.exports = router;