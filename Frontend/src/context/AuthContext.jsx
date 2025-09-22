// Auth Context - src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const API_URL = import.meta.env.VITE_API_URL || 'https://github-automation-8d48.onrender.com';
axios.defaults.baseURL = API_URL;

export const AuthProvider = ({ children }) => {
  // Keep original state
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // New: signal that initial session check is complete
  const [ready, setReady] = useState(false);

  // New: guards to prevent duplicate /me calls
  const meInFlight = useRef(false);
  const mePromise = useRef(null);

  // Set auth token in axios headers (kept, slightly enhanced)
  const setAuthToken = (token) => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
    }
  };

  // New: user cache helpers for instant hydration
  const cacheUser = (u) => {
    if (u) localStorage.setItem('user', JSON.stringify(u));
    else localStorage.removeItem('user');
  };
  const getCachedUser = () => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); }
    catch { return null; }
  };

  // New: single-flight /me with one soft retry on network/server hiccup
  const fetchMe = async () => {
  if (meInFlight.current && mePromise.current) {
    return mePromise.current;
  }
  meInFlight.current = true;
  mePromise.current = (async () => {
    try {
      const res = await axios.get('/api/auth/me');
      // FIX: Extract user from nested response
      const u = res.data?.user ?? res.data;
      setUser(u);
      cacheUser(u);
      return { ok: true, data: u };
    } catch (err) {
      const status = err?.response?.status;
      if (!status || status >= 500) {
        try {
          const res2 = await axios.get('/api/auth/me');
          // FIX: Extract user from nested response here too
          const u2 = res2.data?.user ?? res2.data;
          setUser(u2);
          cacheUser(u2);
          return { ok: true, data: u2 };
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

  // Initialize auth on app load (keeps your behavior, adds cache+background validation)
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      const cached = getCachedUser();

      if (token) {
        setAuthToken(token);
      }

      // If we have a cached user, render immediately, then validate in background
      if (cached) {
        setUser(cached);
        setLoading(false);
        setReady(true);
        // Background validation; if invalid, clear without flicker
        fetchMe().then((r) => {
          if (!r.ok) {
            setUser(null);
            cacheUser(null);
            // Do not toast on silent expiry; ProtectedRoute should handle redirect
          }
        });
        return;
      }

      // If no cache but token exists, validate quickly
      if (token) {
        const r = await fetchMe();
        if (!r.ok) {
          setUser(null);
          cacheUser(null);
          // Also clear broken token to avoid loops
          // But only if 401/403 to distinguish expiry vs transient
          const status = r.error?.response?.status;
          if (status === 401 || status === 403) {
            setAuthToken(null);
          }
        }
      }

      setLoading(false);
      setReady(true);
    };

    initAuth();
  }, []);

  // Register function (unchanged, adds cache)
  const register = async (userData) => {
    try {
      setLoading(true);
      const response = await axios.post('/api/auth/register', userData);
      const { token, user: newUserRaw } = response.data;
      const newUser = newUserRaw ?? response.data?.user ?? response.data;
      setAuthToken(token);
      setUser(newUser);
      cacheUser(newUser);
      toast.success('Account created successfully!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Registration failed';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  // Login function (unchanged, adds cache)
  const login = async (credentials) => {
    try {
      setLoading(true);
      const response = await axios.post('/api/auth/login', credentials);
      const { token, user: loggedUserRaw } = response.data;
      const loggedUser = loggedUserRaw ?? response.data?.user ?? response.data;
      setAuthToken(token);
      setUser(loggedUser);
      cacheUser(loggedUser);
      toast.success('Logged in successfully!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Login failed';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  // GitHub OAuth login (unchanged, adds cache)
  const loginWithGitHub = async (code) => {
    try {
      setLoading(true);
      const response = await axios.post('/api/auth/github/callback', { code });
      const { token, user: githubUserRaw } = response.data;
      const githubUser = githubUserRaw ?? response.data?.user ?? response.data;
      setAuthToken(token);
      setUser(githubUser);
      cacheUser(githubUser);
      toast.success('GitHub authentication successful!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'GitHub authentication failed';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  // Logout function (kept)
  const logout = async () => {
    try {
      // Backend logout may be no-op for JWTs; safe to call
      await axios.post('/api/auth/logout');
    } catch (error) {
      // Silent; do not block logout UX
      // console.error('Logout error:', error);
    } finally {
      setAuthToken(null);
      setUser(null);
      cacheUser(null);
      toast.success('Logged out successfully!');
    }
  };

  // Update user function (kept)
  const updateUser = (updatedUserData) => {
    setUser((prev) => {
      const merged = { ...prev, ...updatedUserData };
      cacheUser(merged);
      return merged;
    });
  };

  // Optional: public method to revalidate session on demand
  const refreshSession = async () => {
    const r = await fetchMe();
    return r.ok;
  };

  const value = useMemo(() => ({
    user,
    loading,
    ready,            // NEW: lets pages/guards know hydration is done
    register,
    login,
    loginWithGitHub,
    logout,
    updateUser,
    setLoading,
    refreshSession,   // NEW: manually re-check session
  }), [user, loading, ready]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
