# 📈 Invest AI

> AI-powered personal finance advisor — get a personalized 3-step investment roadmap in seconds.

Built with vanilla HTML/CSS/JS on the frontend and Node.js + Express on the backend. Powered by [Claude](https://anthropic.com) (claude-sonnet-4).

---

## ✨ Features

| Step | Feature |
|------|---------|
| **1 — Finance Basics** | AI-generated analysis of your income, expenses, and goals with 3 actionable tips |
| **2 — Compounding Calculator** | Interactive sliders showing projected portfolio value + investing options (index funds, ETFs, dividend stocks, crypto) |
| **3 — AI Stock Picks** | Paywall — personalized stock recommendations based on your goals and risk tolerance |

---

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 18
- An [Anthropic API key](https://console.anthropic.com)

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/invest-ai.git
cd invest-ai
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
```bash
cp .env.example .env
```

Open `.env` and add your Anthropic API key:
```
ANTHROPIC_API_KEY=your_key_here
```

### 4. Run the app
```bash
npm start
```

Visit [http://localhost:3000](http://localhost:3000)

For development with auto-reload:
```bash
npm run dev
```

---

## 📁 Project Structure

```
invest-ai/
├── index.html          # Main HTML — all screens
├── src/
│   ├── styles.css      # All styles (dark fintech theme)
│   └── app.js          # Frontend logic (form, calculator, AI call)
├── api/
│   └── proxy.js        # Express backend — proxies Anthropic API safely
├── .env.example        # Environment variable template
├── .gitignore
├── package.json
└── README.md
```

---

## 🔐 Security

**Never put your Anthropic API key in client-side JavaScript.**

All API calls go through the `/api/analyze` backend proxy (`api/proxy.js`), which reads the key from the server-side `.env` file. The frontend only calls your own server.

---

## 💳 Enabling the Paywall (Step 3)

The paywall UI is ready — you just need to wire up Stripe.

1. Create a [Stripe account](https://stripe.com) and get your keys
2. Add to `.env`:
   ```
   STRIPE_PUBLISHABLE_KEY=pk_live_...
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_PRICE_ID=price_...
   ```
3. In `src/app.js`, replace `handleUnlock()` with:
   ```js
   async function handleUnlock() {
     const stripe = Stripe(process.env.STRIPE_PUBLISHABLE_KEY);
     const res = await fetch('/api/create-checkout-session', { method: 'POST' });
     const { sessionId } = await res.json();
     stripe.redirectToCheckout({ sessionId });
   }
   ```
4. Add a `/api/create-checkout-session` route in `api/proxy.js` using `stripe.checkout.sessions.create()`

---

## ☁️ Deploying

### Option A — Railway (easiest)
1. Push to GitHub
2. Connect repo at [railway.app](https://railway.app)
3. Add `ANTHROPIC_API_KEY` as an environment variable in Railway dashboard
4. Deploy

### Option B — Render
1. Push to GitHub
2. Create a new Web Service at [render.com](https://render.com)
3. Set Build Command: `npm install`
4. Set Start Command: `npm start`
5. Add environment variable `ANTHROPIC_API_KEY`

### Option C — Vercel (serverless)
Convert `api/proxy.js` to a Vercel serverless function at `api/analyze.js` — the route already matches.

---

## 🛠 Customisation

| What | Where |
|------|-------|
| Colors / theme | `src/styles.css` — edit CSS variables at `:root` |
| AI prompt | `src/app.js` → `fetchAIPlan()` |
| Pricing copy | `index.html` → Step 3 panel |
| Investing options | `index.html` → `.invest-options` section |
| Monthly price | `index.html` → `.btn-unlock` text |

---

## 📄 License

MIT — free to use, modify, and deploy.

---

*Built with ❤️ and Claude AI*
