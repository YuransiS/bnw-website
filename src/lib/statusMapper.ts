export const statusMapper = {
  normalize: (rawStatus: string | null | undefined): 'closed_won' | 'declined' | 'pending' => {
    if (!rawStatus) return 'pending';
    const s = String(rawStatus).toLowerCase().trim();

    // Check if status represents a successful payment
    const hasPaidIndicator = 
      s === 'closed_won' ||
      (s.includes('оплат') && !s.includes('очікує')) ||
      s.includes('approved') ||
      s.includes('aprooved') ||
      s.includes('success') ||
      s.includes('да') ||
      s === 'paid' ||
      s.includes('оплачен') ||
      s.includes('купив');

    const hasUnpaidNegation = 
      s.includes('не оплат') ||
      s.includes('неоплат') ||
      s.includes('не оплач') ||
      s.includes('неоплач') ||
      s.includes('очікує') ||
      /не\s*оплат/.test(s) ||
      /не\s*оплач/.test(s);

    if (hasPaidIndicator && !hasUnpaidNegation) {
      return 'closed_won';
    }

    // Check if status represents a failed/declined/refunded transaction
    const isDeclined = 
      s.includes('fail') ||
      s.includes('decline') ||
      s.includes('expire') ||
      s.includes('відхил') ||
      s.includes('відмов');

    if (isDeclined) {
      return 'declined';
    }

    return 'pending';
  }
};
