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
const path      = require('path');
const fs        = require('fs');
const cron      = require('node-cron');
const Stripe    = require('stripe');
const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');
// Universe tickers for nightly cache — all 272 stocks
const UNIVERSE_TICKERS = [
  'TSLA','XIACF','RIVN','BIDU','UBER','LI','NIO','LCID','GOOS',
  'NVDA','AMD','ASML','MU','TSM','INTC','ARM','AVGO','QCOM','TXN','LRCX','KLAC','AMAT','ON','WOLF','SMCI','AMBA','ACLS','AEHR','ACMR',
  'CRWD','ZS','PANW','NET','S','CYBR','RBRK','QLYS','TENB',
  'NOW','CRM','SNOW','DDOG','MDB','HUBS','VEEV','WDAY','TTD','ZI','DOCN','AI','GTLB','MNDY','ASAN','FRSH','ZM','OKTA','BILL','PCTY','PAYC','ADSK','ANSS','INTU','TEAM','APPF','CWAN','BRZE','DOMO','CSGP','NCNO','PATH','CFLT','SUMO',
  'BABA','JD','FUTU','PDD','DRGN',
  'LVMUY','RACE','HESAY','PRDSY','CFRUY','WOW','TPR','RL','BRBY','EL','GOOS',
  'AAPL','MSFT','GOOGL','AMZN','META','V','MA','JPM','UNH','PG','KO','PEP','COST','IDXX','WST','ROP','MCO','SPGI','MSCI','ICE','NKE',
  'SBUX','MCD','YUM','DKNG','ELF','CELH','BROS','ONON','RBLX','ODD',
  'NU','AFRM','SOFI','HOOD','COIN','PYPL','SQ','FICO','CRCL','BMNR','IBKR','TOST','SKWD','RELY','FLUT',
  'VALE','GLD','SLV','FCX','NEM','WPM','RGLD','AG','RIO','AA','MP',
  'O','EPD','WPC','NNN','MAIN','ARCC','VZ','T','EPD',
  'NVO','LLY','HIMS','VKTX','AMGN','RYTM',
  'HROW','NTRA','PME','RXRX','GRAL','ISRG','ELV','UNH','DXCM','ABBV','EXAS','DOCS','PCVX',
  'MELI','GLOB','STNE','VIST',
  'GLD','SLV','NEM','WPM','RGLD',
  'PLTR','APP','CAVA','NFLX','DUOL','MNDY',
  'INTC','MU','WBD','CVS','PARA','OPEN','QXO','VFC','PTON','BIIB','PFE',
  'MSFT','GOOGL','AMZN','NOW','ADBE','CRM','ZS','PANW','BX','APO','KKR',
  'CRDO','ALAB','ANET','MRVL','CIEN','INFN',
  'LITE','COHR','GLW','AAOI','TSEM','PI',
  'ORCL','CRWV','APLD','CIFR','IREN','NBIS','CORZ',
  'GEV','VST','VRT','CEG','PWR','FSLR','NEE','AES','ENPH','PLUG','BKR',
  'META','RDDT','SNAP','PINS','SPOT',
  'SHOP','CPNG','PDD','GLBE','ETSY','SE','MELI',
  'V','MA','FIS','GPN','FOUR','PAYO','FISV','SQ','TOST',
  'ASTS','LUNR','RKLB','HII','LMT','RTX','NOC','KTOS','ACHR',
].filter((t, i, arr) => arr.indexOf(t) === i); // dedupe

const app    = express();
const PORT   = process.env.PORT || 3000;
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Supabase admin client (uses service_role key — full DB access, server only)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ─── Email transporter (Gmail SMTP) ──────────────────────────────────────────
const emailTransporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,     // your Gmail address
    pass: process.env.GMAIL_APP_PASS, // Gmail App Password (not your login password)
  }
});

const APP_URL = 'https://atharv248-stock.github.io/Invest-AI/index.html';
const FROM    = `"Invest AI" <${process.env.GMAIL_USER}>`;

// ── Helper: generate password reset link via Supabase admin ──────────────────
async function getPasswordResetLink(email) {
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: APP_URL }
  });
  if (error) throw new Error('Could not generate reset link: ' + error.message);
  return data.properties?.action_link || data.action_link;
}

