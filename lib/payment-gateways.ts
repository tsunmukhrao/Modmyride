export type PaymentGatewaySetup = {
  provider: string;
  reference: string;
  amount: number;
  currency: string;
  checkoutUrl: string | null;
  clientData: Record<string, string>;
};

export type PaymentGatewayClient = {
  open(setup: PaymentGatewaySetup, onReturn: (payload: Record<string, string>) => void): void | Promise<void>;
};

const gateways = new Map<string, PaymentGatewayClient>();

export function registerPaymentGateway(provider: string, gateway: PaymentGatewayClient) {
  const key = provider.trim().toLowerCase();
  if (!key) throw new Error('Payment gateway provider name is required.');
  gateways.set(key, gateway);
}

export function getPaymentGateway(provider: string): PaymentGatewayClient | null {
  return gateways.get(provider.trim().toLowerCase()) ?? null;
}
