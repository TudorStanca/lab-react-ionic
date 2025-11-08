import { ReactNode, useCallback, useEffect, useState } from "react";
import AuthContext, { AuthState, initialAuthState } from "./AuthContext";
import { getLogger } from "../utils/AppLogger";
import { loginUser } from "../services/AuthApi";

const log = getLogger("AuthProvider");

interface AuthProviderProps {
  children: ReactNode;
}

const AuthProvider = ({ children }: AuthProviderProps) => {
  const [state, setState] = useState<AuthState>(initialAuthState);

  const login = useCallback((username?: string, password?: string) => {
    log("Login attempt");
    setState((prev) => ({
      ...prev,
      pendingAuthentication: true,
      username,
      password,
    }));
  }, []);

  const logout = useCallback(() => {
    log("Disposing user login data.");
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("pendingOfflineGames");
    setState(initialAuthState);
  }, []);

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedUsername = localStorage.getItem("username");

    if (savedToken && savedUsername) {
      log("Found saved authentication token.");
      setState((prev) => ({
        ...prev,
        token: savedToken,
        username: savedUsername,
        isAuthenticated: true,
      }));
    }
  }, []);

  useEffect(() => {
    let canceled = false;

    const authenticate = async () => {
        if (!state.pendingAuthentication) {
            return;
        }

        log("Trying to authenticate user:", state.username);
        setState(s => ({ ...s, isAuthenticating: true, authenticationError: null }));

        try {
            const { username, password } = state;
            const token = await loginUser(username!, password!);

            if (canceled) return;

            localStorage.setItem("token", token);
            localStorage.setItem("username", username!);

            setState(prev => ({
                ...prev,
                token,
                pendingAuthentication: false,
                isAuthenticated: true,
                isAuthenticating: false,
                authenticationError: null,
            }));
        } catch (error) {
            if (canceled) return;

            setState(prev => ({
                ...prev,
                authenticationError: error as Error,
                pendingAuthentication: false,
                isAuthenticating: false,
                isAuthenticated: false,
            }));
        }
    }

    authenticate();

    return () => {
        canceled = true;
    };
  }, [state.pendingAuthentication]);

  const value = {
    ...state,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
