import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('anti_english_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      loadProfile(true);
    } else {
      setLoading(false);
    }
  }, [token]);

  async function loadProfile(isInitial = false) {
    try {
      if (isInitial) {
        setLoading(true);
      }
      const data = await api.auth.me();
      setUser(data.user);
      setStats(data.stats);
    } catch (err) {
      console.error('Failed to load profile:', err);
      logout();
    } finally {
      if (isInitial) {
        setLoading(false);
      }
    }
  }

  async function login(username, password) {
    const data = await api.auth.login(username, password);
    localStorage.setItem('anti_english_token', data.token);
    setToken(data.token);
    setUser(data.user);
    await loadProfile();
    return data;
  }

  async function register(username, email, password, full_name) {
    const data = await api.auth.register(username, email, password, full_name);
    localStorage.setItem('anti_english_token', data.token);
    setToken(data.token);
    setUser(data.user);
    await loadProfile();
    return data;
  }

  async function quickDemoLogin() {
    return login('demo', '123456');
  }

  function logout() {
    localStorage.removeItem('anti_english_token');
    setToken(null);
    setUser(null);
    setStats(null);
  }

  const value = {
    user,
    token,
    stats,
    loading,
    login,
    register,
    quickDemoLogin,
    logout,
    refreshUser: loadProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext };
export default AuthProvider;



