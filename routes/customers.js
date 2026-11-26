const express = require('express');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
    try {
        const { data, error } = await req.supabase
            .from('customers')
            .select('id, customer_name, contact_number')
            .eq('seller_id', req.user.id)
            .order('customer_name', { ascending: true });

        if (error) {
            return res.status(400).json({ success: false, message: 'Could not fetch customers.', error: error.message });
        }

        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Internal server error.' , error: err.message });
    }
});

module.exports = router;