// ── Helper: generate invite link (set password) via Supabase admin ────────────
async function getInviteLink(email) {
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'invite',
    email,
    options: { redirectTo: APP_URL }
  });
  if (error) {
    // Fall back to recovery link if user already exists
    return getPasswordResetLink(email);
  }
  return data.properties?.action_link || data.action_link;
}

// ═══════════════════════════════════════════════════════════
// EMAIL CASE 1: New user paid (no prior account) — set password + welcome
// ═══════════════════════════════════════════════════════════
async function sendNewPaidUserEmail(email) {
  const link = await getInviteLink(email);
  await emailTransporter.sendMail({
    from: FROM,
    to: email,
    subject: 'Your Invest AI Pro is ready — set your password 🚀',
    html: `
<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#0d1117;color:#e6edf3;border-radius:12px">
  <p style="font-size:18px;font-weight:700;color:#00e5a0;margin-bottom:20px">📈 Invest AI</p>
  <div style="background:#00e5a010;border:1px solid #00e5a030;border-radius:10px;padding:14px 18px;margin-bottom:20px">
    <div style="font-size:12px;color:#00e5a0;font-weight:700;margin-bottom:2px">✅ PAYMENT CONFIRMED</div>
    <div style="font-size:13px;color:#8b949e">Invest AI Pro · $4.99/mo · Active</div>
  </div>
  <h2 style="font-size:20px;font-weight:700;margin-bottom:8px">Welcome to Invest AI Pro!</h2>
  <p style="color:#8b949e;line-height:1.7;margin-bottom:24px">
    Thank you for your payment. Set a password below to activate your account and view your AI-powered stock portfolio anytime.
  </p>
  <a href="${link}" style="display:inline-block;background:#00e5a0;color:#051a10;font-weight:700;font-size:15px;padding:14px 28px;border-radius:10px;text-decoration:none;margin-bottom:16px">
    Set my password →
  </a>
  <p style="color:#8b949e;font-size:13px;line-height:1.6">After setting your password you'll be taken to the sign-in page. Log in to view your personalised AI portfolio.</p>
  <p style="color:#484f58;font-size:12px;margin-top:24px">This link expires in 24 hours. Didn't make this payment? Contact us immediately.</p>
</div>`
  });
  console.log(`📧 [Case 1] New paid user welcome email sent to ${email}`);
}

// ═══════════════════════════════════════════════════════════
// EMAIL CASE 2: Existing registered user just paid — welcome + login link
// ═══════════════════════════════════════════════════════════
async function sendExistingPaidUserEmail(email) {
  await emailTransporter.sendMail({
    from: FROM,
    to: email,
    subject: 'Your Invest AI Pro is active — log in to view your portfolio 🎉',
    html: `
<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#0d1117;color:#e6edf3;border-radius:12px">
  <p style="font-size:18px;font-weight:700;color:#00e5a0;margin-bottom:20px">📈 Invest AI</p>
  <div style="background:#00e5a010;border:1px solid #00e5a030;border-radius:10px;padding:14px 18px;margin-bottom:20px">
    <div style="font-size:12px;color:#00e5a0;font-weight:700;margin-bottom:2px">✅ PAYMENT CONFIRMED</div>
    <div style="font-size:13px;color:#8b949e">Invest AI Pro · $4.99/mo · Active</div>
  </div>
  <h2 style="font-size:20px;font-weight:700;margin-bottom:8px">Your AI portfolio is ready!</h2>
  <p style="color:#8b949e;line-height:1.7;margin-bottom:24px">
    Thank you for subscribing. Log in with your existing password to view your personalised AI stock picks.
  </p>
  <a href="${APP_URL}" style="display:inline-block;background:#00e5a0;color:#051a10;font-weight:700;font-size:15px;padding:14px 28px;border-radius:10px;text-decoration:none;margin-bottom:16px">
    Log in & view my portfolio →
  </a>
  <p style="color:#8b949e;font-size:13px;line-height:1.6">Sign in with your email and password at the link above. Your AI portfolio will be ready immediately.</p>
  <p style="color:#484f58;font-size:12px;margin-top:24px">Didn't make this payment? Contact us immediately.</p>
</div>`
  });
  console.log(`📧 [Case 2] Existing paid user welcome email sent to ${email}`);
}

