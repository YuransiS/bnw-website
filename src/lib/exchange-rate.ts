/**
 * Exchange Rate Service utilizing the National Bank of Ukraine (NBU) API.
 * Fetches USD and EUR exchange rates for a specific date (historical) or today,
 * calculating the exact cross-rate of EUR/USD.
 */

export interface ExchangeRates {
  usdRate: number;
  eurRate: number;
  eurToUsd: number;
}

const FALLBACK_RATES: ExchangeRates = {
  usdRate: 41.0,
  eurRate: 44.28,
  eurToUsd: 1.08
};

export async function getExchangeRates(dateStr?: string): Promise<ExchangeRates> {
  const todayStr = new Date().toISOString().split("T")[0];
  const targetDate = (dateStr || todayStr).replace(/-/g, "");

  try {
    // Next.js fetch revalidation caches these requests server-side.
    // Permanent cache for historical dates, 24h cache for today.
    const revalidate = dateStr && dateStr < todayStr ? undefined : 86400;
    
    const response = await fetch(
      `https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?date=${targetDate}&json`,
      revalidate !== undefined ? { next: { revalidate } } : {}
    );

    if (!response.ok) {
      console.warn(`Failed to fetch exchange rates from NBU for date ${targetDate}: Status ${response.status}. Using fallback.`);
      return FALLBACK_RATES;
    }

    const data: any[] = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      const usdObj = data.find(c => c.cc === "USD");
      const eurObj = data.find(c => c.cc === "EUR");

      const usdRate = usdObj && typeof usdObj.rate === "number" ? usdObj.rate : FALLBACK_RATES.usdRate;
      const eurRate = eurObj && typeof eurObj.rate === "number" ? eurObj.rate : FALLBACK_RATES.eurRate;
      const eurToUsd = usdRate > 0 ? eurRate / usdRate : FALLBACK_RATES.eurToUsd;

      return {
        usdRate: Number(usdRate.toFixed(4)),
        eurRate: Number(eurRate.toFixed(4)),
        eurToUsd: Number(eurToUsd.toFixed(4))
      };
    }

    console.warn(`Unexpected exchange rates payload from NBU for date ${targetDate}. Using fallback.`);
    return FALLBACK_RATES;
  } catch (error) {
    console.error(`Error fetching NBU exchange rates for date ${targetDate}: ${error}. Using fallback.`);
    return FALLBACK_RATES;
  }
}
