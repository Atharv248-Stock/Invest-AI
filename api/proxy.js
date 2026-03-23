/**
 * Invest AI — api/proxy.js  (Production)
 *
 * Routes:
 *  POST /api/analyze                  → Anthropic AI financial analysis
 *  POST /api/create-checkout-session  → Stripe subscription checkout
 *  POST /api/stripe-webhook           → Stripe webhook (subscription events)
 *  GET  /api/stripe-key               → Publishable key for frontend
 *  GET  /api/stock-cache              → Nightly-cached stock valuations
 *  POST /api/run-cache                → Admin: trigger cache refresh
 *
 *  POST /api/auth/signup              → Create account (email + password)
 *  POST /api/auth/login               → Sign in, returns JWT
 *  POST /api/auth/logout              → Invalidate session
 *  POST /api/auth/refresh             → Refresh JWT token
 *  POST /api/auth/forgot-password     → Send reset email
 *  DELETE /api/auth/delete-account    → GDPR data deletion
 *
 *  GET  /api/profile                  → Load user profile
 *  PUT  /api/profile                  → Save / update user profile
 *  GET  /api/portfolios               → Load user's portfolio history
 *  POST /api/portfolios               → Save generated portfolio
 *  GET  /api/subscription             → Check subscription status
 *
 * .env variables required:
 *   ANTHROPIC_API_KEY=sk-ant-...
 *   STRIPE_SECRET_KEY=sk_live_...
 *   STRIPE_PUBLISHABLE_KEY=pk_live_...
 *   STRIPE_PRICE_ID=price_...
 *   STRIPE_WEBHOOK_SECRET=whsec_...
 *   YOUR_DOMAIN=https://your-app.railway.app
 *   CACHE_ADMIN_SECRET=some_secret_string
 *   SUPABASE_URL=https://xxxx.supabase.co
 *   SUPABASE_SERVICE_KEY=eyJhbGc...  (service_role key — never expose to client)
 *   SUPABASE_ANON_KEY=eyJhbGc...    (anon key — safe for client)
 *
 * Install:
 *   npm install express cors dotenv stripe node-cron @supabase/supabase-js
 */
 
require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const path      = require('path');
const fs        = require('fs');
const cron      = require('node-cron');
const Stripe    = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const { UNIVERSE } = require('../src/universe.js');
 
const app    = express();
const PORT   = process.env.PORT || 3000;
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
 
// Supabase admin client (uses service_role key — full DB access, server only)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
 
// ─── Stripe webhook needs raw body ───────────────────────────────────────────
app.use('/api/stripe-webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(cors({
  origin: [
    'https://atharv248-stock.github.io',
    'http://localhost:3000',
    'http://localhost:5500',
    process.env.YOUR_DOMAIN,
  ].filter(Boolean),
  credentials: true,
}));
app.use(express.static(path.join(__dirname, '..')));
 
/* ═══════════════════════════════════════════════════════════
   AUTH MIDDLEWARE
   Validates the Supabase JWT on protected routes.
   Attaches req.user = { id, email } if valid.
═══════════════════════════════════════════════════════════ */
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header.' });
  }
  const token = authHeader.split(' ')[1];
  try {
    // Use Supabase to validate the JWT
    const supabaseUser = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    const { data: { user }, error } = await supabaseUser.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Invalid or expired token.' });
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token validation failed.' });
  }
}
 
/* ═══════════════════════════════════════════════════════════
   AUTH ROUTES
═══════════════════════════════════════════════════════════ */
 
// POST /api/auth/signup
app.post('/api/auth/signup', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
 
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,  // auto-confirm so user can login immediately
  });
 
  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Account created.' });
});
 
// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });
 
  // Use Supabase client auth (never handle raw passwords — Supabase does bcrypt)
  const supabaseClient = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json({ error: 'Invalid email or password.' });
 
  res.json({
    access_token:  data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at:    data.session.expires_at,
    user: { id: data.user.id, email: data.user.email },
  });
});
 
// POST /api/auth/refresh
app.post('/api/auth/refresh', async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) return res.status(400).json({ error: 'refresh_token required.' });
 
  const supabaseClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  const { data, error } = await supabaseClient.auth.refreshSession({ refresh_token });
  if (error) return res.status(401).json({ error: 'Could not refresh session.' });
 
  res.json({
    access_token:  data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at:    data.session.expires_at,
  });
});
 
