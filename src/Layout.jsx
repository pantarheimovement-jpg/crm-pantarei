import React, { useEffect } from 'react';
import { LanguageProvider } from './components/LanguageContext';
import { SiteSettingsProvider, useSiteSettings } from './components/SiteSettingsContext';
import { SystemSettingsProvider, useSystemSettings } from './components/SystemSettingsContext';
import Header from './components/navigation/Header';
import Footer from './components/navigation/Footer';
import { Loader2 } from 'lucide-react';
import LogoCarousel from './components/home/LogoCarousel';
import CookieConsent from './components/shared/CookieConsent';

function StyleInjector() {
  const { siteSettings } = useSiteSettings();
  const { designSettings } = useSystemSettings();

  const googleFonts = [
    'Inter', 'Rubik:wght@300;400;500;600;700', 'Assistant', 'Heebo', 'Frank Ruhl Libre', 
    'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Amatic SC'
  ].map(f => f.replace(' ', '+')).join('&family=');

  const googleFontsUrl = `https://fonts.googleapis.com/css2?family=${googleFonts}&display=swap`;

  // CRM Design Settings (Pantarhei Style)
  const bg = designSettings?.background_color || '#FDF8F0';
  const primary = designSettings?.primary_color || '#6D436D';
  const accent = designSettings?.accent_color || '#D29486';
  const action = designSettings?.action_color || '#FAD980';
  const textColor = designSettings?.text_color || '#5E4B35';
  const fontHeadings = designSettings?.font_headings || 'Amatic SC';
  const fontBody = designSettings?.font_body || 'Rubik';
  const borderRadius = designSettings?.border_radius || 12;
  const buttonRadius = designSettings?.button_radius || 50;

  return (
    <>
      {/* Microsoft Clarity script REMOVED from here, now injected via useEffect in Layout component */}
      
      <style>
        {`
          @import url('${googleFontsUrl}');

          :root {
            /* Pantarhei CRM Colors */
            --crm-bg: ${bg};
            --crm-primary: ${primary};
            --crm-accent: ${accent};
            --crm-action: ${action};
            --crm-text: ${textColor};
            --crm-border-radius: ${borderRadius}px;
            --crm-button-radius: ${buttonRadius}px;

            /* Legacy Site Settings (for public site) */
            --primary-color: ${siteSettings?.primary_color || primary};
            --secondary-color: ${siteSettings?.secondary_color || primary};
            --accent-color: ${siteSettings?.accent_color || bg};
            --text-color: ${siteSettings?.text_color || textColor};
            --background-color: ${siteSettings?.background_color || bg};

            --font-family-he: "${siteSettings?.font_family_he || 'Rubik'}", sans-serif;
            --font-family-en: "${siteSettings?.font_family_en || 'Rubik'}", sans-serif;
            --font-size-base: ${siteSettings?.font_size_base || '16px'};
            --font-weight-bold: ${siteSettings?.font_weight_bold || '700'};

            /* CRM Fonts */
            --font-headings: "${fontHeadings}", cursive;
            --font-body: "${fontBody}", sans-serif;
          }
          
          body {
            background-color: var(--crm-bg);
            color: var(--crm-text);
            font-family: var(--font-body);
            font-size: var(--font-size-base);
            line-height: 1.6;
            margin: 0;
            padding: 0;
          }

          [lang="he"] body {
            font-family: var(--font-family-he);
          }
          [lang="en"] body {
            font-family: var(--font-family-en);
          }

          /* CRM Headings - Organic Flow Style */
          h1, h2, h3, h4, h5, h6 {
            font-family: var(--font-headings);
            font-weight: 700;
          }

          /* CRM Buttons - Pill Shape */
          .btn-primary, button.bg-\\[\\#005e6c\\], button.bg-\\[\\#6D436D\\] {
            border-radius: var(--crm-button-radius) !important;
            background-color: var(--crm-primary) !important;
          }

          .btn-action {
            border-radius: var(--crm-button-radius) !important;
            background-color: var(--crm-action) !important;
            color: var(--crm-text) !important;
          }

          /* CRM Cards - Rounded */
          .card, .rounded-lg {
            border-radius: var(--crm-border-radius) !important;
          }
          
          .gradient-text {
            background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }

          .smooth-transition {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          .shadow-elegant {
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          }
          
          .animate-fade-in {
            animation: fadeIn 0.6s ease-out;
          }
          
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .hover-lift {
            transition: transform 0.3s ease, box-shadow 0.3s ease;
          }
          
          .hover-lift:hover {
            transform: translateY(-4px);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
          }
          
          /* Quill Rich Text Editor Alignment Classes for Frontend Rendering */
          .ql-align-left { text-align: left; }
          .ql-align-center { text-align: center; }
          .ql-align-right { text-align: right; }
          .ql-align-justify { text-align: justify; }
          
          /* RTL Support */
          [dir="rtl"] .space-x-reverse > * + * {
            margin-right: 0.5rem;
            margin-left: 0;
          }
          
          [dir="rtl"] .rtl\\:text-right {
            text-align: right;
          }
          
          [dir="rtl"] .rtl\\:text-left {
            text-align: left;
          }

          /* Logo Carousel Mobile Adjustments */
          @media (max-width: 640px) {
            .logo-item {
              padding-left: 4px;
              padding-right: 4px;
            }
          }
        `}
      </style>
    </>
  );
}

function AppContent({ children, currentPageName }) {
    const { loading: siteLoading } = useSiteSettings();
    const { loading: systemLoading } = useSystemSettings();

    if (siteLoading || systemLoading) {
        return (
            <div style={{ backgroundColor: '#FDF8F0', color: '#5E4B35' }} className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-[#6D436D]" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-[var(--background-color)]">
            <Header />
            <main className="flex-1">
                {children}
            </main>
            {currentPageName !== 'Home' && <LogoCarousel />}
            <Footer />
            <CookieConsent />
        </div>
    );
}

function LayoutContent({ children, currentPageName }) {
  return (
    <SiteSettingsProvider>
      <SystemSettingsProvider>
        <StyleInjector />
        <AppContent currentPageName={currentPageName}>
            {children}
        </AppContent>
      </SystemSettingsProvider>
    </SiteSettingsProvider>
  );
}

export default function Layout({ children, currentPageName }) {
  useEffect(() => {
    // Microsoft Clarity script injection
    const scriptId = 'microsoft-clarity-script';
    if (document.getElementById(scriptId)) {
      return; // Script already exists
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.type = 'text/javascript';
    script.innerHTML = `
      (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/szurul38r2";
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
      })(window, document, "clarity", "script", "szurul38r2");
    `;
    
    document.head.appendChild(script);

    // Facebook domain verification meta tag
    const metaId = 'facebook-domain-verification';
    if (!document.getElementById(metaId)) {
      const meta = document.createElement('meta');
      meta.id = metaId;
      meta.name = 'facebook-domain-verification';
      meta.content = 'w3eu7cym4a5gsmupghavike7mmxdp5-n';
      document.head.appendChild(meta);
    }

    // Cleanup function to remove the script and meta when the component unmounts
    return () => {
      const existingScript = document.getElementById(scriptId);
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
      const existingMeta = document.getElementById(metaId);
      if (existingMeta) {
        document.head.removeChild(existingMeta);
      }
    };
  }, []); // Empty dependency array ensures this runs only once

  return (
    <LanguageProvider>
      <LayoutContent currentPageName={currentPageName}>
        {children}
      </LayoutContent>
    </LanguageProvider>
  );
}