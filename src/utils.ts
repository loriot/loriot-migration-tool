import { AxiosError, isAxiosError } from 'axios';
import csv from 'csvtojson';
import fs from 'fs';

/**
 * Return a meaningful error message to log
 */
export function getErrorMessage(error: Error): string {
  var msg = '';

  if (isAxiosError(error)) {
    msg += `${error.message} ${(error as AxiosError).response?.statusText}`;
    if ((error as AxiosError).response?.data) {
      msg += JSON.stringify((error as AxiosError).response?.data);
    }
    return msg;
  } else {
    msg = error.message;
  }

  return msg;
}

/**
 * Load CSV file and try to cast undefined, boolean and number fields
 */
const hexFields = [
  'dev_addr',
  'devEui',
  'NwkSKey',
  'AppSKey',
  'appEui',
  'appKey',
];
export async function loadCsvFile(path: string): Promise<any> {
  if (!fs.existsSync(path)) {
    console.warn(`File ${path} not found`);
    return [];
  } else {
    const data: any = await csv().fromFile(path);

    // CSV fields are loaded as string, try to cast them
    for (const row of data) {
      for (const field in row) {
        // Undefined
        if (row[field].toLowerCase() == 'null' || row[field] == '')
          delete (row as any)[field];
        // Boolean
        else if (row[field].toLowerCase() == 'true') row[field] = true;
        else if (row[field].toLowerCase() == 'false')
          (row as any)[field] = false;
        // if hex do not try to convert as number
        else if (hexFields.includes(field)) {
        }
        // Number
        else if (!isNaN(Number(row[field]))) row[field] = Number(row[field]);
      }
    }

    return data;
  }
}

/**
 * Returns a new string with leading zeors (on the left) to reach a specified total length.
 *
 * @param length The number of characters in the resulting string, equal to the number of original characters plus zeros
 * @returns A new string that is equivalent to the input string, but right-aligned and padded on the left with as many zeros as needed to create the target length
 */
export function addLeadingZeros(hex: string, length: number): string {
  try {
    while (hex.length < length) hex = '0' + hex;
    return hex;
  } catch (err: any) {
    throw new Error(`Cannot add leading zeros to ${hex}`);
  }
}

export async function sleep(ms: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(() => resolve(), ms));
}

export function randomHex(size: number): string {
  let hex = [...Array(size)]
    .map(() => Math.floor(Math.random() * 16).toString(16))
    .join('')
    .toUpperCase();
  while (hex.length % 2 != 0) hex = '0' + hex; // Left padding
  return hex;
}

export function randomMAC(): string {
  return `${randomHex(2)}:${randomHex(2)}:${randomHex(2)}:${randomHex(
    2
  )}:${randomHex(2)}:${randomHex(2)}`;
}
