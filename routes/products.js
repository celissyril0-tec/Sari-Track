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
            message: 'Internal server error',
            error: err.message
        });
    }
};

const isMoney = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const isWhole = (v) => Number.isInteger(v) && v >= 0;

function cleanProductInput(body, isUpdate) {
    const errors = [];
    const values = {};

    if (body.product_name !== undefined) {
        if (typeof body.product_name !== 'string' || body.product_name.trim() === '') {
            errors.push('product_name must be a non-empty string.');
        } else {
            values.product_name = body.product_name.trim();
        }
    } else if (!isUpdate) {
        errors.push('product_name is required.');
    }

    for (const field of ['cost_price', 'price_per_unit']) {
        if (body[field] !== undefined) {
            if (!isMoney(body[field])) {
                errors.push(`${field} must be a number that is greater than or equal to 0.`);
            } else {
                values[field] = body[field];
            }
        }
    }

    if (!isUpdate && body.price_per_unit === undefined) {
        errors.push('price_per_unit is required.');
    }

    for (const field of ['stock', 'reorder_level']) {
        if (body[field] !== undefined) {
            if (!isWhole(body[field])) {
                errors.push(`${field} must be a whole number that is greater than or equal to 0.`);
            } else {
                values[field] = body[field];
            }
        }
    }

    for (const field of ['category_id', 'product_unit']) {
        if (body[field] !== undefined) {
            const okNull = false;
            if (!okNull && !Number.isInteger(body[field])) {
                errors.push(`${field} must be a whole number.`);
            } else {
                values[field] = body[field];
            }
        }
    }

    if (!isUpdate) {
        if (body.category_id === undefined) errors.push('category_id is required.');
        if (body.product_unit === undefined) errors.push('product_unit is required.');
        if (values.cost_price === undefined) values.cost_price = 0;
        if (values.stock === undefined) values.stock = 0;
        if (values.reorder_level === undefined) values.reorder_level = 0;
    }
    
    return { errors, values };
}

function parseId(req, res) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        res.status(400).json({
            success: false,
            message: 'Invalid product ID.' });
        return null;
    }
    return id;
}

router.get('/', handle(async (req, res) => {
    let query = req.supabase
    .from('products')
    .select('*')
    .eq('seller_id', req.user.id)
    .eq('is_active', true)
    .order('product_name', { ascending: true });

    if (req.query.category_id) {
        query = query.eq('category_id', Number(req.query.category_id));
    }

    const { data, error } = await query;

    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Error fetching products',
            error: error.message
        });
    }

    let products = data;
    if (req.query.low_stock === 'true') {
        products = products.filter((p) => p.stock <= p.reorder_level);
    }

    res.json({ success: true, count: products.length, data: products });
}));

router.get('/:id', handle(async (req, res) => {
    const id = parseId(req, res);
    if (id === null) return;

    const { data, error } = await req.supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .eq('seller_id', req.user.id)
        .eq('is_active', true)
        .maybeSingle();

    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Error fetching product',
            error: error.message
        });
    }
    if (!data) {
        return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    res.json({ success: true, data });
}));

router.post('/', handle(async (req, res) => {
    const { errors, values } = cleanProductInput(req.body, false);

    if (errors.length > 0) {
        return res.status(400).json({ success: false, message: 'Invalid input', errors });
    }

    const { data, error } = await req.supabase
        .from('products')
        .insert([{ ...values, seller_id: req.user.id }])
        .select()
        .single();

    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Error creating product',
            error: error.message
        });
    }

    res.status(201).json({ success: true, message: 'Product created successfully', data });
}));

router.patch('/:id', handle(async (req, res) => {
    const id = parseId(req, res);
    if (id === null) return;

    const { errors, values } = cleanProductInput(req.body, true);

    if (errors.length > 0) {
        return res.status(400).json({ success: false, message: 'Invalid input', errors });
    }
    if (Object.keys(values).length === 0) {
        return res.status(400).json({ success: false, message: 'No valid fields provided for update.' });
    }

    const { data, error } = await req.supabase
        .from('products')
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('seller_id', req.user.id)
        .eq('is_active', true)
        .select()
        .maybeSingle();

    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Error updating product',
            error: error.message
        });
    }
    if (!data) {
        return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    res.json({ success: true, message: 'Product updated', data });
}));

router.delete('/:id', handle(async (req, res) => {
    const id = parseId(req, res);
    if (id === null) return;

    const { data, error } = await req.supabase
        .from('products')
        .delete()
        .eq('id', id)
        .eq('seller_id', req.user.id)
        .select()
        .maybeSingle();

    if (error) {
        if (error.code === '23503') {
            const hidden = await req.supabase
                .from('products')
                .update({ is_active: false, updated_at: new Date().toISOString() })
                .eq('id', id)
                .eq('seller_id', req.user.id)
                .select()
                .maybeSingle();

            if (hidden.error) {
                return res.status(400).json({
                    success: false,
                    message: 'Could not remove product.',
                    error: hidden.error.message
                });
            }
            if (!hidden.data) {
                return res.status(404).json({ success: false, message: 'Product not found.' });
            }

            return res.json({
                success: true,
                archived: true,
                message: 'This product has past sales, so it was removed from your list and kept in your sales history.'
            });
        }

        return res.status(400).json({
            success: false,
            message: 'Could not delete product.',
            error: error.message
        });
    }
    if (!data) {
        return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    res.json({ success: true, message: 'Product deleted.' });
}));

module.exports = router;
