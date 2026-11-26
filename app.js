const express = require('express');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const lookupRoutes = require('./routes/lookups');
const saleRoutes = require('./routes/sales');
const utangRoutes = require('./routes/utang');
const customerRoutes = require('./routes/customers');
const budgetRoutes = require('./routes/budget');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/lookups', lookupRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/utang', utangRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/budget', budgetRoutes);

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

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
    });
}

module.exports = app;
