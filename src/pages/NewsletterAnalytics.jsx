import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { BarChart3, ArrowRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import AnalyticsKPICards from '../components/newsletter/AnalyticsKPICards';
import CampaignTable from '../components/newsletter/CampaignTable';
import HourlyChart from '../components/newsletter/HourlyChart';
import RecentEventsTable from '../components/newsletter/RecentEventsTable';

export default function NewsletterAnalytics() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await base44.entities.EmailEvents.list('-created_date', 500);
        setEvents(data || []);
      } catch (error) {
        console.error('Error loading email events:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--crm-bg)] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[var(--crm-primary)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--crm-bg)] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-[var(--crm-primary)]" />
            <div>
              <h1 className="text-3xl font-bold text-[var(--crm-text)]" style={{ fontFamily: 'var(--font-headings)' }}>
                סטטיסטיקות ניוזלטר
              </h1>
              <p className="text-sm text-[var(--crm-text)] opacity-70">
                נתוני פתיחות, קליקים ו-bounces מ-AWS SES
              </p>
            </div>
          </div>
          <Link
            to={createPageUrl('NewsletterManager')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[var(--crm-primary)] border-2 border-[var(--crm-primary)] hover:bg-[var(--crm-primary)]/10 transition-colors"
            style={{ borderRadius: 'var(--crm-button-radius)' }}
          >
            <ArrowRight className="w-4 h-4" />
            חזרה לניוזלטר
          </Link>
        </div>

        {/* KPI Cards */}
        <AnalyticsKPICards events={events} />

        {/* Campaign Table */}
        <div>
          <h2 className="text-xl font-bold text-[var(--crm-text)] mb-4" style={{ fontFamily: 'var(--font-headings)' }}>
            ביצועי קמפיינים
          </h2>
          <CampaignTable events={events} />
        </div>

        {/* Hourly Chart */}
        <HourlyChart events={events} />

        {/* Recent Events */}
        <div>
          <h2 className="text-xl font-bold text-[var(--crm-text)] mb-4" style={{ fontFamily: 'var(--font-headings)' }}>
            אירועים אחרונים
          </h2>
          <RecentEventsTable events={events} />
        </div>
      </div>
    </div>
  );
}