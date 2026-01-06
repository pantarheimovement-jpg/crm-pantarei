import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const SystemSettingsContext = createContext(null);

export const useSystemSettings = () => {
  const context = useContext(SystemSettingsContext);
  if (!context) {
    throw new Error('useSystemSettings must be used within SystemSettingsProvider');
  }
  return context;
};

export const SystemSettingsProvider = ({ children }) => {
  const [designSettings, setDesignSettings] = useState(null);
  const [systemTexts, setSystemTexts] = useState(null);
  const [leadStatuses, setLeadStatuses] = useState([]);
  const [automationSettings, setAutomationSettings] = useState(null);
  const [generalSettings, setGeneralSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  // רענון אוטומטי כשהדף חוזר להיות visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadSettings();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const [design, texts, statuses, automation, general] = await Promise.all([
        base44.entities.DesignSettings.list(),
        base44.entities.SystemTexts.list(),
        base44.entities.LeadStatuses.list(),
        base44.entities.AutomationSettings.list(),
        base44.entities.GeneralSettings.list()
      ]);

      setDesignSettings(design && design.length > 0 ? design[0] : null);
      setSystemTexts(texts && texts.length > 0 ? texts[0] : null);
      setLeadStatuses(statuses || []);
      setAutomationSettings(automation && automation.length > 0 ? automation[0] : null);
      setGeneralSettings(general && general.length > 0 ? general[0] : null);
    } catch (error) {
      console.error('Error loading system settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const reloadSettings = async () => {
    await loadSettings();
  };

  return (
    <SystemSettingsContext.Provider
      value={{
        designSettings,
        systemTexts,
        leadStatuses,
        automationSettings,
        generalSettings,
        loading,
        reloadSettings
      }}
    >
      {children}
    </SystemSettingsContext.Provider>
  );
};