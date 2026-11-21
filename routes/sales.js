const express = require('express');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.use(requireAuth);

const handle = (fn) => async (req, res) => {
    try {
        await fn(req, res);
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Internal server error.',
            error: err.message
        });
    }
};

const isId = (v) => Number.isInteger(v) && v > 0;

function cleanSaleInput(body) {
    const errors = [];

    if (!isId(body.payment_method)) errors.push('payment_method must be a valid id.');
    if (!isId(body.payment_status)) errors.push('payment_status must be a valid id.');

    if (body.customer_id !== undefined && body.customer_id !== null && !isId(body.customer_id)) {
        errors.push('customer_id must be a valid id.');
    }

    if (body.due_date !== undefined && body.due_date !== null) {
        if (typeof body.due_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.due_date)) {
            errors.push('due_date must look like 2026-12-31.');
        }
    }

    if (!Array.isArray(body.items) || body.items.length === 0) {
        errors.push('items must be a list with at least one product.');
    } else if (body.items.length > 100) {
        errors.push('a sale can have at most 100 items.');
    } else {
        body.items.forEach((item, i) => {
            if (!item || !isId(item.product_id)) {
                errors.push(`items[${i}].product_id must be a valid id`);
            }
            if (!item || !isId(item.quantity)) {
                errors.push(`items[${i}].quantity must be a whole number of 1 or more.`);
            }
        });
    }

    return errors;
}

router.post('/', handle(async (req, res) => {
    const errors = cleanSaleInput(req.body);
    if (errors.length > 0) {
        return res.status(400).json({ success: false, message: 'Invalid input.', errors });
    }

    const items = req.body.items.map((i) => ({
        product_id: i.product_id,
        quantity: i.quantity
    }));

    const { data: saleId, error } = await req.supabase.rpc('create_sale', {
        p_payment_method: req.body.payment_method,
        p_payment_status: req.body.payment_status,
        p_customer_id: req.body.customer_id ?? null,
        p_customer_name: req.body.customer_name ?? null,
        p_due_date: req.body.due_date ?? null,
        p_note: req.body.note ?? null,
        p_amount_paid: req.body.amount_paid ?? 0,
        p_items: items
    });

    if (error) {
        return res.status(400).json({
            success: false,
            message: error.code === 'P0001' ? error.message :'Could not save the sale',
            error: error.message
        });
    }

    const { data: sale, error: fetchError } = await req.supabase
        .from('sales')
        .select('*, sale_items(*, products(product_name))')
        .eq('id', saleId)
        .eq('seller_id', req.user.id)
        .single();

    if (fetchError) {
        return res.status(201).json({
            success: true,
            message: 'Sale saved',
            sale_id: saleId
        });
    }

    res.status(201).json({ success: true, message: 'Sale saved.', data: sale });
}));

router.get('/', handle(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 200);

    let query = req.supabase
        .from('sales')
        .select('*')
        .eq('seller_id', req.user.id)
        .order('created_at', { ascending: false })
        .limit(limit);
    
    if (req.query.from) query = query.gte('created_at', req.query.from);
    if (req.query.to) query = query.lte('created_at', req.query.to);

    const { data, error } = await query;

    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Could not fetch sales',
            error: error.message
        });
    }

    res.json({ success: true, count: data.length, data });
}));

router.get('/:id', handle(async (req, res) => {
    const id = Number(req.params.id);
    if (!isId(id)) {
        return res.status(400).json({ success: false, message: 'Invalid sale id' });
    }

    const { data, error } = await req.supabase
        .from('sales')
        .select('*, sale_items(*, products(product_name))')
        .eq('id', id)
        .eq('seller_id', req.user.id)
        .maybeSingle();

    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Could not fetch sale',
            error: error.message
        });
    }
    if (!data) {
        return res.status(404).json({ success: false, message: 'Sale not found.' });
    }

    res.json({ success: true, data });
}));

module.exports = router;
