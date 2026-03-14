/**
 * Invest AI — api/proxy.js
 * Backend proxy for Anthropic API calls.
 *
 * This keeps your API key safely on the server —
 * never expose it in client-side JavaScript.
 *
 * Stack: Node.js + Express
 * Install: npm install express cors dotenv
 * Run:     node api/proxy.js
 */

require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const path       = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve the frontend from the project root
app.use(express.static(path.join(__dirname, '..')));

// ─────────────────────────────────────────
// POST /api/analyze
// Receives a { prompt } and returns { text }
// ─────────────────────────────────────────
app.post('/api/analyze', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'No prompt provided.' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set in environment.' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':         'application/json',
        'x-api-key':            apiKey,
        'anthropic-version':    '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 400,
        messages: [
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic API error:', err);
      return res.status(response.status).json({ error: 'Upstream API error.' });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    res.json({ text });

  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Invest AI running at http://localhost:${PORT}`);
});

module.exports = app;
