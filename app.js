const express = require('express');
const path = require('path');
const app = express();

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'landing_page.html'));
});

app.use(express.static('public'));

app.listen(3000, () => {
    console.log('Server running at http://localhost:3000');
});