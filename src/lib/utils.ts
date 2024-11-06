import { type ClassValue, clsx } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

export const twMerge = extendTailwindMerge({
  prefix: "tw-",
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function decodeJWT(token) {
  try {
    const [headerB64, payloadB64, signature] = token.split('.');
    const header = JSON.parse(atob(headerB64));
    const payload = JSON.parse(atob(payloadB64));

    return {
      header,
      payload,
      signature
    };
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}