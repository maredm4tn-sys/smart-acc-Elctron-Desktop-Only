import * as XLSX from 'xlsx';

/**
 * Utility to export any JSON data to Excel with professional formatting
 * @param data Array of objects to export
 * @param fileName Name of the file (without extension)
 * @param sheetName Name of the Excel sheet
 */
export function exportToExcel(data: any[], fileName: string = 'data-export', sheetName: string = 'Sheet1') {
    if (!data || data.length === 0) return;

    // Create a new workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Generate buffer and trigger download
    XLSX.writeFile(workbook, `${fileName}-${new Date().toISOString().split('T')[0]}.xlsx`);
}
