# FinTrack • Smart Expense Tracker & Financial Dashboard

A premium, modern, and privacy-focused Personal Expense Tracker web application built entirely using **HTML5, Vanilla CSS3 (Custom Glassmorphic Design System), and ES6+ JavaScript**.

---

## 🌟 Key Features

### 1. 🔐 User Authentication & Multi-Account System
- **Create Account**: Register with Full Name, Email, Password, Preferred Currency (₹ INR, $ USD, € EUR, £ GBP, etc.), and Opening Balance.
- **Login**: Instant session validation and password hashing simulation.
- **⚡ Instant Live Demo Login**: Click one button ("Test Demo") to immediately explore a pre-populated account (*Aryan Sharma*) with months of realistic salaries, freelance gigs, bills, groceries, dining, gadgets, charts, and budgets!
- **Session Persistence**: Stays logged in on refresh via `localStorage`.

### 2. 📊 Dynamic Financial Dashboard
- **Real-Time KPI Cards**:
  - **Total Net Balance** (Available liquid funds)
  - **Monthly Income** (Total inflow this calendar month)
  - **Monthly Expenses** (Total outflow this month with comparison vs last month)
  - **Monthly Savings Rate** (Percentage saved with dynamic progress)
- **Interactive Visual Charts (Chart.js)**:
  - **Cash Flow Trend**: Grouped bar chart comparing Income vs Expenses over the past 6 months.
  - **Expense Category Breakdown**: Doughnut chart showing percentage spending distribution with custom hover tooltips.
- **Recent Transactions Feed**: Quick table of latest income and expenses with category icons and colored amounts.
- **Monthly Budgets Snapshot**: Live progress meters showing status per category.

### 3. 💳 Comprehensive Transaction Management
- **Add / Edit Modal**:
  - Segmented toggle between **Expense** (Rose) and **Income** (Emerald).
  - Emoji Category Picker (🍔 Food, 🛒 Groceries, 🏠 Housing, 🚗 Transport, 🛍️ Shopping, 🎬 Entertainment, ⚡ Utilities, 💊 Health, 💼 Salary, 💻 Freelance, 📈 Investments, 📦 Other).
  - Payment Method (UPI, Credit Card, Debit Card, Net Banking, Cash, Bank Transfer).
  - Recurring Monthly commitment indicator.
  - Custom notes / tags.
- **Search & Advanced Filters**:
  - Instant live keyword search.
  - Filter by Type (All / Income / Expense).
  - Filter by Category.
  - Filter by Date Period (This Month, Last Month, Last 30 Days, This Year, All Time).
  - Sort by Date or Amount (Ascending / Descending).
- **Safe Delete with Undo**:
  - When a transaction is deleted, a floating toast appears with a 5-second **Undo** action to restore it immediately!

### 4. 🎯 Category Budgets & Savings Goals
- **Category Spending Caps**: Set monthly budget caps (e.g. ₹20,000 for Food). Visual meter dynamically changes color:
  - 🟢 Safe (< 70%)
  - 🟡 Warning (70% - 89%)
  - 🔴 Overbudget / Danger (≥ 90%)
- **Savings Goals**:
  - Create milestone targets (e.g. Emergency Fund, New Laptop, Vacation).
  - "+ Add Funds" modal to deposit savings and watch your goal progress bar grow.

### 5. 📈 Analytics & Reports
- Lifetime cumulative expenses and inflows.
- Average expense ticket size.
- Top spending merchant/category highlights.

### 6. ⚙️ Settings, Privacy & Data Portability
- **Currency Switcher**: Switch between ₹ INR, $ USD, € EUR, £ GBP, etc.
- **Export to CSV**: Download spreadsheet compatible with Microsoft Excel & Google Sheets.
- **JSON Backup**: Download complete backup file of all accounts, transactions, budgets, and goals.
- **Restore Backup**: Upload JSON file to restore data anytime.
- **100% Client-Side Privacy**: All data is stored in your browser's `localStorage` — no third-party servers tracking your private transactions.

---

## 🚀 How to Run

You can run this project in any standard browser:

### Option A: Direct Open
Double click `index.html` in your file explorer / Finder to open directly in Chrome, Safari, Edge, or Brave.

### Option B: Local Web Server
Run using Python:
```bash
python3 -m http.server 3000
```
Then open `http://localhost:3000` in your web browser.

### Option C: Vercel Deployment (Production)

Deploy directly to Vercel with zero configuration:

1. **Via Vercel CLI**:
   ```bash
   npx vercel
   ```
2. **Via GitHub / Vercel Dashboard**:
   - Push this repo to your GitHub:
     ```bash
     git add .
     git commit -m "Deploy FinTrack on Vercel"
     git push
     ```
   - Go to [vercel.com/new](https://vercel.com/new), select this repository, and click **Deploy**.
   - Vercel will automatically read `vercel.json` and deploy it instantly as a global static application.

---

## 📁 File Structure

```
aryan/
├── index.html            # Main HTML document with semantic views & dialog modals
├── vercel.json           # Vercel configuration (SPA rewrites, security headers, caching)
├── .vercelignore         # Vercel deployment ignore rules
├── .gitignore            # Git exclusion rules
├── package.json          # Project metadata & scripts
├── css/
│   ├── variables.css     # Dual-theme tokens (Terminal Zinc Dark & Studio Slate Light)
│   ├── base.css          # Reset, Geist typography, View Transitions, badges
│   ├── auth.css          # Authentication screen with ambient spotlight & telemetry
│   ├── dashboard.css     # KPI cards, charts layout, high-density ledger, budgets
│   └── components.css    # Top-layer animated dialogs, category picker, Sonner toasts
└── js/
    ├── app.js            # App orchestrator, View Transitions, shortcuts (T, ⌘K, 1-5)
    ├── auth.js           # Multi-user authentication & session management
    ├── auth-bg.js        # 60fps interactive constellation canvas with mouse attraction
    ├── storage.js        # Multi-user schema, SVG vector icons, CSV/JSON portability
    ├── ui.js             # UI rendering, monospaced tabular figures, toast engine
    └── charts.js         # Theme-aware Chart.js data visualization engine
```
