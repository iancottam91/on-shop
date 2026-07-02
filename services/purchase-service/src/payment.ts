/**
 * Stub for the "Third Party Payment Provider" box in the diagram
 * (e.g. paypal/checkout.com). Simulates network latency and lets the
 * failure rate be tuned via PAYMENT_FAILURE_RATE for testing the
 * failure/rollback path locally.
 */
const FAILURE_RATE = Number(process.env.PAYMENT_FAILURE_RATE ?? "0");
const SIMULATED_LATENCY_MS = 300;

export type PaymentResult = { success: boolean; reference: string };

export async function chargePayment(userId: string, amount: number): Promise<PaymentResult> {
  await new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));

  const success = Math.random() >= FAILURE_RATE;
  return {
    success,
    reference: `mock-payment-${userId}-${Date.now()}`,
  };
}
