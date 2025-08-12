//utils/excelUtils.js

import ExcelJS from 'exceljs';

/**
 * Parse an XLSX file and return JSON data.
 * @param {Buffer} fileBuffer - The buffer of the XLSX file.
 * @returns {Object[]} - Parsed data from the XLSX file.
 */
export const parseExcelFile = async (fileBuffer) => {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer);

    const worksheet = workbook.worksheets[0]; // Assumes you are reading from the first sheet
    const jsonData = [];

    // Process rows from the beginning to capture header and initial rows correctly
    worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      // Skip the header row and empty rows
      if (rowNumber === 1 || isRowEmpty(row)) return;

      // Extract and process cell values
      jsonData.push({
        staff: extractCellText(row.getCell(1)) || 'Unknown', // STAFF column
        post: extractCellText(row.getCell(2)) || 'N/A', // Post Des column
        monday: extractCellText(row.getCell(3)) || '', // Monday column
        tuesday: extractCellText(row.getCell(4)) || '', // Tuesday column
        wednesday: extractCellText(row.getCell(5)) || '', // Wednesday column
        thursday: extractCellText(row.getCell(6)) || '', // Thursday column
        friday: extractCellText(row.getCell(7)) || '', // Friday column
        saturday: extractCellText(row.getCell(8)) || '', // Saturday column
        sunday: extractCellText(row.getCell(9)) || '', // Sunday column
      });
    });

    // Ensure to handle empty rows or initial rows properly
    const filteredData = jsonData.filter((item) => item.staff !== 'Unknown');

    return filteredData;
  } catch (error) {
    console.error('Error parsing Excel file:', error);
    throw new Error('Failed to parse Excel file.');
  }
};

/**
 * Check if a row is empty by examining each cell.
 * @param {ExcelJS.Row} row - The row to check.
 * @returns {boolean} - Returns true if the row is empty, false otherwise.
 */
const isRowEmpty = (row) => {
  let isEmpty = true;
  row.eachCell({ includeEmpty: true }, (cell) => {
    if (cell.value !== null && cell.value !== undefined && cell.value !== '') {
      isEmpty = false;
    }
  });
  return isEmpty;
};

/**
 * Extract text from a cell, handling rich text and other cell types.
 * @param {ExcelJS.Cell} cell - The cell to extract text from.
 * @returns {string} - The extracted text or empty string if no data.
 */
const extractCellText = (cell) => {
  if (!cell || !cell.value) return '';

  if (typeof cell.value === 'string') {
    return cell.value;
  }

  if (typeof cell.value === 'number') {
    return cell.value.toString(); // Convert numbers to strings
  }

  if (typeof cell.value === 'object') {
    if (cell.value.richText) {
      return cell.value.richText.map((item) => item.text).join(' ');
    }
    return ''; // Handle other objects as empty strings
  }

  return '';
};
