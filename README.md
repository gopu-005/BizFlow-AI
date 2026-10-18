# BizFlow AI — One-Screen Conversational ERP

> **A voice-first, one-screen Conversational ERP assistant tailored for small & medium businesses, retail shops, and local enterprises.**

![BizFlow AI](https://raw.githubusercontent.com/gopu-005/BizFlow-AI/main/public/banner.png)

BizFlow AI reimagines traditional enterprise resource planning into an intuitive, distraction-free conversational experience. Speak or type in everyday English or Tamil to check today's sales, audit low-stock items, draft and download GST-compliant PDF invoices, and trigger customer follow-ups—all without leaving a single screen.

---

## ✨ Key Features

- **Realistic 3D Spherical Neon Fluid Assistant:**
  - Dynamic glass sphere rendered with 3D caustic caustics, Fresnel rim reflections, and volumetric swirling neon fluid ribbons.
  - Flanking audio equalizer lines that react dynamically with vocal waveforms when the user speaks and when the AI responds.
- **Multilingual Voice Interaction:**
  - Natural speech recognition and speech synthesis supporting both **English** and **Tamil** (`en-IN` & `ta-IN`).
  - Clean single natural assistant voice mode with one-click stop/mute controls.
- **Unified One-Screen Operations:**
  - **Today's Sales & Revenue:** Real-time breakdown of cash, UPI, and card sales with transaction histories.
  - **Inventory Health:** Instant low-stock alerts, reorder thresholds, and unit metrics.
  - **Instant GST Invoice Generator:** Contextual draft generation with automatic CGST/SGST calculations and one-click PDF downloads.
  - **Customer CRM & Follow-ups:** Automated pending dues reminders and WhatsApp message drafts.
- **Sliding Action Drawers:**
  - Distraction-free interface with hidden drawers for **Quick Actions** and **Connected Apps** that slide smoothly into view from the screen edges on click.
- **Connected Integrations:**
  - Mock and live connectors for **Gmail**, **WhatsApp Business API**, **PostgreSQL**, and **Excel/CSV Data Import**.

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
│   ├── globals.css          # Core design tokens, gradients, glassmorphism styles
│   ├── layout.tsx           # Root HTML layout & fonts (Inter, Outfit, Caveat)
│   └── page.tsx             # Main dashboard, header, drawer controls & contextual workspace
├── components/
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
