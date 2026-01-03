# Stokkr ERP - Smart Inventory & Financial Management

Stokkr is a smart ERP system designed for Small and Medium Enterprises (SMEs) to manage inventory, sales, and financial health with precision. It focuses on batch-wise tracking and accurate profit calculation using FIFO-based Cost of Goods Sold (COGS).

## 🚀 Core Features

- **Sales Invoicing**: Create professional sales invoices with automated inventory deductions.
- **Inventory & Batch Tracking**: Monitor stock levels with batch-wise details, including expiry dates and low-stock alerts.
- **Expense Tracking**: Record and categorize operating expenses (Rent, Salaries, Transportation, etc.).
- **Accounts Receivable & Payable**: Track customer dues and supplier payments with invoice-level detail.
- **Dashboard Analytics**: Real-time KPIs for monthly sales, expenses, and net profit.
- **Business Insights Assistant**: A read-only AI chatbot that provides natural language summaries of your business data.
- **Financial Reports**: Derived reports including Profit & Loss (P&L), Cash Flow, and Balance Sheets.

## 🛠 Tech Stack

- **Frontend**: [Next.js](https://nextjs.org/) (App Router)
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL
- **ORM**: [Prisma](https://www.prisma.io/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **AI**: OpenAI (GPT-4o-mini) for read-only business insights

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js**: v18 or higher
- **npm**: (comes with Node.js)
- **PostgreSQL**: Local installation or a cloud-hosted instance
- **Git**: To clone the repository

## ⚙️ Getting Started

### 1. Clone the Repository

```bash
git clone <repo-url>
cd stokkr-erp
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables Setup

Create a file named `.env.local` in the root directory and add the following variables:

```env
# Database connection string
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"

# NextAuth configuration
NEXTAUTH_SECRET="your-generated-secret-key"
NEXTAUTH_URL="http://localhost:5000"

# AI Integration (OpenAI)
AI_INTEGRATIONS_OPENAI_API_KEY="your-openai-api-key"
# Optional: Set this if using a custom base URL (e.g., Replit AI Integration)
# AI_INTEGRATIONS_OPENAI_BASE_URL="https://proxy.replit.com/..."
```

> **Note**: Always restart your development server after changing environment variables. Never commit your `.env.local` file to version control.

### 4. Database Setup

Ensure your PostgreSQL instance is running, then run the following commands to initialize your database:

```bash
# Generate the Prisma client based on the schema
npx prisma generate

# Push the schema to your database (or use 'migrate dev' for versioned migrations)
npx prisma db push
```

- `prisma generate`: Updates the local TypeScript types to match your database structure.
- `prisma db push`: Syncs your Prisma schema directly with your database (ideal for development).

### 5. Running the Project

Start the development server:

```bash
npm run dev
```

The application will be available at [http://localhost:5000](http://localhost:5000).

## 📊 Demo Data (Optional)

To see the dashboards and AI insights in action, you can manually add sample data:
1. Create a few **Products** in the Inventory section.
2. Add **Batches** to those products to establish stock.
3. Record **Sales Invoices** and **Expenses**.
This data is stored in your local database and can be safely modified or deleted at any time.

## 🤖 AI Features Note

- The **Business Insights Assistant** is strictly **read-only**. It analyzes your database records to provide summaries but cannot modify any data.
- AI features require a valid API key in the environment variables.
- The core ERP functionality (billing, inventory, reports) works perfectly even if AI is disabled or the API key is missing.

## 🔧 Troubleshooting

- **Prisma Client Errors**: If you encounter issues with database queries, try running `npx prisma generate` again.
- **Database Connection**: Verify your `DATABASE_URL` matches your local PostgreSQL credentials and that the service is running.
- **AI Not Responding**: Ensure `AI_INTEGRATIONS_OPENAI_API_KEY` is set correctly. Check the server logs for specific error codes.
- **Port Conflict**: If port 5000 is in use, you can change it in `package.json` under the `dev` script.

---
*Built with precision for modern business management.*
