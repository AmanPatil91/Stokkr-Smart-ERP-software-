STOKKR: Smart ERP for Business

Stokkr is a production-grade, AI-enhanced Enterprise Resource Planning (ERP) platform designed for modern SMEs. It integrates high-integrity financial tracking with Generative AI and predictive analytics to provide actionable business intelligence.

🚀 Key Features

1. Billing & Client Management

Invoice Generation: Streamlined workflow for creating professional, multi-item invoices.

Payment Tracking: Real-time monitoring of outstanding balances, payment history, and client aging.

Client & Supplier Management: A centralized "Party" database for managing all business relationships securely.

2. Inventory Management

Real-time Monitoring: Instant visibility into stock levels across all products and locations.

Batch & Expiry Tracking: Precision management of perishable goods through dedicated batch-level logic.

Automated Alerts: Smart notifications for low stock levels and nearing expiration dates.

3. Automated Accounting

Ledger Maintenance: Automated double-entry bookkeeping synchronized with every transaction (Sales, Purchases, Expenses).

Expense Tracking: Log and categorize operational costs for granular budget control.

Financial Reporting: Instant generation of Profit & Loss statements and balance sheet summaries.

4. AI & Intelligence Layer

Gemini RAG Assistant: A built-in chatbot powered by Google Gemini (Function Calling). It uses Retrieval-Augmented Generation (RAG) to answer natural language questions (e.g., "What is my total sales this week?") by querying your live PostgreSQL records.

Sales Forecasting: Integrated Prophet models via an external FastAPI microservice to predict future inventory demand based on historical trends.

🛠 Tech Stack

Layer

Technology

Framework

Next.js 14+ (App Router), TypeScript

Database

PostgreSQL + Prisma ORM

Auth

Firebase Auth (Client) + NextAuth.js (Server Verification)

AI Layer

Google Gemini API (RAG), Prophet (Forecasting)

UI

Tailwind CSS, Lucide Icons

💻 Local Setup & Installation

Follow these steps to run the project on your machine with zero errors.

1. Prerequisites

Node.js (v18.17.0+)

npm (v9.0.0+)

PostgreSQL (Local or Cloud instance)

2. Clone and Install

git clone [https://github.com/AmanPatil91/Stokkr-Smart-ERP-software-.git](https://github.com/AmanPatil91/Stokkr-Smart-ERP-software-.git)
cd Stokkr-Smart-ERP-software-
npm install


3. Environment Variables

Create a .env.local file in the root directory and populate it with your credentials:

# Database connection
DATABASE_URL="postgresql://user:password@localhost:5432/stokkr_db"

# NextAuth configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your_random_secret_string"

# Firebase Client (Public)
NEXT_PUBLIC_FIREBASE_API_KEY="..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="..."
NEXT_PUBLIC_FIREBASE_PROJECT_ID="..."
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="..."
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="..."
NEXT_PUBLIC_FIREBASE_APP_ID="..."

# Firebase Admin (Private - Used for server-side auth verification)
FIREBASE_PROJECT_ID="..."
FIREBASE_CLIENT_EMAIL="..."
# Ensure the private key handles newlines correctly
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Gemini API
GEMINI_API_KEY="your_google_ai_studio_key"


4. Initialize Database

# Sync schema to the database
npx prisma db push

# Generate the Prisma Client (Required for Type Safety)
npx prisma generate


5. Start Development

npm run dev


Navigate to http://localhost:3000 to access the app.

🏗 System Architecture

Stokkr uses a decoupled architecture for maximum scalability:

Next.js Core: Manages the main UI, secure API routes, and transactional logic.

PostgreSQL/Prisma: Handles ACID-compliant data storage and atomic updates.

AI Layer: Uses a Python microservice for heavy forecasting and Gemini for natural language processing via secure function calling.

Auth Layer: A dual-SDK approach ensures secure client-side login and robust server-side session persistence.

🛡 Troubleshooting

Prisma Errors: If you see PrismaClient is not a constructor, run npx prisma generate.

Auth Failures: Ensure the FIREBASE_PRIVATE_KEY in .env.local is wrapped in double quotes and uses \n for line breaks.

Database Timeouts: Verify your DATABASE_URL is accessible from your network.