import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
  const [taskStatuses, setTaskStatuses] = useState([]);
  const [courseStatuses, setCourseStatuses] = useState([]);
  const [leadSources, setLeadSources] = useState([]);
  const [automationSettings, setAutomationSettings] = useState(null);
  const [generalSettings, setGeneralSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const lastRefreshRef = useRef(0);

  useEffect(() => {
    loadSettings();
  }, []);

  // רענון אוטומטי כשהדף חוזר להיות visible - בלי להציג מסך טעינה
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshSettingsSilently();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // רענון שקט - ללא מסך טעינה (לשימוש כש-visibility חוזר) - מקסימום פעם ב-60 שניות
  const refreshSettingsSilently = async () => {
    const now = Date.now();
    if (now - lastRefreshRef.current < 60000) return;
    lastRefreshRef.current = now;
    try {
      const [design, texts, statuses, tStatuses, cStatuses, lSources, automation, general] = await Promise.all([
        base44.entities.DesignSettings.list(),
        base44.entities.SystemTexts.list(),
        base44.entities.LeadStatuses.list(),
        base44.entities.TaskStatuses.list(),
        base44.entities.CourseStatuses.list(),
        base44.entities.LeadSources.list(),
        base44.entities.AutomationSettings.list(),
        base44.entities.GeneralSettings.list()
      ]);

      setDesignSettings(design && design.length > 0 ? design[0] : null);
      setSystemTexts(texts && texts.length > 0 ? texts[0] : null);
      setLeadStatuses(statuses || []);
      setTaskStatuses(tStatuses || []);
      setCourseStatuses(cStatuses || []);
      setLeadSources(lSources || []);
      setAutomationSettings(automation && automation.length > 0 ? automation[0] : null);
      setGeneralSettings(general && general.length > 0 ? general[0] : null);
    } catch (error) {
      console.error('Error refreshing system settings silently:', error);
    }
  };

  const loadSettings = async () => {
    setLoading(true);
    try {
      const [design, texts, statuses, tStatuses, cStatuses, lSources, automation, general] = await Promise.all([
        base44.entities.DesignSettings.list(),
        base44.entities.SystemTexts.list(),
        base44.entities.LeadStatuses.list(),
        base44.entities.TaskStatuses.list(),
        base44.entities.CourseStatuses.list(),
        base44.entities.LeadSources.list(),
        base44.entities.AutomationSettings.list(),
        base44.entities.GeneralSettings.list()
      ]);

      setDesignSettings(design && design.length > 0 ? design[0] : null);
      setSystemTexts(texts && texts.length > 0 ? texts[0] : null);
      setLeadStatuses(statuses || []);
      setTaskStatuses(tStatuses || []);
      setCourseStatuses(cStatuses || []);
      setLeadSources(lSources || []);
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
        taskStatuses,
        courseStatuses,
        leadSources,
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