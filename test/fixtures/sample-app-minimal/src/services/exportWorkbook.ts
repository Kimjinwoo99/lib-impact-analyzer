import * as XLSX from 'xlsx';
import { useGridPrefsStore } from '../stores/gridPrefs';

export function exportRowsToWorkbook(rows: Array<Record<string, unknown>>) {
  const prefs = useGridPrefsStore();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');
  const binary = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  prefs.markExported();
  return binary;
}