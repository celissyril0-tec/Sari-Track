const express = require('express');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.use(requireAuth);

const handle = (fn) => async (req, res) => {
    try {
        await fn(req, res);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Internal server error.', error: err.message });
    }
};

router.get('/customers', handle(async (req, res) => {
    const { data, error } = await req.supabase
        .from('utang')
        .select('customer_id, balance, due_date, created_at, customers(customer_name), utang_status(status_name)')
        .eq('seller_id', req.user.id)
        .gt('balance', 0)
        .order('created_at', { ascending: true });

    if (error) {
        return res.status(400).json({ success: false, message: 'Could not fetch utang.', error: error.message });
    }

    const byCustomer = {};

    data.forEach((row) => {
        const id = row.customer_id;

        if (!byCustomer[id]) {
            byCustomer[id] = {
                customer_id: id,
                customer_name: row.customers ? row.customers.customer_name : 'Unknown',
                balance: 0,
                due_date: row.due_date,
                latest: row.created_at,
                status_name: row.utang_status ? row.utang_status.status_name : ''
            };
        }

        const c = byCustomer[id];
        c.balance += Number(row.balance);

        if (row.due_date && (!c.due_date || row.due_date < c.due_date)) c.due_date = row.due_date;
        if (row.created_at > c.latest) c.latest = row.created_at;
        if (row.utang_status && row.utang_status.status_name.toLowerCase() === 'unpaid') {
            c.status_name = row.utang_status.status_name;
        }
    });

    res.json({ success: true, data: Object.values(byCustomer) });
}));

router.get('/summary', handle(async (req, res) => {
    const [utangResult, paymentsResult] = await Promise.all([
        req.supabase.from('utang').select('customer_id, balance').eq('seller_id', req.user.id).gt('balance', 0),
        req.supabase.from('utang_payments').select('amount, paid_at').eq('seller_id', req.user.id)
    ]);

    if (utangResult.error) {
        return res.status(400).json({ success: false, message: 'Could not fetch utang.', error: utangResult.error.message });
    }
    if (paymentsResult.error) {
        return res.status(400).json({ success: false, message: 'Could not fetch payments.', error: paymentsResult.error.message });
    }

    const totalUtang = utangResult.data.reduce((sum, r) => sum + Number(r.balance), 0);
    const customerCount = new Set(utangResult.data.map((r) => r.customer_id)).size;

    const now = new Date();
    const dayIndex = (now.getDay() + 6) % 7;
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayIndex);

    const paidThisWeek = paymentsResult.data
        .filter((p) => new Date(p.paid_at) >= weekStart)
        .reduce((sum, p) => sum + Number(p.amount), 0);

    res.json({
        success: true,
        data: { total_utang: totalUtang, customer_count: customerCount, paid_this_week: paidThisWeek }
    });
}));

router.post('/payments', handle(async (req, res) => {
    const { customer_id, amount, payment_method, note } = req.body;

    if (!Number.isInteger(customer_id) || customer_id <= 0) {
        return res.status(400).json({ success: false, message: 'customer_id must be a valid id.' });
    }
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ success: false, message: 'amount must be a number greater than 0.' });
    }
    if (!Number.isInteger(payment_method) || payment_method <= 0) {
        return res.status(400).json({ success: false, message: 'payment_method must be a valid id.' });
    }

    const { data, error } = await req.supabase.rpc('record_utang_payment', {
        p_customer_id: customer_id,
        p_amount: amount,
        p_payment_method: payment_method,
        p_note: note ?? null
    });

    if (error) {
        return res.status(400).json({
            success: false,
            message: error.code === 'P0001' ? error.message : 'Could not record payment.',
            error: error.message
        });
    }

    res.status(201).json({ success: true, message: 'Payment recorded.', amount_applied: data });
}));

module.exports = router;
