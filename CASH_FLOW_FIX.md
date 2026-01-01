# Cash Flow Statement Fix

The Monthly Cash Flow Statement was enhanced to accurately reflect real cash movements.

## Changes

1.  **API Logic Update (`app/api/cash-flow/route.ts`)**:
    *   **Customer Payments**: Now specifically filters for `AccountsReceivable` that were marked `COMPLETED` within the selected month range.
    *   **Supplier Payments**: Added logic to subtract cash paid to suppliers by filtering for `AccountsPayable` marked `COMPLETED` within the month.
    *   **Financing Activities**: Explicitly tracks "Interest on Loans" from the expenses table and provides placeholders for loan principal movements.
    *   **Accurate Ranges**: Replaced `EXTRACT` SQL calls with robust date range filtering using `startDate` and `endDate`.

2.  **UI Enhancements (`app/reports/cash-flow/page.tsx`)**:
    *   Added **Cash paid to suppliers** line item under Operating Activities.
    *   Updated Financing Activities to show **Loan amounts received**, **Loan repayments**, and **Interest paid**.
    *   Improved the accounting-style table with clear positive/negative indicators.

3.  **CSV Export Fix**:
    *   Corrected the `exportToCSV` call to match the utility's interface (`{ filename, headers, rows }`).
    *   Formatted negative values with a leading minus sign for better spreadsheet compatibility.

## How it works
This statement is strictly cash-based. It ignores credit sales (accruals) and inventory purchases (assets) until a corresponding payment record is finalized in `AccountsReceivable` or `AccountsPayable`.