// POST /api/auth/forgot-password
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required.' });
 
  const supabaseClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  await supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.YOUR_DOMAIN}/reset-password.html`,
  });
  // Always return success to prevent email enumeration
  res.json({ message: 'If that email exists, a reset link has been sent.' });
});
 
// DELETE /api/auth/delete-account  (GDPR + App Store requirement)
app.delete('/api/auth/delete-account', requireAuth, async (req, res) => {
  const userId = req.user.id;
  try {
    // Cancel Stripe subscription if active
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', userId)
      .single();
 
    if (sub?.stripe_subscription_id) {
      await stripe.subscriptions.cancel(sub.stripe_subscription_id);
    }
 
    // Delete from Supabase (cascades to profiles, portfolios, subscriptions)
    await supabaseAdmin.auth.admin.deleteUser(userId);
    res.json({ message: 'Account and all associated data deleted.' });
  } catch (e) {
    console.error('Delete account error:', e);
    res.status(500).json({ error: 'Could not delete account. Please contact support.' });
  }
});
 
/* ═══════════════════════════════════════════════════════════
   PROFILE ROUTES
═══════════════════════════════════════════════════════════ */
 
// GET /api/profile
app.get('/api/profile', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('user_id', req.user.id)
    .single();
 
  if (error && error.code !== 'PGRST116') {
    return res.status(500).json({ error: 'Could not load profile.' });
  }
  res.json({ profile: data || null });
});
 
// PUT /api/profile  (upsert)
app.put('/api/profile', requireAuth, async (req, res) => {
  const allowed = ['age','income','expenses','savings','goal_short','goal_long',
                   'risk_tier','interests','income_range','income_min','income_max',
                   'expenses_range','expenses_min','expenses_max',
                   'savings_range','savings_min','savings_max'];
  const update = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
 
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .upsert({ user_id: req.user.id, ...update }, { onConflict: 'user_id' })
    .select()
    .single();
 
  if (error) return res.status(500).json({ error: 'Could not save profile.' });
  res.json({ profile: data });
});
 
/* ═══════════════════════════════════════════════════════════
   PORTFOLIO ROUTES
═══════════════════════════════════════════════════════════ */
 
// GET /api/portfolios  (returns last 5)
app.get('/api/portfolios', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('portfolios')
    .select('*')
    .eq('user_id', req.user.id)
    .order('generated_at', { ascending: false })
    .limit(5);
 
  if (error) return res.status(500).json({ error: 'Could not load portfolios.' });
  res.json({ portfolios: data });
});
 
// POST /api/portfolios  (save generated portfolio)
app.post('/api/portfolios', requireAuth, async (req, res) => {
  const { tier, age_bracket, interests, strategy_text, risk_score,
          allocation, picks, cat_summary, monthly_invest } = req.body;
 
  const { data, error } = await supabaseAdmin
    .from('portfolios')
    .insert({
      user_id:        req.user.id,
      tier, age_bracket, interests,
      strategy_text, risk_score,
      allocation:     JSON.stringify(allocation),
      picks:          JSON.stringify(picks),
      cat_summary:    JSON.stringify(cat_summary),
      monthly_invest,
    })
    .select()
    .single();
 
  if (error) return res.status(500).json({ error: 'Could not save portfolio.' });
  res.json({ portfolio: data });
});
 
/* ═══════════════════════════════════════════════════════════
   SUBSCRIPTION CHECK
═══════════════════════════════════════════════════════════ */
app.get('/api/subscription', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .select('status,plan,trial_end,current_period_end,cancel_at_period_end')
    .eq('user_id', req.user.id)
    .single();
 
  if (error || !data) return res.json({ subscribed: false, status: 'none' });
 
  const now = new Date();
  const isActive = data.status === 'active'
    || (data.status === 'trialing' && new Date(data.trial_end) > now);
 
  res.json({ subscribed: isActive, ...data });
});
 
/* ═══════════════════════════════════════════════════════════
   STRIPE CHECKOUT
═══════════════════════════════════════════════════════════ */
app.get('/api/stripe-key', (req, res) => {
  const key = process.env.STRIPE_PUBLISHABLE_KEY;
  if (!key) return res.status(500).json({ error: 'Stripe not configured.' });
  res.json({ publishableKey: key });
});
 
app.post('/api/create-checkout-session', requireAuth, async (req, res) => {
  const priceId = req.body.priceId || process.env.STRIPE_PRICE_ID;
  const domain  = process.env.YOUR_DOMAIN || `http://localhost:${PORT}`;
 
  try {
    // Get or create Stripe customer linked to this user
    let customerId;
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', req.user.id)
      .single();
 
    if (sub?.stripe_customer_id) {
      customerId = sub.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email:    req.user.email,
        metadata: { supabase_user_id: req.user.id },
      });
      customerId = customer.id;
    }
 
    const session = await stripe.checkout.sessions.create({
      customer:             customerId,
      mode:                 'subscription',
      line_items:           [{ price: priceId, quantity: 1 }],
      success_url:          `${domain}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:           `${domain}/?cancelled=true`,
      allow_promotion_codes: true,
      payment_method_types: ['card', 'apple_pay', 'google_pay'],
      subscription_data:    {},
    });
 
    res.json({ sessionId: session.id, url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    res.status(500).json({ error: err.message });
  }
});
 
/* ═══════════════════════════════════════════════════════════
   STRIPE WEBHOOK
   Keeps subscription table in sync with Stripe events.
   Set webhook URL in Stripe dashboard:
   https://dashboard.stripe.com/webhooks
   → Add endpoint: https://your-app.railway.app/api/stripe-webhook
   → Events: customer.subscription.*
═══════════════════════════════════════════════════════════ */
app.post('/api/stripe-webhook', async (req, res) => {
  const sig    = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
 
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).json({ error: 'Webhook signature invalid.' });
  }
 
  const sub = event.data.object;
 
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      // Find Supabase user by Stripe customer ID
      const customer = await stripe.customers.retrieve(sub.customer);
      const userId   = customer.metadata?.supabase_user_id;
      if (!userId) break;
 
      await supabaseAdmin.from('subscriptions').upsert({
        user_id:                userId,
        stripe_customer_id:     sub.customer,
        stripe_subscription_id: sub.id,
        status:                 sub.status,
        trial_end:              sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
        current_period_end:     new Date(sub.current_period_end * 1000).toISOString(),
        cancel_at_period_end:   sub.cancel_at_period_end,
      }, { onConflict: 'user_id' });
      break;
    }
    case 'customer.subscription.deleted': {
      await supabaseAdmin.from('subscriptions')
        .update({ status: 'canceled' })
        .eq('stripe_subscription_id', sub.id);
      break;
    }
  }
 
  res.json({ received: true });
});
 
/* ═══════════════════════════════════════════════════════════
   ANTHROPIC AI PROXY
═══════════════════════════════════════════════════════════ */
app.post('/api/analyze', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'No prompt.' });
 
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
        model:    'claude-sonnet-4-20250514',
        max_tokens: 400,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!response.ok) return res.status(response.status).json({ error: 'Upstream error.' });
    const data = await response.json();
    res.json({ text: data.content?.[0]?.text || '' });
  } catch (err) {
    res.status(500).json({ error: 'Internal error.' });
  }
});
 
/* ═══════════════════════════════════════════════════════════
   NIGHTLY VALUATION CACHE
═══════════════════════════════════════════════════════════ */
const CACHE_FILE = path.join(__dirname, 'cache.json');
let valuationCache = { lastUpdated: null, stocks: {}, marketNote: '' };
 
function loadCacheFromDisk() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      valuationCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      console.log(`✅ Cache loaded. Last updated: ${valuationCache.lastUpdated}`);
    }
  } catch (e) { console.warn('Cache load error:', e.message); }
}
 
function saveCacheToDisk() {
  try { fs.writeFileSync(CACHE_FILE, JSON.stringify(valuationCache, null, 2)); }
  catch (e) { console.warn('Cache save error:', e.message); }
}
 
async function runValuationBatch() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.error('❌ No ANTHROPIC_API_KEY'); return; }
  console.log('🔄 Starting nightly valuation batch...');
 
  // Small chunks of 15 to stay well within token limits
  const allTickers = UNIVERSE.map(s => s.t);
  const chunks = [];
  for (let i = 0; i < allTickers.length; i += 15) {
    chunks.push(allTickers.slice(i, i + 15));
  }
 
  const allStocks = {};
  let marketNote = '';
 
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`🔄 Chunk ${i+1}/${chunks.length}: ${chunk.join(', ')}`);
 
    const prompt = `Valuation analyst. Date: ${new Date().toLocaleDateString()}.
 
For each ticker, return current valuation status. Use today's approximate market prices.
 
Tickers: ${chunk.join(', ')}
 
Rules:
- status: "cheap" if >15% below 5yr avg multiple, "fair" if within 15%, "expensive" if >20% above
- metric: current multiple e.g. "P/E 14x" or "PEG 1.4"
- valNote: max 8 words explaining valuation
- why: max 20 words investment thesis
- pills: exactly 4 items alternating [label, colorClass, label, colorClass]. Colors: pg=green pb=blue py=gold pp=purple pr=red
 
Return ONLY this JSON, nothing else:
{"marketNote":"one sentence","stocks":{"TICKER":{"status":"cheap|fair|expensive","metric":"X","valNote":"X","why":"X","pills":["l1","pg","l2","pb"]}}}`;
 
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
          max_tokens: 4000,
          messages:   [{ role: 'user', content: prompt }],
        }),
      });
 
      if (!response.ok) {
        const errText = await response.text();
        console.error(`❌ Chunk ${i+1} API error ${response.status}:`, errText);
        continue;
      }
 
      const data = await response.json();
      const rawText = (data.content?.[0]?.text || '').trim();
 
      // Extract JSON even if there's any surrounding text
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error(`❌ Chunk ${i+1} no JSON found. Raw:`, rawText.substring(0, 200));
        continue;
      }
 
      const parsed = JSON.parse(jsonMatch[0]);
      Object.assign(allStocks, parsed.stocks || {});
      if (!marketNote && parsed.marketNote) marketNote = parsed.marketNote;
 
      console.log(`✅ Chunk ${i+1} done — ${Object.keys(parsed.stocks||{}).length} stocks`);
 
      // 1.5s delay between chunks
      if (i < chunks.length - 1) await new Promise(r => setTimeout(r, 1500));
 
    } catch (err) {
      console.error(`❌ Chunk ${i+1} failed:`, err.message);
    }
  }
 
  if (Object.keys(allStocks).length > 0) {
    valuationCache = {
      lastUpdated: new Date().toISOString(),
      marketNote:  marketNote || 'Market data updated.',
      stocks:      allStocks,
    };
    saveCacheToDisk();
    console.log(`✅ Batch complete — ${Object.keys(allStocks).length} stocks cached.`);
  } else {
    console.error('❌ Batch produced no results.');
  }
}
 
cron.schedule('0 23 * * *', runValuationBatch, { timezone: 'UTC' });
 
app.get('/api/stock-cache', (req, res) => {
  res.json({
    lastUpdated: valuationCache.lastUpdated,
    marketNote:  valuationCache.marketNote,
    stocks:      valuationCache.stocks,
    stale:       !valuationCache.lastUpdated || (Date.now() - new Date(valuationCache.lastUpdated).getTime()) > 1000*60*60*26,
  });
});
 
app.get('/api/run-cache', async (req, res) => {
  const secret = req.headers['x-admin-secret'] || req.query.secret;
  if (secret !== process.env.CACHE_ADMIN_SECRET) return res.status(401).json({ error: 'Unauthorized.' });
  res.json({ message: 'Cache refresh started.' });
  runValuationBatch();
});
 
app.post('/api/run-cache', async (req, res) => {
  const secret = req.headers['x-admin-secret'] || req.query.secret;
  if (secret !== process.env.CACHE_ADMIN_SECRET) return res.status(401).json({ error: 'Unauthorized.' });
  res.json({ message: 'Cache refresh started.' });
  runValuationBatch();
});
 
/* ═══════════════════════════════════════════════════════════
   STARTUP
═══════════════════════════════════════════════════════════ */
app.listen(PORT, () => {
  console.log(`✅ Invest AI running at http://localhost:${PORT}`);
  loadCacheFromDisk();
  const cacheAge = valuationCache.lastUpdated
    ? Date.now() - new Date(valuationCache.lastUpdated).getTime()
    : Infinity;
  if (cacheAge > 1000*60*60*24) {
    console.log('🔄 Cache stale — running initial batch...');
    setTimeout(runValuationBatch, 3000);
  }
});
 
module.exports = app;
