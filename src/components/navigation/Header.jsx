import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useLanguage } from '../LanguageContext';
import { useSiteSettings } from '../SiteSettingsContext';
import { useSystemSettings } from '../SystemSettingsContext';
import { base44 } from '@/api/base44Client';
import { Menu, X, Globe, Settings, LogIn, LogOut, MoreVertical, LayoutDashboard, GraduationCap, Users, MessageSquare, CheckSquare, Mail } from 'lucide-react';

// Hook לניהול משתמש
function useUser() {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkUser();
  }, []);

  const login = async () => {
    try {
      await base44.auth.redirectToLogin();
    } catch (error) {
      console.log('Login error:', error);
    }
  };

  const logout = async () => {
    try {
      await base44.auth.logout();
      setUser(null);
    } catch (error) {
      console.log('Logout error:', error);
    }
  };

  return { user, loading, login, logout };
}

export default function Header() {
  const { language, switchLanguage } = useLanguage();
  const { siteSettings } = useSiteSettings();
  const { generalSettings, systemTexts } = useSystemSettings();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDesktopMenuOpen, setIsDesktopMenuOpen] = useState(false);
  const { user, login, logout } = useUser();

  // Use logo from GeneralSettings, fallback to SiteSettings
  const logoUrl = generalSettings?.logo_url || (language === 'he' ? siteSettings?.logo_url_he : siteSettings?.logo_url_en);

  // CRM Navigation Items (Dynamic from SystemTexts)
  const crmNavItems = [
    {
      key: 'dashboard',
      label: systemTexts?.page_dashboard || 'דשבורד',
      labelEn: 'Dashboard',
      path: 'PipelineDashboard',
      icon: LayoutDashboard
    },
    {
      key: 'students',
      label: systemTexts?.page_students || 'משתתפים',
      labelEn: 'Students',
      path: 'Students',
      icon: Users
    },
    {
      key: 'courses',
      label: systemTexts?.page_courses || 'קורסים',
      labelEn: 'Courses',
      path: 'Courses',
      icon: GraduationCap
    },

    {
      key: 'tasks',
      label: systemTexts?.page_tasks || 'משימות',
      labelEn: 'Tasks',
      path: 'Tasks',
      icon: CheckSquare
    },
    {
      key: 'newsletter',
      label: systemTexts?.page_newsletter || 'ניוזלטר',
      labelEn: 'Newsletter',
      path: 'NewsletterManager',
      icon: Mail
    }
  ];

  return (
    <>
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Desktop Header */}
          <div className="hidden md:flex justify-between items-center h-16 gap-4">
            {/* Logo */}
            <Link to={createPageUrl('CRMDashboard')} className="flex items-center flex-shrink-0">
              {logoUrl?.trim() ? (
                <img
                  src={logoUrl}
                  alt={generalSettings?.system_name || 'CRM'}
                  className="h-12 w-auto"
                />
              ) : (
                <div className="text-xl font-bold gradient-text">
                  {generalSettings?.system_name || (language === 'he' ? 'CRM' : 'CRM')}
                </div>
              )}
            </Link>

            {/* Desktop Navigation */}
            <nav className="flex flex-1 justify-around items-center">
              {crmNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.key}
                    to={createPageUrl(item.path)}
                    className="text-[var(--text-color)] hover:text-[var(--primary-color)] px-1 py-2 text-sm font-medium transition-colors duration-200 relative group text-center flex items-center gap-2"
                  >
                    <Icon className="w-4 h-4" />
                    {language === 'he' ? item.label : item.labelEn}
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-[var(--primary-color)] transition-all duration-300 group-hover:w-full"></span>
                  </Link>
                );
              })}
            </nav>

            {/* Desktop Controls */}
            <div className="flex items-center space-x-4 rtl:space-x-reverse relative flex-shrink-0">
              {/* Language Switcher */}
              <button
                onClick={() => {
                  const newLang = language === 'he' ? 'en' : 'he';
                  switchLanguage(newLang);
                }}
                className="flex items-center space-x-1 rtl:space-x-reverse text-[var(--text-color)] hover:text-[var(--primary-color)] transition-colors duration-200"
              >
                <Globe className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {language === 'he' ? 'עב' : 'EN'}
                </span>
              </button>

              <div className="relative">
                <button
                  onClick={() => setIsDesktopMenuOpen(!isDesktopMenuOpen)}
                  className="text-[var(--text-color)] hover:text-[var(--primary-color)] transition-colors duration-200 p-2 rounded-lg hover:bg-gray-100"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>

                {isDesktopMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-100 py-1 z-50">
                    <Link
                      to={createPageUrl('CRMSettings')}
                      className="flex items-center gap-3 px-4 py-2 text-sm font-medium hover:text-[var(--primary-color)] hover:bg-gray-50 transition-colors duration-200"
                      onClick={() => setIsDesktopMenuOpen(false)}
                    >
                      <Settings className="w-4 h-4" />
                      {language === 'he' ? 'הגדרות CRM' : 'CRM Settings'}
                    </Link>

                    {user ? (
                      <button
                        onClick={() => {
                          logout();
                          setIsDesktopMenuOpen(false);
                        }}
                        className="flex items-center gap-3 px-4 py-2 text-sm font-medium hover:text-[var(--primary-color)] hover:bg-gray-50 transition-colors duration-200 w-full text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        {language === 'he' ? 'יציאה' : 'Logout'}
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          login();
                          setIsDesktopMenuOpen(false);
                        }}
                        className="flex items-center gap-3 px-4 py-2 text-sm font-medium hover:text-[var(--primary-color)] hover:bg-gray-50 transition-colors duration-200 w-full text-left"
                      >
                        <LogIn className="w-4 h-4" />
                        {language === 'he' ? 'כניסה' : 'Login'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Header */}
          <div className="flex md:hidden justify-between items-center h-16">
            {/* Right Side - Menu & Language */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-[var(--text-color)] hover:text-[var(--primary-color)] p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
                aria-label={isMenuOpen ? 'סגור תפריט' : 'פתח תפריט'}
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>

              <button
                onClick={() => {
                  const newLang = language === 'he' ? 'en' : 'he';
                  switchLanguage(newLang);
                }}
                className="flex items-center gap-1 text-[var(--text-color)] hover:text-[var(--primary-color)] p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="החלף שפה"
              >
                <Globe className="w-5 h-5" />
                <span className="text-sm font-medium">
                  {language === 'he' ? 'עב' : 'EN'}
                </span>
              </button>
            </div>

            {/* Center - Logo */}
            <Link to={createPageUrl('CRMDashboard')} className="absolute left-1/2 transform -translate-x-1/2">
              {logoUrl?.trim() ? (
                <img
                  src={logoUrl}
                  alt={generalSettings?.system_name || 'CRM'}
                  className="h-10 w-auto"
                />
              ) : (
                <div className="text-xl font-bold gradient-text">
                  {generalSettings?.system_name || 'CRM'}
                </div>
              )}
            </Link>

            {/* Left Side - Spacer */}
            <div className="w-24"></div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Menu - Outside header container */}
      {isMenuOpen && (
        <div className="fixed inset-0 top-16 z-40 md:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-25" 
            onClick={() => setIsMenuOpen(false)}
          />
          
          {/* Menu */}
          <div className="relative bg-white border-b border-gray-200 shadow-xl max-h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="py-2 px-4 space-y-1">
              {crmNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.key}
                    to={createPageUrl(item.path)}
                    className="flex items-center gap-3 px-3 py-3 text-base font-medium text-[var(--text-color)] hover:text-[var(--primary-color)] hover:bg-gray-50 rounded-lg transition-colors duration-200 active:bg-gray-100"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span>{language === 'he' ? item.label : item.labelEn}</span>
                  </Link>
                );
              })}

              <div className="border-t border-gray-100 pt-2 mt-2">
                <Link
                  to={createPageUrl('CRMSettings')}
                  className="flex items-center gap-3 px-3 py-3 text-base font-medium text-[var(--text-color)] hover:text-[var(--primary-color)] hover:bg-gray-50 rounded-lg transition-colors duration-200 active:bg-gray-100"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Settings className="w-5 h-5 flex-shrink-0" />
                  <span>{language === 'he' ? 'הגדרות CRM' : 'CRM Settings'}</span>
                </Link>

                {user ? (
                  <button
                    onClick={() => {
                      logout();
                      setIsMenuOpen(false);
                    }}
                    className="flex items-center gap-3 px-3 py-3 text-base font-medium text-[var(--text-color)] hover:text-[var(--primary-color)] hover:bg-gray-50 rounded-lg transition-colors duration-200 active:bg-gray-100 w-full text-right"
                  >
                    <LogOut className="w-5 h-5 flex-shrink-0" />
                    <span>{language === 'he' ? 'יציאה' : 'Logout'}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      login();
                      setIsMenuOpen(false);
                    }}
                    className="flex items-center gap-3 px-3 py-3 text-base font-medium text-[var(--text-color)] hover:text-[var(--primary-color)] hover:bg-gray-50 rounded-lg transition-colors duration-200 active:bg-gray-100 w-full text-right"
                  >
                    <LogIn className="w-5 h-5 flex-shrink-0" />
                    <span>{language === 'he' ? 'כניסה' : 'Login'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}