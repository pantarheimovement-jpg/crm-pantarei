import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Calendar, Check, X, Clock, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function AttendanceManager({ courseId, students }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingDates, setExistingDates] = useState([]);

  useEffect(() => {
    loadAttendanceDates();
  }, [courseId]);

  useEffect(() => {
    if (selectedDate) {
      loadAttendanceForDate(selectedDate);
    }
  }, [selectedDate, courseId]);

  const loadAttendanceDates = async () => {
    const allAttendance = await base44.entities.Attendance.filter({ course_id: courseId });
    const dates = [...new Set((allAttendance || []).map(a => a.date))].sort().reverse();
    setExistingDates(dates);
  };

  const loadAttendanceForDate = async (date) => {
    setLoading(true);
    const records = await base44.entities.Attendance.filter({ course_id: courseId, date: date });
    
    // Build attendance map from existing records
    const attendanceMap = {};
    (records || []).forEach(r => {
      attendanceMap[r.student_id] = r;
    });

    // Build full list with all students
    const fullList = students.map(student => {
      const existing = attendanceMap[student.id];
      return {
        student_id: student.id,
        student_name: student.full_name,
        status: existing?.status || null,
        record_id: existing?.id || null
      };
    });

    setAttendance(fullList);
    setLoading(false);
  };

  const updateStatus = async (studentId, newStatus) => {
    setSaving(true);
    const item = attendance.find(a => a.student_id === studentId);
    
    if (item.record_id) {
      // Update existing
      await base44.entities.Attendance.update(item.record_id, { status: newStatus });
    } else {
      // Create new
      const created = await base44.entities.Attendance.create({
        course_id: courseId,
        student_id: studentId,
        student_name: item.student_name,
        date: selectedDate,
        status: newStatus
      });
      item.record_id = created.id;
    }

    setAttendance(prev => prev.map(a => 
      a.student_id === studentId ? { ...a, status: newStatus } : a
    ));

    // Refresh dates list
    if (!existingDates.includes(selectedDate)) {
      setExistingDates(prev => [selectedDate, ...prev].sort().reverse());
    }

    setSaving(false);
  };

  const markAllPresent = async () => {
    setSaving(true);
    for (const item of attendance) {
      if (item.status !== 'נוכח/ת') {
        if (item.record_id) {
          await base44.entities.Attendance.update(item.record_id, { status: 'נוכח/ת' });
        } else {
          const created = await base44.entities.Attendance.create({
            course_id: courseId,
            student_id: item.student_id,
            student_name: item.student_name,
            date: selectedDate,
            status: 'נוכח/ת'
          });
          item.record_id = created.id;
        }
      }
    }
    setAttendance(prev => prev.map(a => ({ ...a, status: 'נוכח/ת' })));
    if (!existingDates.includes(selectedDate)) {
      setExistingDates(prev => [selectedDate, ...prev].sort().reverse());
    }
    setSaving(false);
  };

  const statusConfig = {
    'נוכח/ת': { icon: Check, color: 'bg-green-100 text-green-700 border-green-300', activeColor: 'bg-green-500 text-white' },
    'נעדר/ת': { icon: X, color: 'bg-red-100 text-red-700 border-red-300', activeColor: 'bg-red-500 text-white' },
    'איחור': { icon: Clock, color: 'bg-yellow-100 text-yellow-700 border-yellow-300', activeColor: 'bg-yellow-500 text-white' }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mt-6" style={{ borderRadius: 'var(--crm-border-radius)' }}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-[var(--crm-text)]" style={{ fontFamily: 'var(--font-headings)' }}>
          מעקב נוכחות
        </h2>
        <div className="flex items-center gap-3">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-44"
          />
          <Button
            onClick={markAllPresent}
            disabled={saving || students.length === 0}
            variant="outline"
            className="text-green-700 border-green-300 hover:bg-green-50"
            style={{ borderRadius: 'var(--crm-button-radius)' }}
          >
            <Check className="w-4 h-4 mr-1" />
            סמן כולם נוכחים
          </Button>
        </div>
      </div>

      {/* Quick date buttons */}
      {existingDates.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="text-xs text-gray-500 self-center">מפגשים קודמים:</span>
          {existingDates.slice(0, 10).map(date => (
            <button
              key={date}
              onClick={() => setSelectedDate(date)}
              className={`px-3 py-1 text-xs rounded-full border transition-all ${
                selectedDate === date 
                  ? 'bg-[var(--crm-primary)] text-white border-[var(--crm-primary)]' 
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
              }`}
            >
              {new Date(date).toLocaleDateString('he-IL')}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--crm-primary)]" />
        </div>
      ) : students.length === 0 ? (
        <p className="text-center text-gray-400 py-8">אין משתתפים רשומים לקורס זה</p>
      ) : (
        <div className="space-y-2">
          {attendance.map(item => (
            <div
              key={item.student_id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <span className="font-medium text-[var(--crm-text)]">{item.student_name}</span>
              <div className="flex gap-2">
                {Object.entries(statusConfig).map(([status, config]) => {
                  const Icon = config.icon;
                  const isActive = item.status === status;
                  return (
                    <button
                      key={status}
                      onClick={() => updateStatus(item.student_id, status)}
                      disabled={saving}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        isActive ? config.activeColor : config.color
                      } ${saving ? 'opacity-50' : 'hover:opacity-80'}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {status}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}