const express = require('express');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.use(requireAuth);

const handle = (fn) => async (req, res) => {
    try {
        await fn(req, res);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
    }
};

router.get('/', handle(async (req, res) => {
    const [profileResult, expensesResult] = await Promise.all([
        req.supabase.from('profiles').select('budget_amount').eq('id', req.user.id).single(),
        req.supabase.from('budget_expenses')
            .select('id, category, amount, created_at')
            .eq('seller_id', req.user.id)
            .order('created_at', { ascending: true })
    ]);

    if (profileResult.error) {
        return res.status(400).json({ success: false, message: 'Could not fetch budget', error: profileResult.error.message });
    }
    if (expensesResult.error) {
        return res.status(400).json({ success: false, message: 'Could not fetch expenses', error: expensesResult.error.message });
    }

    res.json({
        success: true,
        data: {
            amount: Number(profileResult.data.budget_amount) || 0,
            expenses: expensesResult.data
        }
    });
}));

router.put('/', handle(async (req, res) => {
    const { amount } = req.body;

    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ success: false, message: 'amount must be a number greater than 0' });
    }

    const { error } = await req.supabase
        .from('profiles')
        .update({ budget_amount: amount })
        .eq('id', req.user.id);

    if (error) {
        return res.status(400).json({ success: false, message: 'Could not save budget', error: error.message });
    }

    res.json({ success: true, message: 'Budget saved', amount });
}));

router.post('/expenses', handle(async (req, res) => {
    const { category, amount } = req.body;

    if (typeof category !== 'string' || category.trim() === '') {
        return res.status(400).json({ success: false, message: 'category is required' });
    }
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ success: false, message: 'amount must be a number greater than 0' });
    }

    const { data, error } = await req.supabase
        .from('budget_expenses')
        .insert({ seller_id: req.user.id, category: category.trim(), amount })
        .select()
        .single();

    if (error) {
        return res.status(400).json({ success: false, message: 'Could not add expense', error: error.message });
    }

    res.status(201).json({ success: true, message: 'Expense added', data });
}));

router.delete('/expenses/:id', handle(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid expense id' });
    }

    const { data, error } = await req.supabase
        .from('budget_expenses')
        .delete()
        .eq('id', id)
        .eq('seller_id', req.user.id)
        .select()
        .maybeSingle();

    if (error) {
        return res.status(400).json({ success: false, message: 'Could not remove expense', error: error.message });
    }
    if (!data) {
        return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    res.json({ success: true, message: 'Expense removed' });
}));

router.post('/reset', handle(async (req, res) => {
    const [profileUpdate, expensesDelete] = await Promise.all([
        req.supabase.from('profiles').update({ budget_amount: 0 }).eq('id', req.user.id),
        req.supabase.from('budget_expenses').delete().eq('seller_id', req.user.id)
    ]);

    if (profileUpdate.error) {
        return res.status(400).json({ success: false, message: 'Could not reset budget', error: profileUpdate.error.message });
    }
    if (expensesDelete.error) {
        return res.status(400).json({ success: false, message: 'Could not clear expenses', error: expensesDelete.error.message });
    }

    res.json({ success: true, message: 'Budget cleared' });
}));

module.exports = router;