export type UserRole = 'EVENT_MANAGER' | 'VISITOR';

export interface CreateUserDTO {
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  companyId?: string;
}

export interface UpdateUserDTO {
  firstName?: string;
  lastName?:  string;
  email?:     string;
  role?:      UserRole;
  companyId?:   string;
}