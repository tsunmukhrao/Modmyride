import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPaymentGateway, registerPaymentGateway, type PaymentGatewaySetup } from './payment-gateways';

const setup: PaymentGatewaySetup = {
  provider: 'example', reference: 'ref-1', amount: 12500, currency: 'INR', checkoutUrl: null, clientData: {},
};

afterEach(() => { vi.restoreAllMocks(); });

describe('provider-neutral checkout adapters', () => {
  it('looks up providers case-insensitively and returns no accidental default gateway', () => {
    expect(getPaymentGateway('unconfigured')).toBeNull();
    const open = vi.fn();
    registerPaymentGateway('Example', { open });
    expect(getPaymentGateway('example')?.open).toBe(open);
    expect(getPaymentGateway('another')).toBeNull();
  });

  it('replaces an adapter registration for the same provider', () => {
    const first = { open: vi.fn() };
    const second = { open: vi.fn() };
    registerPaymentGateway('example', first);
    registerPaymentGateway('example', second);
    expect(getPaymentGateway(setup.provider)).toBe(second);
  });
});
