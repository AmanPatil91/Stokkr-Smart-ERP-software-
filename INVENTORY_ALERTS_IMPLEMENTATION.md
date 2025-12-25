# Inventory Alert Features - Implementation Guide

## Overview
This document outlines the inventory alert system implemented in your ERP project. The system tracks batch expiry dates and product stock levels, generating dynamic alerts without requiring cron jobs or background tasks.

---

## 1. Schema Changes

### Updated Product Model
**File**: `prisma/schema.prisma`

```prisma
model Product {
  id                      String             @id @default(cuid())
  name                    String
  sku                     String             @unique
  description             String?
  price                   Decimal            @db.Decimal(10, 2)
  cost                    Decimal            @db.Decimal(10, 2)
  expiryAlertDays         Int                @default(7)  // New: Days before expiry to trigger alert
  lowStockAlertQty        Int                @default(10) // New: Minimum stock threshold
  batches                 Batch[]
  stockTransactions       StockTransaction[]
  invoiceItems            InvoiceItem[]
}
```

### Existing Batch Model (No changes needed)
```prisma
model Batch {
  id            String             @id @default(cuid())
  batchNumber   String
  expiryDate    DateTime           // Used for expiry calculations
  quantity      Int
  costPerItem   Decimal            @db.Decimal(10, 2)
  productId     String
  product       Product            @relation(fields: [productId], references: [id])
  stockTransactions StockTransaction[]
}
```

### Database Migration
Run the following to apply schema changes:
```bash
npx prisma migrate dev --name add_alert_fields
```

---

## 2. Alert Calculation Logic

### File: `lib/alertsService.ts`
This service handles all alert calculations dynamically at request time.

#### Key Functions:

**1. `calculateRemainingDays(expiryDate: Date): number`**
- Calculates days remaining until batch expiry
- Uses live system datetime: `new Date()`
- Returns negative value if already expired
- **No manual date input required**

**2. `getExpiringBatches(): ExpiringBatch[]`**
- Fetches all products with their batches
- For each batch: calculates `remainingDays = expiryDate - now`
- Returns batches where: `remainingDays <= product.expiryAlertDays`
- Marks batches as either "EXPIRING_SOON" or "EXPIRED"
- Sorted by urgency (closest expiry first)

**3. `getLowStockProducts(): LowStockProduct[]`**
- Fetches all products with batch data
- Calculates: `totalStock = sum(quantity across all batches)`
- Returns products where: `totalStock <= product.lowStockAlertQty`
- Sorted by stock level (lowest first)

**4. `getAllAlerts()`**
- Calls both functions and returns combined alerts
- Returns: `{ expiringBatches, lowStockProducts, totalAlerts }`

#### How It Works:
```
When API is called → Service fetches all product/batch data
                   → Calculates remaining days using live system time
                   → Compares against product alert settings
                   → Returns filtered alerts (no database caching)
```

---

## 3. API Endpoint

### GET `/api/alerts`
**File**: `app/api/alerts/route.ts`

**Response**:
```json
{
  "totalAlerts": 5,
  "expiringBatches": [
    {
      "id": "batch_id",
      "batchNumber": "BATCH-001",
      "productName": "Laptop",
      "productId": "prod_id",
      "expiryDate": "2025-02-15T00:00:00Z",
      "quantity": 50,
      "remainingDays": 3,
      "status": "EXPIRING_SOON"
    }
  ],
  "lowStockProducts": [
    {
      "id": "prod_id",
      "name": "Laptop",
      "totalStock": 5,
      "alertThreshold": 10,
      "remainingBatches": 2
    }
  ]
}
```

**Cache Control**: `no-cache, no-store, must-revalidate` (ensures fresh data always)

---

## 4. Product Creation Form

### File: `app/products/new/page.tsx`

New form fields added:

```typescript
// Alert Configuration Section
- Expiry Alert Days (default: 7)
  - Number input, min: 1, max: 365
  - Tooltip: "Days before batch expiry to trigger alert"
  
- Low Stock Alert Quantity (default: 10)
  - Number input, min: 0
  - Tooltip: "Minimum total stock across all batches"
```

**Form Styling**: Blue alert box with warning icon (⚠️)

**Form Submission**:
```javascript
// Sends to POST /api/products
{
  name: "Laptop",
  sku: "SKU-001",
  description: "Electronics",
  price: 0,
  cost: 0,
  expiryAlertDays: 7,      // New fields
  lowStockAlertQty: 10      // New fields
}
```

---

## 5. Dashboard Integration

### File: `app/dashboard/page.tsx`

#### New Dashboard Sections:

**1. Expiring Soon Batches Card**
- **Background**: Orange (⏰ icon)
- **Shows**: Product name, batch number, expiry date, remaining days
- **Badge**: Red if expired, orange if expiring soon
- **Updates**: Real-time with each dashboard load

**2. Low Stock Products Card**
- **Background**: Red (📉 icon)
- **Shows**: Product name, current stock, alert threshold
- **Badge**: Red "X/Y" format showing current/threshold
- **Updates**: Real-time with each dashboard load

