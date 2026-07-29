import { Icon } from '@/components/Icon';

export const metadata = {
  title: 'Help & Safety — EverAfter',
  description: 'About EverAfter, safety guidance, support contacts and terms of service.',
};

const SECTIONS = [
  {
    id: 'about',
    icon: 'favorite',
    title: 'About Us',
    body: [
      'EverAfter has been matchmaking since 2012, on the belief that a marriage joins two families rather than two profiles.',
      'Every member is identity-verified before their profile becomes searchable, and our relationship advisors stay with you from the first conversation through to the wedding.',
    ],
  },
  {
    id: 'safety',
    icon: 'shield',
    title: 'Safety Tips',
    body: [
      'Keep conversations on EverAfter until you are confident about the other person. Our team can only help with what happens on the platform.',
      'Never send money, share banking details, or forward one-time passwords — no genuine member will ask.',
      'Meet in a public place for the first time and tell a family member where you are going.',
      'Report anything that feels wrong. Every report is reviewed by a person, not an algorithm.',
    ],
  },
  {
    id: 'contact',
    icon: 'support_agent',
    title: 'Contact Support',
    body: [
      'Email support@everafter.com and we reply within one working day.',
      'Call 1-800-HEART-88, Monday to Saturday, 9am to 9pm IST.',
      'Premium members get a dedicated advisor reachable directly from their dashboard.',
    ],
  },
  {
    id: 'terms',
    icon: 'gavel',
    title: 'Terms of Service',
    body: [
      'You must be of legal marriageable age in your jurisdiction to create a profile.',
      'One profile per person. Profiles created on behalf of a family member must say so at registration.',
      'Membership fees cover the period stated at purchase and are non-transferable between accounts.',
      'We never sell member data. Contact details are shared only when both members have expressed interest.',
    ],
  },
];

export default function HelpPage() {
  return (
    <div className="w-full bg-surface">
      <section className="w-full bg-primary-fixed/40 py-20">
        <div className="mx-auto max-w-container px-margin-mobile">
          <h1 className="font-heading text-display-lg-mobile text-primary lg:text-display-lg">
            Help &amp; Safety
          </h1>
          <p className="mt-6 max-w-2xl font-body text-body-lg text-on-surface-variant">
            Everything you need to know about how EverAfter works, and how we keep your search safe.
          </p>
        </div>
      </section>

      <div className="mx-auto flex max-w-3xl flex-col gap-12 px-margin-mobile py-section-gap-mobile">
        {SECTIONS.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-28">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary-container/20">
                <Icon name={section.icon} className="text-secondary" />
              </span>
              <h2 className="font-heading text-[28px] text-primary">{section.title}</h2>
            </div>
            <div className="flex flex-col gap-3 border-l-2 border-outline-variant/50 pl-6">
              {section.body.map((paragraph) => (
                <p key={paragraph} className="font-body text-body-md text-on-surface-variant">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
