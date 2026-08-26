import * as DocumentPicker from 'expo-document-picker';
import { readAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import { extractText, isAvailable } from 'expo-pdf-text-extract';
import * as XLSX from 'xlsx';

import type { NewTransaction } from '@/db/schema';

type ImportSource = 'Paytm' | 'GPay' | 'BHIM';
type PickedFile = { uri: string; name: string; mimeType?: string | null };

const moneyToPaise = (value: unknown) => Math.round(Number(String(value).replace(/[,+₹]/g, '')) * 100);
const inferCategory = (name: string, tag = '') => {
  const text = `${name} ${tag}`.toLowerCase();
  if (text.includes('flipkart') || text.includes('shopping')) return 'Shopping';
  if (text.includes('electric') || text.includes('bill')) return 'Bills';
  if (text.includes('cashback')) return 'Cashback';
  if (text.includes('zomato') || text.includes('swiggy') || text.includes('food')) return 'Food & dining';
  if (text.includes('grocery') || text.includes('instamart')) return 'Groceries';
  if (text.includes('received') || text.includes('sent') || text.includes('transfer')) return 'Transfers';
  return 'Other';
};

const isoFromPaytm = (date: string, time: string) => {
  const [day, month, year] = date.split('/').map(Number);
  return new Date(year, month - 1, day, ...time.split(':').map(Number)).getTime();
};

function record(values: Omit<NewTransaction, 'id' | 'createdAt'>, index: number): NewTransaction {
  const now = Date.now();
  return { ...values, id: `import-${now}-${index}`, createdAt: new Date(now) };
}

export async function chooseStatement(): Promise<PickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    copyToCacheDirectory: true,
  });
  return result.canceled ? null : result.assets[0];
}

export async function parseStatement(file: PickedFile): Promise<{ source: ImportSource; rows: NewTransaction[] }> {
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith('.xlsx')) return { source: 'Paytm', rows: await parsePaytm(file) };
  if (!isAvailable()) throw new Error('PDF imports need a development build. Spreadsheet imports work in Expo Go.');
  const text = await extractText(file.uri);
  if (text.includes('Google Pay') || text.includes('Transaction statement period')) {
    return { source: 'GPay', rows: parseGPayPdf(text, file.name) };
  }
  if (text.includes('Transaction History') || text.includes('BHIM')) {
    return { source: 'BHIM', rows: parseBhimPdf(text, file.name) };
  }
  throw new Error('This PDF is not a recognised GPay or BHIM statement.');
}

async function parsePaytm(file: PickedFile) {
  const base64 = await readAsStringAsync(file.uri, { encoding: EncodingType.Base64 });
  const workbook = XLSX.read(base64, { type: 'base64', cellDates: true });
  const sheet = workbook.Sheets['Passbook Payment History'];
  if (!sheet) throw new Error('No Paytm payment history sheet found.');
  const data = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });
  return data.map((row, index) => {
    const amount = moneyToPaise(row.Amount);
    const counterparty = row['Transaction Details'] || 'Paytm transaction';
    return record({
      occurredAt: new Date(isoFromPaytm(row.Date, row.Time)),
      counterparty,
      amountPaise: Math.abs(amount),
      direction: amount < 0 ? 'debit' : 'credit',
      category: inferCategory(counterparty, row.Tags),
      source: 'Paytm',
      reference: row['UPI Ref No.'] || null,
      status: 'SUCCESS',
      sourceFile: file.name,
    }, index);
  });
}

function parseGPayPdf(text: string, filename: string) {
  const expression = /(\d{2} \w{3}, \d{4})\s+(\d{2}:\d{2} [AP]M)\s+(Received from|Paid to)\s+([\s\S]*?)\s+UPI Transaction ID:\s*(\d+)[\s\S]*?₹([\d,]+)/g;
  const rows: NewTransaction[] = [];
  for (const match of text.matchAll(expression)) {
    const direction = match[3] === 'Paid to' ? 'debit' : 'credit';
    const counterparty = match[4].replace(/\s+/g, ' ').trim();
    rows.push(record({
      occurredAt: new Date(`${match[1]} ${match[2]}`),
      counterparty,
      amountPaise: moneyToPaise(match[6]),
      direction,
      category: inferCategory(counterparty),
      source: 'GPay',
      reference: match[5],
      status: 'SUCCESS',
      sourceFile: filename,
    }, rows.length));
  }
  return rows;
}

function parseBhimPdf(text: string, filename: string) {
  const expression = /(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2}:\d{2})[\s\S]*?\s(\d{12})\s+PAY\s+(\d+(?:\.\d+)?)\s+(DR|CR)\s+(SUCCESS)/g;
  const rows: NewTransaction[] = [];
  for (const match of text.matchAll(expression)) {
    const [day, month, year] = match[1].split('/').map(Number);
    rows.push(record({
      occurredAt: new Date(year, month - 1, day, ...match[2].split(':').map(Number)),
      counterparty: 'BHIM UPI payment',
      amountPaise: moneyToPaise(match[4]),
      direction: match[5] === 'DR' ? 'debit' : 'credit',
      category: 'Other',
      source: 'BHIM',
      reference: match[3],
      status: match[6],
      sourceFile: filename,
    }, rows.length));
  }
  return rows;
}
