import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DB_PATH = path.join(__dirname, 'src', 'data', 'db.json');

app.use(cors());
app.use(express.json());

// Get all collections
app.get('/api/collections', async (req, res) => {
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Error reading DB:', error);
    res.status(500).json({ error: 'Failed to read data' });
  }
});

// Update all collections
app.post('/api/collections', async (req, res) => {
  try {
    const collections = req.body;
    await fs.writeFile(DB_PATH, JSON.stringify(collections, null, 2), 'utf-8');
    res.json({ success: true });
  } catch (error) {
    console.error('Error writing DB:', error);
    res.status(500).json({ error: 'Failed to save data' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running at http://localhost:${PORT}`);
});
