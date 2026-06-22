import { env } from '../config/env.js';

export async function initializePaystack(email: string, amount: number, reference: string, callbackUrl: string) {
  if (!env.paystackSecretKey) throw new Error('Paystack secret key is not configured');

  const res = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.paystackSecretKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, amount: amount * 100, reference, callback_url: callbackUrl })
  });
  const json = await res.json();

  if (!res.ok) throw new Error(json.message || 'Paystack initialization failed');
  if (!json.status) throw new Error(json.message);
  return json.data;
}

export async function verifyPaystack(reference: string) {
  if (!env.paystackSecretKey) throw new Error('Paystack secret key is not configured');

  const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, { headers: { Authorization: `Bearer ${env.paystackSecretKey}` } });
  const json = await res.json();

  if (!res.ok) throw new Error(json.message || 'Paystack verification failed');
  if (!json.status) throw new Error(json.message);
  return json.data;
}
