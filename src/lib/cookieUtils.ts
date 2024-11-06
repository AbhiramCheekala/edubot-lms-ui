// utils/cookieUtils.ts

import Cookies from 'js-cookie';

export const setCookie = (name: string, value: string, days?: number): void => {
  if (days) {
    Cookies.set(name, value, { expires: days });
  } else {
    Cookies.set(name, value);
  }
};

export const removeCookie = (name: string): void => {
  Cookies.remove(name);
};

export const getCookie = (name: string): string | undefined => {
  return Cookies.get(name);
};