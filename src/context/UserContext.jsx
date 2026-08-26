import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { supportedLanguages, translations } from '../utils/translations';

// ─── Language lookup maps ────────────────────────────────────────────────────
const codeToName = supportedLanguages.reduce((acc, l) => { acc[l.code] = l.name; return acc; }, {});
const nameToCode = supportedLanguages.reduce((acc, l) => { acc[l.name] = l.code; return acc; }, {});

/**
 * Accepts either a language code ("hi") or a language name ("Hindi")
 * Always returns the canonical NAME ("Hindi").
 */
function normalizeLang(input) {
  if (!input) return 'Hindi';
  // Input is a code like "hi"
  if (codeToName[input]) return codeToName[input];
  // Input is a name like "Hindi" — validate it exists
  const match = supportedLanguages.find(
    l => l.name.toLowerCase() === input.toLowerCase() || l.nativeName.toLowerCase() === input.toLowerCase()
  );
  return match ? match.name : 'English';
}

function getLangCode(nameOrCode) {
  // If already a code
  if (codeToName[nameOrCode]) return nameOrCode;
  // If a name
  return nameToCode[normalizeLang(nameOrCode)] || 'en';
}

function loadSavedLanguage() {
  // Could be stored as code ("hi") or name ("Hindi") — normalize to name
  const saved = localStorage.getItem('saathi_language');
  return normalizeLang(saved);
}

// ─── Defaults ────────────────────────────────────────────────────────────────
const defaultUser = { name: '', farmerId: '', mobile: '' };
const defaultLocation = { village: '', block: '', district: '', state: '' };

const UserContext = createContext(undefined);

export function UserProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) || defaultUser; } catch { return defaultUser; }
  });
  const [token, setTokenState] = useState(() =>
    localStorage.getItem('token') || localStorage.getItem('saathi_token') || ''
  );
  const [location, setLocation] = useState(defaultLocation);
  const [preferredLanguage, setPreferredLanguage] = useState(loadSavedLanguage); // Always a NAME
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => !!(localStorage.getItem('token') || localStorage.getItem('user'))
  );

  // ─── Auth ──────────────────────────────────────────────────────────────────
  const login = useCallback((userData) => {
    const newUser = { ...defaultUser, ...userData };
    setUser(newUser);
    setIsLoggedIn(true);
    const tok = localStorage.getItem('token') || localStorage.getItem('saathi_token') || '';
    setTokenState(tok);
    localStorage.setItem('user', JSON.stringify(newUser));
  }, []);

  const updateUser = useCallback((userData) => {
    setUser(curr => {
      const updated = { ...curr, ...userData };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });

    // Background sync to MongoDB
    const tok = localStorage.getItem('token') || localStorage.getItem('saathi_token');
    if (tok) {
      const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5001' : '');
      const apiBaseUrl = configuredBaseUrl.replace(/\/api\/auth\/?$/, '').replace(/\/$/, '');
      fetch(`${apiBaseUrl}/api/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}` },
        body: JSON.stringify(userData)
      }).catch(err => console.error('Failed to sync profile to backend', err));
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.clear();
    setUser(defaultUser);
    setTokenState('');
    setIsLoggedIn(false);
  }, []);

  // ─── Location ─────────────────────────────────────────────────────────────
  const updateLocation = useCallback((locData) => {
    setLocation(curr => ({ ...curr, ...locData }));
  }, []);

  // ─── Language ─────────────────────────────────────────────────────────────
  /**
   * Accept either a code ("hi") or a name ("Hindi") — normalize to name internally.
   * Persist as code ("hi") in localStorage for compactness.
   */
  const setLanguage = useCallback((langInput) => {
    const name = normalizeLang(langInput);  // e.g. "Hindi"
    const code = getLangCode(name);          // e.g. "hi"
    setPreferredLanguage(name);
    localStorage.setItem('saathi_language', code);
  }, []);

  // ─── Translation function ──────────────────────────────────────────────────
  /**
   * t(key, params?)
   * Looks up the key in the currently selected language dict.
   * Falls back to Hindi, then English, then the raw key.
   */
  const t = useCallback((key, params = {}) => {
    if (!key) return undefined;

    const langDict =
      translations[preferredLanguage] ||
      translations['Hindi'] ||
      translations['English'] ||
      {};
    let text =
      langDict[key] ||
      translations['Hindi']?.[key] ||
      translations['English']?.[key];

    if (text === undefined) {
      // If it's a missing token key (like 'buyer.title'), return undefined so JSX `|| 'Fallback'` works
      if (typeof key === 'string' && key.includes('.') && !key.includes(' ')) {
        return undefined;
      }
      // Otherwise (for full sentence keys like 'Welcome to SAATHI'), return the key itself
      text = key;
    }

    if (params && typeof params === 'object' && typeof text === 'string') {
      Object.entries(params).forEach(([k, v]) => {
        if (text) {
          text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        }
      });
    }
    return text;
  }, [preferredLanguage]); // re-memoize whenever language changes

  // ─── Context value ─────────────────────────────────────────────────────────
  const value = useMemo(() => ({
    user,
    token,
    location,
    preferredLanguage,          // always a NAME ("Hindi", "English", "Marathi" …)
    preferredLanguageCode: getLangCode(preferredLanguage), // always a CODE ("hi", "en" …)
    isLoggedIn,
    supportedLanguages,
    t,
    login,
    updateUser,
    logout,
    updateLocation,
    setLanguage,
  }), [user, token, location, preferredLanguage, isLoggedIn, t, login, updateUser, logout, updateLocation, setLanguage]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within a UserProvider');
  return ctx;
}

export default UserContext;
