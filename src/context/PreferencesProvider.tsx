import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { financeService } from '../services/financeService';
import {
  buildPreferences,
  DEFAULT_PREFERENCES,
  PreferencesContext,
  type Preferences,
} from './PreferencesContext';
import type { Profile } from '../types/database';

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [preferences, setPreferencesState] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadPreferences = async () => {
      if (!user?.id) {
        setPreferencesState(DEFAULT_PREFERENCES);
        setProfile(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const data = await financeService.getProfile();
        if (cancelled) return;

        setProfile(data);

        if (data) {
          setPreferencesState(
            buildPreferences({
              currency: data.currency,
              numberFormat: data.number_format,
              firstDayOfWeek: data.first_day_of_week,
            })
          );
        }
      } catch (err) {
        console.error('Error cargando preferencias:', err);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadPreferences();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const setPreferences = useCallback((updates: Partial<Preferences>) => {
    setPreferencesState((previous) => buildPreferences({ ...previous, ...updates }));
  }, []);

  const value = useMemo(
    () => ({ ...preferences, profile, loading, setPreferences }),
    [preferences, profile, loading, setPreferences]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
};
