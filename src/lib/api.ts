import axios, { AxiosError } from "axios";
import { getCookie, setCookie, removeCookie } from "@/lib/cookieUtils";
import { useAuthStore } from "@/store/authStore";
import config from "./config";

export { AxiosError };

// Separate function for logout logic
const logoutUser = () => {
  useAuthStore.getState().logout();
  removeCookie("accessToken");
  removeCookie("refreshToken");
  window.location.reload();
  // Add any additional logout logic here
};

// Custom Axios instance
const api = axios.create({
  baseURL: config.API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (cb) => {
  refreshSubscribers.push(cb);
};

const onTokenRefreshed = (token) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

const refreshAuthToken = async () => {
  const refreshToken = getCookie("refreshToken");
  return axios.post(`${config.API_BASE_URL}/auth/refresh-token`, { refreshToken })
    .then((response) => {
      const { authTokenResponse } = response.data;
      setCookie("accessToken", authTokenResponse.access.token);
      setCookie("refreshToken", authTokenResponse.refresh.token);
      return authTokenResponse.access.token;
    })
    .catch((error) => {
      if (
        error.response &&
        error.response.status === 401 &&
        error.response.data.message === "EDUBOT_INVALID_TOKEN_TRIGGER_LOGOUT"
      ) {
        logoutUser();
      }
      throw error;
    });
};

api.interceptors.request.use(
  async (incConfig) => {
    const token = getCookie("accessToken");
    const refreshToken = getCookie("refreshToken");

    if (!token && !refreshToken) {
      logoutUser();
      throw new Error('Authentication required');
    }

    const { exp } = token ? JSON.parse(atob(token.split(".")[1])) : { exp: 0 };
    const currentTime = Math.floor(Date.now() / 1000);

    if (currentTime >= exp) {
      if (!refreshToken) {
        logoutUser();
        throw new Error('Authentication required');
      }
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const newToken = await refreshAuthToken();
          isRefreshing = false;
          onTokenRefreshed(newToken);
          incConfig.headers.Authorization = `Bearer ${newToken}`;
        } catch (error) {
          isRefreshing = false;
          logoutUser();
          return Promise.reject(error);
        }
      } else {
        return new Promise((resolve) => {
          subscribeTokenRefresh((token) => {
            incConfig.headers.Authorization = `Bearer ${token}`;
            resolve(incConfig);
          });
        });
      }
    } else {
      incConfig.headers.Authorization = `Bearer ${token}`;
    }

    return incConfig;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (
      error.response &&
      error.response.status === 401 &&
      error.response.data.message === "EDUBOT_INVALID_TOKEN_TRIGGER_LOGOUT"
    ) {
      logoutUser();
    }
    return Promise.reject(error);
  }
);

export { api };