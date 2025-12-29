# Profit & Loss Statement Feature - Implementation Summary

## Overview
Added a professional, industry-standard Profit & Loss statement feature to the Stokkr ERP project. The P&L statement provides comprehensive financial performance analysis with dynamic month/year selection and configurable parameters.

---

## Location
- **Page:** `/reports/profit-loss/page.tsx`
- **Route:** `/reports/profit-loss`
- **Dashboard Link:** Added "📊 View P&L Statement" button to `/dashboard/page.tsx`

---

## P&L Statement Structure

### 1. **Sales**
- Source: Total invoices from `/api/accounts-receivable` for selected month
- Calculation: Sum of all invoice amounts for the month

### 2. **Expenses**
- Source: Total expenses from `/api/expenses` for selected month
- Calculation: Sum of all expense amounts for the month

### 3. **Operating Profit**
- Formula: `Sales − Expenses`
- Represents core business profitability before other income/costs

### 4. **Other Income**
- Includes: Incentives, schemes, subsidies
- Type: User-configurable (editable input field in UI)
- Default: 0

### 5. **Interest Cost**
- Includes: Loan interest, interest on borrowings
- Type: User-configurable (editable input field in UI)
- Default: 0

### 6. **Profit Before Tax (PBT)**
- Formula: `Operating Profit + Other Income − Interest Cost`
- Industry standard: Shows profit before tax deduction

### 7. **Tax**
- Type: Percentage-based and configurable
- Default: 18% (GST/standard tax rate in India)
- Calculation: `PBT × Tax Rate / 100`
- Note: Tax only applies to positive PBT (no negative tax)

### 8. **Net Profit / Loss**
- Formula: `PBT − Tax`
- Final bottom-line result
- Color-coded: Green if profit, Red if loss

---

## Features

### Month/Year Selection
- Default: Current month and year
- Dropdowns for selecting historical months (12 months)
- Year range: ±2 years from current year
- Dynamic recalculation on selection change

### Configurable Parameters
1. **Tax Rate** (%)
   - Range: 0-100%
   - Step: 0.5%
   - Default: 18%
   - Applies to all positive PBT amounts

2. **Other Income** (₹)
   - Editable input field
   - Inline input on statement
   - Real-time recalculation

3. **Interest Cost** (₹)
   - Editable input field
   - Inline input on statement
   - Real-time recalculation

### Dynamic Calculations
- All values update instantly when parameters change
- No page refresh required
- Real-time margin calculations

### Profitability Margins
**Displayed Summary Stats:**
1. **Operating Margin** = (Operating Profit ÷ Sales) × 100
2. **Net Profit Margin** = (Net Profit ÷ Sales) × 100
3. **Effective Tax Rate** = (Tax Amount ÷ PBT) × 100

### User Interface
- **Clean table format** mimicking professional accounting software
- **Color-coded rows:**
  - Blue: Operating Profit
  - Purple: Profit Before Tax
  - Green: Net Profit (positive)
  - Red: Net Loss (negative)
- **Visual separators** between P&L sections
- **Notes section** explaining each line item
- **Responsive design** for mobile and desktop
- **Indian Rupee (₹) formatting** for all values

### Data Export
- **CSV Export functionality**
- Exports complete P&L statement with:
  - Month and year
  - All line items
  - Calculated values
  - Tax rate used
- Filename: `ProfitLossStatement_MonthName_Year`

### Controls
1. **Month Selector** - Select reporting month
2. **Year Selector** - Select reporting year
3. **Tax Rate Input** - Adjust tax percentage
4. **Export Button** - Download P&L as CSV
5. **Refresh Button** - Reload data from APIs

---

## Data Flow

```
1. Page Load
   ├── Fetch: /api/accounts-receivable (Invoices)
   ├── Fetch: /api/expenses (Operating Expenses)
   └── Store: Both datasets

2. Month/Year Selection
   └── Filter invoices/expenses by selected month/year

3. Calculate P&L
   ├── Sales = Sum of invoices for month
   ├── Expenses = Sum of expenses for month
   ├── Operating Profit = Sales - Expenses
   ├── PBT = Operating Profit + Other Income - Interest
   ├── Tax = Max(0, PBT × Tax Rate / 100)
   └── Net Profit = PBT - Tax

4. Display & Export
   ├── Show formatted P&L statement
   ├── Show margin calculations
   └── Allow CSV export
```

---

## Code Quality

