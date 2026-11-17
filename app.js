const express = require('express');
const path = require('path');
require('dotenv').config();

const supabase = require('./config/supabase');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);

app.use(express.static(path.join(__dirname, 'public'), { index: false }));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'landing_page.html'));
});

app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'SariTrack API is working!'
    });
});

app.get('/api/test-db', async (req, res) => {
    try {
        const { data, error } = await supabase
        .from('products')
        .select('*');

        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Error fetching data from Supabase',
                error: error.message
            });
        }

        res.json({
            success: true,
            message: 'Data fetched successfully from Supabase',
            data: data
        });
    
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: err.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});