/**
 * Authoritative pricing catalog.
 *
 * The checkout API uses this as the SOURCE OF TRUTH for price/credits/duration.
 * Any price, credits, or plan info sent by the client is IGNORED — only the
 * product_id is honored, and everything else is looked up here.
 *
 * To change pricing, edit this file and redeploy. Admin UI cannot alter prices.
 */

import { PaymentInterval, PaymentType } from '@/core/payment/types';

export type PricingPlanInfo = {
  name: string;
  interval: PaymentInterval;
  intervalCount: number;
};

export type PricingProduct = {
  productId: string;
  productName: string;
  planName: string;
  description: string;
  type: PaymentType;
  priceInCents: number;
  currency: string;
  credits: number;
  creditsValidDays?: number;
  plan?: PricingPlanInfo;
};

/**
 * Default demo catalog. Replace with your real products when launching.
 * Keys MUST match what the pricing UI sends as product_id.
 */
export const pricingCatalog: Record<string, PricingProduct> = {};
// Test fixture only: never returned by listPricingProducts and never available in production.
const testProduct: PricingProduct = {
  productId: 'stripe_test_pack',
  productName: 'Test generation pack',
  planName: 'Test only',
  description: 'Stripe sandbox validation only',
  type: PaymentType.ONE_TIME,
  priceInCents: 100,
  currency: 'usd',
  credits: 2,
  creditsValidDays: 365,
};

export function getPricingProduct(productId: string): PricingProduct | null {
  if (!productId) return null;
  if (
    process.env.NODE_ENV !== 'production' &&
    process.env.GAME_PAYMENT_TEST_MODE === 'true' &&
    productId === testProduct.productId
  )
    return testProduct;
  return pricingCatalog[productId] ?? null;
}

export function listPricingProducts(): PricingProduct[] {
  return Object.values(pricingCatalog);
}
