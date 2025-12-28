// CSV Export Utility
// Generates CSV content from data and triggers browser download

interface CSVExportOptions {
  filename: string;
  headers: string[];
  rows: (string | number)[][];
}

/**
 * Generate CSV content and trigger download
 * @param options - Export configuration with filename, headers, and data rows
 */
export const exportToCSV = ({ filename, headers, rows }: CSVExportOptions) => {
  // Escape CSV values that contain commas, quotes, or newlines
  const escapeCSVValue = (value: string | number): string => {
    const stringValue = String(value);
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  // Build CSV content
  const csvContent = [
    // Add header row
    headers.map(escapeCSVValue).join(','),
    // Add data rows
    ...rows.map(row => 
      row.map(escapeCSVValue).join(',')
    ),
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Format date for CSV export (YYYY-MM-DD)
 */
export const formatDateForCSV = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
};

/**
 * Format currency for CSV export (remove ₹ symbol, show as number)
 */
export const formatCurrencyForCSV = (amount: number | string): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return num.toFixed(2);
};
