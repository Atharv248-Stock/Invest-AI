/**
 * Invest AI — api/proxy.js
 *
 * Handles:
 *  - POST /api/analyze            → Anthropic AI analysis
 *  - POST /api/create-checkout-session → Stripe Checkout
 *  - GET  /api/stripe-key         → Returns publishable key to frontend
 *  - GET  /api/stripe-success     → Post-payment success handler
 *  - GET  /api/stripe-cancel      → Cancelled payment handler
 *
 * Required .env variables:
 *   ANTHROPIC_API_KEY=sk-ant-...
 *   STRIPE_SECRET_KEY=sk_live_...
 *   STRIPE_PUBLISHABLE_KEY=pk_live_...
 *   STRIPE_PRICE_ID=price_1TB0h6FTA4Zo5UZkJzJI0O8u
 *   YOUR_DOMAIN=https://your-app.railway.app  (no trailing slash)
 *
 * Install: npm install express cors dotenv stripe
 * Run:     node api/proxy.js
 */

require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const Stripe  = require('stripe');

const app    = express();
const PORT   = process.env.PORT || 3000;
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

/* ─────────────────────────────────────────
   GET /api/stripe-key
   Returns the publishable key so the frontend
   never has it hardcoded in source code.
───────────────────────────────────────── */
app.get('/api/stripe-key', (req, res) => {
  const key = process.env.STRIPE_PUBLISHABLE_KEY;
  if (!key) return res.status(500).json({ error: 'Stripe publishable key not configured.' });
  res.json({ publishableKey: key });
});

/* ─────────────────────────────────────────
   POST /api/create-checkout-session
   Creates a Stripe Checkout session and
   returns the session URL for redirect.
───────────────────────────────────────── */
app.post('/api/create-checkout-session', async (req, res) => {
  const priceId = req.body.priceId || process.env.STRIPE_PRICE_ID;
  const domain  = process.env.YOUR_DOMAIN || `http://localhost:${PORT}`;

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'STRIPE_SECRET_KEY not set in environment.' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price:    priceId,
          quantity: 1,
        },
      ],
      success_url: `${domain}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${domain}/?cancelled=true`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      subscription_data: {
        trial_period_days: 7,   // 7-day free trial
      },
    });

    res.json({ sessionId: session.id, url: session.url });

  } catch (err) {
    console.error('Stripe session error:', err);
    res.status(500).json({ error: err.message });
  }
});

/* ─────────────────────────────────────────
   POST /api/analyze
   Proxies requests to Anthropic API.
───────────────────────────────────────── */
app.post('/api/analyze', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) return res.status(400).json({ error: 'No prompt provided.' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set.' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 400,
        messages:   [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic error:', err);
      return res.status(response.status).json({ error: 'Upstream API error.' });
    }

    const data = await response.json();
    res.json({ text: data.content?.[0]?.text || '' });

  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Invest AI running at http://localhost:${PORT}`);
});

module.exports = app;
