// Global Roles - Platform level roles
export enum GlobalRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  USER = 'USER',
}

// Organization Roles - Within an organization
export enum OrgRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

// Permissions for RBAC
export enum Permission {
  // Organization permissions
  ORG_MANAGE = 'ORG_MANAGE',
  ORG_VIEW = 'ORG_VIEW',
  
  // User/Member permissions
  USER_INVITE = 'USER_INVITE',
  USER_REMOVE = 'USER_REMOVE',
  USER_VIEW = 'USER_VIEW',
  
  // CRM permissions
  CRM_READ = 'CRM_READ',
  CRM_WRITE = 'CRM_WRITE',
  
  // Finance permissions
  FINANCE_READ = 'FINANCE_READ',
  FINANCE_WRITE = 'FINANCE_WRITE',
  
  // Subscription permissions
  SUBSCRIPTION_VIEW = 'SUBSCRIPTION_VIEW',
  SUBSCRIPTION_MANAGE = 'SUBSCRIPTION_MANAGE',
  
  // Audit permissions
  AUDIT_READ = 'AUDIT_READ',
}

// Role to Permission mapping
export const RolePermissions: Record<OrgRole, Permission[]> = {
  [OrgRole.OWNER]: Object.values(Permission),
  [OrgRole.ADMIN]: [
    Permission.ORG_VIEW,
    Permission.USER_INVITE,
    Permission.USER_VIEW,
    Permission.CRM_READ,
    Permission.CRM_WRITE,
    Permission.FINANCE_READ,
    Permission.FINANCE_WRITE,
    Permission.SUBSCRIPTION_VIEW,
    Permission.AUDIT_READ,
  ],
  [OrgRole.MEMBER]: [
    Permission.ORG_VIEW,
    Permission.USER_VIEW,
    Permission.CRM_READ,
    Permission.FINANCE_READ,
    Permission.SUBSCRIPTION_VIEW,
  ],
};

// Organization status
export enum OrgStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING = 'PENDING',
}

// Subscription plans
export enum Plan {
  FREE = 'FREE',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

// Invitation status
export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

// Lead status for CRM
export enum LeadStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  QUALIFIED = 'QUALIFIED',
  PROPOSAL = 'PROPOSAL',
  NEGOTIATION = 'NEGOTIATION',
  WON = 'WON',
  LOST = 'LOST',
}

// Finance entry types
export enum FinanceEntryType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

// Audit log actions
export enum AuditAction {
  // Auth actions
  USER_REGISTERED = 'USER_REGISTERED',
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  
  // Organization actions
  ORG_CREATED = 'ORG_CREATED',
  ORG_UPDATED = 'ORG_UPDATED',
  ORG_DELETED = 'ORG_DELETED',
  ORG_SUSPENDED = 'ORG_SUSPENDED',
  ORG_ACTIVATED = 'ORG_ACTIVATED',
  
  // Membership actions
  USER_INVITED = 'USER_INVITED',
  INVITATION_ACCEPTED = 'INVITATION_ACCEPTED',
  INVITATION_CANCELLED = 'INVITATION_CANCELLED',
  MEMBER_REMOVED = 'MEMBER_REMOVED',
  ROLE_CHANGED = 'ROLE_CHANGED',
  
  // CRM actions
  LEAD_CREATED = 'LEAD_CREATED',
  LEAD_UPDATED = 'LEAD_UPDATED',
  LEAD_DELETED = 'LEAD_DELETED',
  LEAD_STATUS_CHANGED = 'LEAD_STATUS_CHANGED',
  LEAD_ASSIGNED = 'LEAD_ASSIGNED',
  
  // Finance actions
  FINANCE_ENTRY_CREATED = 'FINANCE_ENTRY_CREATED',
  FINANCE_ENTRY_UPDATED = 'FINANCE_ENTRY_UPDATED',
  FINANCE_ENTRY_DELETED = 'FINANCE_ENTRY_DELETED',
  
  // Subscription actions
  SUBSCRIPTION_CREATED = 'SUBSCRIPTION_CREATED',
  SUBSCRIPTION_UPGRADED = 'SUBSCRIPTION_UPGRADED',
  SUBSCRIPTION_DOWNGRADED = 'SUBSCRIPTION_DOWNGRADED',
  SUBSCRIPTION_CANCELLED = 'SUBSCRIPTION_CANCELLED',
  PLAN_CHANGED = 'PLAN_CHANGED',
}
