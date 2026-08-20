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

  // Exclude explicit failure/lead/click/intent statuses
  if (
    s.includes('перехід до оплат') ||
    s.includes('переход к оплат') ||
    s.includes('клик на форму') ||
    s.includes('клік на форму') ||
    s.includes('клик') ||
    s.includes('клік') ||
    s.includes('new') ||
    s.includes('новий') ||
    s.includes('новый') ||
    s.includes('зареєстрован') ||
    s.includes('зарегистрирован') ||
    s.includes('відмова') ||
    s.includes('отказ') ||
    s.includes('failed') ||
    s.includes('decline') ||
    s.includes('відхил') ||
    s.includes('expire') ||
    s.includes('прострочен') ||
    s.includes('refund') ||
    s.includes('повернен') ||
    s.includes('в обробці') ||
    s.includes('in_progress') ||
    s.includes('pending') ||
    s.includes('очікує') ||
    s.includes('ожидает') ||
    s.includes('почат') ||
    s.includes('начат') ||
    s.includes('не оплат') ||
    s.includes('неоплат') ||
    s.includes('не оплач') ||
    s.includes('неоплач')
  ) {
    return false;
  }

  // Exact canonical match
  if (CANONICAL_PAID_STATUSES.includes(s)) {
    return true;
  }

  // Exact positive words: 'approved', 'paid', 'success', 'completed', 'оплачено', 'купив', 'купил'
  if (
    s === 'approved' ||
    s === 'paid' ||
    s === 'success' ||
    s === 'completed' ||
    s === 'оплачено' ||
    s.startsWith('оплачено') ||
    s.startsWith('купив') ||
    s.startsWith('купил')
  ) {
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
