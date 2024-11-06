import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { checkActionScopes, Policies } from '../lib/permissionUtils';
import { useAuthStore } from '../store/authStore';

interface PolicyResponse {
  permissionSet: Policies;
}

// export const sidebarItemPermissions: Record<string, { action: Action; scopes: Scope[] }> = {
//   '/all': { action: 'course:read', scopes: ['organization', 'admin'] },
//   '/users': { action: 'user:read', scopes: ['organization', 'admin'] },
//   '/students': { action: 'student:read', scopes: ['organization', 'admin'] },
//   '/organization': { action: 'organization:read', scopes: ['organization', 'admin'] },
//   '/programs': { action: 'program:read', scopes: ['organization', 'admin'] },
//   '/manage-courses': { action: 'course:write', scopes: ['organization', 'admin'] },
//   '/submissions': { action: 'submission:read', scopes: ['organization', 'admin'] },
//   '/batches': { action: 'batch:read', scopes: ['organization', 'admin'] },
//   '/data': { action: 'data:export', scopes: ['organization', 'admin'] },
//   '/tickets': { action: 'student:read', scopes: ['organization', 'admin'] },
//   '/settings': { action: 'user:read', scopes: ['self', 'supervisor', 'organization', 'admin'] },
// };

export const sidebarItemPermissions: Record<string, (policies: Policies) => boolean> = {
  // '/home': (policies) => checkActionScopes(policies, 'dashboard:read', ['self']),
  // '/performance': (policies) => checkActionScopes(policies, 'performance:read', ['self']),
  '/all': (policies) => checkActionScopes(policies, 'course:read', ['organization', 'admin', 'supervisor', 'self']),
  '/users': (policies) => checkActionScopes(policies, 'user:read', ['admin', 'organization']),
  '/students': (policies) => checkActionScopes(policies, 'student:read', ['organization', 'admin', 'supervisor']),
  '/organization': (policies) => checkActionScopes(policies, 'organization:read', ['organization', 'admin', 'supervisor']),
  '/programs': (policies) => checkActionScopes(policies, 'program:read', ['organization', 'admin', 'supervisor']),
  '/manage-courses': (policies) => 
    checkActionScopes(policies, 'course:write', ['organization', 'admin', 'supervisor']) ||
    checkActionScopes(policies, 'course:read', ['organization', 'admin', 'supervisor']),
  '/submissions': (policies) => checkActionScopes(policies, 'submission:read', ['organization', 'admin', 'supervisor']),
  '/my/submissions': (policies) => checkActionScopes(policies, 'submission:read', ['self']),
  '/batches': (policies) => checkActionScopes(policies, 'batch:read', ['organization', 'admin', 'supervisor', 'self']),
  '/batches/my/students': (policies) => checkActionScopes(policies, 'batch:read', ['self']),
  '/data': (policies) => checkActionScopes(policies, 'data:export', ['organization', 'admin', 'supervisor']),
  '/tickets': (policies) => checkActionScopes(policies, 'data:export', ['organization', 'admin', 'supervisor']),
  '/settings': (policies) => 
    checkActionScopes(policies, 'user:read', ['self', 'supervisor']) ||
    checkActionScopes(policies, 'organization:read', ['organization', 'admin']),
  '/my/profile': (policies) => checkActionScopes(policies, 'student:read', ['self']),
};

export const usePolicies = () => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  const query = useQuery<PolicyResponse, Error>({
    queryKey: ['policies'],
    queryFn: async () => {
      const response = await api.get<PolicyResponse>('/policies');
      return response.data;
    },
    staleTime: 30 * 60 * 1000,
    enabled: isAuthenticated, // Only run the query if the user is authenticated
  });

  return {
    ...query,
    permissionSet: query.data?.permissionSet,
  };
};