export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER';
  mustChangePassword: boolean;
}

export interface AuthResponse {
  user: AuthUser;
}
