import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SiteSettings } from '@/entities/SiteSettings';

const SiteSettingsContext = createContext();

export const useSiteSettings = () => {
  const context = useContext(SiteSettingsContext);
  if (!context) {
    throw new Error('useSiteSettings must be used within a SiteSettingsProvider');
  }
  return context;
};

export const SiteSettingsProvider = ({ children }) => {
  const [siteSettings, setSiteSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadSiteSettings = useCallback(async () => {
    setLoading(true);
    try {
      const settings = await SiteSettings.list();
      if (settings && settings.length > 0) {
        setSiteSettings(settings[0]);
      }
    } catch (error) {
      console.log('No site settings found yet, or user has no permission. This is expected for public visitors.');
      setSiteSettings(null);
    } finally {
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSiteSettings();
  }, [loadSiteSettings]);

  const value = {
    siteSettings,
    reloadSettings: loadSiteSettings,
    loading
  };

  return (
    <SiteSettingsContext.Provider value={value}>
      {children}
    </SiteSettingsContext.Provider>
  );
};