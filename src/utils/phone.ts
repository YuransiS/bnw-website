import { isValidPhoneNumber, getCountryCallingCode, CountryCode } from 'libphonenumber-js';

export function validatePhoneNumber(phone: string, defaultCountry = 'UA'): boolean {
  const trimmed = phone.trim();
  if (!trimmed) return false;
  
  try {
    if (!trimmed.startsWith('+')) {
      return isValidPhoneNumber(trimmed, defaultCountry.toUpperCase() as CountryCode);
    }
    return isValidPhoneNumber(trimmed);
  } catch (error) {
    return false;
  }
}

export function getCallingCodeForCountry(country: string): string {
  try {
    return getCountryCallingCode(country.toUpperCase() as CountryCode);
  } catch (e) {
    return '380';
  }
}
