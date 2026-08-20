

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { requestGeolocation, reverseGeocode } from '../utils/locationService';
import { isValidLocation } from '../utils/locationOptions';

const SESSION_KEY = 'saathi_location';

const defaultState = {
  coordinates: null,       
  address: null,           
  accuracy: null,          
  source: null,            
  permissionStatus: 'idle', 
  loading: false,
  error: null,
  lastUpdated: null,
};

const LocationContext = createContext(undefined);

function loadCachedLocation() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveCachedLocation(data) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
  } catch {

  }
}

function clearCachedLocation() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {

  }
}

export function LocationProvider({ children }) {
  const [state, setState] = useState(() => {
    const cached = loadCachedLocation();
    if (cached && cached.permissionStatus === 'granted') {
      return { ...defaultState, ...cached };
    }
    return defaultState;
  });

  const doFetch = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      loading: true,
      permissionStatus: 'requesting',
      error: null,
    }));

    try {

      const coords = await requestGeolocation();

      setState((prev) => ({
        ...prev,
        coordinates: { latitude: coords.latitude, longitude: coords.longitude },
        accuracy: coords.accuracy,
        loading: true, 
        permissionStatus: 'granted',
      }));

      const address = await reverseGeocode(coords.latitude, coords.longitude);

      const newState = {
        coordinates: { latitude: coords.latitude, longitude: coords.longitude },
        address,
        accuracy: coords.accuracy,
        source: 'device',
        permissionStatus: 'granted',
        loading: false,
        error: null,
        lastUpdated: new Date().toISOString(),
      };

      setState(newState);
      saveCachedLocation(newState);
    } catch (err) {
      let permissionStatus = 'unavailable';
      let errorKey = 'location.unavailable';

      if (err.code === 'PERMISSION_DENIED') {
        permissionStatus = 'denied';
        errorKey = 'location.denied';
      } else if (err.code === 'TIMEOUT') {
        permissionStatus = 'timeout';
        errorKey = 'location.timeout';
      } else if (err.code === 'UNSUPPORTED') {
        permissionStatus = 'unavailable';
        errorKey = 'location.unavailable';
      }

      setState((prev) => ({
        ...prev,
        loading: false,
        permissionStatus,
        error: errorKey,
      }));

      clearCachedLocation();
    }
  }, []);

  const requestLocation = useCallback(() => {
    doFetch();
  }, [doFetch]);

  const refreshLocation = useCallback(() => {
    clearCachedLocation();
    doFetch();
  }, [doFetch]);

  const setManualLocation = useCallback(({ village, district, state }) => {
    if (!isValidLocation({ village, district, state })) return false;

    const formatted = `${village}, ${district}, ${state}`;
    const manualState = {
      coordinates: null,
      address: {
        locality: village,
        city: district,
        district,
        state,
        country: 'India',
        formatted,
      },
      accuracy: null,
      source: 'manual',
      permissionStatus: 'granted',
      loading: false,
      error: null,
      lastUpdated: new Date().toISOString(),
    };
    setState(manualState);
    saveCachedLocation(manualState);
    return true;
  }, []);

  const clearLocation = useCallback(() => {
    clearCachedLocation();
    setState(defaultState);
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      requestLocation,
      refreshLocation,
      setManualLocation,
      clearLocation,
    }),
    [state, requestLocation, refreshLocation, setManualLocation, clearLocation]
  );

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocationContext() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocationContext must be used within a LocationProvider');
  }
  return context;
}

export default LocationContext;