// ═══════════════════════════════════════════════════════════
// EMAIL CASE 3: Reset password (forgot password flow)
// ═══════════════════════════════════════════════════════════
async function sendResetPasswordEmail(email) {
  const link = await getPasswordResetLink(email);
  await emailTransporter.sendMail({
    from: FROM,
    to: email,
    subject: 'Reset your Invest AI password',
    html: `
<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#0d1117;color:#e6edf3;border-radius:12px">
  <p style="font-size:18px;font-weight:700;color:#00e5a0;margin-bottom:20px">📈 Invest AI</p>
  <h2 style="font-size:20px;font-weight:700;margin-bottom:8px">Reset your password</h2>
  <p style="color:#8b949e;line-height:1.7;margin-bottom:24px">We received a request to reset your Invest AI password. Click below to choose a new one.</p>
  <a href="${link}" style="display:inline-block;background:#00e5a0;color:#051a10;font-weight:700;font-size:15px;padding:14px 28px;border-radius:10px;text-decoration:none;margin-bottom:24px">
    Reset my password →
  </a>
  <p style="color:#8b949e;font-size:13px;line-height:1.6">After resetting you'll be taken to the sign-in page.</p>
  <p style="color:#484f58;font-size:12px;margin-top:24px">This link expires in 1 hour. If you didn't request this, your account is safe — ignore this email.</p>
</div>`
  });
  console.log(`📧 [Case 3] Reset password email sent to ${email}`);
}

// ═══════════════════════════════════════════════════════════
// EMAIL CASE 4: New user signed up (no payment yet) — confirm email
// ═══════════════════════════════════════════════════════════
async function sendConfirmSignupEmail(email) {
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'signup',
    email,
    options: { redirectTo: APP_URL }
  });
  if (error) throw new Error('Could not generate confirmation link: ' + error.message);
  const link = data.properties?.action_link || data.action_link;

  await emailTransporter.sendMail({
    from: FROM,
    to: email,
    subject: 'Welcome to Invest AI — please confirm your email',
    html: `
<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#0d1117;color:#e6edf3;border-radius:12px">
  <p style="font-size:18px;font-weight:700;color:#00e5a0;margin-bottom:20px">📈 Invest AI</p>
  <h2 style="font-size:20px;font-weight:700;margin-bottom:8px">Welcome! Confirm your email</h2>
  <p style="color:#8b949e;line-height:1.7;margin-bottom:24px">
    Thanks for signing up. Click below to confirm your email address and activate your account.
    Once confirmed you can unlock your AI-powered stock portfolio for just $4.99/mo.
  </p>
  <a href="${link}" style="display:inline-block;background:#00e5a0;color:#051a10;font-weight:700;font-size:15px;padding:14px 28px;border-radius:10px;text-decoration:none;margin-bottom:24px">
    Confirm my email →
  </a>
  <p style="color:#8b949e;font-size:13px;line-height:1.6;margin-bottom:8px">After confirming you'll be taken to the sign-in page. Then visit the app to get started:</p>
  <a href="${APP_URL}" style="color:#00e5a0;font-size:13px">${APP_URL}</a>
  <p style="color:#484f58;font-size:12px;margin-top:24px">If you didn't create an account, ignore this email.</p>
</div>`
  });
  console.log(`📧 [Case 4] Confirm signup email sent to ${email}`);
}



// ─── Stripe webhook needs raw body BEFORE any other middleware ───────────────
app.use('/api/stripe-webhook', express.raw({ type: '*/*' }));

app.use(express.json());

// CORS — must be before all routes
app.use((req, res, next) => {
  const allowed = [
    'https://atharv248-stock.github.io',
    'http://localhost:3000',
    'http://localhost:5500',
    process.env.YOUR_DOMAIN,
  ].filter(Boolean);
  const origin = req.headers.origin;
  if (!origin || allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://atharv248-stock.github.io');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
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
  const { email, password, fromCheckout } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

  try {
    // At checkout: auto-confirm so user can log in immediately after payment
    // For regular signup: require email confirmation
    const emailConfirm = fromCheckout === true;

    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: emailConfirm,
    });

    if (createError) {
      if (createError.message.toLowerCase().includes('already') || createError.message.toLowerCase().includes('exists')) {
        return res.status(400).json({ error: 'An account with this email already exists. Please sign in.' });
      }
      return res.status(400).json({ error: createError.message });
    }

    if (fromCheckout) {
      // Checkout signup — user will get welcome email after payment, no confirm email needed yet
      console.log(`✅ Checkout user created (auto-confirmed): ${email}`);
      res.json({ message: 'Account created.', requiresVerification: false });
    } else {
      // Regular signup — send confirmation email
      await sendConfirmSignupEmail(email);
      console.log(`✅ Regular signup — confirmation email sent: ${email}`);
      res.json({ message: 'Account created! Please check your email to confirm before signing in.', requiresVerification: true });
    }

  } catch(e) {
    console.error('Signup error:', e.message);
    res.status(500).json({ error: 'Sign up failed. Please try again.' });
  }
});

