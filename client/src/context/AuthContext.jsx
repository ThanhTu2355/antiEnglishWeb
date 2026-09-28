import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

const SESSION_TIMEOUT_MS = 30 * 24 * 60 * 60 * 1000; // 30 ngày (30 * 24 giờ)
const LAST_ACTIVE_KEY = 'anti_english_last_active';
const TOKEN_KEY = 'anti_english_token';
const USER_KEY = 'anti_english_user';
const STATS_KEY = 'anti_english_stats';
const EXPIRED_KEY = 'anti_english_session_expired';

function clearAuthStorage(isExpired = false) {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(LAST_ACTIVE_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(STATS_KEY);
    if (isExpired) {
      sessionStorage.setItem(EXPIRED_KEY, '1');
    } else {
      sessionStorage.removeItem(EXPIRED_KEY);
    }
  } catch (e) {
    console.error('Storage error:', e);
  }
}

function getInitialAuthState() {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const lastActive = localStorage.getItem(LAST_ACTIVE_KEY);

    // Nếu không có token, dọn sạch và trả về null
    if (!token) {
      clearAuthStorage(false);
      return { token: null, user: null, stats: null };
    }

    // Nếu đã có lastActive và vượt quá 30 ngày kể từ lần hoạt động gần nhất
    if (lastActive) {
      const lastActiveTime = Number(lastActive);
      if (!isNaN(lastActiveTime) && lastActiveTime > 0 && Date.now() - lastActiveTime > SESSION_TIMEOUT_MS) {
        clearAuthStorage(true);
        return { token: null, user: null, stats: null };
      }
    }

    const savedUser = localStorage.getItem(USER_KEY);
    const savedStats = localStorage.getItem(STATS_KEY);

    return {
      token,
      user: savedUser ? JSON.parse(savedUser) : null,
      stats: savedStats ? JSON.parse(savedStats) : null
    };
  } catch {
    clearAuthStorage(false);
    return { token: null, user: null, stats: null };
  }
}

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(getInitialAuthState);
  const { user, token, stats } = authState;

  const [loading, setLoading] = useState(() => {
    // Chỉ hiển thị loading nếu có token nhưng chưa tải được user từ storage
    return Boolean(authState.token && !authState.user);
  });

  // Cập nhật timestamp hoạt động gần nhất
  function updateLastActive() {
    try {
      localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
    } catch (e) {
      console.error('Error updating last active time:', e);
    }
  }

  // Đăng xuất và dọn sạch session
  const logout = useCallback((isExpired = false) => {
    clearAuthStorage(isExpired);
    setAuthState({ token: null, user: null, stats: null });
    setLoading(false);
  }, []);

  // Lắng nghe sự kiện session expired từ API client
  useEffect(() => {
    function handleSessionExpired() {
      logout(true);
    }
    window.addEventListener('anti_english_session_expired', handleSessionExpired);
    return () => {
      window.removeEventListener('anti_english_session_expired', handleSessionExpired);
    };
  }, [logout]);

  // Tải thông tin người dùng và stats (dependencies rỗng để không bị tạo lại hàm)
  const loadProfile = useCallback(async (isInitial = false) => {
    const currentToken = localStorage.getItem(TOKEN_KEY);
    if (!currentToken) {
      setLoading(false);
      return;
    }

    try {
      const data = await api.auth.me();
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      if (data.stats) {
        localStorage.setItem(STATS_KEY, JSON.stringify(data.stats));
      }
      setAuthState(prev => ({
        ...prev,
        token: currentToken,
        user: data.user,
        stats: data.stats || prev.stats
      }));
    } catch (err) {
      console.error('Failed to load profile:', err);
      // Không tự ý gọi logout() ở đây để tránh bị văng khi mất mạng hoặc lỗi server tạm thời.
      // Nếu là lỗi 401 thì client.js đã phát event 'anti_english_session_expired' tự động logout.
    } finally {
      if (isInitial) {
        setLoading(false);
      }
    }
  }, []);

  // Khi có token, chạy loadProfile một lần duy nhất khi mount
  useEffect(() => {
    if (token) {
      loadProfile(true);
    } else {
      setLoading(false);
    }
  }, [token, loadProfile]);

  // Kiểm tra timeout định kỳ và theo dõi tương tác người dùng
  useEffect(() => {
    if (!token) return;

    updateLastActive();

    let lastWriteTime = Date.now();
    function handleUserActivity() {
      const now = Date.now();
      // Throttle ghi localStorage tối đa 1 lần mỗi 20 giây
      if (now - lastWriteTime > 20000) {
        lastWriteTime = now;
        updateLastActive();
      }
    }

    function checkSessionExpired() {
      const lastActive = localStorage.getItem(LAST_ACTIVE_KEY);
      if (lastActive) {
        const lastActiveTime = Number(lastActive);
        if (!isNaN(lastActiveTime) && lastActiveTime > 0 && Date.now() - lastActiveTime > SESSION_TIMEOUT_MS) {
          logout(true);
        }
      }
    }

    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    activityEvents.forEach(evt => window.addEventListener(evt, handleUserActivity, { passive: true }));

    // Kiểm tra định kỳ mỗi 30 giây
    const interval = setInterval(checkSessionExpired, 30000);

    // Kiểm tra ngay lập tức khi người dùng quay lại tab trình duyệt
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkSessionExpired();
      }
    };
    window.addEventListener('focus', checkSessionExpired);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      activityEvents.forEach(evt => window.removeEventListener(evt, handleUserActivity));
      clearInterval(interval);
      window.removeEventListener('focus', checkSessionExpired);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [token, logout]);

  async function login(username, password) {
    const data = await api.auth.login(username, password);
    sessionStorage.removeItem(EXPIRED_KEY);
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    updateLastActive();
    setAuthState({
      token: data.token,
      user: data.user,
      stats: null
    });
    // Gọi cập nhật stats nền
    loadProfile(false);
    return data;
  }

  async function register(username, email, password, full_name) {
    const data = await api.auth.register(username, email, password, full_name);
    sessionStorage.removeItem(EXPIRED_KEY);
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    updateLastActive();
    setAuthState({
      token: data.token,
      user: data.user,
      stats: null
    });
    loadProfile(false);
    return data;
  }

  async function quickDemoLogin() {
    return login('demo', '123456');
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
