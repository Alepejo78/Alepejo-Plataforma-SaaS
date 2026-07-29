export interface AuthenticatedUser {
    id: string;
  
    companyId: string;
  
    email: string;
  
    roles: string[];
  
    permissions: string[];
  }