import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { financeService } from '../services/financeService';
import {
  buildPreferences,
  DEFAULT_PREFERENCES,
  PreferencesContext,
  type Preferences,
} from './PreferencesContext';

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [preferences, setPreferencesState] = useState<Preferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    const loadPreferences = async () => {
      if (!user?.id) {
        setPreferencesState(DEFAULT_PREFERENCES);
        return;
      }

      try {
        const profile = await financeService.getProfile();
        if (!profile) return;

        setPreferencesState(
          buildPreferences({
            currency: profile.currency,
            numberFormat: profile.number_format,
            firstDayOfWeek: profile.first_day_of_week,
          })
        );
      } catch (err) {
        console.error('Error cargando preferencias:', err);
      }
    };

    void loadPreferences();
  }, [user?.id]);

  const setPreferences = useCallback((updates: Partial<Preferences>) => {
    setPreferencesState((previous) => buildPreferences({ ...previous, ...updates }));
  }, []);

  const value = useMemo(
    () => ({ ...preferences, setPreferences }),
    [preferences, setPreferences]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
};
