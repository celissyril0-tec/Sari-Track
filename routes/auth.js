const express = require('express');
const { createSupabaseClient } = require('../config/supabaseFactory');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.post('/signup', async (req, res) => {
    try {
        const { email, password, seller_name, store_name } = req.body;

        if (!email || !password || !seller_name) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: email, password, and seller_name.'
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
                store_name: store_name || null,
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
            message: 'Account created successfully.',
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

router.patch('/profile', requireAuth, async (req, res) => {
    try {
        const values = {};

        for (const field of ['seller_name', 'store_name', 'store_address', 'store_type']) {
            const value = req.body[field];
            if (value === undefined) continue;

            if (typeof value !== 'string') {
                return res.status(400).json({ success: false, message: `${field} must be text.` });
            }
            values[field] = value.trim();
        }

        for (const field of ['seller_name', 'store_name']) {
            if (values[field] === '') {
                return res.status(400).json({ success: false, message: `${field} cannot be empty.` });
            }
        }

        for (const field of ['store_address', 'store_type']) {
            if (values[field] === '') values[field] = null;
        }

        const allowedTypes = ['Sari-sari Store', 'Grocery', 'Other'];
        if (values.store_type && !allowedTypes.includes(values.store_type)) {
            return res.status(400).json({ success: false, message: 'Invalid store type.' });
        }

        for (const field of ['default_low_stock', 'default_due_days']) {
            const value = req.body[field];
            if (value === undefined) continue;

            if (!Number.isInteger(value) || value < 0) {
                return res.status(400).json({ success: false, message: `${field} must be a whole number of 0 or more.` });
            }
            values[field] = value;
        }

        for (const field of ['notify_low_stock', 'notify_overdue']) {
            const value = req.body[field];
            if (value === undefined) continue;

            if (typeof value !== 'boolean') {
                return res.status(400).json({ success: false, message: `${field} must be true or false.` });
            }
            values[field] = value;
        }

        if (Object.keys(values).length === 0) {
            return res.status(400).json({ success: false, message: 'Nothing to update.' });
        }

        const { data, error } = await req.supabase
            .from('profiles')
            .update(values)
            .eq('id', req.user.id)
            .select()
            .maybeSingle();

        if (error) {
            return res.status(400).json({ success: false, message: 'Could not update profile.', error: error.message });
        }
        if (!data) {
            return res.status(404).json({ success: false, message: 'Profile not found.' });
        }

        res.json({ success: true, message: 'Profile updated.', profile: data });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Internal server error.', error: err.message });
    }
});

router.post('/refresh', async (req, res) => {
    try {
        const { refresh_token } = req.body;

        if (!refresh_token) {
            return res.status(400).json({ success: false, message: 'refresh_token is required.' });
        }

        const supabase = createSupabaseClient();
        const { data, error } = await supabase.auth.refreshSession({ refresh_token });

        if (error || !data.session) {
            return res.status(401).json({ success: false, message: 'Session expired, please log in again.' });
        }

        res.json({
            success: true,
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Internal server error.', error: err.message });
    }
});

router.post('/change-password', requireAuth, async (req, res) => {
    try {
        const { current_password, new_password } = req.body;

        if (!current_password || !new_password) {
            return res.status(400).json({
                success: false,
                message: 'current_password and new_password are required.'
            });
        }

        if (new_password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 8 characters.'
            });
        }

        const checkClient = createSupabaseClient();
        const { error: checkError } = await checkClient.auth.signInWithPassword({
            email: req.user.email,
            password: current_password
        });

        if (checkError) {
            return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
        }

        const { error } = await req.supabase.auth.updateUser({ password: new_password });

        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Could not update password.',
                error: error.message
            });
        }

        res.json({ success: true, message: 'Password updated.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Internal server error.', error: err.message });
    }
});

module.exports = router;