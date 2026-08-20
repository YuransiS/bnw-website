export const CANONICAL_PAID_STATUSES = [
  'closed_won',
  'paid',
  'approved',
  'aprooved',
  'success',
  'completed',
  'оплачено',
  'оплачено полностью',
  'купив курс',
  'купив_курс',
  'купив трипвайєр',
  'купив трипвайер',
  'купив(-ла) трипвайер',
  'купив(-ла) трипвайєр',
  'внесена предоплата',
  'внесена передплата',
  'передплата',
  'предоплата',
  'частково оплачено',
  'частично оплачено'
];

export function isPaidStatus(rawStatus: string | null | undefined): boolean {
  if (!rawStatus) return false;
  const s = String(rawStatus).toLowerCase().trim();

  // Exclude explicit failure/lead/click statuses
  if (['клик', 'кликформы', 'new', 'новый', 'відмова', 'отказ', 'failed', 'declined', 'refunded', 'повернення', 'в обробці', 'in_progress', 'pending'].includes(s)) {
    return false;
  }

  // Exact canonical match
  if (CANONICAL_PAID_STATUSES.includes(s)) {
    return true;
  }

  // Check if status has unpaid negation
  const hasUnpaidNegation =
    s.includes('не оплат') ||
    s.includes('неоплат') ||
    s.includes('не оплач') ||
    s.includes('неоплач') ||
    s.includes('очікує') ||
    /не\s*оплат/.test(s) ||
    /не\s*оплач/.test(s);

  if (hasUnpaidNegation) return false;

  // Patterns for Ukrainian CRM statuses
  if (s.includes('оплач') || s.includes('купив') || s.includes('approved') || s.includes('paid')) {
    return true;
  }

  return false;
}

export const statusMapper = {
  isPaid: isPaidStatus,
  normalize: (rawStatus: string | null | undefined): 'closed_won' | 'declined' | 'pending' => {
    if (!rawStatus) return 'pending';
    if (isPaidStatus(rawStatus)) {
      return 'closed_won';
    }

    const s = String(rawStatus).toLowerCase().trim();
    // Check if status represents a failed/declined/refunded transaction
    const isDeclined = 
      s.includes('fail') ||
      s.includes('decline') ||
      s.includes('expire') ||
      s.includes('відхил') ||
      s.includes('відмов') ||
      s.includes('отказ') ||
      s.includes('повернен');

    if (isDeclined) {
      return 'declined';
    }

    return 'pending';
  }
};