// POST /api/auth/resend-verification
app.post('/api/auth/resend-verification', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required.' });
  try {
    await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email,
      options: { redirectTo: 'https://atharv248-stock.github.io/Invest-AI/index.html' }
    });
    res.json({ message: 'Verification email resent.' });
  } catch(e) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });

  const supabaseClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    console.warn(`Login failed for ${email}: ${error.message} (status: ${error.status})`);

    // If email not confirmed, auto-confirm via admin and retry
    if (error.message?.toLowerCase().includes('email not confirmed') ||
        error.message?.toLowerCase().includes('not confirmed')) {
      try {
        await supabaseAdmin.auth.admin.updateUserById(
          (await supabaseAdmin.auth.admin.listUsers()).data.users.find(u => u.email === email)?.id,
          { email_confirm: true }
        );
        // Retry login
        const retry = await supabaseClient.auth.signInWithPassword({ email, password });
        if (!retry.error) {
          console.log(`Auto-confirmed and logged in: ${email}`);
          return res.json({
            access_token:  retry.data.session.access_token,
            refresh_token: retry.data.session.refresh_token,
            expires_at:    retry.data.session.expires_at,
            user: { id: retry.data.user.id, email: retry.data.user.email },
          });
        }
      } catch(e) { console.warn('Auto-confirm failed:', e.message); }
    }

    return res.status(401).json({ error: 'Invalid email or password.' });
  }

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
  try {
    await sendResetPasswordEmail(email);  // Case 3: reset password email
  } catch(e) {
    console.warn('Forgot password email error:', e.message);
  }
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


/* ── Check subscription by email (no auth — for paywall email check) ── */
app.get('/api/check-email-subscription', async (req, res) => {
  const email = req.query.email;
  if (!email) return res.json({ subscribed: false });
  try {
    // Find user by email
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const user = users?.users?.find(u => u.email === email);
    if (!user) return res.json({ subscribed: false, exists: false });

    // Check subscription
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .select('status,current_period_end')
      .eq('user_id', user.id)
      .single();

    if (error || !data) return res.json({ subscribed: false, exists: true });

    const isActive = data.status === 'active' ||
      (data.status === 'trialing' && new Date(data.current_period_end) > new Date());

    res.json({ subscribed: isActive, exists: true, status: data.status });
  } catch(e) {
    console.error('check-email-subscription error:', e.message);
    res.json({ subscribed: false });
  }
});

/* ═══════════════════════════════════════════════════════════
   SUBSCRIPTION CHECK
═══════════════════════════════════════════════════════════ */
app.get('/api/subscription', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .select('status,plan,trial_end,current_period_end,cancel_at_period_end,stripe_customer_id,stripe_subscription_id')
    .eq('user_id', req.user.id)
    .single();

  if (error || !data) return res.json({ subscribed: false, status: 'none' });

  const now = new Date();
  const isActive = data.status === 'active'
    || (data.status === 'trialing' && new Date(data.trial_end) > now);

  res.json({ subscribed: isActive, ...data });
});

