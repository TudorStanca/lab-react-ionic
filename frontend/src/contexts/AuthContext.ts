import { createContext, useContext } from "react";

export type LoginFunctionType = (username: string, password: string) => void;
export type LogoutFunctionType = () => void;

export interface AuthState {
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  pendingAuthentication?: boolean;
  authenticationError: Error | null;
  username?: string;
  password?: string;
  token: string;
  login: LoginFunctionType;
  logout: LogoutFunctionType;
}

export const initialAuthState: AuthState = {
  isAuthenticated: false,
  isAuthenticating: false,
  pendingAuthentication: false,
  authenticationError: null,
  username: undefined,
  password: undefined,
  token: "",
  login: async () => {
    throw new Error("AuthProvider not mounted");
  },
  logout: () => {
    throw new Error("AuthProvider not mounted");
  },
};

const AuthContext = createContext<AuthState>(initialAuthState);

export const useAuth = (): AuthState => {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return ctx;
};

export default AuthContext;