### Calculation Logic (Clearly Commented)
```typescript
// Step 1: Calculate Sales (total invoices for the month)
const sales = monthInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

// Step 2: Calculate Operating Expenses (total expenses for the month)
const totalExpenses = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);

// Step 3: Operating Profit = Sales - Expenses
const operatingProfit = sales - totalExpenses;

// Step 4: Other Income (user configured)
const otherIncomeValue = otherIncome || 0;

// Step 5: Interest Cost (user configured)
const interestCostValue = interestCost || 0;

// Step 6: Profit Before Tax = Operating Profit + Other Income - Interest Cost
const profitBeforeTax = operatingProfit + otherIncomeValue - interestCostValue;

// Step 7: Tax = PBT × Tax Rate / 100
const taxAmount = Math.max(0, profitBeforeTax * (taxRate / 100));

// Step 8: Net Profit / Loss = PBT - Tax
const netProfit = profitBeforeTax - taxAmount;
```

### Filter Logic
```typescript
// Month-wise filtering ensures accurate reporting
const getInvoicesForMonth = (): Invoice[] => {
  return invoices.filter(inv => {
    const invDate = new Date(inv.date);
    return (
      invDate.getMonth() === selectedMonth &&
      invDate.getFullYear() === selectedYear
    );
  });
};
```

---

## Constraints Met

✅ **No EPS** - Not included in statement  
✅ **No Depreciation** - Not included in statement  
✅ **No Dividend Payout** - Not included in statement  
✅ **No Refactoring** - Existing sales/expense logic untouched  
✅ **Uses Existing Data** - Leverages accounts-receivable and expenses APIs  
✅ **Minimal Helper Logic** - Only needed for month filtering and P&L calculations  
✅ **Clear Comments** - All calculation logic well-documented  

---

## Dashboard Integration
- Quick link button added to dashboard: "📊 View P&L Statement"
- Positioned at top of dashboard for easy access
- Uses indigo color (#4F46E5) for visual distinction

---

## Testing Checklist

1. **Page Load** - Visit `/reports/profit-loss`
   - Should load with current month selected
   - Should display P&L statement
   - Should show summary statistics

2. **Month Selection** - Change month dropdown
   - P&L values should recalculate
   - Margins should update
   - No page refresh needed

3. **Year Selection** - Change year dropdown
   - Should filter invoices/expenses correctly
   - Should recalculate all values

4. **Tax Rate** - Modify tax rate input
   - Tax amount should update
   - Net profit should recalculate
   - Effective tax rate should update

5. **Other Income** - Enter amount in field
   - PBT should increase
   - Net profit should increase
   - Margins should recalculate

6. **Interest Cost** - Enter amount in field
   - PBT should decrease
   - Net profit should decrease
   - Margins should recalculate

7. **CSV Export** - Click export button
   - Should download CSV file
   - Filename should include month/year
   - Data should be properly formatted

8. **Edge Cases**
   - Month with no invoices → Sales = 0
   - Month with no expenses → Expenses = 0
   - Negative PBT → Tax = 0 (no negative tax)
   - Loss months → Negative net profit shown in red

---

## Margin Calculations

### Operating Margin
- Shows percentage of sales that becomes operating profit
- Higher is better
- Formula: (Operating Profit ÷ Sales) × 100

### Net Profit Margin
- Shows percentage of sales that becomes net profit
- Higher is better
- Affected by tax rate and interest costs

### Effective Tax Rate
- Shows actual tax burden on profit
- Varies based on PBT
- Calculated after all deductions

---

## Currency & Formatting
- All values in Indian Rupees (₹)
- 2 decimal places for all amounts
- Thousands separators for readability
- Percentage values with 2 decimal places
- Automatic sign (+/-) for positive/negative values

---

## File Modified/Created
- **Created:** `app/reports/profit-loss/page.tsx` (300+ lines)
- **Modified:** `app/dashboard/page.tsx` (added quick link button)

---

## Next Steps (Future Enhancements)
- Add year-over-year P&L comparison
- Multi-month P&L statements
- Budget vs actual analysis
- Trend analysis with charts
- Cash flow statement integration
- Ratio analysis (ROE, ROA, etc.)

---

## Notes
- P&L statements are calculated on the client-side for instant updates
- No new API endpoints required - uses existing data sources
- All configurable values (tax rate, other income, interest) are stored in component state
- Data fetched once on page load, then filtered by month selection
- Export includes full statement with all details and calculations