/* ── Direct subscription creation (used by checkout.html) ──────────── */
app.post('/api/create-subscription', async (req, res) => {
  const { paymentMethodId, email } = req.body;
  if (!paymentMethodId || !email) return res.status(400).json({ error: 'paymentMethodId and email required.' });

  try {
    // Get or create Stripe customer
    let customerId;
    const existing = await stripe.customers.list({ email, limit: 1 });
    if (existing.data.length > 0) {
      customerId = existing.data[0].id;
    } else {
      // Get user ID from auth header if present
      let supabaseUserId = null;
      const authHeader = req.headers.authorization;
      if (authHeader) {
        try {
          const token = authHeader.replace('Bearer ', '');
          const { data } = await supabaseAdmin.auth.getUser(token);
          supabaseUserId = data?.user?.id;
        } catch(e) {}
      }
      const customer = await stripe.customers.create({
        email,
        metadata: supabaseUserId ? { supabase_user_id: supabaseUserId } : {}
      });
      customerId = customer.id;
    }

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
    await stripe.customers.update(customerId, { invoice_settings: { default_payment_method: paymentMethodId } });

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer:   customerId,
      items:      [{ price: process.env.STRIPE_PRICE_ID }],
      expand:     ['latest_invoice.payment_intent'],
      payment_settings: { payment_method_types: ['card'], save_default_payment_method: 'on_subscription' },
    });

    const invoice       = subscription.latest_invoice;
    const paymentIntent = invoice.payment_intent;

    // If requires 3D Secure
    if (paymentIntent?.status === 'requires_action') {
      return res.json({ requiresAction: true, clientSecret: paymentIntent.client_secret });
    }

    // Payment succeeded — webhook will write to DB and send email
    // But also write immediately as fallback
    if (paymentIntent?.status === 'succeeded' || subscription.status === 'active') {
      let userId = null;
      const authHeader = req.headers.authorization;
      if (authHeader) {
        try {
          const token = authHeader.replace('Bearer ', '');
          const { data } = await supabaseAdmin.auth.getUser(token);
          userId = data?.user?.id;
        } catch(e) {}
      }
      if (!userId) {
        const { data: users } = await supabaseAdmin.auth.admin.listUsers();
        userId = users?.users?.find(u => u.email === email)?.id;
      }
      if (userId) {
        await supabaseAdmin.from('subscriptions').upsert({
          user_id: userId, stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          status: subscription.status, plan: 'pro',
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
        }, { onConflict: 'user_id' });
        await stripe.customers.update(customerId, { metadata: { supabase_user_id: userId } });
        console.log(`✅ Direct subscription created for ${email} (${userId})`);
      }
    }

    res.json({ success: true, subscriptionId: subscription.id, status: subscription.status });

  } catch(e) {
    console.error('create-subscription error:', e.message);
    res.status(500).json({ error: e.message });
  }
});


