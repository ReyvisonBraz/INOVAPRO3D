import { loadStripe } from '@stripe/stripe-js';

const key = (import.meta as any).env?.VITE_STRIPE_PUBLIC_KEY as string | undefined;

export const stripePromise = key ? loadStripe(key) : null;
export const stripeEnabled = Boolean(key);

export const stripeAppearance = {
  theme: 'night' as const,
  variables: {
    colorPrimary: '#3b82f6',
    colorBackground: '#080d1a',
    colorText: '#f1f5f9',
    colorDanger: '#ef4444',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    borderRadius: '12px',
    spacingUnit: '4px',
    fontSizeBase: '14px',
  },
  rules: {
    '.Input': { border: '1px solid rgba(255,255,255,0.08)', padding: '14px 16px' },
    '.Input:focus': { border: '1px solid rgba(59,130,246,0.6)', boxShadow: 'none' },
    '.Label': { fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.35)' },
    '.Tab': { border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' },
    '.Tab--selected': { border: '1px solid rgba(59,130,246,0.5)', backgroundColor: 'rgba(59,130,246,0.08)' },
  },
};
