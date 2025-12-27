-- CreateTable
CREATE TABLE "public"."AccountsPayable" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "payableAmount" DECIMAL(10,2) NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountsPayable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AccountsReceivable" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "receivableAmount" DECIMAL(10,2) NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountsReceivable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountsPayable_batchId_key" ON "public"."AccountsPayable"("batchId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountsReceivable_invoiceId_key" ON "public"."AccountsReceivable"("invoiceId");

-- AddForeignKey
ALTER TABLE "public"."AccountsPayable" ADD CONSTRAINT "AccountsPayable_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "public"."Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AccountsReceivable" ADD CONSTRAINT "AccountsReceivable_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
