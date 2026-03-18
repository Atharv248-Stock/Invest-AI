/**
 * Invest AI — src/universe.js
 *
 * 300+ global stocks across 12 categories.
 * Large-cap anchors + mid-cap compounders + small-cap high-conviction picks.
 *
 * Each stock:
 *   t         ticker / symbol
 *   n         full name
 *   cat       category (must match CAT_TARGETS keys)
 *   size      'large' | 'mid' | 'small'
 *   region    'us' | 'canada' | 'europe' | 'asia' | 'latam' | 'global'
 *   emoji     display icon
 *   bg        card background color
 *   tier      which risk tiers can include this stock
 *   status    'cheap' | 'fair' | 'expensive' — overridden nightly by cache
 *   metric    current valuation metric string
 *   valNote   one-line valuation note
 *   why       2-sentence investment thesis
 *   pills     alternating [label, colorClass] — max 4 items (2 tags)
 *
 * Color classes: pg=green, pb=blue, py=gold, pp=purple, pr=red
 *
 * Categories:
 *   EVs | AI/Semis | Cybersecurity | Cloud/SaaS | China |
 *   Luxury | Quality | Consumption | Fintech | LATAM |
 *   Metals | Dividends | Innovation/Space | Robotics/Defense
 */

const UNIVERSE = [

  // ═══════════════════════════════════════════════════════
  // 1. EVs & AUTONOMOUS MOBILITY
  // ═══════════════════════════════════════════════════════
  { t:'TSLA',  n:'Tesla Inc.',                  cat:'EVs', size:'large', region:'us',
    emoji:'⚡', bg:'rgba(0,229,160,.12)',  tier:['aggressive','moderate'],
    status:'fair',   metric:'PEG ~2.1',  valNote:'Fair PEG for EV+FSD+Optimus thesis',
    why:'EV market leader + Full Self-Driving + Optimus humanoid robot pipeline. Revenue growing >20%/yr with energy storage becoming a second major business.',
    pills:['EV Leader','FSD Optionality','pb','py'] },

  { t:'XIACF', n:'Xiaomi Corp (EV+Phones)',     cat:'EVs', size:'large', region:'asia',
    emoji:'📱', bg:'rgba(255,107,107,.12)', tier:['aggressive','moderate'],
    status:'cheap',  metric:'P/E 18x',   valNote:'P/E 18x — cheap for EV+phone dual flywheel',
    why:'Xiaomi SU7 EV launched to massive demand, leveraging 600M device ecosystem for software monetization. P/E of 18x is cheap for a company growing EV revenue 200%+ annually.',
    pills:['EV + Ecosystem','P/E 18x','pr','py'] },

  { t:'RIVN',  n:'Rivian Automotive',           cat:'EVs', size:'mid',   region:'us',
    emoji:'🚗', bg:'rgba(255,107,107,.12)', tier:['aggressive'],
    status:'fair',   metric:'P/S ~2.5',  valNote:'Sub-$10B market cap, Amazon-backed',
    why:'Amazon 100k delivery van contract + R2 consumer truck launching. P/S near multi-year floor. High risk but asymmetric upside at current valuation.',
    pills:['Amazon-Backed','High Risk','pr','pb'] },

  { t:'BIDU',  n:'Baidu Inc.',                  cat:'EVs', size:'large', region:'asia',
    emoji:'🤖', bg:'rgba(79,163,247,.12)',  tier:['aggressive','moderate'],
    status:'cheap',  metric:'P/E 12x',   valNote:'P/E 12x vs 5yr avg 22x — decade low',
    why:'China AI leader + Apollo autonomous driving platform with most robotaxi licenses. P/E of 12x is the lowest in Baidu\'s public market history — maximum fear pricing.',
    pills:['AI + AV','P/E Decade Low','pg','pb'] },

  { t:'UBER',  n:'Uber Technologies',           cat:'EVs', size:'large', region:'us',
    emoji:'🚕', bg:'rgba(0,229,160,.12)',  tier:['moderate','aggressive'],
    status:'fair',   metric:'P/E 28x',   valNote:'Fair for 20%+ EBIT growth mobility platform',
    why:'World\'s largest mobility network turning highly profitable. AV partnership strategy (Waymo, Cruise) means Uber benefits from autonomy without building it.',
    pills:['Mobility Platform','AV Partnerships','pg','py'] },

  { t:'CSU',   n:'Cooper-Standard Holdings',    cat:'EVs', size:'small', region:'us',
    emoji:'🔧', bg:'rgba(79,163,247,.12)',  tier:['aggressive','moderate'],
    status:'cheap',  metric:'P/S 0.15x', valNote:'P/S 0.15x — deeply discounted EV/hybrid supplier',
    why:'Makes sealing systems and fuel/brake lines for every major automaker. EV/hybrid transition is a direct tailwind. Trading at P/S 0.15x — one of the most discounted auto-tech names.',
    pills:['EV Supplier','P/S 0.15x','pb','pg'] },

  { t:'AAP',   n:'Advance Auto Parts',          cat:'EVs', size:'large', region:'us',
    emoji:'🔩', bg:'rgba(79,163,247,.12)',  tier:['moderate','conservative'],
    status:'cheap',  metric:'P/E 14x',   valNote:'P/E 14x — near decade low, EV parts transition',
    why:'Auto parts retailer at decade-low valuations after restructuring. $40 stock from $240 peak. EV/hybrid service complexity is a long-term tailwind for aftermarket parts demand. Turnaround in progress with new management.',
    pills:['Auto Parts','Turnaround Play','pb','py'] },

  // ═══════════════════════════════════════════════════════
  // 2. AI & SEMICONDUCTORS
  // ═══════════════════════════════════════════════════════
  { t:'NVDA',  n:'Nvidia Corporation',          cat:'AI/Semis', size:'large', region:'us',
    emoji:'🖥️', bg:'rgba(0,229,160,.12)',  tier:['aggressive','moderate'],
    status:'fair',   metric:'PEG 1.8',   valNote:'PEG 1.8 justified by 120%+ EPS growth',
    why:'Dominant AI infrastructure — every major AI company runs on Nvidia GPUs. Data center revenue accelerating with H100/H200/B200 demand far exceeding supply.',
    pills:['AI Infrastructure','PEG 1.8','pg','py'] },

  { t:'AMD',   n:'Advanced Micro Devices',      cat:'AI/Semis', size:'large', region:'us',
    emoji:'💻', bg:'rgba(79,163,247,.12)',  tier:['aggressive','moderate'],
    status:'cheap',  metric:'PEG 1.4',   valNote:'$227→$100. Cheapest large-cap AI semi on PEG',
    why:'AMD peaked at $227 and corrected to ~$100 — a 56% drawdown pricing in a permanent loss. MI300X data center GPU revenue is doubling annually. PEG 1.4 is the cheapest major AI semiconductor.',
    pills:['PEG 1.4 Cheapest','56% Off Peak','pg','pb'] },

  { t:'AVGO',  n:'Broadcom Inc.',               cat:'AI/Semis', size:'large', region:'us',
    emoji:'📡', bg:'rgba(167,139,250,.12)', tier:['moderate','conservative'],
    status:'fair',   metric:'P/E 26x',   valNote:'P/E 26x below 5yr avg 28x',
    why:'Custom AI ASIC chips for Google, Meta, Apple — plus VMware recurring software revenue. P/E slightly below 5yr average for a high-margin, wide-moat business.',
    pills:['Custom AI Chips','High Margin','pp','py'] },

  { t:'ASML',  n:'ASML Holding N.V.',           cat:'AI/Semis', size:'large', region:'europe',
    emoji:'🔬', bg:'rgba(0,229,160,.12)',  tier:['conservative','moderate'],
    status:'cheap',  metric:'P/E 30x',   valNote:'€900→€600. P/E 30x vs 5yr avg 45x — rare value',
    why:'Global monopoly on EUV lithography machines — every advanced chip requires ASML. Peaked at €900, now ~€600. P/E of 30x is historically cheap vs 45x average.',
    pills:['EUV Monopoly','30% Below Avg P/E','pg','pp'] },

  { t:'MU',    n:'Micron Technology',           cat:'AI/Semis', size:'large', region:'us',
    emoji:'🧠', bg:'rgba(79,163,247,.12)',  tier:['aggressive','moderate'],
    status:'cheap',  metric:'P/E 13x',   valNote:'$157→$75. HBM AI memory cycle just beginning',
    why:'HBM3E memory is structurally essential for AI training — Micron is a key beneficiary. Peaked at $157, now $75. P/E 13x is 50% below historical average while AI memory demand is structural.',
    pills:['HBM AI Memory','50% Below Hist P/E','pb','pg'] },

  { t:'LRCX',  n:'Lam Research Corporation',   cat:'AI/Semis', size:'large', region:'us',
    emoji:'⚗️', bg:'rgba(0,229,160,.12)',  tier:['moderate','aggressive'],
    status:'cheap',  metric:'P/E 22x',   valNote:'P/E 22x below 5yr avg 28x — semi equipment buy',
    why:'Makes etch and deposition equipment essential for every advanced chip fab. P/E 22x below 5yr average of 28x. Every dollar spent building AI chip fabs flows through Lam.',
    pills:['Semi Equipment','P/E Below Avg','pg','pb'] },

  { t:'KLAC',  n:'KLA Corporation',            cat:'AI/Semis', size:'large', region:'us',
    emoji:'🔭', bg:'rgba(79,163,247,.12)',  tier:['moderate','conservative'],
    status:'fair',   metric:'P/E 28x',   valNote:'Fair — process control monopoly for chip fabs',
    why:'Dominant process control and inspection equipment — catches defects in chip manufacturing. Near-monopoly position. P/E of 28x is fair for this recurring, sticky business.',
    pills:['Process Control','Near-Monopoly','pb','py'] },

  { t:'ALAB',  n:'Astera Labs Inc.',            cat:'AI/Semis', size:'mid',   region:'us',
    emoji:'🔗', bg:'rgba(167,139,250,.12)', tier:['aggressive'],
    status:'fair',   metric:'P/S 18x',   valNote:'Premium P/S justified by 80%+ revenue growth',
    why:'AI interconnect chips — the high-speed "plumbing" connecting GPUs in data centers. Only pure-play AI connectivity stock. Revenue growing 80%+ with hyperscaler customers.',
    pills:['AI Interconnects','High Growth','pp','pr'] },

  { t:'CDNS',  n:'Cadence Design Systems',      cat:'AI/Semis', size:'large', region:'us',
    emoji:'📐', bg:'rgba(0,229,160,.12)',  tier:['moderate','conservative'],
    status:'fair',   metric:'P/E 64x',   valNote:'Premium — EDA duopoly, every chip designed here',
    why:'Electronic design automation — every AI chip (NVDA, AMD, Apple) is designed using Cadence software. Duopoly with Synopsys. Extremely high switching costs and recurring revenue.',
    pills:['EDA Duopoly','Chip Design','pg','py'] },

  { t:'SNPS',  n:'Synopsys Inc.',               cat:'AI/Semis', size:'large', region:'us',
    emoji:'🔩', bg:'rgba(79,163,247,.12)',  tier:['moderate','conservative'],
    status:'fair',   metric:'P/E 58x',   valNote:'Premium justified by AI chip design TAM expansion',
    why:'Co-duopolist with Cadence in chip design software. AI is dramatically increasing chip complexity, requiring more EDA software. Synopsys acquisition of Ansys broadens simulation moat.',
    pills:['EDA Software','AI Chip Design','pb','pp'] },

  { t:'GOOGL', n:'Alphabet Inc.',               cat:'AI/Semis', size:'large', region:'us',
    emoji:'🔍', bg:'rgba(0,229,160,.12)',  tier:['moderate','conservative'],
    status:'cheap',  metric:'P/E 20x',   valNote:'P/E 20x below 5yr avg 25x',
    why:'Search monopoly + YouTube + Google Cloud + Gemini AI + Waymo. P/E of 20x is below 5yr avg — one of the cheapest mega-cap tech stocks relative to quality right now.',
    pills:['Mega Cap','P/E Below Avg','pg','pb'] },

  { t:'AMZN',  n:'Amazon.com Inc.',             cat:'AI/Semis', size:'large', region:'us',
    emoji:'📦', bg:'rgba(245,197,66,.12)',  tier:['moderate','conservative'],
    status:'fair',   metric:'P/E 34x',   valNote:'34x P/E fair — AWS + Bedrock AI monetization',
    why:'AWS is the #1 cloud platform. Amazon Bedrock is the enterprise AI deployment layer of choice. P/E of 34x reasonable for the combined consumer + cloud + AI business.',
    pills:['Cloud + AI','AWS Leader','py','pb'] },

  { t:'EWY',   n:'iShares MSCI South Korea ETF',cat:'AI/Semis', size:'large', region:'asia',
    emoji:'🇰🇷', bg:'rgba(79,163,247,.12)',  tier:['aggressive','moderate'],
    status:'cheap',  metric:'P/E 9x',    valNote:'Samsung+SK Hynix exposure at P/E 9x — decade low',
    why:'Single ETF owning Samsung (world\'s largest memory maker) and SK Hynix (Nvidia\'s HBM3E supplier). South Korea trades at P/E 9x — one of the cheapest developed markets. Corporate governance reforms adding re-rating catalyst.',
    pills:['SK Hynix+Samsung','P/E 9x','pb','pg'] },

  { t:'INTC',  n:'Intel Corporation',           cat:'AI/Semis', size:'large', region:'us',
    emoji:'🔵', bg:'rgba(79,163,247,.12)',  tier:['moderate','conservative'],
    status:'cheap',  metric:'P/B 0.9x',  valNote:'P/B below 1 — trading below book value',
    why:'Intel is trading below book value for the first time in decades — pricing in permanent decline. But 18A process node has potential and foundry services could re-rate. High risk turnaround story.',
    pills:['Below Book Value','Turnaround','pb','pr'] },

  { t:'MCHP',  n:'Microchip Technology',        cat:'AI/Semis', size:'large', region:'us',
    emoji:'🔌', bg:'rgba(0,229,160,.12)',  tier:['moderate','conservative'],
    status:'cheap',  metric:'P/E 20x',   valNote:'P/E 20x — near 5yr low, 2.3% dividend',
    why:'Microcontrollers for industrial and automotive — deeply embedded in global supply chains. P/E near 5yr low due to inventory correction that is now clearing. High free cash flow + 2.3% dividend.',
    pills:['Industrial IoT','P/E Near 5yr Low','pg','py'] },

  // ═══════════════════════════════════════════════════════
  // 3. CYBERSECURITY
  // ═══════════════════════════════════════════════════════
  { t:'CRWD',  n:'CrowdStrike Holdings',        cat:'Cybersecurity', size:'large', region:'us',
    emoji:'🛡️', bg:'rgba(255,107,107,.12)', tier:['aggressive','moderate'],
    status:'fair',   metric:'PEG 2.0',   valNote:'PEG 2.0 for 30%+ ARR growth',
    why:'AI-native endpoint security platform. Every major enterprise breach makes CRWD more essential. 30%+ ARR growth with high net retention. PEG of 2.0 is fair for this growth quality.',
    pills:['AI Security','30% ARR','pr','pb'] },

  { t:'PANW',  n:'Palo Alto Networks',          cat:'Cybersecurity', size:'large', region:'us',
    emoji:'🔒', bg:'rgba(79,163,247,.12)',  tier:['moderate','conservative'],
    status:'fair',   metric:'P/E 48x',   valNote:'Premium justified by 25%+ FCF margins',
    why:'Largest pure-play cybersecurity platform. Platform consolidation trend benefits PANW as enterprises reduce vendor count. 25%+ free cash flow margins with high customer stickiness.',
    pills:['Platform Leader','25% FCF','pb','pp'] },

  { t:'NET',   n:'Cloudflare Inc.',             cat:'Cybersecurity', size:'large', region:'us',
    emoji:'☁️', bg:'rgba(0,229,160,.12)',  tier:['aggressive','moderate'],
    status:'fair',   metric:'P/S 18x',   valNote:'P/S 18x below 3yr avg 30x',
    why:'Zero-trust network security + CDN + AI inference at the edge. P/S of 18x significantly below 3yr average of 30x. Cloudflare Workers AI is a new revenue vector starting to scale.',
    pills:['Zero-Trust','P/S Discounted','pg','pb'] },

  { t:'ZS',    n:'Zscaler Inc.',                cat:'Cybersecurity', size:'large', region:'us',
    emoji:'🌐', bg:'rgba(245,197,66,.12)',  tier:['moderate','aggressive'],
    status:'cheap',  metric:'P/S 12x',   valNote:'$376→$170. P/S 12x vs 3yr avg 20x',
    why:'ZS peaked at $376, now ~$170. Zero-trust cloud security. P/S of 12x well below 3yr avg of 20x. Federal zero-trust mandates are accelerating adoption post-SolarWinds and Colonial Pipeline.',
    pills:['Zero-Trust','P/S Cheapest','py','pg'] },

  { t:'RBRK',  n:'Rubrik Inc.',                 cat:'Cybersecurity', size:'mid',   region:'us',
    emoji:'💾', bg:'rgba(167,139,250,.12)', tier:['aggressive'],
    status:'fair',   metric:'P/S 12x',   valNote:'Recent IPO — P/S 12x for 40%+ ARR',
    why:'Cloud data security and ransomware recovery. 40%+ ARR growth. Recently IPO\'d — P/S looks high but growth rate and Microsoft partnership support current valuation.',
    pills:['Data Security','40% ARR','pp','pr'] },

  { t:'S',     n:'SentinelOne Inc.',            cat:'Cybersecurity', size:'mid',   region:'us',
    emoji:'🤖', bg:'rgba(0,229,160,.12)',  tier:['aggressive','moderate'],
    status:'cheap',  metric:'P/S 7x',    valNote:'P/S 7x — below 3yr avg 18x. AI SOC catalyst',
    why:'AI-powered endpoint detection and response. P/S of 7x is well below 3yr average of 18x. Purple AI (autonomous SOC) is closing large enterprise deals that were previously unwinnable.',
    pills:['AI SOC','P/S 7x','pg','pb'] },

  { t:'CYBR',  n:'CyberArk Software',           cat:'Cybersecurity', size:'mid',   region:'us',
    emoji:'🔑', bg:'rgba(79,163,247,.12)',  tier:['moderate','aggressive'],
    status:'fair',   metric:'P/S 14x',   valNote:'P/S 14x — fair for identity security leader',
    why:'Privileged access management — protects the most sensitive credentials. Increasingly mandated by regulators and cyber insurers. Acquisition of Venafi adds machine identity layer.',
    pills:['Identity Security','PAM Leader','pb','py'] },

  // ═══════════════════════════════════════════════════════
  // 4. CLOUD / SAAS
  // ═══════════════════════════════════════════════════════
  { t:'CRM',   n:'Salesforce Inc.',             cat:'Cloud/SaaS', size:'large', region:'us',
    emoji:'💼', bg:'rgba(0,229,160,.12)',  tier:['moderate','conservative'],
    status:'cheap',  metric:'P/E 26x',   valNote:'$311→$126 crash, recovered. P/E 26x vs avg 35x',
    why:'CRM crashed from $311 to $126, now recovered. P/E 26x below 5yr avg 35x. Agentforce AI is showing real enterprise traction — could add a second revenue growth engine on top of the core CRM business.',
    pills:['Agentforce AI','P/E Below Avg','pg','pb'] },

  { t:'NOW',   n:'ServiceNow Inc.',             cat:'Cloud/SaaS', size:'large', region:'us',
    emoji:'⚙️', bg:'rgba(167,139,250,.12)', tier:['moderate','conservative'],
    status:'fair',   metric:'P/E 60x',   valNote:'Premium justified by AI workflow automation moat',
    why:'Every Fortune 500 IT department runs ServiceNow. AI Now platform automates workflows that previously required humans. Premium P/E but near-impossible to displace once embedded.',
    pills:['Enterprise AI','High Retention','pp','py'] },

  { t:'SNOW',  n:'Snowflake Inc.',              cat:'Cloud/SaaS', size:'large', region:'us',
    emoji:'❄️', bg:'rgba(79,163,247,.12)',  tier:['aggressive','moderate'],
    status:'cheap',  metric:'P/S 10x',   valNote:'IPO $250+, bottomed $107. P/S 67% below avg',
    why:'IPO\'d above $250, crashed to $107. Cortex AI is becoming the enterprise AI data layer of choice. P/S of 10x vs 3yr average of 30x is one of the biggest valuation discounts in enterprise software.',
    pills:['P/S 67% Below Avg','AI Data Layer','pb','pg'] },

  { t:'MDB',   n:'MongoDB Inc.',               cat:'Cloud/SaaS', size:'large', region:'us',
    emoji:'🍃', bg:'rgba(0,229,160,.12)',  tier:['aggressive','moderate'],
    status:'cheap',  metric:'P/S 8x',    valNote:'P/S 8x near 3yr low despite 20%+ growth',
    why:'Developer-first document database for AI applications. P/S of 8x near multi-year lows despite consistent 20%+ revenue growth. Every major AI app team evaluates MongoDB first.',
    pills:['Dev Database','P/S Near Low','pg','pb'] },

  { t:'ADBE',  n:'Adobe Inc.',                 cat:'Cloud/SaaS', size:'large', region:'us',
    emoji:'🎨', bg:'rgba(167,139,250,.12)', tier:['moderate','conservative'],
    status:'cheap',  metric:'P/E 24x',   valNote:'$700→$370. 5yr P/E low. Firefly AI upside',
    why:'Adobe peaked at $700, now ~$370. P/E of 24x is a 5-year low for one of the most durable software businesses. Firefly generative AI embedded in Creative Cloud adds new monetization layer.',
    pills:['Creative AI','5yr P/E Low','pp','py'] },

  { t:'TOIV',  n:'Topicus.com Inc. (TOI.V)',   cat:'Cloud/SaaS', size:'mid',   region:'canada',
    emoji:'🍁', bg:'rgba(0,229,160,.12)',  tier:['moderate','aggressive'],
    status:'fair',   metric:'P/E 45x',   valNote:'Premium but Constellation-model compounder',
    why:'Spinoff from Constellation Software — acquires vertical market SaaS businesses in Europe. Constellation-style capital allocation with 25%+ IRR on acquisitions. Still small enough to compound at high rates for years.',
    pills:['Vertical SaaS','CSI Spinoff','pg','pb'] },

  { t:'CSU',   n:'Constellation Software',     cat:'Cloud/SaaS', size:'large', region:'canada',
    emoji:'⭐', bg:'rgba(245,197,66,.12)',  tier:['conservative','moderate'],
    status:'fair',   metric:'P/E 90x',   valNote:'Always premium — best capital allocator in tech',
    why:'Acquires vertical market software companies at high IRR. Mark Leonard has compounded at 35%+ for 20 years. Premium valuation is structural — the quality of capital allocation is unmatched.',
    pills:['Best Allocator','Vertical SaaS','py','pg'] },

  { t:'HUBS',  n:'HubSpot Inc.',               cat:'Cloud/SaaS', size:'large', region:'us',
    emoji:'🧲', bg:'rgba(79,163,247,.12)',  tier:['moderate','aggressive'],
    status:'cheap',  metric:'P/S 9x',    valNote:'P/S 9x — well below 3yr avg 18x',
    why:'SMB CRM and marketing platform. P/S of 9x is well below 3yr average of 18x. AI features (Breeze AI) are accelerating upsell within existing customer base. Potential acquisition target.',
    pills:['SMB CRM','P/S Below Avg','pb','pg'] },

  { t:'DDOG',  n:'Datadog Inc.',               cat:'Cloud/SaaS', size:'large', region:'us',
    emoji:'🐕', bg:'rgba(255,107,107,.12)', tier:['aggressive','moderate'],
    status:'fair',   metric:'P/S 16x',   valNote:'P/S 16x below 3yr avg 28x',
    why:'Cloud infrastructure observability — every DevOps team needs Datadog. P/S of 16x below 3yr average. AI workloads are inherently more complex to monitor, expanding Datadog\'s TAM structurally.',
    pills:['Cloud Monitoring','P/S Below Avg','pr','pb'] },

  { t:'GLBE',  n:'Global-E Online',            cat:'Cloud/SaaS', size:'mid',   region:'us',
    emoji:'🌍', bg:'rgba(0,229,160,.12)',  tier:['aggressive','moderate'],
    status:'cheap',  metric:'P/S 6x',    valNote:'P/S 6x — cheap cross-border e-com infrastructure',
    why:'The plumbing behind international e-commerce — handles duties, taxes, currency, and compliance for Shopify, Meta, and 1000+ merchants. P/S of 6x is cheap for 30%+ revenue growth.',
    pills:['Cross-Border Ecom','P/S 6x','pg','pb'] },

  // ═══════════════════════════════════════════════════════
  // 5. CHINA GROWTH
  // ═══════════════════════════════════════════════════════
  { t:'BABA',  n:'Alibaba Group',              cat:'China', size:'large', region:'asia',
    emoji:'🐉', bg:'rgba(255,107,107,.12)', tier:['aggressive','moderate'],
    status:'cheap',  metric:'P/E 11x',   valNote:'$300+→$80s. Historic P/E low',
    why:'Alibaba peaked above $300, now ~$80s. P/E of 11x is the lowest in its public history. Regulatory storm is largely behind it. Cloud growing 15%+. The market is pricing in permanent collapse.',
    pills:['Deep Value','P/E 11x Historic','pr','py'] },

  { t:'PDD',   n:'PDD Holdings (Temu)',        cat:'China', size:'large', region:'asia',
    emoji:'🛒', bg:'rgba(0,229,160,.12)',  tier:['aggressive'],
    status:'cheap',  metric:'P/E 14x',   valNote:'P/E 14x for 60%+ revenue — remarkably cheap',
    why:'Temu global expansion + Pinduoduo domestic dominance. Revenue growing 60%+ with P/E of only 14x. One of the cheapest high-growth stocks in any market globally.',
    pills:['60% Revenue Growth','P/E 14x','pg','pr'] },

  { t:'FUTU',  n:'Futu Holdings',              cat:'China', size:'mid',   region:'asia',
    emoji:'📊', bg:'rgba(79,163,247,.12)',  tier:['aggressive'],
    status:'cheap',  metric:'P/E 18x',   valNote:'P/E 18x — Chinese digital brokerage 30%+ growth',
    why:'China\'s Robinhood expanding to Singapore, Malaysia, and Japan. 30%+ user growth. P/E 18x cheap relative to growth rate and international expansion optionality.',
    pills:['Chinese Fintech','P/E 18x','pb','pg'] },

  { t:'KWEB',  n:'KraneShares China ETF',      cat:'China', size:'large', region:'asia',
    emoji:'🇨🇳', bg:'rgba(255,107,107,.12)', tier:['aggressive','moderate'],
    status:'cheap',  metric:'P/E 11x',   valNote:'China tech basket at 11x vs 40x peak',
    why:'BABA + Tencent + PDD + JD + Meituan basket. P/E of 11x vs 40x peak in 2021. Authorities pivoting from crackdown to stimulus. Single ETF for diversified China tech recovery.',
    pills:['China Tech Basket','P/E 11x vs 40x','pr','pb'] },

  { t:'JD',    n:'JD.com Inc.',               cat:'China', size:'large', region:'asia',
    emoji:'📬', bg:'rgba(79,163,247,.12)',  tier:['aggressive','moderate'],
    status:'cheap',  metric:'P/E 10x',   valNote:'P/E 10x — JD Logistics separating hidden value',
    why:'China\'s Amazon — largest direct-sales e-commerce platform with own logistics network. JD Logistics is a fast-growing independent business. P/E 10x is historically cheap.',
    pills:['China Amazon','P/E 10x','pb','pg'] },

  { t:'9988',  n:'Alibaba HK (9988.HK)',       cat:'China', size:'large', region:'asia',
    emoji:'🏮', bg:'rgba(255,107,107,.12)', tier:['aggressive','moderate'],
    status:'cheap',  metric:'P/E 11x',   valNote:'HK-listed — same value thesis, local access',
    why:'Same Alibaba thesis but via Hong Kong listing for those with HK brokerage access. HK listing getting included in Stock Connect programs, adding mainland Chinese investor demand.',
    pills:['HK Listed','Stock Connect','pr','py'] },

  { t:'DRGN',  n:'DRGN ETF (China Dragons)',   cat:'China', size:'large', region:'asia',
    emoji:'🐲', bg:'rgba(245,197,66,.12)',  tier:['aggressive'],
    status:'cheap',  metric:'P/E 12x',   valNote:'Top 7 China tech cos at blended 12x P/E',
    why:'Concentrated ETF of the largest China tech companies at decade-low valuations. Simple way to own the China tech recovery thesis across multiple names with one ticker.',
    pills:['China Tech ETF','Blended 12x P/E','py','pr'] },

  // ═══════════════════════════════════════════════════════
  // 6. LUXURY & SECULAR CONSUMPTION
  // ═══════════════════════════════════════════════════════
  { t:'RACE',  n:'Ferrari N.V.',               cat:'Luxury', size:'large', region:'europe',
    emoji:'🏎️', bg:'rgba(245,197,66,.12)',  tier:['conservative','moderate'],
    status:'fair',   metric:'P/E 52x',   valNote:'Always premium — secular UHNW demand',
    why:'Most exclusive brand in the world — never discounts, never overproduces. Personalization revenue (higher-margin) growing rapidly. UHNW demand is secular and resilient across economic cycles.',
    pills:['Luxury Monopoly','Secular Growth','py','pp'] },

  { t:'HESAY', n:'Hermès International',       cat:'Luxury', size:'large', region:'europe',
    emoji:'🧣', bg:'rgba(167,139,250,.12)', tier:['conservative','moderate'],
    status:'fair',   metric:'P/E 54x',   valNote:'Birkin waitlists = demand always exceeds supply',
    why:'Demand perpetually exceeds supply by design. P/E 54x sounds expensive but Hermès never trades cheap — that is the entire brand promise. Generational wealth transfer tailwind.',
    pills:['Birkin Brand','Inelastic Demand','pp','py'] },

  { t:'LVMUY', n:'LVMH (Louis Vuitton)',       cat:'Luxury', size:'large', region:'europe',
    emoji:'👜', bg:'rgba(245,197,66,.12)',  tier:['conservative','moderate'],
    status:'cheap',  metric:'P/E 20x',   valNote:'€900→€530. Best LVMH entry in a decade',
    why:'75 luxury brands — LV, Dior, Moët, Bulgari, Tiffany, Hennessy. Peaked €900, now €530. P/E 20x well below 5yr avg 28x. China luxury slowdown is temporary; UHNW demand is structural.',
    pills:['75 Luxury Brands','P/E Decade Low','py','pg'] },

  { t:'PRDSY', n:'Prada Group',               cat:'Luxury', size:'large', region:'europe',
    emoji:'👗', bg:'rgba(167,139,250,.12)', tier:['moderate','conservative'],
    status:'cheap',  metric:'P/E 22x',   valNote:'P/E 22x below peers. Miu Miu +90% growth',
    why:'Prada + Miu Miu massive Gen Z resurgence. Miu Miu growing 90% YoY while Prada brand stabilizes. P/E 22x below luxury peer group average. Cultural moment is real and building.',
    pills:['Gen Z Resurgence','Miu Miu Growth','pp','py'] },

  { t:'CFRUY', n:'Compagnie Financière Richemont',cat:'Luxury', size:'large', region:'europe',
    emoji:'💎', bg:'rgba(245,197,66,.12)',  tier:['conservative','moderate'],
    status:'cheap',  metric:'P/E 18x',   valNote:'P/E 18x — Cartier parent at multi-year low',
    why:'Owns Cartier, Van Cleef, IWC, Panerai. Jewellery and watches have the best luxury pricing power. P/E of 18x is a multi-year low for Richemont — cheaper than LVMH on a relative basis.',
    pills:['Cartier+VCA','P/E Multi-yr Low','py','pg'] },

  { t:'WOW',   n:'Watches of Switzerland',    cat:'Luxury', size:'mid',   region:'europe',
    emoji:'⌚', bg:'rgba(167,139,250,.12)', tier:['moderate','aggressive'],
    status:'cheap',  metric:'P/E 12x',   valNote:'P/E 12x — luxury watch retailer at trough',
    why:'UK luxury watch retailer (Rolex, Patek, AP) hit by watch market downturn. P/E of 12x is near trough. Rolex supply normalization and US expansion are two recovery catalysts.',
    pills:['Rolex Retailer','Trough Valuation','pp','py'] },

  { t:'RNLSY', n:'Rémy Cointreau',            cat:'Luxury', size:'mid',   region:'europe',
    emoji:'🥃', bg:'rgba(245,197,66,.12)',  tier:['conservative','moderate'],
    status:'cheap',  metric:'P/E 22x',   valNote:'P/E 22x — premium cognac at trough demand',
    why:'Rémy Martin cognac — premium spirits with strongest pricing power in beverages. US and China destocking nearly complete. P/E near decade low as investors wait for demand recovery.',
    pills:['Premium Cognac','Trough Entry','py','pg'] },

  // ═══════════════════════════════════════════════════════
  // 7. QUALITY COMPOUNDERS
  // ═══════════════════════════════════════════════════════
  { t:'META',  n:'Meta Platforms',            cat:'Quality', size:'large', region:'us',
    emoji:'👍', bg:'rgba(0,229,160,.12)',  tier:['moderate','conservative','aggressive'],
    status:'fair',   metric:'P/E 24x',   valNote:'$89 Year of Efficiency bottom → ~10x. Fair now',
    why:'Hit $89 in 2022 — the Year of Efficiency bottom — and rose ~10x. $50B+ FCF. AI ad tools compound ROAS for advertisers. Ray-Ban AI glasses are a real hardware optionality.',
    pills:['3B Daily Users','20%+ EPS Growth','pg','py'] },

  { t:'NFLX',  n:'Netflix Inc.',              cat:'Quality', size:'large', region:'us',
    emoji:'🎬', bg:'rgba(255,107,107,.12)', tier:['moderate','conservative'],
    status:'fair',   metric:'P/E 38x',   valNote:'$78 in 2022 was bargain. P/E 38x below 5yr avg',
    why:'Hit $78 in 2022 — a generational buy that most missed. Ad-supported tier + live sports (NFL, boxing) unlocked a second revenue engine. 300M+ subscribers with real pricing power.',
    pills:['Streaming Leader','Ad Tier Growing','pr','py'] },

  { t:'MSFT',  n:'Microsoft Corp.',           cat:'Quality', size:'large', region:'us',
    emoji:'🪟', bg:'rgba(167,139,250,.12)', tier:['conservative','moderate'],
    status:'fair',   metric:'P/E 32x',   valNote:'P/E 32x — slight premium for best enterprise AI',
    why:'Azure + Copilot AI + Office 365 + Xbox + GitHub. Every enterprise AI project runs on Azure. P/E of 32x is a slight premium but justified for the highest-quality large-cap tech business.',
    pills:['Enterprise AI','Copilot Revenue','pp','pb'] },

  { t:'AAPL',  n:'Apple Inc.',                cat:'Quality', size:'large', region:'us',
    emoji:'🍎', bg:'rgba(79,163,247,.12)',  tier:['conservative','moderate'],
    status:'fair',   metric:'P/E 30x',   valNote:'P/E 30x near 3yr avg — quality anchor',
    why:'iPhone + Services + Apple Intelligence. Services segment is 25%+ of revenue and growing 15%+. Massive buyback program reducing share count. Ultimate quality anchor for any portfolio.',
    pills:['Services Growth','Buybacks','pb','py'] },

  { t:'APP',   n:'Applovin Corp.',            cat:'Quality', size:'large', region:'us',
    emoji:'📱', bg:'rgba(0,229,160,.12)',  tier:['aggressive','moderate'],
    status:'fair',   metric:'PEG 1.5',   valNote:'PEG 1.5 for 70%+ revenue growth',
    why:'AI-powered mobile advertising platform. 70%+ revenue growth with PEG of just 1.5. Expanding from mobile games into e-commerce and web advertising — total addressable market 10x larger.',
    pills:['AI Ad Tech','PEG 1.5','pg','pb'] },

  { t:'CMG',   n:'Chipotle Mexican Grill',    cat:'Quality', size:'large', region:'us',
    emoji:'🌯', bg:'rgba(245,197,66,.12)',  tier:['conservative','moderate'],
    status:'fair',   metric:'P/E 52x',   valNote:'Premium — 15% unit growth + pricing power',
    why:'Best QSR unit economics. 15% annual unit growth + real pricing power + international expansion barely started (Europe, Middle East). Premium P/E consistently earned.',
    pills:['Unit Growth','Pricing Power','py','pg'] },


  { t:'NKE',   n:'Nike Inc.',                 cat:'Quality', size:'large', region:'us',
    emoji:'👟', bg:'rgba(245,197,66,.12)',  tier:['conservative','moderate'],
    status:'cheap',  metric:'P/E 22x',   valNote:'P/E 22x — near 10yr low. Turnaround in progress',
    why:'Nike peaked at $180, now ~$70-80. P/E 22x is near a 10-year low as new CEO Elliott Hill executes a return-to-sport strategy. Wholesale channel reset and product innovation cycle starting.',
    pills:['Brand Turnaround','P/E 10yr Low','py','pg'] },

  { t:'DIS',   n:'Walt Disney Company',       cat:'Quality', size:'large', region:'us',
    emoji:'🏰', bg:'rgba(79,163,247,.12)',  tier:['moderate','conservative'],
    status:'cheap',  metric:'P/E 20x',   valNote:'P/E 20x — below 5yr avg, streaming turning profit',
    why:'Disney+ reached profitability. Parks business generating record EBITDA. P/E of 20x is below 5yr avg while streaming pivot largely complete. ESPN direct-to-consumer is the next major catalyst.',
    pills:['Parks + Streaming','Streaming Profitable','pb','py'] },

  // ═══════════════════════════════════════════════════════
  // 8. CONSUMPTION GROWTH
  // ═══════════════════════════════════════════════════════
  { t:'ONON',  n:'On Running AG',             cat:'Consumption', size:'large', region:'europe',
    emoji:'👟', bg:'rgba(0,229,160,.12)',  tier:['moderate','aggressive'],
    status:'fair',   metric:'P/E 62x',   valNote:'Premium but 25%+ revenue growth earns it',
    why:'Swiss athletic brand growing 25%+ revenue globally. Roger Federer-backed. Moving into apparel and expanding in Asia. Athletic luxury positioning drives premium pricing that sticks.',
    pills:['25% Rev Growth','Athletic Luxury','pg','pb'] },

  { t:'DECK',  n:'Deckers Brands (HOKA)',     cat:'Consumption', size:'large', region:'us',
    emoji:'🥾', bg:'rgba(79,163,247,.12)',  tier:['moderate','conservative'],
    status:'cheap',  metric:'P/E 22x',   valNote:'P/E 22x below peer group for HOKA growth',
    why:'HOKA and UGG brand parent. P/E 22x below athletic footwear peers despite 20%+ HOKA growth. HOKA is in early innings of becoming a running shoe category leader globally.',
    pills:['HOKA Growth','Cheap P/E','pb','pg'] },

  { t:'HIMS',  n:'Hims & Hers Health',        cat:'Consumption', size:'mid',   region:'us',
    emoji:'💊', bg:'rgba(167,139,250,.12)', tier:['aggressive','moderate'],
    status:'fair',   metric:'P/S 4x',    valNote:'P/S 4x fair for 50%+ telehealth growth',
    why:'GLP-1 compounded weight loss drugs driving explosive growth. 50%+ revenue growth. P/S of 4x is fair for telehealth at this growth rate. Regulatory risk is the key variable to monitor.',
    pills:['GLP-1 Tailwind','50% Growth','pp','pr'] },

  { t:'CAVA',  n:'CAVA Group Inc.',           cat:'Consumption', size:'mid',   region:'us',
    emoji:'🥗', bg:'rgba(245,197,66,.12)',  tier:['aggressive','moderate'],
    status:'fair',   metric:'P/E 120x',  valNote:'Expensive P/E but Chipotle-early-days parallel',
    why:'Mediterranean QSR with Chipotle-level unit economics. 20%+ comp store growth. Yes, the P/E is high — so was Chipotle at this stage. The unit economics are real and expanding.',
    pills:['Next Chipotle','Unit Economics','py','pr'] },

  { t:'BROS',  n:'Dutch Bros Inc.',           cat:'Consumption', size:'mid',   region:'us',
    emoji:'☕', bg:'rgba(0,229,160,.12)',  tier:['aggressive','moderate'],
    status:'fair',   metric:'P/S 3x',    valNote:'P/S 3x reasonable for 20%+ unit expansion',
    why:'Drive-thru coffee chain with cult following growing 20%+ new stores annually. Still limited to Western US with massive national expansion opportunity ahead.',
    pills:['Drive-Thru Cult','Unit Expansion','pg','py'] },

  { t:'PJZZA', n:'Papa John\'s International', cat:'Consumption', size:'mid',   region:'us',
    emoji:'🍕', bg:'rgba(245,197,66,.12)',  tier:['moderate','conservative'],
    status:'cheap',  metric:'P/E 18x',   valNote:'P/E 18x — below historical avg, franchise recovery',
    why:'Pizza delivery franchise undergoing turnaround under new management. P/E of 18x below historical average. Delivery category is resilient. International franchise growth is underappreciated.',
    pills:['Pizza Recovery','P/E Below Avg','py','pg'] },

  { t:'DPZ',   n:'Domino\'s Pizza',           cat:'Consumption', size:'large', region:'us',
    emoji:'🍕', bg:'rgba(255,107,107,.12)', tier:['conservative','moderate'],
    status:'fair',   metric:'P/E 26x',   valNote:'P/E 26x — fair for best QSR tech + delivery moat',
    why:'Best technology platform in QSR — own delivery, own app, own loyalty. International segment is a compounding machine with 90+ markets. Consistent earnings growth through economic cycles.',
    pills:['Best QSR Tech','International Compounder','pr','py'] },

  { t:'MAMAEARTH',n:'Mamaearth (Honasa Consumer)',cat:'Consumption', size:'small', region:'asia',
    emoji:'🌿', bg:'rgba(0,229,160,.12)',  tier:['aggressive','moderate'],
    status:'cheap',  metric:'P/E 30x',   valNote:'P/E 30x — India D2C personal care at growth stage',
    why:'India\'s fastest-growing D2C personal care brand. Natural/clean beauty trend tailwind. P/E of 30x is reasonable for 30%+ revenue growth in the world\'s largest emerging consumer market.',
    pills:['India D2C','Natural Beauty','pg','pp'] },

  { t:'TPVG',  n:'TPB Brands (Turning Point Brands)',cat:'Consumption', size:'small', region:'us',
    emoji:'🌱', bg:'rgba(79,163,247,.12)',  tier:['aggressive','moderate'],
    status:'cheap',  metric:'P/E 11x',   valNote:'P/E 11x — alternative tobacco + ZYN competitor',
    why:'Alternative tobacco, ZYN-competitor nicotine pouches, and smokeless products. P/E of 11x extremely cheap for a profitable, cash-generative consumer brand growing in nicotine alternatives.',
    pills:['Alt Tobacco','P/E 11x','pb','pg'] },

  { t:'ELF',   n:'e.l.f. Beauty',             cat:'Consumption', size:'mid',   region:'us',
    emoji:'💄', bg:'rgba(167,139,250,.12)', tier:['moderate','aggressive'],
    status:'fair',   metric:'P/E 40x',   valNote:'P/E 40x — fair for fastest growing US cosmetics',
    why:'Fastest growing cosmetics brand in the US — disrupting with affordable dupes of luxury products. TikTok marketing drives viral adoption. International expansion just starting in UK and Europe.',
    pills:['Gen Z Cosmetics','TikTok Viral','pp','py'] },

  { t:'CELH',  n:'Celsius Holdings',          cat:'Consumption', size:'mid',   region:'us',
    emoji:'🥤', bg:'rgba(0,229,160,.12)',  tier:['moderate','aggressive'],
    status:'cheap',  metric:'P/S 4x',    valNote:'P/S 4x — below avg after Pepsi distribution reset',
    why:'Celsius is the fastest growing energy drink brand distributed through Pepsi. P/S has corrected to 4x after Pepsi normalized its channel inventory. International distribution is the next growth leg.',
    pills:['Energy Drink Growth','Pepsi Distribution','pg','pb'] },

  // ═══════════════════════════════════════════════════════
  // 9. FINTECH & STABLECOINS
  // ═══════════════════════════════════════════════════════
  { t:'COIN',  n:'Coinbase Global',           cat:'Fintech', size:'large', region:'us',
    emoji:'₿',  bg:'rgba(255,107,107,.12)', tier:['aggressive'],
    status:'fair',   metric:'P/E 25x',   valNote:'P/E 25x — fair in crypto upcycle',
    why:'US regulated crypto exchange + USDC stablecoin custody + Base L2 network. Profitable in bull cycles. Regulatory clarity from crypto-friendly policy environment is a major tailwind.',
    pills:['Crypto Exchange','USDC Stablecoin','pr','pg'] },

  { t:'HOOD',  n:'Robinhood Markets',         cat:'Fintech', size:'mid',   region:'us',
    emoji:'🏹', bg:'rgba(0,229,160,.12)',  tier:['aggressive','moderate'],
    status:'cheap',  metric:'P/E 18x',   valNote:'P/E 18x — crypto + options + retirement growth',
    why:'Crypto trading + options + Robinhood Retirement adding new revenue streams. P/E of 18x cheap for a platform rapidly adding features. Crypto and options upcycle is a direct tailwind.',
    pills:['Cheap P/E 18x','Crypto Tailwind','pg','pb'] },

  { t:'SOFI',  n:'SoFi Technologies',         cat:'Fintech', size:'mid',   region:'us',
    emoji:'🏦', bg:'rgba(79,163,247,.12)',  tier:['moderate','aggressive'],
    status:'cheap',  metric:'P/B 1.8x',  valNote:'P/B 1.8x below bank peers, 40% deposit growth',
    why:'Only fintech with a national bank charter. 40%+ deposit growth. P/B of 1.8x below traditional bank peers despite superior growth. Student loan refinancing recovery adds another leg.',
    pills:['Digital Bank','40% Deposit Growth','pb','pg'] },

  { t:'NU',    n:'Nu Holdings (Nubank)',       cat:'LATAM', size:'large', region:'latam',
    emoji:'🇧🇷', bg:'rgba(167,139,250,.12)', tier:['aggressive','moderate'],
    status:'cheap',  metric:'P/E 22x',   valNote:'P/E 22x for 50%+ earnings growth fintech',
    why:'100M+ customers in Brazil, Mexico, Colombia. Fastest growing bank in history. P/E of 22x extremely cheap for 50%+ earnings growth. LATAM digital banking is barely penetrated.',
    pills:['100M Customers','50% Earnings Growth','pp','pg'] },

  { t:'MELI',  n:'MercadoLibre Inc.',         cat:'LATAM', size:'large', region:'latam',
    emoji:'🛍️', bg:'rgba(0,229,160,.12)',  tier:['moderate','aggressive'],
    status:'fair',   metric:'P/E 58x',   valNote:'P/E 58x — LATAM e-com + fintech at 15% penetration',
    why:'Amazon + PayPal of Latin America. Mercado Pago fintech growing 30%+. LATAM e-commerce at 15% penetration vs US 20%+. P/E expensive but the TAM runway justifies the premium.',
    pills:['LATAM Amazon','Fintech + E-Com','pg','py'] },

  { t:'CRCL',  n:'Circle Internet (USDC)',    cat:'Fintech', size:'mid',   region:'us',
    emoji:'💵', bg:'rgba(245,197,66,.12)',  tier:['aggressive'],
    status:'fair',   metric:'N/A (IPO)',  valNote:'USDC issuer — stablecoin regulation tailwinds',
    why:'Issuer of USDC stablecoin — $45B+ in circulation. Stablecoin regulation passing creates massive tailwind. Pre-profitability but dominant position in the institutional stablecoin market.',
    pills:['USDC Issuer','Stablecoin Bill','py','pr'] },

  { t:'AFRM',  n:'Affirm Holdings',           cat:'Fintech', size:'mid',   region:'us',
    emoji:'💳', bg:'rgba(79,163,247,.12)',  tier:['aggressive','moderate'],
    status:'cheap',  metric:'P/S 5x',    valNote:'P/S 5x below 3yr avg — BNPL leader undervalued',
    why:'Buy Now Pay Later leader with 20M+ active consumers and Amazon + Shopify integrations. P/S of 5x well below 3yr average. Interest rate decline is a direct tailwind for BNPL economics.',
    pills:['BNPL Leader','P/S Below Avg','pb','pg'] },

  { t:'PYPL',  n:'PayPal Holdings',           cat:'Fintech', size:'large', region:'us',
    emoji:'💙', bg:'rgba(79,163,247,.12)',  tier:['moderate','conservative'],
    status:'cheap',  metric:'P/E 14x',   valNote:'P/E 14x — near 5yr low for payments leader',
    why:'PayPal peaked at $310, now ~$70. P/E of 14x near 5-year low. New CEO Alex Chriss focused on high-value users and Fastlane checkout. Venmo monetization is still in early innings.',
    pills:['Payments Turnaround','P/E 5yr Low','pb','py'] },

  { t:'BMNR',  n:'Bitmine Immersion (BMNR)',  cat:'Fintech', size:'small', region:'us',
    emoji:'⛏️', bg:'rgba(255,107,107,.12)', tier:['aggressive'],
    status:'fair',   metric:'N/A',       valNote:'Speculative BTC miner — immersion cooling edge',
    why:'Bitcoin miner using immersion cooling technology for higher efficiency. Small-cap speculative position. Only suitable for aggressive portfolios with very small allocation given binary risk.',
    pills:['BTC Mining','Immersion Tech','pr','pp'] },

  // ═══════════════════════════════════════════════════════
  // 10. LATAM — Latin America Growth
  // ═══════════════════════════════════════════════════════
  { t:'VALE',  n:'Vale S.A.',                 cat:'LATAM', size:'large', region:'latam',
    emoji:'⛏️', bg:'rgba(245,197,66,.12)',  tier:['moderate','conservative'],
    status:'cheap',  metric:'P/E 7x',    valNote:'P/E 7x — iron ore + EV nickel deeply cheap',
    why:'World\'s largest iron ore miner + growing EV nickel production. P/E of 7x is extremely cheap. 8%+ dividend yield. China infrastructure stimulus is a direct catalyst for iron ore demand.',
    pills:['P/E 7x','8% Dividend','py','pg'] },

  { t:'SE',    n:'Sea Limited',               cat:'LATAM', size:'large', region:'asia',
    emoji:'🌊', bg:'rgba(79,163,247,.12)',  tier:['aggressive','moderate'],
    status:'cheap',  metric:'P/S 3x',    valNote:'P/S 3x — Southeast Asia digital economy leader',
    why:'Shopee e-commerce + SeaMoney fintech + Garena gaming across Southeast Asia and LATAM. P/S of 3x well below its 3yr average of 15x. SE Asia is the fastest growing digital economy region.',
    pills:['SE Asia Leader','P/S Below Avg','pb','pg'] },

  // ═══════════════════════════════════════════════════════
  // 11. METALS & MINING
  // ═══════════════════════════════════════════════════════
  { t:'GLD',   n:'SPDR Gold Shares ETF',      cat:'Metals', size:'large', region:'global',
    emoji:'🥇', bg:'rgba(245,197,66,.12)',  tier:['conservative','moderate'],
    status:'fair',   metric:'Store of Value', valNote:'Central banks buying record gold — inflation hedge',
    why:'Physical gold ETF. Central banks globally buying record amounts. Inflation hedge and safe haven. De-dollarization trend is a structural tailwind for gold demand.',
    pills:['Inflation Hedge','Central Bank Buying','py','pg'] },

  { t:'SLV',   n:'iShares Silver Trust',      cat:'Metals', size:'large', region:'global',
    emoji:'🥈', bg:'rgba(167,139,250,.12)', tier:['moderate','aggressive'],
    status:'cheap',  metric:'Gold/Silver 90x',valNote:'90:1 ratio — silver historically cheap vs gold',
    why:'Silver at historic 90:1 discount to gold (historical 60:1). Dual monetary + industrial demand from EVs, solar panels, and electronics. When ratio mean-reverts, silver outperforms gold significantly.',
    pills:['Historically Cheap','EV+Solar Demand','pp','py'] },

  { t:'GDX',   n:'VanEck Gold Miners ETF',    cat:'Metals', size:'large', region:'global',
    emoji:'⛰️', bg:'rgba(245,197,66,.12)',  tier:['moderate','aggressive'],
    status:'cheap',  metric:'P/NAV 0.85x',valNote:'Miners below NAV — leveraged gold play',
    why:'Gold mining stocks at 0.85x NAV — rare discount to underlying gold. When gold rises, miners historically move 2-3x gold\'s return due to operating leverage. High conviction entry point.',
    pills:['Leveraged Gold','Below NAV','py','pg'] },

  { t:'SILJ',  n:'ETFMG Junior Silver Miners',cat:'Metals', size:'mid',   region:'global',
    emoji:'💿', bg:'rgba(167,139,250,.12)', tier:['aggressive'],
    status:'cheap',  metric:'P/NAV 0.7x', valNote:'Junior miners at extreme discount — high leverage',
    why:'Small and mid-cap silver miners with 3-5x leverage to silver price. At P/NAV 0.7x, the most extreme discount in the precious metals mining sector. High risk, highest leverage to a silver bull market.',
    pills:['Junior Miners','3-5x Silver Leverage','pp','pr'] },

  { t:'COPX',  n:'Global X Copper Miners ETF',cat:'Metals', size:'mid',   region:'global',
    emoji:'🟤', bg:'rgba(245,197,66,.12)',  tier:['moderate','aggressive'],
    status:'cheap',  metric:'P/E 12x',   valNote:'P/E 12x — copper demand structural from EVs+AI',
    why:'Copper is the key metal for electrification — EVs use 4x copper, charging infrastructure uses massive amounts. AI data centers need copper for cooling. Miners are cheap while demand is structural.',
    pills:['EV+AI Copper','P/E 12x','py','pg'] },

  { t:'PAAS',  n:'Pan American Silver',       cat:'Metals', size:'mid',   region:'canada',
    emoji:'🥈', bg:'rgba(167,139,250,.12)', tier:['moderate','aggressive'],
    status:'cheap',  metric:'P/NAV 0.9x',valNote:'Below NAV — largest primary silver miner',
    why:'Largest primary silver miner globally with mines across Mexico, Peru, and Argentina. P/NAV below 1x is rare. Silver industrial demand from EVs and solar panels adds a structural demand floor.',
    pills:['Silver Miner','P/NAV Below 1x','pp','py'] },

  { t:'WPM',   n:'Wheaton Precious Metals',   cat:'Metals', size:'large', region:'canada',
    emoji:'🌟', bg:'rgba(245,197,66,.12)',  tier:['conservative','moderate'],
    status:'fair',   metric:'P/CF 25x',  valNote:'Fair — streaming model, no capex or cost risk',
    why:'Precious metals streamer — pays upfront for future production at a fixed cost. No capex risk, no cost inflation risk. When gold or silver prices rise, Wheaton captures nearly pure margin expansion.',
    pills:['Streaming Model','No Capex Risk','py','pg'] },

  // ═══════════════════════════════════════════════════════
  // 12. DIVIDENDS & INCOME
  // ═══════════════════════════════════════════════════════
  { t:'KO',    n:'Coca-Cola Company',         cat:'Dividends', size:'large', region:'us',
    emoji:'🥤', bg:'rgba(0,229,160,.12)',  tier:['conservative','moderate'],
    status:'fair',   metric:'P/E 24x',   valNote:'62 consecutive dividend raises, fairly valued',
    why:'62 consecutive years of dividend increases — the ultimate proof of pricing power. Recession-proof with 200+ country distribution. P/E near historical average with 3.1% yield.',
    pills:['62yr Div Growth','3.1% Yield','pg','py'] },

  { t:'XOM',   n:'ExxonMobil Corp.',          cat:'Dividends', size:'large', region:'us',
    emoji:'⛽', bg:'rgba(245,197,66,.12)',  tier:['conservative'],
    status:'cheap',  metric:'P/E 13x',   valNote:'P/E 13x below 5yr avg, 3.5% and growing',
    why:'P/E 13x below 5yr average of 16x. 3.5% dividend growing every year. 40+ consecutive years of dividend raises. Pioneer acquisition made Exxon the dominant Permian Basin operator.',
    pills:['3.5% Yield','P/E Below Avg','py','pg'] },

  { t:'T',     n:'AT&T Inc.',                 cat:'Dividends', size:'large', region:'us',
    emoji:'📞', bg:'rgba(79,163,247,.12)',  tier:['conservative'],
    status:'cheap',  metric:'P/E 10x',   valNote:'P/E 10x, 5.7% yield, debt steadily declining',
    why:'P/E of 10x with 5.7% dividend yield. Debt declining significantly post-Warner spin-off. Telecom infrastructure is utility-like with sticky subscribers. Pure income play.',
    pills:['5.7% Yield','P/E 10x','pb','py'] },

  { t:'JNJ',   n:'Johnson & Johnson',         cat:'Dividends', size:'large', region:'us',
    emoji:'💉', bg:'rgba(0,229,160,.12)',  tier:['conservative','moderate'],
    status:'cheap',  metric:'P/E 14x',   valNote:'P/E 14x below 10yr avg 18x, 3.3% dividend',
    why:'60+ consecutive years of dividend growth. P/E 14x below 10-year average of 18x. MedTech segment growing 8%+ with robotics and electrophysiology as growth drivers.',
    pills:['60yr Div Growth','P/E Below 10yr Avg','pg','py'] },

  { t:'VZ',    n:'Verizon Communications',    cat:'Dividends', size:'large', region:'us',
    emoji:'📡', bg:'rgba(167,139,250,.12)', tier:['conservative'],
    status:'cheap',  metric:'P/E 9x',    valNote:'P/E 9x decade low, 6.4% yield',
    why:'P/E of 9x is near a decade low. 6.4% dividend yield with 5G capital investment now largely complete. Fixed wireless internet is an incremental revenue stream with high margins.',
    pills:['6.4% Yield','P/E 9x','pp','py'] },

  { t:'O',     n:'Realty Income Corp.',       cat:'Dividends', size:'large', region:'us',
    emoji:'🏪', bg:'rgba(245,197,66,.12)',  tier:['conservative','moderate'],
    status:'fair',   metric:'P/FFO 15x', valNote:'Monthly dividend REIT — fairly valued',
    why:'"The Monthly Dividend Company" — pays dividends every month. Net lease REIT with Walmart, Walgreens, 7-Eleven as tenants. 108 consecutive quarterly dividend increases. Excellent for income portfolios.',
    pills:['Monthly Dividend','108 Increases','py','pg'] },

  { t:'MO',    n:'Altria Group',              cat:'Dividends', size:'large', region:'us',
    emoji:'🚬', bg:'rgba(245,197,66,.12)',  tier:['conservative'],
    status:'cheap',  metric:'P/E 9x',    valNote:'P/E 9x, 9% dividend yield — max fear pricing',
    why:'9% dividend yield with P/E of 9x. Regulatory risk fully priced in. NJOY e-cigarette acquisition is a transition vehicle. One of the highest pure income yields in the large-cap universe.',
    pills:['9% Yield','P/E 9x','py','pr'] },

  { t:'PM',    n:'Philip Morris International',cat:'Dividends', size:'large', region:'us',
    emoji:'🌐', bg:'rgba(79,163,247,.12)',  tier:['conservative','moderate'],
    status:'fair',   metric:'P/E 19x',   valNote:'P/E 19x — IQOS smoke-free transition leader',
    why:'Philip Morris\'s IQOS heated tobacco product is disrupting cigarettes globally. Smoke-free products now >40% of revenue. P/E of 19x fair for a company transforming its business model with a 5% yield.',
    pills:['5% Yield','IQOS Growth','pb','py'] },

  { t:'MCD',   n:'McDonald\'s Corporation',   cat:'Dividends', size:'large', region:'us',
    emoji:'🍟', bg:'rgba(245,197,66,.12)',  tier:['conservative','moderate'],
    status:'fair',   metric:'P/E 24x',   valNote:'P/E 24x — fair for 48yr dividend streak',
    why:'48 consecutive years of dividend growth. Franchise model generates high-margin royalties globally. Digital and delivery platform now accounting for >40% of systemwide sales.',
    pills:['48yr Div Growth','3% Yield','py','pg'] },

  { t:'ABT',   n:'Abbott Laboratories',       cat:'Dividends', size:'large', region:'us',
    emoji:'🩺', bg:'rgba(0,229,160,.12)',  tier:['conservative','moderate'],
    status:'fair',   metric:'P/E 24x',   valNote:'P/E 24x — Libre CGM + cardiac devices compounder',
    why:'FreeStyle Libre continuous glucose monitor is a 20%+ growth business. Cardiac rhythm devices growing 10%+. 52 consecutive years of dividend growth. Best healthcare dividend growth story.',
    pills:['52yr Div Growth','2% Yield','pg','pb'] },

  // ═══════════════════════════════════════════════════════
  // 13. INNOVATION / SPACE / DEFENSE TECH
  // ═══════════════════════════════════════════════════════
  { t:'MDA',   n:'MDA Space Ltd.',            cat:'Innovation/Space', size:'mid', region:'canada',
    emoji:'🛸', bg:'rgba(79,163,247,.12)',  tier:['aggressive','moderate'],
    status:'cheap',  metric:'P/E 28x',   valNote:'P/E 28x — Canadarm3 + satellite servicing',
    why:'Canadian space technology company building Canadarm3 for NASA Lunar Gateway + commercial satellite servicing robots. P/E 28x is cheap for a defense-adjacent space business with government-contracted revenue.',
    pills:['Canadarm3','Space Robotics','pb','pg'] },

  { t:'RCM',   n:'Kraken Robotics',           cat:'Robotics/Defense', size:'small', region:'canada',
    emoji:'🦑', bg:'rgba(0,229,160,.12)',  tier:['aggressive'],
    status:'cheap',  metric:'P/S 3x',    valNote:'P/S 3x — military sonar and underwater drones',
    why:'Canadian small-cap making acoustic modems, sonars, and unmanned underwater vehicles for NATO navies. P/S of 3x is cheap for a defense-adjacent company growing revenue 50%+. NATO spending surge is a direct tailwind.',
    pills:['NATO UUV','50% Revenue Growth','pg','pr'] },

  { t:'RKLB',  n:'Rocket Lab USA',            cat:'Innovation/Space', size:'mid',   region:'us',
    emoji:'🚀', bg:'rgba(167,139,250,.12)', tier:['aggressive'],
    status:'fair',   metric:'P/S 14x',   valNote:'P/S 14x — small launch + space systems growth',
    why:'Most frequent orbital launch provider after SpaceX. Electron rocket + Neutron in development. Space systems (spacecraft manufacturing) growing 50%+ and becoming the larger revenue segment.',
    pills:['Frequent Launcher','Space Systems','pp','pr'] },

  { t:'ASTS',  n:'AST SpaceMobile',           cat:'Innovation/Space', size:'small', region:'us',
    emoji:'📡', bg:'rgba(255,107,107,.12)', tier:['aggressive'],
    status:'fair',   metric:'P/S 40x',   valNote:'Pre-revenue — direct-to-device satellite broadband',
    why:'Building a direct-to-smartphone satellite broadband network. AT&T and Verizon already signed deals. Pre-revenue but the TAM (5.3B people without broadband) is enormous. High risk, high optionality.',
    pills:['Direct-to-Device','AT&T+Verizon Deals','pr','pp'] },

  { t:'PLTR',  n:'Palantir Technologies',     cat:'Innovation/Space', size:'large', region:'us',
    emoji:'🔮', bg:'rgba(0,229,160,.12)',  tier:['aggressive','moderate'],
    status:'fair',   metric:'P/S 28x',   valNote:'Premium P/S for AIP AI government dominance',
    why:'AIP (Artificial Intelligence Platform) winning massive US government and commercial contracts. Revenue accelerating to 30%+ growth. Premium P/S but the moat in defense AI is very real.',
    pills:['AI Platform','Gov Defense','pg','py'] },

  { t:'IRDM',  n:'Iridium Communications',    cat:'Innovation/Space', size:'mid',   region:'us',
    emoji:'🛰️', bg:'rgba(79,163,247,.12)',  tier:['moderate','conservative'],
    status:'cheap',  metric:'P/E 22x',   valNote:'P/E 22x — only truly global satellite network',
    why:'Only satellite constellation covering 100% of the Earth including poles and oceans. Maritime, aviation, IoT connectivity. P/E of 22x reasonable for a mission-critical infrastructure monopoly.',
    pills:['Global Monopoly','P/E 22x','pb','pg'] },

  { t:'HII',   n:'Huntington Ingalls Industries',cat:'Innovation/Space', size:'large', region:'us',
    emoji:'⚓', bg:'rgba(79,163,247,.12)',  tier:['conservative','moderate'],
    status:'cheap',  metric:'P/E 16x',   valNote:'P/E 16x — only US nuclear sub/carrier builder',
    why:'America\'s only nuclear submarine and aircraft carrier shipbuilder. P/E 16x below historical average. Defense spending is bipartisan. 30+ year backlogs make revenue highly predictable.',
    pills:['Nuclear Sub Builder','P/E Below Avg','pb','py'] },

  { t:'KTOS',  n:'Kratos Defense & Security',  cat:'Innovation/Space', size:'mid',   region:'us',
    emoji:'✈️', bg:'rgba(167,139,250,.12)', tier:['aggressive','moderate'],
    status:'fair',   metric:'P/S 4x',    valNote:'P/S 4x — affordable drone platforms for DoD',
    why:'Makes affordable unmanned aerial systems and electronic warfare systems for the US DoD. Low-cost attritable drones are the new defense strategy. P/S of 4x fair for 15%+ revenue growth.',
    pills:['Affordable Drones','DoD Contract','pp','pb'] },

  // ═══════════════════════════════════════════════════════
  // 14. ROBOTICS & AUTOMATION
  // ═══════════════════════════════════════════════════════
  { t:'ISRG',  n:'Intuitive Surgical',        cat:'Robotics/Defense', size:'large', region:'us',
    emoji:'🤖', bg:'rgba(0,229,160,.12)',  tier:['conservative','moderate'],
    status:'fair',   metric:'P/E 68x',   valNote:'Premium — robotic surgery monopoly',
    why:'Da Vinci surgical robot installed in every major hospital globally. 15%+ procedure growth. Premium P/E justified by near-monopoly in robotic-assisted surgery and high switching costs.',
    pills:['Surgical Monopoly','15% Proc Growth','pg','py'] },

  { t:'FANUY', n:'FANUC Corporation',         cat:'Robotics/Defense', size:'large', region:'asia',
    emoji:'🦾', bg:'rgba(79,163,247,.12)',  tier:['moderate','conservative'],
    status:'cheap',  metric:'P/E 22x',   valNote:'P/E 22x — industrial robot leader at trough',
    why:'World\'s largest industrial robot manufacturer. P/E of 22x is near cycle trough as auto and electronics capex pauses. EV manufacturing buildout is a massive long-term catalyst for industrial robots.',
    pills:['Industrial Robot Leader','EV Manufacturing','pb','pg'] },

  { t:'ADSK',  n:'Autodesk Inc.',             cat:'Robotics/Defense', size:'large', region:'us',
    emoji:'📏', bg:'rgba(167,139,250,.12)', tier:['moderate','conservative'],
    status:'cheap',  metric:'P/E 30x',   valNote:'P/E 30x below 5yr avg — AEC software monopoly',
    why:'Architecture, Engineering, Construction software monopoly. P/E of 30x below 5yr average. Construction AI and digital twin integration is expanding TAM meaningfully.',
    pills:['AEC Monopoly','Digital Twins','pp','py'] },

  { t:'BLDP',  n:'Ballard Power Systems',     cat:'Robotics/Defense', size:'small', region:'canada',
    emoji:'⚡', bg:'rgba(0,229,160,.12)',  tier:['aggressive'],
    status:'fair',   metric:'P/S 6x',    valNote:'P/S 6x — fuel cell technology for heavy transport',
    why:'Canadian hydrogen fuel cell leader for buses, trucks, and trains. P/S 6x is reasonable at the inflection of commercial scaling. Heavy transport electrification is one area where hydrogen wins over battery.',
    pills:['Hydrogen Fuel Cell','Heavy Transport','pg','pr'] },

  { t:'TER',   n:'Teradyne Inc.',             cat:'Robotics/Defense', size:'large', region:'us',
    emoji:'🔬', bg:'rgba(79,163,247,.12)',  tier:['moderate','aggressive'],
    status:'cheap',  metric:'P/E 28x',   valNote:'P/E 28x below 5yr avg — AI chip testing leader',
    why:'Tests every major AI chip (NVDA, AMD, Apple Silicon) before it ships. P/E of 28x below 5yr average. Universal Robots division is the collaborative robot market leader.',
    pills:['AI Chip Testing','Cobot Leader','pb','pg'] },

  // ═══════════════════════════════════════════════════════
  // 15. GLP-1 & HEALTHCARE
  // ═══════════════════════════════════════════════════════
  { t:'NVO',   n:'Novo Nordisk A/S',         cat:'GLP1', size:'large', region:'europe',
    emoji:'💉', bg:'rgba(0,229,160,.12)',  tier:['aggressive','moderate'],
    status:'cheap',  metric:'P/E 20x',   valNote:'DKK 900→450. P/E 20x — GLP-1 pioneer re-rated',
    why:'Ozempic and Wegovy inventor. Peaked near DKK 900, now ~DKK 450 after CagriSema trial miss. P/E 20x is historically cheap for the company that created the GLP-1 category with $20B+ annual revenue.',
    pills:['Ozempic Pioneer','P/E 20x','pg','pb'] },

  { t:'LLY',   n:'Eli Lilly & Company',      cat:'GLP1', size:'large', region:'us',
    emoji:'🔬', bg:'rgba(79,163,247,.12)',  tier:['aggressive','moderate'],
    status:'fair',   metric:'P/E 38x',   valNote:'P/E 38x — below 2024 peak of 60x',
    why:'Mounjaro and Zepbound are the fastest-growing drugs in pharma history. P/E 38x below 2024 peak of 60x. Tirzepatide cardiovascular outcomes data adds long-term upside beyond weight loss.',
    pills:['Mounjaro Leader','P/E Below Peak','pb','py'] },

  { t:'VKTX',  n:'Viking Therapeutics',      cat:'GLP1', size:'small', region:'us',
    emoji:'⚗️', bg:'rgba(255,107,107,.12)', tier:['aggressive'],
    status:'fair',   metric:'P/S 25x',   valNote:'Clinical stage — oral GLP-1 pill binary catalyst',
    why:'Oral GLP-1 pill in Phase 2 — could replace injections entirely. Binary risk but enormous TAM. Only for aggressive portfolios with very small allocation.',
    pills:['Oral GLP-1','Binary Catalyst','pr','pp'] },

  // ── NKE (replaces LULU in Quality) ──────────────────────────────────
  { t:'NKE',   n:'Nike Inc.',                cat:'Quality', size:'large', region:'us',
    emoji:'👟', bg:'rgba(245,197,66,.12)',  tier:['conservative','moderate'],
    status:'cheap',  metric:'P/E 22x',   valNote:'$180→$75. P/E near 10yr low — turnaround starting',
    why:'Nike peaked at $180, now ~$75. P/E 22x near a 10-year low as new CEO Elliott Hill executes a return-to-sport strategy. Product innovation cycle and wholesale channel rebuild just beginning.',
    pills:['Brand Turnaround','P/E 10yr Low','py','pg'] },

];

// Export for use in success.html and proxy.js
if (typeof module !== 'undefined') module.exports = { UNIVERSE };