app.get('/api/sync-subscription', requireAuth, async (req, res) => {
  const sessionId = req.query.session_id;
  const userId    = req.user.id;

  try {
    let customerId, subscriptionId;

    if (sessionId) {
      // Get session from Stripe
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      customerId    = session.customer;
      subscriptionId = session.subscription;
    } else {
      // Try to find by existing customer record
      const { data: existing } = await supabaseAdmin
        .from('subscriptions')
        .select('stripe_customer_id,stripe_subscription_id')
        .eq('user_id', userId)
        .single();
      customerId     = existing?.stripe_customer_id;
      subscriptionId = existing?.stripe_subscription_id;
    }

    if (!customerId && !subscriptionId) {
      // Last resort: search Stripe by email
      const userRes = await supabaseAdmin.auth.admin.getUserById(userId);
      const email   = userRes?.data?.user?.email;
      if (email) {
        const customers = await stripe.customers.list({ email, limit: 1 });
        if (customers.data.length > 0) {
          customerId = customers.data[0].id;
          // Save userId to Stripe customer
          await stripe.customers.update(customerId, {
            metadata: { supabase_user_id: userId }
          });
          // Get their subscriptions
          const subs = await stripe.subscriptions.list({ customer: customerId, status: 'active', limit: 1 });
          if (subs.data.length > 0) subscriptionId = subs.data[0].id;
        }
      }
    }

    if (!subscriptionId) {
      return res.json({ synced: false, message: 'No active subscription found in Stripe' });
    }

    const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
    const { error } = await supabaseAdmin.from('subscriptions').upsert({
      user_id:                userId,
      stripe_customer_id:     customerId || stripeSub.customer,
      stripe_subscription_id: subscriptionId,
      status:                 stripeSub.status,
      plan:                   'pro',
      current_period_end:     new Date(stripeSub.current_period_end * 1000).toISOString(),
      cancel_at_period_end:   stripeSub.cancel_at_period_end,
    }, { onConflict: 'user_id' });

    if (error) {
      console.error('sync-subscription error:', error.message);
      return res.json({ synced: false, error: error.message });
    }

    console.log(`✅ Synced subscription for user ${userId} — status: ${stripeSub.status}`);
    res.json({ synced: true, status: stripeSub.status, subscribed: stripeSub.status === 'active' });

  } catch (err) {
    console.error('sync-subscription error:', err.message);
    res.json({ synced: false, error: err.message });
  }
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
  const domain  = 'https://atharv248-stock.github.io/Invest-AI';
  const profile = req.body.profile || {};

  try {
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

    // Encode profile in success URL so it survives cross-browser redirects
    const profileParam = profile.income
      ? '&p=' + encodeURIComponent(btoa(JSON.stringify(profile)))
      : '';

    const session = await stripe.checkout.sessions.create({
      customer:              customerId,
      mode:                  'subscription',
      line_items:            [{ price: priceId, quantity: 1 }],
      success_url:           `${domain}/success.html?session_id={CHECKOUT_SESSION_ID}${profileParam}`,
      cancel_url:            `${domain}/index.html`,
      allow_promotion_codes: true,
      subscription_data:     {},
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

  // Always respond 200 quickly to prevent Stripe retries causing 502s
  // Process async after responding
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    // Return 200 anyway so Stripe doesn't keep retrying with bad signature
    // The real fix is to update STRIPE_WEBHOOK_SECRET in Railway
    return res.status(200).json({ received: true, warning: 'signature_failed' });
  }

  // Respond immediately, process async
  res.json({ received: true });

  try {
    const obj = event.data.object;
    console.log(`📨 Webhook: ${event.type}`);

    switch (event.type) {

      // ── Payment completed via Stripe Checkout (Apple Pay, card, etc) ──
      case 'checkout.session.completed': {
        if (obj.mode !== 'subscription') break;
        const customerId    = obj.customer;
        const subscriptionId = obj.subscription;
        // Try all possible email fields — Apple Pay populates differently
        const customerEmail = obj.customer_details?.email
                           || obj.customer_email
                           || obj.customer_details?.name; // sometimes name has email
        if (!customerId || !subscriptionId) break;

        const stripeSub  = await stripe.subscriptions.retrieve(subscriptionId);
        const customer   = await stripe.customers.retrieve(customerId);
        // Get email from customer object as final fallback
        const email      = customerEmail || customer.email;

        console.log(`✅ checkout.session.completed
  customer:  ${customerId}
  sub:       ${subscriptionId}
  email src: customer_details=${obj.customer_details?.email} | customer_email=${obj.customer_email} | customer.email=${customer.email}
  resolved:  ${email}`);

        let userId    = customer.metadata?.supabase_user_id;
        let isNewUser = false;

        // Step 1: Find or create Supabase user by email
        if (!userId && email) {
          console.log(`🔍 Looking up Supabase user by email: ${email}`);
          const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
          const existing = userList?.users?.find(u => u.email === email);

          if (existing) {
            userId = existing.id;
            console.log(`✅ Found existing user: ${userId}`);
          } else {
            isNewUser = true;
            // New user — create Supabase account with temp password
            const tempPw = 'InvAI_' + Math.random().toString(36).slice(2, 12) + '!';
            const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
              email,
              password: tempPw,
              email_confirm: true,
            });
            if (createErr) {
              console.error(`❌ Failed to create user for ${email}:`, createErr.message);
            } else {
              userId = newUser.user.id;
              console.log(`✅ Created new Supabase user: ${userId} for ${email}`);
            }
          }

          // Save userId to Stripe customer metadata
          if (userId) {
            await stripe.customers.update(customerId, {
              metadata: { supabase_user_id: userId }
            });
          }
        }

        if (!userId) {
          console.error(`❌ Could not resolve Supabase user for ${email}`);
          break;
        }

        // Step 2: Write subscription to DB
        const { error: upsertErr } = await supabaseAdmin.from('subscriptions').upsert({
          user_id:                userId,
          stripe_customer_id:     customerId,
          stripe_subscription_id: subscriptionId,
          status:                 stripeSub.status,
          plan:                   'pro',
          current_period_end:     new Date(stripeSub.current_period_end * 1000).toISOString(),
          cancel_at_period_end:   stripeSub.cancel_at_period_end,
        }, { onConflict: 'user_id' });

        if (upsertErr) {
          console.error(`❌ Supabase upsert error:`, upsertErr.message);
        } else {
          console.log(`✅ Subscription written to DB for user ${userId}`);
        }

        // Step 3: Send correct email — Case 1 (new user) or Case 2 (existing user)
        if (email && !email.includes('privaterelay')) {
          try {
            if (isNewUser) {
              await sendNewPaidUserEmail(email);       // Case 1: set password welcome
            } else {
              await sendExistingPaidUserEmail(email);  // Case 2: login welcome
            }
          } catch(e) {
            console.error(`❌ Email failed for ${email}: ${e.message}`);
          }
        }
        break;
      }

      // ── Subscription created or updated (recurring billing) ──
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const customerId = obj.customer;
        const customer = await stripe.customers.retrieve(customerId);
        let userId = customer.metadata?.supabase_user_id;

        // Fallback: find by email
        if (!userId && customer.email) {
          const { data: users } = await supabaseAdmin.auth.admin.listUsers();
          const match = users?.users?.find(u => u.email === customer.email);
          if (match) {
            userId = match.id;
            await stripe.customers.update(customerId, {
              metadata: { supabase_user_id: userId }
            });
          }
        }

        if (!userId) {
          console.error(`❌ No user found for customer ${customerId}`);
          break;
        }

        const { error } = await supabaseAdmin.from('subscriptions').upsert({
          user_id:                userId,
          stripe_customer_id:     customerId,
          stripe_subscription_id: obj.id,
          status:                 obj.status,
          plan:                   'pro',
          trial_end:              obj.trial_end ? new Date(obj.trial_end * 1000).toISOString() : null,
          current_period_end:     new Date(obj.current_period_end * 1000).toISOString(),
          cancel_at_period_end:   obj.cancel_at_period_end,
        }, { onConflict: 'user_id' });

        if (error) console.error(`❌ Supabase upsert error:`, error.message);
        else console.log(`✅ Subscription ${event.type} for user ${userId} — status: ${obj.status}`);
        break;
      }

      // ── Subscription cancelled ──
      case 'customer.subscription.deleted': {
        const { error } = await supabaseAdmin.from('subscriptions')
          .update({ status: 'canceled', cancel_at_period_end: true })
          .eq('stripe_subscription_id', obj.id);
        if (error) console.error(`❌ Cancel error:`, error.message);
        else console.log(`✅ Subscription canceled: ${obj.id}`);
        break;
      }

      // ── Invoice paid — renew subscription period ──
      case 'invoice.paid': {
        const subscriptionId = obj.subscription;
        if (!subscriptionId) break;
        const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
        const { error } = await supabaseAdmin.from('subscriptions')
          .update({
            status: 'active',
            current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
          })
          .eq('stripe_subscription_id', subscriptionId);
        if (error) console.error(`❌ Invoice paid update error:`, error.message);
        else console.log(`✅ Subscription renewed: ${subscriptionId}`);
        break;
      }

      // ── Payment failed ──
      case 'invoice.payment_failed': {
        const subscriptionId = obj.subscription;
        if (!subscriptionId) break;
        await supabaseAdmin.from('subscriptions')
          .update({ status: 'past_due' })
          .eq('stripe_subscription_id', subscriptionId);
        console.log(`⚠️ Payment failed for subscription: ${subscriptionId}`);
        break;
      }

      default:
        console.log(`ℹ️ Unhandled webhook: ${event.type}`);
    }
  } catch (err) {
    console.error(`❌ Webhook processing error for ${event?.type}:`, err.message);
  }
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
  console.log('🔄 Starting nightly valuation + bull/bear batch...');

  // Chunks of 10 (smaller to fit bull/bear in token budget)
  const allTickers = UNIVERSE_TICKERS;
  const chunks = [];
  for (let i = 0; i < allTickers.length; i += 10) {
    chunks.push(allTickers.slice(i, i + 10));
  }

  const allStocks = {};
  let marketNote = '';

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`🔄 Chunk ${i+1}/${chunks.length}: ${chunk.join(', ')}`);

    const prompt = `You are a senior equity analyst at a top-tier hedge fund. Date: ${new Date().toLocaleDateString()}.

Analyze these tickers with COMPLETELY BALANCED bull and bear cases. Be specific and data-driven. The bear case must be as compelling as the bull case — no promotional bias.

Tickers: ${chunk.join(', ')}

Rules:
- status: "cheap" if >15% below 5yr avg multiple, "fair" if within 15%, "expensive" if >20% above
- metric: current multiple e.g. "P/E 14x" or "PEG 1.4" or "EV/EBITDA 8x"
- valNote: max 8 words explaining valuation
- why: max 25 words balanced investment thesis (not one-sided)
- bull: exactly 3 specific bullish points WITH data/numbers (not vague)
- bear: exactly 3 specific bearish risks WITH data/numbers (brutally honest)
- pills: exactly 4 items alternating [label, colorClass, label, colorClass]. Colors: pg=green pb=blue py=gold pp=purple pr=red

Return ONLY this JSON (no other text, no markdown):
{"marketNote":"one sentence on current market","stocks":{"TICKER":{"status":"cheap|fair|expensive","metric":"X","valNote":"X","why":"X","bull":["point1","point2","point3"],"bear":["risk1","risk2","risk3"],"pills":["l1","pg","l2","pb"]}}}`;

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
          max_tokens: 6000,
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
      // Add updatedAt timestamp to each stock
      const stocks = parsed.stocks || {};
      Object.keys(stocks).forEach(t => {
        stocks[t].updatedAt = new Date().toISOString();
      });
      Object.assign(allStocks, stocks);
      if (!marketNote && parsed.marketNote) marketNote = parsed.marketNote;

      console.log(`✅ Chunk ${i+1} done — ${Object.keys(stocks).length} stocks`);

      // 2s delay between chunks to avoid rate limits
      if (i < chunks.length - 1) await new Promise(r => setTimeout(r, 2000));

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

