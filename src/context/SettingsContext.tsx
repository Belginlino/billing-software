import React, { createContext, useContext, useState, useEffect } from 'react';
import { StoreSettings } from '../types';
import { dbService } from '../services/db';

interface SettingsContextType {
  settings: StoreSettings | null;
  loading: boolean;
  updateSettings: (newSettings: Partial<StoreSettings>) => Promise<StoreSettings>;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const data = await dbService.getSettings();
      let needsUpdate = false;
      const updates: Partial<StoreSettings> = {};

      if (data && data.currency === '$') {
        data.currency = '₹';
        updates.currency = '₹';
        needsUpdate = true;
      }

      if (data && (!data.storeName || data.storeName.toUpperCase().includes('VOGUE'))) {
        data.storeName = 'LINO MENSWEAR';
        updates.storeName = 'LINO MENSWEAR';
        needsUpdate = true;
      }

      if (needsUpdate) {
        await dbService.updateSettings(updates);
      }
      setSettings(data);
    } catch (err) {
      console.error("Failed to load store settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const updateSettings = async (newSettings: Partial<StoreSettings>) => {
    setLoading(true);
    try {
      const updated = await dbService.updateSettings(newSettings);
      setSettings(updated);
      return updated;
    } catch (err) {
      console.error("Failed to update store settings:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const refreshSettings = async () => {
    await fetchSettings();
  };

  return (
    <SettingsContext.Provider value={{ settings, loading, updateSettings, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
