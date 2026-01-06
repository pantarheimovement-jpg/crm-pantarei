import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useLanguage } from '../LanguageContext';
import { useSiteSettings } from '../SiteSettingsContext';

export default function Footer() {
  const { language, t } = useLanguage();
  const { siteSettings } = useSiteSettings();
  const currentYear = new Date().getFullYear();

  return (
    <footer 
      className="py-12 text-white"
      style={{ 
        backgroundColor: siteSettings?.footer_background_color || '#2e2e2e',
        color: siteSettings?.footer_text_color || '#e5e7eb'
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Logo and Description */}
          <div className="space-y-4">
            <div>
              {siteSettings?.footer_logo_url_he || siteSettings?.logo_url_he ? (
                <img 
                  src={language === 'he' ? (siteSettings.footer_logo_url_he || siteSettings.logo_url_he) : (siteSettings.footer_logo_url_en || siteSettings.logo_url_en)} 
                  alt="CRM"
                  className="h-10 w-auto"
                />
              ) : (
                <h2 className="text-2xl font-bold" style={{ color: siteSettings?.footer_title_color || '#ffffff' }}>
                  CRM System
                </h2>
              )}
            </div>
            <p className="text-sm leading-relaxed">
              {t('מערכת ניהול לקוחות מתקדמת לארגונים', 'Advanced customer relationship management system')}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4" style={{ color: siteSettings?.footer_title_color || '#ffffff' }}>
              {t('קישורים מהירים', 'Quick Links')}
            </h3>
            <nav className="space-y-2">
              <Link to={createPageUrl('PipelineDashboard')} className="block text-sm hover:text-white smooth-transition">
                {t('לוח בקרה', 'Dashboard')}
              </Link>
              <Link to={createPageUrl('Organizations')} className="block text-sm hover:text-white smooth-transition">
                {t('ארגונים', 'Organizations')}
              </Link>
              <Link to={createPageUrl('Contacts')} className="block text-sm hover:text-white smooth-transition">
                {t('אנשי קשר', 'Contacts')}
              </Link>
              <Link to={createPageUrl('Opportunities')} className="block text-sm hover:text-white smooth-transition">
                {t('הזדמנויות', 'Opportunities')}
              </Link>
            </nav>
          </div>

          {/* Tools */}
          <div>
            <h3 className="text-lg font-semibold mb-4" style={{ color: siteSettings?.footer_title_color || '#ffffff' }}>
              {t('כלים', 'Tools')}
            </h3>
            <nav className="space-y-2">
              <Link to={createPageUrl('ImportLeads')} className="block text-sm hover:text-white smooth-transition">
                {t('ייבוא לידים', 'Import Leads')}
              </Link>
              <Link to={createPageUrl('NewsletterManager')} className="block text-sm hover:text-white smooth-transition">
                {t('ניהול ניוזלטר', 'Newsletter Manager')}
              </Link>
              <Link to={createPageUrl('CRMSettings')} className="block text-sm hover:text-white smooth-transition">
                {t('הגדרות', 'Settings')}
              </Link>
            </nav>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t border-gray-600 text-center text-sm">
          <p>
            {language === 'he' 
              ? `© ${currentYear} CRM System. כל הזכויות שמורות.` 
              : `© ${currentYear} CRM System. All rights reserved.`
            }
          </p>
        </div>
      </div>
    </footer>
  );
}