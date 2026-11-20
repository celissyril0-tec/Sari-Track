const express = require('express');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.use(requireAuth);

const LOOKUP_TABLES = [
    'categories',
    'units',
    'payment_methods',
    'utang_status',
    'notification_types'
];

router.get('/', async (req, res) => {
    try {
        const results = await Promise.all(
            LOOKUP_TABLES.map((table) =>
            req.supabase.from(table).select('*').order('id', { ascending: true })
            )
        );

        const data = {};
        for (let i = 0; i < LOOKUP_TABLES.length; i++) {
            if (results[i].error) {
                return res.status(400).json({
                    success: false,
                    message: `Could not fetch ${LOOKUP_TABLES[i]}`,
                    error: results[i].error.message
                });
            }
            data[LOOKUP_TABLES[i]] = results[i].data;
        }

        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Internal server error.',
            error: err.message
        });
    }
});

module.exports = router;
