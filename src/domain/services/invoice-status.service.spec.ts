import { toInvoiceCurrency } from './invoice-status.service';

describe('toInvoiceCurrency', () => {
  it('counts a same-currency payment at face value', () => {
    const payment = { amountPaid: 100, currency: 'USD' as const, exchangeRate: undefined };
    expect(toInvoiceCurrency(payment, 'USD')).toBe(100);
  });

  it('converts a cross-currency payment using its own exchange rate', () => {
    // Paying an LBP invoice with USD: 1 USD = 89000 LBP for this payment.
    const payment = { amountPaid: 10, currency: 'USD' as const, exchangeRate: 89000 };
    expect(toInvoiceCurrency(payment, 'LBP')).toBe(890000);
  });

  it('converts the other direction too', () => {
    // Paying a USD invoice with LBP: 1 LBP = 0.0000112 USD for this payment.
    const payment = { amountPaid: 890000, currency: 'LBP' as const, exchangeRate: 0.0000112 };
    expect(toInvoiceCurrency(payment, 'USD')).toBeCloseTo(9.968, 3);
  });

  it('contributes zero for a cross-currency payment missing its exchange rate rather than silently counting at face value', () => {
    const payment = { amountPaid: 10, currency: 'USD' as const, exchangeRate: undefined };
    expect(toInvoiceCurrency(payment, 'LBP')).toBe(0);
  });
});
