/**
 * Invest AI — app.js
 * Main application logic
 *
 * IMPORTANT: The Anthropic API key must be handled via a backend proxy.
 * See api/proxy.js for a Node.js/Express example.
 * Never expose your API key in client-side code.
 */

// ─────────────────────────────────────────
// CONFIG — update this to point to your proxy
// ─────────────────────────────────────────
const API_ENDPOINT = '/api/analyze'; // Your backend proxy endpoint

// ─────────────────────────────────────────
// STATE
// ─────────────────────────────────────────
let userData = {};

// ─────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────
function fmt(n) {
  return '$' + Math.round(n).toLocaleString();
}

// ─────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────
function goBack() {
  document.getElementById('s-plan').classList.remove('active');
  document.getElementById('s-input').classList.add('active');
  switchTab(0);
}

function switchTab(idx) {
  document.querySelectorAll('.step-tab').forEach((t, i) =>
    t.classList.toggle('active', i === idx)
  );
  document.querySelectorAll('.step-panel').forEach((p, i) =>
    p.classList.toggle('active', i === idx)
  );
}

// ─────────────────────────────────────────
// FORM SUBMISSION
// ─────────────────────────────────────────
function generatePlan() {
  const income   = parseFloat(document.getElementById('income').value)   || 0;
  const expenses = parseFloat(document.getElementById('expenses').value) || 0;
  const savings  = parseFloat(document.getElementById('savings').value)  || 0;
  const age      = document.getElementById('age').value || 'not specified';
  const goal1    = document.getElementById('goal1').value.trim() || 'build an emergency fund';
  const goal2    = document.getElementById('goal2').value.trim() || 'retire comfortably';

  if (!income) {
    alert('Please enter your monthly income.');
    return;
  }

  const free = income - expenses;
  userData = { income, expenses, savings, age, goal1, goal2, free };

  // Update summary bar
  document.getElementById('disp-income').textContent   = fmt(income);
  document.getElementById('disp-expenses').textContent = fmt(expenses);
  document.getElementById('disp-free').textContent     = fmt(Math.max(0, free));
  document.getElementById('plan-subtitle').textContent =
    `Based on ${fmt(income)}/mo income · ${fmt(savings)} saved`;

  // Pre-fill calculator with a sensible default (30% of free cash)
  const suggestedContrib = Math.max(50, Math.min(Math.round((free * 0.3) / 50) * 50, 5000));
  document.getElementById('contrib-slider').value = suggestedContrib;

  // Switch screens
  document.getElementById('s-input').classList.remove('active');
  document.getElementById('s-plan').classList.add('active');

  // Initialise calculator
  updateCalc();

  // Kick off AI analysis
  fetchAIPlan(userData);
}

// ─────────────────────────────────────────
// COMPOUNDING CALCULATOR
// ─────────────────────────────────────────
function updateCalc() {
  const contrib = parseFloat(document.getElementById('contrib-slider').value);
  const rate    = parseFloat(document.getElementById('rate-slider').value);
  const years   = parseFloat(document.getElementById('years-slider').value);

  document.getElementById('contrib-out').textContent = fmt(contrib);
  document.getElementById('rate-out').textContent    = rate.toFixed(1) + '%';
  document.getElementById('years-out').textContent   = years;

  const monthly = rate / 100 / 12;
  const months  = years * 12;

  const futureVal    = contrib * ((Math.pow(1 + monthly, months) - 1) / monthly);
  const totalContrib = contrib * months;

  document.getElementById('future-val').textContent = fmt(futureVal);
  document.getElementById('future-sub').textContent =
    `in ${years} year${years > 1 ? 's' : ''} at ${rate.toFixed(1)}% annual return`;

  // Build bar chart snapshots
  const snapshots = [
    { yr: '5y',     months: 60  },
    { yr: '10y',    months: 120 },
    { yr: `${years}y`, months },
  ]
  .filter(s => s.months <= months)
  .map(s => ({
    yr: s.yr,
    fv: contrib * ((Math.pow(1 + monthly, s.months) - 1) / monthly),
    c:  contrib * s.months,
  }));

  const maxVal = futureVal || 1;
  const bc = document.getElementById('bar-chart');
  bc.innerHTML = snapshots.map(r => {
    const cPct = Math.min(Math.round((r.c / maxVal) * 100), 100);
    const gPct = Math.min(Math.round(((r.fv - r.c) / maxVal) * 100), 100);
    return `
      <div class="bar-row">
        <span class="bar-label">${r.yr}</span>
        <div class="bar-track"><div class="bar-fill contrib" style="width:${cPct}%"></div></div>
        <div class="bar-track"><div class="bar-fill growth"  style="width:${gPct}%"></div></div>
        <span class="bar-amount">${fmt(r.fv)}</span>
      </div>`;
  }).join('');
}

