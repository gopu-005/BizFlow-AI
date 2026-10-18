# BizFlow AI — Agentic Small Business Operating System

> **An autonomous, multi-agent operating system tailored for small businesses in India (retailers, grocery stores, clothing shops, distributors, and service providers).**
> **Subscription: ₹299 / month ("BizFlow AI Starter") with server-enforced usage quotas and guardrails.**

![BizFlow AI](https://raw.githubusercontent.com/gopu-005/BizFlow-AI/main/public/banner.png)

BizFlow AI transforms traditional conversational ERP into an agentic small business operating system. Three integrated autonomous agents operate on a shared execution engine with server-enforced autonomy guardrails, human approvals, and deterministic financial accounting.

---

## ✨ Integrated Autonomous Agents

1. **Smart Entry Agent (`/agent?tab=entry`)**:
   - Converts everyday document photos, PDF supplier invoices, purchase receipts, and natural-language expenses into structured records.
   - Detects duplicate bills and mismatched line totals.
   - **Stock Safety Rule:** Inventory stock is strictly updated only through verified goods-receipt workflows, never inflated by invoice upload alone.
   - Prepares human-reviewable drafts for owner confirmation.

2. **Udhaar & Collection Agent (`/udhaar`)**:
   - Dedicated customer credit ledger with 4 aging buckets: Current (0–15d), 16–30d, 31–60d, and 60+ days.
   - Schedules and tracks payment commitments/promises with fulfillment status.
   - Generates personalized WhatsApp reminders with verified `wa.me` click-to-chat links.
   - Transactionally logs verified payments, deducts customer balances, and prevents duplicate receipts.

3. **Profit Leak & Daily Closing Agent (`/closing`)**:
   - End-of-day financial reconciliation of finalized sales vs recorded digital/cash collections.
   - Detects cash variance (expected vs recorded cash in hand).
   - Audits margin anomalies: flags products selling below target margin (<15%) or with unusual discounts.
   - Matches unmatched bank/UPI transactions to open invoices.
   - Produces official Daily Closing Reports backed by verified database records.

4. **Shared Agent Execution Engine (`/agent`)**:
   - Shared multi-step orchestration across 16 typed backend business tools.
   - 3 Server-enforced autonomy modes:
     - `suggest_only`: Prepares drafts and recommendations only.
     - `guarded_autopilot` (default): Consequential financial ledger mutations require human approval.
     - `trusted_autopilot`: Autonomous execution within owner-defined thresholds (up to ₹50,000).
   - Bounded execution loops, error recovery, step-by-step audit timelines, and source-record traceability.

5. **Subscription & Quota Management (`/billing`)**:
   - "BizFlow AI Starter" plan at **₹299/month** (or ₹2,999/year).
   - Server-enforced monthly quotas: 100 AI workflow runs & 50 document extractions.
   - Live usage meter with unblocked manual CRUD operations when quota limits are reached.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 14](https://nextjs.org/) (App Router, Server & Client Components) |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) & Vanilla CSS |
| **3D & Visuals** | HTML5 Canvas (3D Euler orbit geometry, screen-blend caustic fluid simulations) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Voice / Speech** | Web Speech API (`webkitSpeechRecognition` & `speechSynthesis`) |
| **Document Export** | [jsPDF](https://github.com/parallax/jsPDF) & [jspdf-autotable](https://github.com/simonbengtsson/jsPDF-AutoTable) |
| **Data Parsing** | [SheetJS (xlsx)](https://sheetjs.com/) & [PapaParse](https://www.papaparse.com/) |

---

## 📁 Project Structure

```text
BizFlow AI/
├── app/
│   ├── api/                 # API route handlers (chat, connectors, ERP inventory/sales/invoices)
│   ├── sales/               # Dedicated Sales ledger & performance route
│   ├── inventory/           # Dedicated Inventory & low-stock route
│   ├── invoices/            # Dedicated GST Invoice generator & history route
│   ├── customers/           # Dedicated CRM & WhatsApp follow-ups route
│   ├── reports/             # Dedicated Executive Business analytics route
│   ├── connectors/          # Dedicated Connected Apps & data feeds route
│   ├── import/              # Dedicated Handwritten register & Excel import route
│   ├── billing/             # Dedicated All-in-One plan & Razorpay checkout route
│   ├── globals.css          # Core design tokens, gradients, glassmorphism styles
│   ├── layout.tsx           # Root HTML layout & fonts (Inter, Outfit, Caveat)
│   └── page.tsx             # Main Voice Assistant dashboard & intelligent route redirector
├── components/
│   ├── Navbar.tsx           # Unified top navigation bar across all routes
│   ├── Footer.tsx           # Shared footer with Product by LyKSpire
│   ├── AiVoiceOrb.tsx       # Realistic 3D spherical ball with swirling neon fluid & audio visualizer
│   └── panels/              # Contextual slide panels & action dialogs
│       ├── BillingModal.tsx
│       ├── ConnectorsDialog.tsx
│       ├── FollowUpsPanel.tsx
│       ├── ImportDataPanel.tsx
│       ├── InvoiceDraftPanel.tsx
│       ├── LowStockPanel.tsx
│       └── SalesSummaryPanel.tsx
├── data/                    # Local JSON database storage & fallback fixtures
├── lib/
│   ├── ai/                  # Conversational parser & rules-first NLP engine
│   ├── billing/             # Subscription plans & payment handlers
│   ├── db/                  # In-memory and disk persistence layer
│   ├── erp/                 # Invoice generator, sales queries, PDF builders
│   └── voice/               # Speech recognition and natural voice manager
├── types/                   # Unified TypeScript data models
└── scripts/                 # Automated smoke tests
```

---

## 🚀 Getting Started & Setup

Follow these steps to run BizFlow AI on your local environment:

### 1. Prerequisites

- **Node.js**: v18.17.0 or higher ([Download Node.js](https://nodejs.org/))
- **npm**: v9.0.0 or higher (comes bundled with Node.js)
- **Modern Web Browser**: Google Chrome, Brave, or Microsoft Edge (recommended for Web Speech API microphone support)

---

### 2. Clone the Repository

```bash
git clone https://github.com/gopu-005/BizFlow-AI.git
cd BizFlow-AI
```

---

### 3. Install Dependencies

```bash
npm install
```

---

### 4. Configure Environment Variables

Create a `.env.local` file in the root directory by copying the example template:

```bash
cp .env.example .env.local
```

Open `.env.local` and configure credentials if needed:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database (Optional - defaults to local embedded storage in data/bizflow-db.json)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bizflow_production

# Razorpay Test Credentials (Optional)
RAZORPAY_KEY_ID=rzp_test_bizflow999
RAZORPAY_KEY_SECRET=secret_bizflow_test_key_8841

# Optional Integrations
GEMINI_API_KEY=
GOOGLE_CLIENT_ID=
WHATSAPP_ACCESS_TOKEN=
```

> **Note:** BizFlow AI works right out of the box without external API keys using its embedded rules-first query engine and local database.

---

### 5. Run the Development Server

```bash
npm run dev
```

Open your browser and navigate to:

👉 **[http://localhost:3000](http://localhost:3000)**

---

### 6. Run Smoke Tests

To verify that all API endpoints, ERP data routes, and voice utilities pass integrity checks:

```bash
npm test
```

---

### 7. Build for Production

To create an optimized production build:

```bash
npm run build
npm start
```

---

## 🎙️ Sample Voice & Text Prompts

You can speak or type any of the following natural commands into the assistant:

- **Sales:** *"How much sales did we do today?"* or *"Today's sales breakdown"*
- **Inventory:** *"Which products are low in stock?"*
- **Invoices:** *"Create invoice for Priya for 2 Silk Sarees"*
- **Follow-ups:** *"Show pending customer follow-ups"*
- **Mails & Messaging:** *"Check my emails"* or *"Show new WhatsApp orders"*
- **Tamil Commands:** *"இன்றைய விற்பனை எவ்வளவு?"* (How much was today's sale?)

---

## 📄 License

This project is licensed under the MIT License — see the LICENSE file for details.
