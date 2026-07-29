import { CheckoutButton } from '@/components/CheckoutButton';
import { Icon } from '@/components/Icon';
import { formatINR, serverApi } from '@/lib/api';
import type { Plan } from '@/lib/types';

export const metadata = {
  title: 'Membership — EverAfter',
  description: 'Upgrade to reach verified members directly, with priority placement and advisors.',
};

export default async function MembershipPage() {
  const { items, live } = await serverApi<{ items: Plan[]; live: boolean }>(
    '/api/payments/plans',
    300
  );

  return (
    <div className="w-full bg-surface pb-section-gap-mobile lg:pb-section-gap">
      <section className="w-full bg-primary-fixed/40 py-20">
        <div className="mx-auto max-w-container px-margin-mobile text-center">
          <h1 className="font-heading text-display-lg-mobile text-primary lg:text-display-lg">
            Membership That Moves Things Forward
          </h1>
          <p className="mx-auto mt-6 max-w-2xl font-body text-body-lg text-on-surface-variant">
            Free profiles get you seen. A premium membership gets you talking — direct contact,
            priority placement, and an advisor who knows your search.
          </p>
          {!live && (
            <p className="mx-auto mt-6 inline-flex items-center gap-2 rounded-lg bg-surface px-4 py-2 font-body text-label-md text-on-surface-variant shadow-card">
              <Icon name="info" className="text-[16px] text-secondary" />
              Razorpay test mode is not configured — checkout runs as a local simulation.
            </p>
          )}
        </div>
      </section>

      <div className="mx-auto mt-16 grid max-w-container grid-cols-1 gap-gutter px-margin-mobile md:grid-cols-3">
        {items.map((plan) => (
          <div
            key={plan.id}
            className={`relative flex flex-col gap-6 rounded-2xl bg-surface-container-lowest p-8 ${
              plan.highlight ? 'shadow-float ring-2 ring-secondary' : 'shadow-card'
            }`}
          >
            {plan.highlight && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-secondary px-4 py-1 font-body text-label-md uppercase tracking-wider text-on-secondary">
                Most Popular
              </span>
            )}

            <div className="flex flex-col gap-2">
              <h2 className="font-heading text-[28px] text-primary">{plan.name}</h2>
              <p className="font-body text-label-md uppercase tracking-wider text-on-surface-variant">
                {plan.duration}
              </p>
            </div>

            <p className="font-heading text-headline-md text-secondary">
              {formatINR(plan.amount)}
            </p>

            <ul className="flex flex-1 flex-col gap-3">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Icon name="check_circle" className="mt-0.5 text-[18px] text-secondary" filled />
                  <span className="font-body text-body-md text-on-surface-variant">{feature}</span>
                </li>
              ))}
            </ul>

            <CheckoutButton plan={plan} />
          </div>
        ))}
      </div>
    </div>
  );
}
