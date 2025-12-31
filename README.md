
# STOKKR – Smart ERP for Distributors & SMEs

Stokkr is a **web-based ERP system** designed for small and medium businesses, especially **FMCG distributors** (e.g., Parle distributors).
It focuses on **inventory control, accounting accuracy, and financial clarity**, similar to industry tools like Marg ERP.



## 🚀 Key Features

### 1️⃣ Billing & Party Management

* Create and manage **sales invoices**
* Track **payment status** (Pending / Completed)
* Manage **customers and suppliers** in a centralized Party module
* Support for **partial payments** and outstanding balances

---

### 2️⃣ Inventory Management

* Real-time stock tracking
* **Batch-wise inventory management**
* **Expiry date tracking** for perishable goods
* Low-stock and expiring-soon indicators
* FIFO-based stock usage for accurate accounting

---

### 3️⃣ Accounts Receivable & Payable

* **Receivables**: Track customer dues invoice-wise
* **Payables**: Track supplier dues batch-wise
* Automatic payment status updates
* Clear visibility of pending and completed payments

---

### 4️⃣ Expense Tracking

* Record operational expenses such as:

  * Rent
  * Transportation
  * Salaries
  * Maintenance
  * Interest on loans
* Category-wise expense management
* Monthly expense summaries

---

### 5️⃣ Profit & Loss Statement (Industry-Standard)

* Month & year selectable P&L
* Uses **Cost of Goods Sold (COGS)** to ensure accurate profit calculation
* Includes:

  * Sales
  * COGS
  * Operating expenses
  * Interest cost
  * Configurable tax
* Prevents artificial losses due to unsold inventory

---

### 6️⃣ Cash Flow Statement

* Monthly cash flow analysis
* Based strictly on **actual cash movements**
* Separates profit from liquidity
* Includes:

  * Cash received from customers
  * Cash paid for expenses
  * Loan-related cash movements

---

### 7️⃣ Dashboard & Analytics

* Financial health KPIs:

  * Monthly sales
  * Monthly expenses
  * Net profit / loss
  * Outstanding amount
* Month & year selectors
* Clean, ERP-style dashboard layout

---

### 8️⃣ Data Export

* CSV export support for:

  * Expenses
  * Receivables
  * Payables
  * Monthly P&L
  * Cash Flow statements

---

## 🛠 Tech Stack

* **Frontend & Backend**: Next.js (App Router), TypeScript
* **Database**: PostgreSQL with Prisma ORM
* **Authentication**: Firebase Auth + NextAuth.js
* **UI**: Tailwind CSS, Lucide Icons

---

## 💻 Local Setup

### 1. Prerequisites

* Node.js (v18+)
* npm
* PostgreSQL

### 2. Clone & Install

```bash
git clone https://github.com/AmanPatil91/Stokkr-Smart-ERP-software-.git
cd Stokkr-Smart-ERP-software-
npm install
```

### 3. Environment Variables

Create `.env.local` in the root directory:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/stokkr_db"

NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your_secret"

NEXT_PUBLIC_FIREBASE_API_KEY="..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="..."
NEXT_PUBLIC_FIREBASE_PROJECT_ID="..."

FIREBASE_PROJECT_ID="..."
FIREBASE_CLIENT_EMAIL="..."
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 4. Initialize Database

```bash
npx prisma db push
npx prisma generate
```

### 5. Run the App

```bash
npm run dev
```

Open 👉 `http://localhost:3000`

---

## 🎯 Project Objective

Stokkr was built as an **industrial ERP project** to demonstrate:

* Correct accounting principles (COGS, accrual vs cash flow)
* Real-world distributor workflows
* Clean system design with scalable architecture
* Practical financial reporting for SMEs

---

## 📌 Ideal Use Case

* FMCG distributors
* Wholesale businesses
* Small trading firms
* Academic / industrial ERP demonstrations



