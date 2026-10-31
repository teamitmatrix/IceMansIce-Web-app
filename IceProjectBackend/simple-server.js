const express = require('express');
const app = express();
const port = 3003;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Simple server running' });
});

app.post('/test', (req, res) => {
  console.log('Received request:', req.body);
  res.json({ message: 'Test successful', received: req.body });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Simple server running on http://localhost:${port}`);
});