/* ── Admin: manually fix subscription for a user by email ── */
app.post('/api/admin/fix-subscription', async (req, res) => {
  const secret = req.headers['x-admin-secret'] || req.query.secret;
  if (secret !== process.env.CACHE_ADMIN_SECRET) return res.status(401).json({ error: 'Unauthorized.' });

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });

  try {
    // Find Supabase user
    const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
    let user = userList?.users?.find(u => u.email === email);

    // Create if not found
    if (!user) {
      const tempPw = 'InvAI_' + Math.random().toString(36).slice(2, 12) + '!';
      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email, password: tempPw, email_confirm: true,
      });
      if (createErr) return res.status(500).json({ error: createErr.message });
      user = newUser.user;
      console.log(`✅ Created user for ${email}: ${user.id}`);
    }

    // Find Stripe customer by email
    const customers = await stripe.customers.list({ email, limit: 1 });
    const customer  = customers.data[0];
    if (!customer) return res.status(404).json({ error: `No Stripe customer found for ${email}` });

    // Find their subscription
    const subs = await stripe.subscriptions.list({ customer: customer.id, limit: 1 });
    const sub  = subs.data[0];
    if (!sub) return res.status(404).json({ error: `No Stripe subscription found for ${email}` });

    // Write to Supabase
    const { error: upsertErr } = await supabaseAdmin.from('subscriptions').upsert({
      user_id:                user.id,
      stripe_customer_id:     customer.id,
      stripe_subscription_id: sub.id,
      status:                 sub.status,
      plan:                   'pro',
      current_period_end:     new Date(sub.current_period_end * 1000).toISOString(),
      cancel_at_period_end:   sub.cancel_at_period_end,
    }, { onConflict: 'user_id' });

    if (upsertErr) return res.status(500).json({ error: upsertErr.message });

    // Update Stripe metadata
    await stripe.customers.update(customer.id, { metadata: { supabase_user_id: user.id } });

    // Send password setup email
    const { createClient } = require('@supabase/supabase-js');
    const supabaseClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://atharv248-stock.github.io/Invest-AI/index.html',
    });

    console.log(`✅ Admin fix complete for ${email}`);
    res.json({ success: true, userId: user.id, status: sub.status, message: `Password email sent to ${email}` });
  } catch(e) {
    console.error('Admin fix error:', e.message);
    res.status(500).json({ error: e.message });
  }
});


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