#### Display Logic:
```
IF alerts exist:
  Show alert cards (orange and red boxes)
  Below: Stock Summary table
ELSE:
  Show only Stock Summary table
```

---

## 6. How to Use the Alert System

### For Product Managers:

**Step 1: Create a Product**
1. Go to `/products/new`
2. Fill in: Product Name, SKU, Category
3. **Set Alert Configuration**:
   - Expiry Alert Days: e.g., 7 (alert when 7 days left)
   - Low Stock Alert Quantity: e.g., 20 (alert when stock ≤ 20)
4. Click "Create Product"

**Step 2: Add Stock in Batches**
1. Go to Inventory → Add Stock in Batches
2. Select product, supplier, batch number
3. Enter: Quantity, Cost, **Expiry Date**
4. Submit

**Step 3: Monitor Alerts**
1. Go to Dashboard
2. View alerts in "Expiring Soon Batches" and "Low Stock Products" cards
3. Alerts update automatically based on:
   - Current system date (for remaining days)
   - Total stock across all batches

### Example Scenarios:

**Scenario 1: Batch Expiring Soon**
```
Product: Laptop (expiryAlertDays = 7)
Batch: BATCH-001
Expiry Date: February 15, 2025
Current Date: February 10, 2025
Remaining Days: 5

→ Alert Status: EXPIRING_SOON (5 ≤ 7)
→ Shown on Dashboard with 5d badge
```

**Scenario 2: Product Low Stock**
```
Product: Keyboard (lowStockAlertQty = 10)
Batches:
  - BATCH-001: Qty 6
  - BATCH-002: Qty 3
Total Stock: 9

→ Alert Status: LOW_STOCK (9 ≤ 10)
→ Shown on Dashboard with 9/10 badge
```

---

## 7. Technical Constraints & Design

### No Background Jobs
✅ Alerts computed at request time
✅ Uses live system datetime: `new Date()`
✅ No cron jobs or scheduled tasks
✅ No external services required

### Database Efficient
✅ Minimal query overhead
✅ Uses existing Product → Batch relationships
✅ Pagination possible if needed (for future)

### API Design
✅ Single endpoint: `GET /api/alerts`
✅ Cache-Control prevents stale data
✅ Returns all alert types at once
✅ No rate limiting needed

### No Breaking Changes
✅ Existing routes unchanged
✅ Existing APIs backward compatible
✅ New product fields optional (defaults provided)
✅ Existing functionality preserved

---

## 8. Testing the Implementation

### Test Case 1: Create Product with Alerts
```bash
POST /api/products
{
  "name": "Test Product",
  "sku": "TEST-001",
  "description": "Test",
  "price": 100,
  "cost": 50,
  "expiryAlertDays": 5,
  "lowStockAlertQty": 15
}
```

### Test Case 2: Add Batch and Check Alerts
```bash
POST /api/inventory/add-batch
{
  "productId": "prod_xxx",
  "supplierId": "supp_xxx",
  "batchNo": "BATCH-001",
  "quantity": 10,
  "cost": 50,
  "expiryDate": "2025-02-20T00:00:00Z"
}

GET /api/alerts
→ Returns low stock alert (10 ≤ 15)
```

### Test Case 3: Check Dashboard
1. Navigate to `/dashboard`
2. Should show "Low Stock Products" card
3. Should show product with 10/15 badge
4. If expiry date is close, "Expiring Soon Batches" card should appear

---

## 9. Files Changed/Created

### Modified Files:
1. `prisma/schema.prisma` - Added alert fields to Product model
2. `app/products/new/page.tsx` - Added alert configuration form
3. `app/api/products/route.ts` - Updated POST to save alert fields
4. `app/dashboard/page.tsx` - Added alerts display section

### New Files:
1. `lib/alertsService.ts` - Alert calculation logic
2. `app/api/alerts/route.ts` - Alerts API endpoint

---

## 10. Future Enhancements

Possible improvements (out of scope for current release):
- Alert notification emails
- SMS alerts for critical stock
- Alert history/audit log
- Per-user alert preferences
- Batch-wise stock movement tracking
- Predictive stock alerts
- Integration with purchase orders

---

## Troubleshooting

**Q: Alerts not showing on dashboard?**
A: Check browser console for `/api/alerts` response. Ensure products have batches assigned.

**Q: Expiring date calculation incorrect?**
A: Server time zone matters. Verify system date is correct.

**Q: Alert threshold not triggering?**
A: Ensure `lowStockAlertQty` is set when creating product. Default is 10.

**Q: Migration failed?**
A: Run `npx prisma migrate reset --force` to reset and re-apply migrations.

---

## Support

For issues or questions about the alert system, refer to:
- Schema: `prisma/schema.prisma`
- Logic: `lib/alertsService.ts`
- API: `app/api/alerts/route.ts`
- UI: `app/dashboard/page.tsx`
