import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocationEngine } from '@food/hooks/useLocation';
import { useZone } from '@food/hooks/useZone';
import { useTiffinZone } from '@food/hooks/useTiffinZone';
import { userAPI } from '@food/api';
import { LocationContext } from './locationContext';
import {
  persistUserLocation,
  readDeliveryAddressMode,
  readStoredUserLocation,
  notifyLocationUpdated,
  notifyDeliveryModeUpdated,
} from '@food/utils/locationPersistence';

export function LocationProvider({ children }) {
  const engine = useLocationEngine();
  const {
    location: engineLocation,
    loading,
    error,
    permissionGranted,
    requestLocation: engineRequestLocation,
    startWatchingLocation,
    stopWatchingLocation,
  } = engine;

  const [deliveryAddressMode, setDeliveryAddressModeState] = useState(readDeliveryAddressMode);
  const [savedLocationOverride, setSavedLocationOverride] = useState(null);

  const location = useMemo(() => {
    if (deliveryAddressMode === 'saved' && savedLocationOverride) {
      return savedLocationOverride;
    }
    if (deliveryAddressMode === 'saved') {
      const stored = readStoredUserLocation();
      if (stored) return stored;
    }
    return engineLocation;
  }, [deliveryAddressMode, savedLocationOverride, engineLocation]);

  const {
    zoneId,
    zone,
    zoneStatus,
    loading: zoneLoading,
    error: zoneError,
    isInService,
    isOutOfService,
    refreshZone,
  } = useZone(location);

  // Tiffin zones are a separate polygon set. Resolved here so the detected id
  // lands in localStorage for the axios X-Tiffin-Zone-Id header, and so tiffin
  // screens can read it from context. Deliberately kept out of the shared
  // `loading`/`error` values below so it can never gate the rest of the app.
  const {
    tiffinZoneId,
    tiffinZone,
    tiffinZoneStatus,
    isTiffinZoningEnforced,
    loading: tiffinZoneLoading,
    isTiffinServiceable,
    isTiffinOutOfZone,
    refreshTiffinZone,
  } = useTiffinZone(location);

  useEffect(() => {
    const onMode = (e) => {
      if (e?.detail?.mode) setDeliveryAddressModeState(e.detail.mode);
    };
    const onLocation = (e) => {
      if (e?.detail?.location) {
        setSavedLocationOverride(e.detail.location);
      }
    };
    window.addEventListener('deliveryAddressModeUpdated', onMode);
    window.addEventListener('userLocationUpdated', onLocation);
    return () => {
      window.removeEventListener('deliveryAddressModeUpdated', onMode);
      window.removeEventListener('userLocationUpdated', onLocation);
    };
  }, []);

  const effectiveLocation = useMemo(() => {
    if (deliveryAddressMode === 'current') return engineLocation || location;
    return location;
  }, [deliveryAddressMode, engineLocation, location]);

  const setDeliveryAddressMode = useCallback((mode) => {
    try {
      localStorage.setItem('deliveryAddressMode', mode);
    } catch (_) {}
    setDeliveryAddressModeState(mode);
    notifyDeliveryModeUpdated(mode);
    if (mode === 'current') {
      setSavedLocationOverride(null);
    }
  }, []);

  const setSavedLocation = useCallback(async (payload, options = {}) => {
    if (!payload?.latitude || !payload?.longitude) return;
    const mode = options.mode || 'saved';
    setSavedLocationOverride(payload);
    persistUserLocation(payload, { mode });
    notifyLocationUpdated(payload);
    setDeliveryAddressMode(mode);
    if (options.persistDb !== false) {
      try {
        await userAPI.updateLocation(payload);
      } catch (_) {}
    }
  }, [setDeliveryAddressMode]);

  const requestLocation = useCallback(async (...args) => {
    setSavedLocationOverride(null);
    const result = await engineRequestLocation(...args);
    if (result?.latitude) {
      persistUserLocation(result, { mode: 'current' });
      setDeliveryAddressMode('current');
      notifyLocationUpdated(result);
    }
    return result;
  }, [engineRequestLocation, setDeliveryAddressMode]);

  useEffect(() => {
    if (engineLocation?.latitude && engineLocation?.longitude && deliveryAddressMode === 'current') {
      persistUserLocation(engineLocation, { mode: 'current' });
    }
  }, [
    engineLocation?.latitude,
    engineLocation?.longitude,
    engineLocation?.formattedAddress,
    deliveryAddressMode,
  ]);

  const value = useMemo(() => ({
    location,
    effectiveLocation,
    deliveryAddressMode,
    loading: loading || zoneLoading,
    error: error || zoneError,
    permissionGranted,
    zoneId,
    zone,
    zoneStatus,
    isInService,
    isOutOfService,
    tiffinZoneId,
    tiffinZone,
    tiffinZoneStatus,
    tiffinZoneLoading,
    isTiffinZoningEnforced,
    isTiffinServiceable,
    isTiffinOutOfZone,
    refreshTiffinZone,
    isLocationResolved: Boolean(location?.latitude && !loading),
    address: location?.address || location?.formattedAddress || '',
    requestLocation,
    setSavedLocation,
    setDeliveryAddressMode,
    refreshZone,
    startWatchingLocation,
    stopWatchingLocation,
  }), [
    location,
    effectiveLocation,
    deliveryAddressMode,
    loading,
    zoneLoading,
    error,
    zoneError,
    permissionGranted,
    zoneId,
    zone,
    zoneStatus,
    isInService,
    isOutOfService,
    tiffinZoneId,
    tiffinZone,
    tiffinZoneStatus,
    tiffinZoneLoading,
    isTiffinZoningEnforced,
    isTiffinServiceable,
    isTiffinOutOfZone,
    refreshTiffinZone,
    requestLocation,
    setSavedLocation,
    setDeliveryAddressMode,
    refreshZone,
    startWatchingLocation,
    stopWatchingLocation,
  ]);

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}
