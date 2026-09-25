import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate';
import type { ApplicationStatus } from '~/types/applications';
import { zurichDate } from '~~/shared/utils/rav-date';

export interface RavEntry {
  appliedAt: string;
  company: string;
  location: string | null;
  position: string;
  contact: string | null;
  status: ApplicationStatus;
}

export interface RavPerson {
  lastName: string;
  firstName: string;
  ahvNumber: string;
}

export const RAV_MAX_ENTRIES = 14;

const MONTHS_DE = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember'
];

const FORM_SHEET = 'xl/worksheets/sheet1.xml';
const FIRST_ENTRY_ROW = 14;
const ROWS_PER_ENTRY = 3;
// Digit cells of the AHV number on the Form sheet (J, O, T are separators).
const AHV_CELLS = ['G', 'H', 'I', 'K', 'L', 'M', 'N', 'P', 'Q', 'R', 'S', 'U', 'V'];

export function parseRavMonth(
  raw: string
): { year: number; month: number } | null {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(raw);
  return m ? { year: Number(m[1]), month: Number(m[2]) } : null;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function setCell(xml: string, ref: string, value: string | number): string {
  const pattern = new RegExp(
    `<c r="${ref}"((?: [a-z]+="[^"]*")*)\\s*(?:/>|>[\\s\\S]*?</c>)`
  );
  const match = pattern.exec(xml);
  if (!match) throw new Error(`Template cell ${ref} not found`);
  const style = /s="(\d+)"/.exec(match[1] ?? '')?.[1];
  const s = style ? ` s="${style}"` : '';
  const cell =
    typeof value === 'number'
      ? `<c r="${ref}"${s}><v>${value}</v></c>`
      : `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
  return xml.replace(pattern, () => cell);
}

const RESULT_COLUMN: Partial<Record<ApplicationStatus, string>> = {
  applied: 'AQ',
  interviewing: 'AR',
  offered: 'AS',
  accepted: 'AS',
  rejected: 'AT'
};

export function fillRavWorkbook(
  template: Uint8Array,
  year: number,
  month: number,
  entries: RavEntry[],
  person: RavPerson
): Uint8Array {
  if (entries.length > RAV_MAX_ENTRIES) {
    throw new Error(
      `The form fits ${RAV_MAX_ENTRIES} applications, found ${entries.length}.`
    );
  }

  const files = unzipSync(template);
  let sheet = strFromU8(files[FORM_SHEET]!);

  sheet = setCell(sheet, 'G7', person.lastName);
  sheet = setCell(sheet, 'G9', person.firstName);
  sheet = setCell(sheet, 'AA7', MONTHS_DE[month - 1]!);
  sheet = setCell(sheet, 'AA9', year);

  const digits = person.ahvNumber.replace(/\D/g, '');
  if (digits.length === AHV_CELLS.length) {
    AHV_CELLS.forEach((col, i) => {
      sheet = setCell(sheet, `${col}5`, digits[i]!);
    });
  }

  entries.forEach((e, i) => {
    const row = FIRST_ENTRY_ROW + i * ROWS_PER_ENTRY;
    const d = zurichDate(e.appliedAt);
    sheet = setCell(sheet, `B${row}`, d.day);
    sheet = setCell(sheet, `D${row}`, d.month);
    sheet = setCell(sheet, `F${row}`, e.company);
    if (e.location) sheet = setCell(sheet, `F${row + 1}`, e.location);
    if (e.contact) sheet = setCell(sheet, `F${row + 2}`, e.contact);
    sheet = setCell(sheet, `T${row}`, e.position);
    sheet = setCell(sheet, `AK${row}`, 'X');
    sheet = setCell(sheet, `AM${row}`, 'X');
    const result = RESULT_COLUMN[e.status];
    if (result) sheet = setCell(sheet, `${result}${row}`, 'X');
  });

  files[FORM_SHEET] = strToU8(sheet);

  // Cached formula results in the template are stale — have Excel recompute
  // the Arbeitsbemühungen sheet on open.
  const workbook = strFromU8(files['xl/workbook.xml']!).replace(
    /<calcPr calcId="(\d+)"\/>/,
    '<calcPr calcId="$1" fullCalcOnLoad="1"/>'
  );
  files['xl/workbook.xml'] = strToU8(workbook);

  return zipSync(files);
}
