import { v4 as uuidv4 } from 'uuid';

export function formatTimestamp(timestamp: number | string | undefined): string {
  if (!timestamp) {
    return new Date().toISOString();
  }

  const ts = typeof timestamp === 'string' ? parseInt(timestamp, 10) : timestamp;

  try {
    return new Date(ts * 1000).toISOString();
  } catch (error) {
    return new Date().toISOString();
  }
}

export function generateSessionId(): string {
  return `session_${uuidv4()}`;
}

export function validatePhoneNumber(phoneNumber: string): boolean {
  const phoneRegex = /^\d{10,15}$/;
  return phoneRegex.test(phoneNumber.replace(/\D/g, ''));
}

export function formatPhoneNumber(phoneNumber: string): string {
  const cleaned = phoneNumber.replace(/\D/g, '');
  return `${cleaned}@s.whatsapp.net`;
}
