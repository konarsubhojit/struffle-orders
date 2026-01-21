/**
 * Excel/Report Export Service
 * 
 * This service generates Excel files for various reports.
 * Uses a lightweight approach with CSV that Excel can open directly,
 * or can be enhanced with xlsx package for native Excel files.
 */

import { createLogger } from '@/lib/utils/logger';
import type { ReportColumn, OrderExportData } from '@/types';

const logger = createLogger('ExcelExportService');

// Standard column definitions for different report types
export const REPORT_COLUMNS = {
  orders: [
    { key: 'orderId', header: 'Order ID', width: 15, format: 'text' },
    { key: 'orderFrom', header: 'Source', width: 12, format: 'text' },
    { key: 'customerName', header: 'Customer Name', width: 25, format: 'text' },
    { key: 'customerId', header: 'Customer ID', width: 20, format: 'text' },
    { key: 'address', header: 'Address', width: 40, format: 'text' },
    { key: 'totalPrice', header: 'Total Price', width: 12, format: 'currency' },
    { key: 'status', header: 'Status', width: 12, format: 'text' },
    { key: 'paymentStatus', header: 'Payment Status', width: 15, format: 'text' },
    { key: 'paidAmount', header: 'Paid Amount', width: 12, format: 'currency' },
    { key: 'confirmationStatus', header: 'Confirmation', width: 15, format: 'text' },
    { key: 'priority', header: 'Priority', width: 8, format: 'number' },
    { key: 'orderDate', header: 'Order Date', width: 12, format: 'date' },
    { key: 'expectedDeliveryDate', header: 'Expected Delivery', width: 15, format: 'date' },
    { key: 'deliveryStatus', header: 'Delivery Status', width: 15, format: 'text' },
    { key: 'trackingId', header: 'Tracking ID', width: 20, format: 'text' },
    { key: 'deliveryPartner', header: 'Delivery Partner', width: 15, format: 'text' },
    { key: 'actualDeliveryDate', header: 'Actual Delivery', width: 15, format: 'date' },
    { key: 'customerNotes', header: 'Notes', width: 30, format: 'text' },
    { key: 'itemCount', header: 'Items', width: 8, format: 'number' },
    { key: 'items', header: 'Item Details', width: 50, format: 'text' },
    { key: 'createdAt', header: 'Created At', width: 18, format: 'datetime' },
  ] as ReportColumn[],

  salesSummary: [
    { key: 'date', header: 'Date', width: 12, format: 'date' },
    { key: 'orderCount', header: 'Orders', width: 10, format: 'number' },
    { key: 'totalRevenue', header: 'Revenue', width: 15, format: 'currency' },
    { key: 'averageOrderValue', header: 'Avg Order Value', width: 15, format: 'currency' },
    { key: 'uniqueCustomers', header: 'Customers', width: 12, format: 'number' },
  ] as ReportColumn[],

  items: [
    { key: 'id', header: 'ID', width: 8, format: 'number' },
    { key: 'name', header: 'Name', width: 30, format: 'text' },
    { key: 'price', header: 'Price', width: 12, format: 'currency' },
    { key: 'color', header: 'Color', width: 15, format: 'text' },
    { key: 'fabric', header: 'Fabric', width: 15, format: 'text' },
    { key: 'specialFeatures', header: 'Special Features', width: 30, format: 'text' },
    { key: 'categories', header: 'Categories', width: 25, format: 'text' },
    { key: 'tags', header: 'Tags', width: 25, format: 'text' },
    { key: 'createdAt', header: 'Created At', width: 18, format: 'datetime' },
  ] as ReportColumn[],

  customers: [
    { key: 'customerId', header: 'Customer ID', width: 20, format: 'text' },
    { key: 'customerName', header: 'Customer Name', width: 25, format: 'text' },
    { key: 'orderCount', header: 'Total Orders', width: 12, format: 'number' },
    { key: 'totalSpent', header: 'Total Spent', width: 15, format: 'currency' },
    { key: 'averageOrderValue', header: 'Avg Order Value', width: 15, format: 'currency' },
    { key: 'firstOrderDate', header: 'First Order', width: 12, format: 'date' },
    { key: 'lastOrderDate', header: 'Last Order', width: 12, format: 'date' },
  ] as ReportColumn[],

  auditLogs: [
    { key: 'createdAt', header: 'Timestamp', width: 20, format: 'datetime' },
    { key: 'entityType', header: 'Entity Type', width: 12, format: 'text' },
    { key: 'entityId', header: 'Entity ID', width: 10, format: 'number' },
    { key: 'action', header: 'Action', width: 12, format: 'text' },
    { key: 'userName', header: 'User', width: 20, format: 'text' },
    { key: 'userEmail', header: 'Email', width: 25, format: 'text' },
    { key: 'changedFields', header: 'Changed Fields', width: 30, format: 'text' },
  ] as ReportColumn[],
};

