import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

const SESSION_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 1 ngày (24 giờ)
const LAST_ACTIVE_KEY = 'anti_english_last_active';
const TOKEN_KEY = 'anti_english_token';
const EXPIRED_KEY = 'anti_english_session_expired';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [token, setToken] = useState(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (!savedToken) return null;

    const lastActive = localStorage.getItem(LAST_ACTIVE_KEY);
    if (lastActive && Date.now() - Number(lastActive) > SESSION_TIMEOUT_MS) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(LAST_ACTIVE_KEY);
      sessionStorage.setItem(EXPIRED_KEY, '1');
      return null;
    }
    return savedToken;
  });
  const [loading, setLoading] = useState(true);

  // Update last activity timestamp
  function updateLastActive() {
    localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
  }

  // Periodic check and user activity listener
  useEffect(() => {
    if (!token) return;

    updateLastActive();

    let lastWriteTime = Date.now();
    function handleUserActivity() {
      const now = Date.now();
      // Throttle localStorage writes to at most once every 20 seconds
      if (now - lastWriteTime > 20000) {
        lastWriteTime = now;
        updateLastActive();
      }
    }

    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    activityEvents.forEach(evt => window.addEventListener(evt, handleUserActivity, { passive: true }));

    // Periodic check every 30 seconds
    const interval = setInterval(() => {
      const lastActive = localStorage.getItem(LAST_ACTIVE_KEY);
      if (lastActive && Date.now() - Number(lastActive) > SESSION_TIMEOUT_MS) {
        logout(true);
      }
    }, 30000);

    return () => {
      activityEvents.forEach(evt => window.removeEventListener(evt, handleUserActivity));
      clearInterval(interval);
    };
  }, [token]);

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
    sessionStorage.removeItem(EXPIRED_KEY);
    localStorage.setItem(TOKEN_KEY, data.token);
    updateLastActive();
    setToken(data.token);
    setUser(data.user);
    await loadProfile();
    return data;
  }

  async function register(username, email, password, full_name) {
    const data = await api.auth.register(username, email, password, full_name);
    sessionStorage.removeItem(EXPIRED_KEY);
    localStorage.setItem(TOKEN_KEY, data.token);
    updateLastActive();
    setToken(data.token);
    setUser(data.user);
    await loadProfile();
    return data;
  }

  async function quickDemoLogin() {
    return login('demo', '123456');
  }

  function logout(isExpired = false) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(LAST_ACTIVE_KEY);
    if (isExpired) {
      sessionStorage.setItem(EXPIRED_KEY, '1');
    } else {
      sessionStorage.removeItem(EXPIRED_KEY);
    }
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



