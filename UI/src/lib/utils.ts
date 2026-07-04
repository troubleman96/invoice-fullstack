import type { AppState, LineItem, Totals } from './types';

export function generateId(): string {
  return Date.now() + Math.random().toString(36).substring(2, 11);
}

export function generateDocNumber(type: AppState['docType']): string {
  const prefix = type === 'Ankara' ? 'INV' : 'KAD';
  const year = new Date().getFullYear();
  const counter = parseInt(
    typeof window !== 'undefined'
      ? localStorage.getItem('chapisho_invoice_counter') || '1'
      : '1'
  );
  return `${prefix}-${year}-${String(counter).padStart(4, '0')}`;
}

export function incrementCounter(): void {
  const current = parseInt(
    localStorage.getItem('chapisho_invoice_counter') || '1'
  );
  localStorage.setItem('chapisho_invoice_counter', String(current + 1));
}

export function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('sw-TZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function formatCurrency(n: number): string {
  return `TZS ${Math.round(n).toLocaleString('en-US')}`;
}

export function cleanPhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '255' + cleaned.substring(1);
  }
  return cleaned;
}

export function computeTotals(state: AppState): Totals {
  const subtotal = state.items.reduce(
    (sum, item) => sum + item.qty * item.price,
    0
  );
  let discountAmount =
    state.discountType === 'PERCENT'
      ? subtotal * (state.discountValue / 100)
      : state.discountValue;
  if (discountAmount > subtotal) discountAmount = subtotal;
  const vatBase = subtotal - discountAmount;
  const vatAmount = state.vatEnabled ? vatBase * 0.18 : 0;
  const grandTotal = vatBase + vatAmount;
  return { subtotal, discountAmount, vatAmount, grandTotal };
}

export function defaultState(): AppState {
  const today = new Date();
  const due = new Date();
  due.setDate(today.getDate() + 14);

  return {
    docType: 'Ankara',
    myName: '',
    myPhone: '',
    myEmail: '',
    myAddress: '',
    logoBase64: '',
    clientName: '',
    clientPhone: '',
    clientAddress: '',
    docNumber: generateDocNumber('Ankara'),
    dateIssue: today.toISOString().split('T')[0],
    dateDue: due.toISOString().split('T')[0],
    vatEnabled: true,
    discountValue: 0,
    discountType: 'FIXED',
    additionalNotes:
      'Asante kwa kufanya biashara nasi. Malipo yote yafanyike ndani ya siku zilizopangwa kwenye ankara hii.',
    items: [
      {
        id: generateId(),
        description: 'Ushauri wa Kitaalamu (Consultancy)',
        qty: 1,
        price: 1500000,
      },
    ],
  };
}
