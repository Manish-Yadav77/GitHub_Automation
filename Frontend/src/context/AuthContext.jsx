// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// Base URL already set elsewhere; ensure it's set before usage.
// axios.defaults.baseURL is configured in your setup.

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);     // initial app load
  const [ready, setReady] = useState(false);        // session ready to render protected routes
  const meInFlight = useRef(false);
  const mePromise = useRef(null);

  const setAuthToken = (token) => {
    if (token) {
      axios.defaults.headers.common.Authorization = `Bearer ${token}`;
      localStorage.setItem('token', token);
    } else {
      delete axios.defaults.headers.common.Authorization;
      localStorage.removeItem('token');
    }
  };

  const cacheUser = (u) => {
    if (u) localStorage.setItem('user', JSON.stringify(u));
    else localStorage.removeItem('user');
  };

  const getCachedUser = () => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); }
    catch { return null; }
  };

  // Debounced/me request with single-flight guard and small retry
  const fetchMe = async () => {
    if (meInFlight.current && mePromise.current) {
      return mePromise.current;
    }
    meInFlight.current = true;
    mePromise.current = (async () => {
      try {
        const res = await axios.get('/api/auth/me');
        setUser(res.data);
        cacheUser(res.data);
        return { ok: true, data: res.data };
      } catch (err) {
        // Retry once on network hiccup (not on 401)
        const status = err?.response?.status;
        if (!status || status >= 500) {
          try {
            const res2 = await axios.get('/api/auth/me');
            setUser(res2.data);
            cacheUser(res2.data);
            return { ok: true, data: res2.data };
          } catch (e2) {
            return { ok: false, error: e2 };
          }
        }
        return { ok: false, error: err };
      } finally {
        meInFlight.current = false;
        mePromise.current = null;
      }
    })();
    return mePromise.current;
  };

  // Initial hydration on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const cached = getCachedUser();

    if (token) setAuthToken(token);

    // Optimistic hydrate from cache for instant UI; then background-validate
    if (cached) {
      setUser(cached);
      setLoading(false);
      setReady(true);
      // background validate; if invalid, clear gracefully
      fetchMe().then((r) => {
        if (!r.ok) {
          setUser(null);
          cacheUser(null);
          // Don’t toast on 401 silently; user will be redirected by protected route
        }
      });
    } else if (token) {
      // No cached user but token exists—validate quickly
      (async () => {
        const r = await fetchMe();
        setLoading(false);
        setReady(true);
        if (!r.ok) {
          setUser(null);
          cacheUser(null);
        }
      })();
    } else {
      // Completely fresh
      setLoading(false);
      setReady(true);
    }
  }, []);

  // LOGIN
  const login = async ({ email, password }) => {
    try {
      const res = await axios.post('/api/auth/login', { email, password });
      const { token, user: u } = res.data || {};
      if (!token || !u) throw new Error('Invalid login response');
      setAuthToken(token);
      setUser(u);
      cacheUser(u);
      return { success: true };
    } catch (err) {
      const msg = err?.response?.data?.error || 'Login failed. Please try again.';
      toast.error(msg);
      return { success: false, error: msg };
    }
  };

  // GitHub OAuth completed in callback page; ensure it sets token+user to storage+axios too.

  // LOGOUT
  const logout = () => {
    setAuthToken(null);
    setUser(null);
    cacheUser(null);
  };

  // REFRESH TOKEN (optional hook if backend issues short-lived tokens)
  // You can call this before critical actions if your backend issues expiring JWTs.
  const refreshSession = async () => {
    try {
      const r = await fetchMe();
      return r.ok;
    } catch {
      return false;
    }
  };

  const value = useMemo(() => ({
    user, loading, ready,
    login, logout, refreshSession,
  }), [user, loading, ready]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
