import { env } from '../config/env.js';
export async function initializePaystack(email: string, amount: number, reference: string, callbackUrl: string) {
  if (!env.paystackSecretKey) return { authorization_url: `${callbackUrl}?reference=${reference}&mock=1`, access_code: 'mock', reference };
  const res = await fetch('https://api.paystack.co/transaction/initialize', { method: 'POST', headers: { Authorization: `Bearer ${env.paystackSecretKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, amount: amount * 100, reference, callback_url: callbackUrl }) });
  const json = await res.json(); if (!json.status) throw new Error(json.message); return json.data;
}
export async function verifyPaystack(reference: string) {
  if (!env.paystackSecretKey) return { status: 'success', reference, gateway_response: 'Mock success' };
  const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, { headers: { Authorization: `Bearer ${env.paystackSecretKey}` } });
  const json = await res.json(); if (!json.status) throw new Error(json.message); return json.data;
}