/**
 * Format a value based on column format
 */
function formatValue(value: unknown, format: string): string {
  if (value === null || value === undefined) return '';
  
  switch (format) {
    case 'date':
      if (typeof value === 'string' || value instanceof Date) {
        const date = new Date(value as string | Date);
        if (!Number.isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }
      return String(value);
      
    case 'datetime':
      if (typeof value === 'string' || value instanceof Date) {
        const date = new Date(value as string | Date);
        if (!Number.isNaN(date.getTime())) {
          return date.toISOString().replace('T', ' ').substring(0, 19);
        }
      }
      return String(value);
      
    case 'currency':
    case 'number':
      const num = Number(value);
      if (!Number.isNaN(num)) {
        return format === 'currency' ? num.toFixed(2) : String(num);
      }
      return String(value);
      
    default:
      if (Array.isArray(value)) {
        return value.join(', ');
      }
      return String(value);
  }
}

/**
 * Escape a value for CSV
 */
function escapeCSVValue(value: string): string {
  if (value.includes(',') || value.includes('\n') || value.includes('"') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

const ExcelExportService = {
  /**
   * Generate CSV content from data
   */
  generateCSV(data: Record<string, unknown>[], columns: ReportColumn[]): string {
    // Header row
    const headers = columns.map(col => escapeCSVValue(col.header));
    const lines = [headers.join(',')];
    
    // Data rows
    for (const row of data) {
      const values = columns.map(col => {
        const rawValue = row[col.key];
        const formatted = formatValue(rawValue, col.format || 'text');
        return escapeCSVValue(formatted);
      });
      lines.push(values.join(','));
    }
    
    return lines.join('\n');
  },

  /**
   * Generate a tab-separated values file (opens nicely in Excel)
   */
  generateTSV(data: Record<string, unknown>[], columns: ReportColumn[]): string {
    // Header row
    const headers = columns.map(col => col.header.replace(/\t/g, ' '));
    const lines = [headers.join('\t')];
    
    // Data rows
    for (const row of data) {
      const values = columns.map(col => {
        const rawValue = row[col.key];
        const formatted = formatValue(rawValue, col.format || 'text');
        return formatted.replace(/\t/g, ' ').replace(/\n/g, ' ');
      });
      lines.push(values.join('\t'));
    }
    
    return lines.join('\n');
  },

  /**
   * Generate an HTML table that can be opened by Excel
   * This provides better formatting support than CSV
   */
  generateExcelHTML(
    data: Record<string, unknown>[],
    columns: ReportColumn[],
    options?: {
      title?: string;
      currency?: string;
    }
  ): string {
    const title = options?.title || 'Export';
    const currency = options?.currency || '₹';
    
    let html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
  table { border-collapse: collapse; font-family: Arial, sans-serif; }
  th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
  th { background-color: #4CAF50; color: white; font-weight: bold; }
  tr:nth-child(even) { background-color: #f2f2f2; }
  .number, .currency { text-align: right; }
  .date, .datetime { white-space: nowrap; }
</style>
</head>
<body>
<h1>${title}</h1>
<p>Generated: ${new Date().toISOString()}</p>
<table>
<thead>
<tr>`;
    
    // Headers
    for (const col of columns) {
      html += `<th style="width: ${col.width ? col.width * 8 : 100}px">${col.header}</th>`;
    }
    html += '</tr></thead><tbody>';
    
    // Data rows
    for (const row of data) {
      html += '<tr>';
      for (const col of columns) {
        const rawValue = row[col.key];
        let formatted = formatValue(rawValue, col.format || 'text');
        
        // Add currency symbol for currency format
        if (col.format === 'currency' && formatted) {
          formatted = `${currency}${formatted}`;
        }
        
        const className = col.format || 'text';
        html += `<td class="${className}">${formatted}</td>`;
      }
      html += '</tr>';
    }
    
    html += '</tbody></table></body></html>';
    
    return html;
  },

  /**
   * Generate Excel XML Spreadsheet (older .xls format, but widely compatible)
   */
  generateExcelXML(
    data: Record<string, unknown>[],
    columns: ReportColumn[],
    options?: {
      sheetName?: string;
      currency?: string;
    }
  ): string {
    const sheetName = options?.sheetName || 'Sheet1';
    const currency = options?.currency || '₹';
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles>
 <Style ss:ID="Header">
  <Font ss:Bold="1" ss:Color="#FFFFFF"/>
  <Interior ss:Color="#4CAF50" ss:Pattern="Solid"/>
  <Alignment ss:Horizontal="Center"/>
 </Style>
 <Style ss:ID="Currency">
  <NumberFormat ss:Format="${currency}#,##0.00"/>
  <Alignment ss:Horizontal="Right"/>
 </Style>
 <Style ss:ID="Number">
  <NumberFormat ss:Format="#,##0"/>
  <Alignment ss:Horizontal="Right"/>
 </Style>
 <Style ss:ID="Date">
  <NumberFormat ss:Format="yyyy-mm-dd"/>
 </Style>
 <Style ss:ID="DateTime">
  <NumberFormat ss:Format="yyyy-mm-dd hh:mm:ss"/>
 </Style>
</Styles>
<Worksheet ss:Name="${sheetName}">
<Table>`;
    
    // Column widths
    for (const col of columns) {
      xml += `<Column ss:Width="${(col.width || 100) * 6}"/>`;
    }
    
    // Header row
    xml += '<Row>';
    for (const col of columns) {
      xml += `<Cell ss:StyleID="Header"><Data ss:Type="String">${col.header}</Data></Cell>`;
    }
    xml += '</Row>';
    
    // Data rows
    for (const row of data) {
      xml += '<Row>';
      for (const col of columns) {
        const rawValue = row[col.key];
        const formatted = formatValue(rawValue, col.format || 'text');
        
        let styleId = '';
        let dataType = 'String';
        
        switch (col.format) {
          case 'currency':
            styleId = 'Currency';
            dataType = 'Number';
            break;
          case 'number':
            styleId = 'Number';
            dataType = 'Number';
            break;
          case 'date':
            styleId = 'Date';
            break;
          case 'datetime':
            styleId = 'DateTime';
            break;
        }
        
        const styleAttr = styleId ? ` ss:StyleID="${styleId}"` : '';
        xml += `<Cell${styleAttr}><Data ss:Type="${dataType}">${formatted}</Data></Cell>`;
      }
      xml += '</Row>';
    }
    
    xml += '</Table></Worksheet></Workbook>';
    
    return xml;
  },

  /**
   * Get MIME type for export format
   */
  getMimeType(format: 'csv' | 'tsv' | 'html' | 'xls'): string {
    switch (format) {
      case 'csv':
        return 'text/csv';
      case 'tsv':
        return 'text/tab-separated-values';
      case 'html':
        return 'text/html';
      case 'xls':
        return 'application/vnd.ms-excel';
      default:
        return 'text/plain';
    }
  },

  /**
   * Get file extension for export format
   */
  getFileExtension(format: 'csv' | 'tsv' | 'html' | 'xls'): string {
    switch (format) {
      case 'csv':
        return '.csv';
      case 'tsv':
        return '.tsv';
      case 'html':
        return '.html';
      case 'xls':
        return '.xls';
      default:
        return '.txt';
    }
  },

  /**
   * Generate report in specified format
   */
  generateReport(
    data: Record<string, unknown>[],
    columns: ReportColumn[],
    format: 'csv' | 'tsv' | 'html' | 'xls',
    options?: {
      title?: string;
      sheetName?: string;
      currency?: string;
    }
  ): { content: string; mimeType: string; extension: string } {
    let content: string;
    
    switch (format) {
      case 'csv':
        content = this.generateCSV(data, columns);
        break;
      case 'tsv':
        content = this.generateTSV(data, columns);
        break;
      case 'html':
        content = this.generateExcelHTML(data, columns, options);
        break;
      case 'xls':
        content = this.generateExcelXML(data, columns, options);
        break;
      default:
        content = this.generateCSV(data, columns);
    }
    
    return {
      content,
      mimeType: this.getMimeType(format),
      extension: this.getFileExtension(format),
    };
  },
};

export default ExcelExportService;
