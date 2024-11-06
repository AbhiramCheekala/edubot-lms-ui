import {create} from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface Student {
  id: string;
  givenStudentId: string;
  name: string;
  personalEmail: string | null;
  dateOfBirth: string | null;
  apsche: boolean;
  gender: string;
  orgId: string;
  batchId: string;
  joiningDate: string;
  contactPhoneNumber: { countryCode: string; number: string };
  isActive: boolean;
}

export interface User {
  id: string;
  givenUserId: string;
  name: string;
  joiningDate: string;
  contactPhoneNumber: { countryCode: string; number: string };
  isActive: boolean;
}

export interface Account {
  loginId: string;
  email: string;
  accountType: 'student' | 'user';
  isVerified: boolean;
  role: string;
  student?: Student;
  user?: User;
}

export interface AuthState {
  account: Account | null;
  isAuthenticated: boolean;
  setAccount: (account: Account) => void;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      account: null,
      isAuthenticated: false,
      setAccount: (account) => set({ account, isAuthenticated: true }),
      setIsAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
      logout: () => set({ account: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);