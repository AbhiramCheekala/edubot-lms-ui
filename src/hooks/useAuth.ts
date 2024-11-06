import { getCookie, removeCookie, setCookie } from "@/lib/cookieUtils";
import { useMutation } from "@tanstack/react-query";
import { Account, AuthState, useAuthStore } from "../store/authStore";
import { api } from "@/lib/api";
import axios from "axios";
import config from "../lib/config";

interface AuthTokenResponse {
  access: {
    token: string;
    expires: string;
  };
  refresh: {
    token: string;
    expires: string;
    tokenDbRecord: {
      token: string;
      type: string;
      expires: string;
      blacklisted: boolean;
      createdAt: string;
      customData: {
        role: string;
      };
      loginId: string;
    };
  };
}

interface LoginResponse {
  account: Account;
  authTokenResponse: AuthTokenResponse;
}

interface LoginCredentials {
  email: string;
  password: string;
}

export const useAuth = () => {
  const { account, isAuthenticated, setAccount, logout, setIsAuthenticated }: AuthState = useAuthStore();

  const loginMutation = useMutation<{ data: LoginResponse }, Error, LoginCredentials>({
    mutationFn: async (credentials: LoginCredentials) => {
      const response = await axios.post(`${config.API_BASE_URL}/auth/login`, credentials);
      if (response.status === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          window.location.href = redirectUrl;
        }
      }
      return response;
    },
    onSuccess: (response) => {
      const { account, authTokenResponse } = response.data;
      setCookie("accessToken", authTokenResponse.access.token);
      setCookie("refreshToken", authTokenResponse.refresh.token);
      setAccount(account);
      setIsAuthenticated(true);
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const logoutMutation = useMutation({
    mutationFn: () => api.post("/auth/logout", { refreshToken: getCookie("refreshToken") }),
    onSuccess: () => {
      removeCookie("accessToken");
      removeCookie("refreshToken");
      setAccount(null);
      setIsAuthenticated(false);
      logout();
      window.location.reload();
    },
  });

  return {
    account,
    isAuthenticated,
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
  };
};

export type AuthContext = ReturnType<typeof useAuth>;