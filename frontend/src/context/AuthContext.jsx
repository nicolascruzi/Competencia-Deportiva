import { createContext, useContext, useEffect, useState } from 'react';
import { me } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('nanao_token');
    if (!token) { setLoading(false); return; }
    me()
      .then(setUser)
      .catch(() => localStorage.removeItem('nanao_token'))
      .finally(() => setLoading(false));
  }, []);

  function saveLogin(token, userData) {
    localStorage.setItem('nanao_token', token);
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem('nanao_token');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, saveLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
