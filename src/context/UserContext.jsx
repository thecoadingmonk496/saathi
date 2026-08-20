import { createContext, useContext, useMemo, useState } from 'react';
import { supportedLanguages, translations } from '../utils/translations';

const languageCodeToName = supportedLanguages.reduce((acc, item) => {
  acc[item.code] = item.name;
  return acc;
}, {});

const languageNameToCode = supportedLanguages.reduce((acc, item) => {
  acc[item.name] = item.code;
  return acc;
}, {});

const normalizeLanguage = (language) => {
  if (!language) return 'Hindi';
  if (languageCodeToName[language]) return languageCodeToName[language];
  const matched = supportedLanguages.find(
    (item) => item.name.toLowerCase() === language.toLowerCase() || item.nativeName.toLowerCase() === language.toLowerCase(),
  );
  return matched ? matched.name : 'Hindi';
};

const getLanguageCode = (language) => languageNameToCode[normalizeLanguage(language)] || 'hi';

const getSavedLanguage = () => {
  const savedLanguage = localStorage.getItem('saathi_language');
  return normalizeLanguage(savedLanguage);
};

const defaultUser = {
  name: '',
  farmerId: '',
  mobile: '',
};

const defaultLocation = {
  village: '',
  block: '',
  district: '',
  state: '',
};

const UserContext = createContext(undefined);

export function UserProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : defaultUser;
  });
  const [location, setLocation] = useState(defaultLocation);
  const [preferredLanguage, setPreferredLanguage] = useState(() => getSavedLanguage());
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => !!localStorage.getItem('token') || !!localStorage.getItem('user'),
  );

  const login = (userData) => {
    const newUser = { ...defaultUser, ...userData };
    setUser(newUser);
    setIsLoggedIn(true);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const updateUser = (userData) => {
    setUser((currentUser) => {
      const updatedUser = { ...currentUser, ...userData };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      return updatedUser;
    });
  };

  const logout = () => {
    localStorage.clear();
    setUser(defaultUser);
    setIsLoggedIn(false);
  };

  const updateLocation = (locData) => {
    setLocation((currentLocation) => ({ ...currentLocation, ...locData }));
  };

  const setLanguage = (lang) => {
    const languageName = normalizeLanguage(lang);
    setPreferredLanguage(languageName);
    localStorage.setItem('saathi_language', getLanguageCode(languageName));
  };

  const t = (key, params = {}) => {
    const langDict = translations[preferredLanguage] || translations['Hindi'] || translations['English'] || {};
    let text = langDict[key] || translations['Hindi']?.[key] || translations['English']?.[key] || key;

    if (params && typeof params === 'object') {
      Object.keys(params).forEach((paramKey) => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), params[paramKey]);
      });
    }

    return text;
  };

  const value = useMemo(
    () => ({
      user,
      location,
      preferredLanguage,
      isLoggedIn,
      supportedLanguages,
      t,
      login,
      updateUser,
      logout,
      updateLocation,
      setLanguage,
    }),
    [user, location, preferredLanguage, isLoggedIn],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);

  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }

  return context;
}

export default UserContext;
