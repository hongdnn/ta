export type AuthUser = {
  id: string;
  email: string;
  name: string;
  user_type: 'student' | 'professor' | string;
  status: string;
};

export type AuthSession = {
  access_token: string;
  token_type: string;
  user: AuthUser;
};

