# Stokkr ERP - P&L Statement COGS Fix

## Project Overview
Stokkr is an ERP system for inventory and financial management. This project implements proper Cost of Goods Sold (COGS) accounting using FIFO method.

## Recent Changes (Dec 30, 2025)

### Problem Fixed
Previously, inventory purchases were incorrectly treated as immediate expenses, causing artificial losses when stock was purchased but not sold in the same month.

### Solution Implemented

#### 1. **Database Schema Update**
- Added `cogsPerItem` and `cogsTotal` fields to `InvoiceItem` model
- COGS is calculated at invoice creation time using FIFO method
- Migration: `20251230174202_add_cogs_to_invoice_items`

#### 2. **COGS Calculation (FIFO Method)**
- **New File**: `lib/cogsCalculator.ts`
- Implements FIFO (First-In-First-Out) logic for COGS
- Functions:
  - `calculateFifoCogs()`: Calculates COGS by consuming oldest batches first
  - `reduceBatchQuantities()`: Updates batch quantities after sale
- Usage: Automatically called when creating sales invoices

#### 3. **Invoice API Update**
- **File**: `app/api/invoices/route.ts`
- Modified POST endpoint to:
  - Calculate COGS for each item using FIFO
  - Store COGS per item and total COGS in invoice items
  - Reduce batch quantities based on FIFO consumption
  - All operations in atomic database transaction

#### 4. **P&L Statement Restructure**
- **File**: `app/reports/profit-loss/page.tsx`
- New P&L structure:
  ```
  Sales
  - Cost of Goods Sold (COGS)
  = Gross Profit
  - Operating Expenses
  = Operating Profit
  + Other Income
  - Interest Cost
  = Profit Before Tax
  - Tax
  = Net Profit/Loss
  ```
- Updated UI with new line items and visual hierarchy
- Enhanced notes section explaining COGS and FIFO method

## Key Features

### Correct Accounting Logic
- **Inventory Purchases**: Do NOT affect P&L - only impact cash flow and inventory assets
- **COGS**: Only includes cost of SOLD items calculated at sale time using FIFO
- **Unsold Inventory**: Remains as an asset, not an expense
- **Operating Expenses**: Only manual expenses (rent, salaries, etc.), NOT inventory purchases

### FIFO Implementation Details
- Oldest batches consumed first when calculating COGS
- Batch quantities automatically reduced by quantity sold
- Each sale item stores its calculated COGS per unit
- Handles overselling edge case (calculates COGS with available inventory)

## Technical Details

### Database Fields Added
```sql
ALTER TABLE "InvoiceItem" 
ADD COLUMN "cogsPerItem" DECIMAL(10,2),
ADD COLUMN "cogsTotal" DECIMAL(10,2);
```

### API Flow
1. Create sales invoice with items
2. For each item: Calculate FIFO COGS using available batches
3. Reduce batch quantities based on FIFO consumption
4. Store COGS in invoice items
5. All within atomic transaction

### P&L Calculation
- **Sales**: Sum of invoice totals for month
- **COGS**: Sum of `cogsTotal` from invoice items (only sold items)
- **Gross Profit**: Sales - COGS
- **Operating Expenses**: Manual expenses only
- **Operating Profit**: Gross Profit - Operating Expenses

## Testing Scenario

### Expected Behavior
**Scenario**: Buy 100 units @ ₹10, sell 30 units in same month
- **Before Fix**: Loss of ₹700 (revenue 300 minus all 1000 inventory purchase)
- **After Fix**: Profit of ₹0 (revenue 300 minus 300 COGS, unsold 700 remains as inventory asset)

## Code Quality
- FIFO logic well-commented with clear documentation
- Minimal schema changes (only added COGS fields)
- Preserved existing invoice, batch, and inventory flows
- No breaking changes to existing APIs
- All historical data preserved accurately

## How to Use

### Reports Available

#### 1. Profit & Loss Statement
1. Navigate to Reports → Profit & Loss
2. Select month and year
3. View accrual-based accounting:
   - Sales revenue (invoices created)
   - COGS (cost of goods sold using FIFO)
   - Operating expenses (all recorded expenses)
   - Operating profit (before financing/taxes)

#### 2. Cash Flow Statement (NEW)
1. Navigate to Reports → Cash Flow
2. Select month and year
3. View cash-based accounting:
   - **Operating Activities**: Cash received from customer payments - Cash paid for expenses
   - **Financing Activities**: Loans received/repaid (future feature)
   - **Investing Activities**: Capital expenditures (future feature)
   - **Net Cash Flow**: Total monthly cash movement
4. Export to CSV for records

### COGS Implementation
- **For New Invoices**: COGS is automatically calculated using FIFO method
- **For Existing Invoices**: Run `POST /api/backfill-cogs` to initialize historical data
- **FIFO Logic**: Uses oldest batches first; batch quantities automatically reduced

### Key Differences: P&L vs Cash Flow
- **P&L**: Accrual-based (sales/expenses recorded when incurred)
- **Cash Flow**: Cash-based (only actual cash movements counted)
- **Example**: A credit sale appears in P&L immediately but in Cash Flow only when paid

## Dev Setup
- Next.js dev server: `npm run dev` (running on port 5000)
- Prisma client auto-generated after migration
- Database: PostgreSQL with Prisma ORM
- Prisma schema: `prisma/schema.prisma`

## User Preferences
- Keep invoice/batch/inventory flows unchanged
- Minimal UI changes to existing layouts
- Add FIFO logic comments for clarity
- Preserve historical invoice data accuracy

## Known Issues Fixed
- Inventory purchases incorrectly treated as expenses ✓
- COGS shows as 0 for old invoices (backfill API fixes this) ✓
- P&L structure now matches standard accounting ✓

## Features Implemented

### Monthly Cash Flow Statement (NEW)
- **Location**: Reports → Cash Flow
- **Purpose**: Track actual cash movements (cash-based accounting)
- **Sections**:
  - Operating Activities: Cash from customers - Expenses paid
  - Financing Activities: Loans and repayments (future)
  - Investing Activities: Capital expenditures (future)
- **Features**:
  - Month/year selection defaulting to current month
  - Dynamic recalculation on month/year change
  - CSV export with formatted accounting table
  - Positive/negative indicators for cash flow health
  - Clear separation from P&L statement

### COGS & Profit & Loss (Previously Implemented)
- FIFO method for calculating cost of goods sold
- Automatic calculation when invoices are created
- Backfill API for historical invoice data
- P&L statement shows: Sales → COGS → Gross Profit → Operating Expenses → Net Profit

## API Endpoints
- `GET /api/cash-flow?month=0-11&year=YYYY` - Monthly cash flow calculation
- `GET /api/accounts-receivable` - Customer invoices with COGS
- `POST /api/backfill-cogs` - Initialize COGS for old invoices
- `GET /api/expenses` - Operating expenses list
