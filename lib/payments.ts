export type PaymentRequest = { orderId: string; amount: number; currency: string };
export type PaymentResult = { provider: string; status: 'pending' | 'paid'; reference: string };

export interface PaymentProvider { createPayment(request: PaymentRequest): Promise<PaymentResult>; }

export class MockPaymentProvider implements PaymentProvider {
  async createPayment(request: PaymentRequest): Promise<PaymentResult> { return { provider: 'mock', status: 'paid', reference: `MOCK_${request.orderId}_${request.amount}` }; }
}
