import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useSystemSettings } from '../components/SystemSettingsContext';
import { LayoutDashboard, Users, TrendingUp, Clock, Phone, Calendar, CheckCircle, Loader2, ArrowRight } from 'lucide-react';

export default function PipelineDashboard() {
  const { systemTexts, leadStatuses } = useSystemSettings();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState(null);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      const data = await base44.entities.Student.list('-created_date');
      setStudents(data || []);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStudentsByStatus = (statusName) => {
    return students.filter(s => s.status === statusName);
  };

  const getTotalStudents = () => students.length;
  const getNewToday = () => {
    const today = new Date().toISOString().split('T')[0];
    return students.filter(s => s.created_date?.startsWith(today)).length;
  };
  const getTrialsScheduled = () => students.filter(s => s.trial_date).length;
  const getRegistered = () => students.filter(s => s.status === 'רשום').length;

  const stats = [
    { label: 'סה"כ משתתפים', value: getTotalStudents(), icon: Users, color: '#6D436D' },
    { label: 'חדשים היום', value: getNewToday(), icon: TrendingUp, color: '#FAD980' },
    { label: 'ניסיונות מתוכננים', value: getTrialsScheduled(), icon: Calendar, color: '#D29486' },
    { label: 'רשומים', value: getRegistered(), icon: CheckCircle, color: '#4CAF50' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--crm-bg)]">
        <Loader2 className="w-12 h-12 animate-spin text-[var(--crm-primary)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--crm-bg)] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <LayoutDashboard className="w-8 h-8 text-[var(--crm-primary)]" />
            <h1 className="text-4xl font-bold text-[var(--crm-text)]" style={{ fontFamily: 'var(--font-headings)' }}>
              {systemTexts?.page_dashboard || 'דשבורד'}
            </h1>
          </div>
          <p className="text-[var(--crm-text)] opacity-70">
            סקירת פעילות ופייפליין {systemTexts?.entity_student_plural || 'משתתפים'}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
              style={{ borderRadius: 'var(--crm-border-radius)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <stat.icon className="w-8 h-8" style={{ color: stat.color }} />
                <span className="text-3xl font-bold text-[var(--crm-text)]" style={{ fontFamily: 'var(--font-body)' }}>
                  {stat.value}
                </span>
              </div>
              <p className="text-sm text-[var(--crm-text)] opacity-70 font-medium">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Pipeline */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8" style={{ borderRadius: 'var(--crm-border-radius)' }}>
          <h2 className="text-2xl font-bold text-[var(--crm-text)] mb-6" style={{ fontFamily: 'var(--font-headings)' }}>
            פייפליין ניהול לידים
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {leadStatuses.sort((a, b) => a.order_index - b.order_index).map((status, idx) => {
              const count = getStudentsByStatus(status.name).length;
              return (
                <div
                  key={status.id}
                  onClick={() => setSelectedStatus(selectedStatus === status.name ? null : status.name)}
                  className="relative cursor-pointer group"
                >
                  <div
                    className="rounded-xl p-6 text-center transition-all hover:scale-105"
                    style={{
                      backgroundColor: status.color + '20',
                      borderRadius: 'var(--crm-border-radius)',
                      border: `2px solid ${status.color}`
                    }}
                  >
                    <div
                      className="text-3xl font-bold mb-2"
                      style={{ color: status.color, fontFamily: 'var(--font-body)' }}
                    >
                      {count}
                    </div>
                    <div className="text-sm font-medium" style={{ color: status.color }}>
                      {status.name}
                    </div>
                    {status.description && (
                      <div className="text-xs mt-2 opacity-70" style={{ color: status.color }}>
                        {status.description}
                      </div>
                    )}
                  </div>
                  {idx < leadStatuses.length - 1 && (
                    <ArrowRight
                      className="hidden lg:block absolute -left-6 top-1/2 -translate-y-1/2 text-gray-300"
                      style={{ width: '24px', height: '24px' }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Students by Selected Status */}
        {selectedStatus && (
          <div className="bg-white rounded-xl shadow-sm p-6" style={{ borderRadius: 'var(--crm-border-radius)' }}>
            <h3 className="text-xl font-bold text-[var(--crm-text)] mb-4" style={{ fontFamily: 'var(--font-headings)' }}>
              {systemTexts?.entity_student_plural || 'משתתפים'} - {selectedStatus}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getStudentsByStatus(selectedStatus).map(student => (
                <div
                  key={student.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  style={{ borderRadius: 'var(--crm-border-radius)' }}
                >
                  <h4 className="font-semibold text-[var(--crm-text)] mb-2">{student.full_name}</h4>
                  <div className="space-y-1 text-sm text-[var(--crm-text)] opacity-70">
                    {student.phone && <div className="flex items-center gap-2"><Phone className="w-4 h-4" />{student.phone}</div>}
                    {student.interest_area && <div className="truncate">{student.interest_area}</div>}
                    {student.trial_date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(student.trial_date).toLocaleDateString('he-IL')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}