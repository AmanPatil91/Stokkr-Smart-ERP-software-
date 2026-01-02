export const GST_RATES = [0, 5, 12, 18, 28];
export const DEFAULT_GST_RATE = 18; // Default to 18% for most goods

export interface GSTCalculation {
  taxableValue: number;
  gstRate: number;
  gstAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

export function calculateGST(
  quantity: number,
  pricePerItem: number,
  sellerState: string = 'Maharashtra',
  customerState: string = 'Maharashtra',
  gstRate: number = DEFAULT_GST_RATE
): GSTCalculation {
  const taxableValue = quantity * pricePerItem;
  const gstAmount = (taxableValue * gstRate) / 100;
  
  const isIntraState = sellerState.toLowerCase() === customerState.toLowerCase();
  
  return {
    taxableValue,
    gstRate,
    gstAmount,
    cgst: isIntraState ? gstAmount / 2 : 0,
    sgst: isIntraState ? gstAmount / 2 : 0,
    igst: isIntraState ? 0 : gstAmount,
    total: taxableValue + gstAmount
  };
}
