export type Action = 
  | 'user:read'
  | 'user:write'
  | 'student:read'
  | 'student:write'
  | 'organization:read'
  | 'organization:write'
  | 'program:read'
  | 'program:write'
  | 'course:read'
  | 'course:write'
  | 'batch:read'
  | 'batch:write'
  | 'submission:read'
  | 'submission:write'
  | 'submission:grade'
  | 'grade:write'
  | 'data:import'
  | 'data:export';

export type Scope = 'self' | 'supervisor' | 'organization' | 'admin' | 'program';

export type PolicyAction = {
  scopes: Scope[]
};

export type Policies = {
  [key in Action]: PolicyAction
};

export function hasAnyScope(action: PolicyAction, ...scopes: Scope[]): boolean {
  return action.scopes.some((scope) => scopes.includes(scope));
}

export function hasAllScopes(action: PolicyAction, ...scopes: Scope[]): boolean {
  return scopes.every((scope) => action.scopes.includes(scope));
}

export function hasAction(policies: Policies, action: Action, scope: Scope): boolean {
  if (!policies || !policies[action]) return false;
  return policies[action].scopes.includes(scope);
}

export function checkAction(policies: Policies, action: Action, scope: Scope): boolean {
  return hasAction(policies, action, scope);
}

export function hasAnyAction(policies: Policies, actionsWithScopes: { action: Action, scope: Scope }[]): boolean {
  return actionsWithScopes.some(({ action, scope }) => hasAction(policies, action, scope));
}

export function hasAllActions(policies: Policies, actionsWithScopes: { action: Action, scope: Scope }[]): boolean {
  return actionsWithScopes.every(({ action, scope }) => hasAction(policies, action, scope));
}

export function getActionsForScope(policies: Policies, scope: Scope): Action[] {
  return Object.keys(policies).filter(action => 
    policies[action as Action].scopes.includes(scope)
  ) as Action[];
}

export function checkActionScopes(policies: Policies, action: Action, scopes: Scope[], checkAll: boolean = false): boolean {
  if (!policies || !policies[action]) return false;
  return checkAll 
    ? hasAllScopes(policies[action], ...scopes)
    : hasAnyScope(policies[action], ...scopes);
}