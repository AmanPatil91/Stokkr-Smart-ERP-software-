# Stokkr ERP - P&L Statement COGS Fix

## Project Overview
Stokkr is an ERP system for inventory and financial management. This project implements proper Cost of Goods Sold (COGS) accounting using FIFO method.

## Recent Changes (Jan 3, 2026)

### AI Chatbot Implementation
- **Feature**: Conversational Business Insights Assistant
- **UI**: Added a scrollable chat interface on the Home page with message history.
- **Backend**: Enhanced `/api/ai/insights` with broader context (Sales, Purchases, Expenses, Low Stock, Top Debtors).
- **Safety**: Strictly read-only data access; environment-based API key management.

## Features Implemented

### Conversational AI Chatbot (NEW)
- **Location**: Home Page → Business Insights Assistant
- **Capabilities**:
  - Answers natural language questions about business performance.
  - Summarizes monthly expenses and sales.
  - Identifies top debtors (Accounts Receivable).
  - Reports low stock products.
  - Explains financial discrepancies (e.g., cash vs profit).
- **Architecture**:
  - React state-managed chat history.
  - GPT-4o-mini powered insights via OpenAI integration.
  - Real-time data fetching from existing database models.


## API Endpoints
- `GET /api/cash-flow?month=0-11&year=YYYY` - Monthly cash flow calculation
- `GET /api/accounts-receivable` - Customer invoices with COGS
- `POST /api/backfill-cogs` - Initialize COGS for old invoices
- `GET /api/expenses` - Operating expenses list
