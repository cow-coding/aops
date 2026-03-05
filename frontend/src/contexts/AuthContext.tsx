import { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '../types/auth';
import { authApi } from '../services/authApi';
import { setAccessToken } from '../services/api';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: attempt to restore session via stored refresh token
  useEffect(() => {
    const storedRefreshToken = localStorage.getItem('refresh_token');
    if (!storedRefreshToken) {
      setIsLoading(false);
      return;
    }

    authApi
      .refresh(storedRefreshToken)
      .then(({ access_token }) => {
        setAccessToken(access_token);
        return authApi.getMe();
      })
      .then(setUser)
      .catch(() => {
        localStorage.removeItem('refresh_token');
        setAccessToken(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const { access_token, refresh_token } = await authApi.login({ email, password });
    localStorage.setItem('refresh_token', refresh_token);
    setAccessToken(access_token);
    const me = await authApi.getMe();
    setUser(me);
  };

  const register = async (email: string, password: string, name: string) => {
    const newUser = await authApi.register({ email, password, name });
    // Auto-login after successful registration
    const { access_token, refresh_token } = await authApi.login({ email, password });
    localStorage.setItem('refresh_token', refresh_token);
    setAccessToken(access_token);
    setUser(newUser);
  };

  const logout = async () => {
    const storedRefreshToken = localStorage.getItem('refresh_token');
    if (storedRefreshToken) {
      try {
        await authApi.logout(storedRefreshToken);
      } catch {
        // Ignore logout API errors — still clear local state
      }
    }
    localStorage.removeItem('refresh_token');
    setAccessToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
