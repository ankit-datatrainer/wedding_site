'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, formatINR } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Plan } from '@/lib/types';

type OrderResponse = {
  mode: 'live' | 'simulated';
  keyId: string | null;
  order: { id: string; amount: number; currency: string };
  plan: Plan;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpay(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function CheckoutButton({ plan }: { plan: Plan }) {
  const { user, refresh } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState('');
  const [pending, setPending] = useState(false);

  const active = user?.plan_id === plan.id;

  async function confirm(payload: Record<string, string>) {
    await api('/api/payments/verify', {
      method: 'POST',
      auth: true,
      body: JSON.stringify(payload),
    });
    await refresh();
    setStatus(`${plan.name} membership is active. Welcome aboard.`);
    setPending(false);
  }

  async function checkout() {
    if (!user) {
      router.push('/login?next=/membership');
      return;
    }

    setStatus('');
    setPending(true);

    try {
      const res = await api<OrderResponse>('/api/payments/order', {
        method: 'POST',
        auth: true,
        body: JSON.stringify({ planId: plan.id }),
      });

      // Without Razorpay keys the API issues a simulated order, so the flow
      // completes locally instead of opening the hosted checkout.
      if (res.mode === 'simulated') {
        setStatus('Razorpay keys are not configured — completing a simulated payment.');
        await confirm({ razorpay_order_id: res.order.id });
        return;
      }

      const ok = await loadRazorpay();
      if (!ok) throw new Error('Could not reach Razorpay Checkout. Check your connection.');

      const rzp = new window.Razorpay!({
        key: res.keyId,
        order_id: res.order.id,
        amount: res.order.amount,
        currency: res.order.currency,
        name: 'EverAfter Matrimonials',
        description: `${plan.name} — ${plan.duration}`,
        prefill: { email: user.email, name: `${user.first_name} ${user.last_name}` },
        theme: { color: '#b02559' },
        handler: (response: Record<string, string>) => {
          confirm(response).catch((err: Error) => {
            setStatus(err.message);
            setPending(false);
          });
        },
        modal: {
          ondismiss: () => {
            setStatus('Payment cancelled.');
            setPending(false);
          },
        },
      });

      rzp.open();
    } catch (err) {
      setStatus((err as Error).message);
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={checkout}
        disabled={pending || active}
        className={`w-full rounded-lg px-6 py-3 font-body text-label-lg uppercase transition-colors disabled:opacity-70 ${
          plan.highlight
            ? 'bg-secondary text-on-secondary shadow-md hover:bg-on-secondary-container'
            : 'border-[1.5px] border-secondary text-secondary hover:bg-secondary hover:text-on-secondary'
        }`}
      >
        {active ? 'Current Plan' : pending ? 'Processing…' : `Choose ${plan.name}`}
      </button>
      <p className="text-center font-body text-label-md text-on-surface-variant">
        {formatINR(plan.amount)} billed once for {plan.duration.toLowerCase()}
      </p>
      {status && (
        <p role="status" className="text-center font-body text-label-md text-secondary">
          {status}
        </p>
      )}
    </div>
  );
}
