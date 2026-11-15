'use client';

export function InvoicePrintButton() {
  return <button className="button no-print" type="button" onClick={() => window.print()}>PRINT / SAVE PDF</button>;
}
