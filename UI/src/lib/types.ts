export interface LineItem {
  id: string;
  description: string;
  qty: number;
  price: number;
}

export interface AppState {
  docType: 'Ankara' | 'Bei-Kadirio';
  myName: string;
  myPhone: string;
  myEmail: string;
  myAddress: string;
  logoBase64: string;
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  docNumber: string;
  dateIssue: string;
  dateDue: string;
  vatEnabled: boolean;
  discountValue: number;
  discountType: 'FIXED' | 'PERCENT';
  additionalNotes: string;
  items: LineItem[];
}

export interface Totals {
  subtotal: number;
  discountAmount: number;
  vatAmount: number;
  grandTotal: number;
}