// ─────────────────────────────────────────
// AI PLAN — API CALL
// ─────────────────────────────────────────
async function fetchAIPlan(d) {
  document.getElementById('ai-loading').style.display = 'block';
  document.getElementById('ai-content').style.display = 'none';

  const savingsRatio    = d.income > 0 ? Math.round((d.free / d.income) * 100) : 0;
  const emergencyMonths = d.expenses > 0 ? Math.round(d.savings / d.expenses) : 0;

  const prompt = `You are a concise personal finance advisor. A user has shared their finances:
- Monthly income: $${d.income}
- Monthly expenses: $${d.expenses}
- Free cash flow: $${d.free} (${savingsRatio}% savings rate)
- Current savings: $${d.savings} (covers ~${emergencyMonths} months of expenses)
- Age: ${d.age}
- Immediate goal (1-2 years): ${d.goal1}
- Long-term goal (10+ years): ${d.goal2}

Write a SHORT, warm, direct financial analysis (3-4 sentences) addressing their specific situation — mention their actual numbers. Then on a new line write "TIPS:" followed by exactly 3 tips, each on its own line starting with a bold title in format "**Title**: explanation". Be specific to their goals and numbers. Keep it under 200 words total.`;

  try {
    const res = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    renderAIPlan(data.text || '');
  } catch (err) {
    console.warn('API call failed, using fallback content:', err.message);
    renderAIPlan(fallbackPlan(d));
  }
}

// ─────────────────────────────────────────
// FALLBACK (shown when API is unavailable)
// ─────────────────────────────────────────
function fallbackPlan(d) {
  const e3mo = Math.round(d.expenses * 3).toLocaleString();
  const e6mo = Math.round(d.expenses * 6).toLocaleString();
  const auto = Math.round(d.free * 0.2).toLocaleString();

  return `Based on your $${d.income.toLocaleString()}/mo income and $${Math.max(0, d.free).toLocaleString()}/mo free cash flow, you're in a strong position to start building wealth. With $${d.savings.toLocaleString()} already saved, you have a real foundation to work from.

TIPS:
**Build your emergency fund first**: Aim for 3–6 months of expenses ($${e3mo}–$${e6mo}) before investing aggressively.
**Automate your savings**: Set up an automatic transfer of at least $${auto} (20% of free cash) each month — the day after payday.
**Tackle high-interest debt**: Any debt above 7% interest should be paid off before investing — it's a guaranteed, risk-free return.`;
}

// ─────────────────────────────────────────
// RENDER AI RESPONSE
// ─────────────────────────────────────────
function renderAIPlan(text) {
  document.getElementById('ai-loading').style.display = 'none';
  document.getElementById('ai-content').style.display = 'block';

  const parts    = text.split('TIPS:');
  const analysis = (parts[0] || text).trim();

  document.getElementById('ai-text').textContent = analysis;

  const tipsContainer = document.getElementById('tips-container');
  tipsContainer.innerHTML = '';

  if (parts[1]) {
    const tips = parts[1].trim().split('\n').filter(l => l.trim());
    tips.forEach(tip => {
      const match = tip.match(/\*\*(.+?)\*\*:?\s*(.*)/);
      const div   = document.createElement('div');
      div.className = 'tip-card';
      if (match) {
        div.innerHTML = `<strong>${match[1]}</strong>${match[2]}`;
      } else {
        div.textContent = tip.replace(/^[-•]\s*/, '');
      }
      tipsContainer.appendChild(div);
    });
  }
}

// ─────────────────────────────────────────
// PAYWALL UNLOCK
// ─────────────────────────────────────────
function handleUnlock() {
  /**
   * TODO: Integrate Stripe Checkout (or Apple/Google Pay)
   * Example with Stripe:
   *
   * const stripe = Stripe('YOUR_STRIPE_PUBLISHABLE_KEY');
   * stripe.redirectToCheckout({ lineItems: [{ price: 'price_xxx', quantity: 1 }], mode: 'subscription', ... });
   */
  alert(
    'Payment integration coming soon!\n\n' +
    'To enable: add your Stripe publishable key and create a checkout session in api/proxy.js.'
  );
}

// ─────────────────────────────────────────
// EXPOSE GLOBALS (called from HTML onclick)
// ─────────────────────────────────────────
window.generatePlan  = generatePlan;
window.goBack        = goBack;
window.switchTab     = switchTab;
window.updateCalc    = updateCalc;
window.handleUnlock  = handleUnlock;
