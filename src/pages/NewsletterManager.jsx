import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { 
  Mail, Send, Users, History, Loader2, CheckCircle, AlertCircle,
  Filter, X, MessageSquare
} from 'lucide-react';

export default function NewsletterManager() {
  const [subscribers, setSubscribers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('compose'); // 'compose' or 'history'
  
  // Compose state
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [sending, setSending] = useState(false);
  const [sendMode, setSendMode] = useState('whatsapp'); // 'email' or 'whatsapp'

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Auto-select recipients when group changes
    if (selectedGroup === 'all') {
      setSelectedRecipients(subscribers.filter(s => s.subscribed).map(s => s.id));
    } else {
      setSelectedRecipients(
        subscribers
          .filter(s => s.subscribed && s.group === selectedGroup)
          .map(s => s.id)
      );
    }
  }, [selectedGroup, subscribers]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [subsData, logsData] = await Promise.all([
        base44.entities.Subscribers.list('-created_date'),
        base44.entities.NewsletterLogs.list('-sent_date')
      ]);
      setSubscribers(subsData || []);
      setLogs(logsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!subject.trim()) {
      alert('אנא הזיני נושא');
      return;
    }
    if (!content.trim()) {
      alert('אנא כתבי תוכן');
      return;
    }
    if (selectedRecipients.length === 0) {
      alert('אנא בחרי לפחות נמען אחד');
      return;
    }

    const confirmMessage = `האם לשלוח ${sendMode === 'email' ? 'מייל' : 'הודעת WhatsApp'} ל-${selectedRecipients.length} נמענים?`;
    if (!confirm(confirmMessage)) return;

    setSending(true);
    try {
      const recipients = subscribers.filter(s => selectedRecipients.includes(s.id));
      let result;
      
      if (sendMode === 'whatsapp') {
        // Send via WhatsApp
        const whatsappRecipients = recipients.map(r => ({
          name: r.name || 'שלום',
          whatsapp: r.whatsapp,
          message_content: `*${subject}*\n\n${stripHtml(content)}`
        }));

        result = await base44.functions.invoke('sendWhatsappNewsletter', {
          recipients: whatsappRecipients
        });

        // Log the newsletter
        await base44.entities.NewsletterLogs.create({
          subject: subject,
          content: content,
          group: selectedGroup,
          recipients_count: whatsappRecipients.length,
          status: result.data.failed_count === 0 ? 'נשלח בהצלחה' : 
                  result.data.success_count === 0 ? 'נכשל' : 'נשלח חלקית',
          sent_date: new Date().toISOString(),
          error_message: result.data.failed_count > 0 ? 
            `${result.data.failed_count} הודעות נכשלו` : null,
          sent_by: 'WhatsApp'
        });

        alert(`✅ נשלחו ${result.data.success_count} הודעות בהצלחה\n${result.data.failed_count > 0 ? `❌ ${result.data.failed_count} הודעות נכשלו` : ''}`);
      } else {
        // Send via Email
        let successCount = 0;
        let failedCount = 0;

        for (const recipient of recipients) {
          if (!recipient.email) {
            failedCount++;
            continue;
          }

          try {
            await base44.integrations.Core.SendEmail({
              to: recipient.email,
              subject: subject,
              body: `
                <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #6D436D;">${subject}</h2>
                  ${content}
                  <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
                  <p style="font-size: 12px; color: #666;">
                    לביטול המנוי, לחצי 
                    <a href="#" style="color: #6D436D;">כאן</a>
                  </p>
                </div>
              `
            });
            successCount++;
          } catch (error) {
            failedCount++;
            console.error('Error sending email:', error);
          }

          // Small delay between emails
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Log the newsletter
        await base44.entities.NewsletterLogs.create({
          subject: subject,
          content: content,
          group: selectedGroup,
          recipients_count: recipients.length,
          status: failedCount === 0 ? 'נשלח בהצלחה' : 
                  successCount === 0 ? 'נכשל' : 'נשלח חלקית',
          sent_date: new Date().toISOString(),
          error_message: failedCount > 0 ? `${failedCount} מיילים נכשלו` : null,
          sent_by: 'מייל'
        });

        alert(`✅ נשלחו ${successCount} מיילים בהצלחה\n${failedCount > 0 ? `❌ ${failedCount} מיילים נכשלו` : ''}`);
      }

      // Clear form
      setSubject('');
      setContent('');
      setActiveTab('history');
      loadData();
    } catch (error) {
      console.error('Error sending newsletter:', error);
      alert('שגיאה בשליחת הניוזלטר: ' + error.message);
    } finally {
      setSending(false);
    }
  };

  const stripHtml = (html) => {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const toggleRecipient = (id) => {
    setSelectedRecipients(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const uniqueGroups = ['all', ...new Set(subscribers.map(s => s.group).filter(Boolean))];
  const filteredSubscribers = subscribers.filter(s => s.subscribed);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-[#6D436D]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--crm-bg)]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <Mail className="w-8 h-8 text-[var(--crm-primary)]" />
            <div>
              <h1 className="text-3xl font-bold text-[var(--crm-text)]" style={{ fontFamily: 'var(--font-headings)' }}>
                ניוזלטר
              </h1>
              <p className="text-sm text-[var(--crm-text)] opacity-70">
                שליחת עדכונים למנויים
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm mb-6" style={{ borderRadius: 'var(--crm-border-radius)' }}>
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('compose')}
                className={`px-6 py-4 font-medium ${
                  activeTab === 'compose'
                    ? 'border-b-2 border-[var(--crm-primary)] text-[var(--crm-primary)]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Mail className="w-5 h-5 inline-block ml-2" />
                כתוב הודעה
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-6 py-4 font-medium ${
                  activeTab === 'history'
                    ? 'border-b-2 border-[var(--crm-primary)] text-[var(--crm-primary)]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <History className="w-5 h-5 inline-block ml-2" />
                היסטוריה
              </button>
            </div>
          </div>

          {/* Compose Tab */}
          {activeTab === 'compose' && (
            <div className="p-6 space-y-6">
              {/* Send Mode Selection */}
              <div className="flex gap-4">
                <button
                  onClick={() => setSendMode('whatsapp')}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                    sendMode === 'whatsapp'
                      ? 'bg-[var(--crm-primary)] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  style={{ borderRadius: 'var(--crm-button-radius)' }}
                >
                  <MessageSquare className="w-5 h-5 inline-block ml-2" />
                  WhatsApp
                </button>
                <button
                  onClick={() => setSendMode('email')}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                    sendMode === 'email'
                      ? 'bg-[var(--crm-primary)] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  style={{ borderRadius: 'var(--crm-button-radius)' }}
                >
                  <Mail className="w-5 h-5 inline-block ml-2" />
                  מייל
                </button>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-[var(--crm-text)] mb-2">
                  נושא *
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="נושא ההודעה..."
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-[var(--crm-text)] mb-2">
                  תוכן *
                </label>
                <ReactQuill
                  value={content}
                  onChange={setContent}
                  theme="snow"
                  style={{ minHeight: '200px', backgroundColor: 'white' }}
                  modules={{
                    toolbar: [
                      ['bold', 'italic', 'underline'],
                      [{ list: 'ordered' }, { list: 'bullet' }],
                      ['link'],
                      ['clean']
                    ]
                  }}
                />
              </div>

              {/* Recipients */}
              <div>
                <label className="block text-sm font-medium text-[var(--crm-text)] mb-2">
                  נמענים ({selectedRecipients.length})
                </label>
                
                {/* Group Filter */}
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3"
                >
                  <option value="all">כל המנויים</option>
                  {uniqueGroups.filter(g => g !== 'all').map(group => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>

                {/* Recipients List */}
                <div className="border border-gray-300 rounded-lg p-4 max-h-60 overflow-y-auto">
                  {filteredSubscribers.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">אין מנויים פעילים</p>
                  ) : (
                    <div className="space-y-2">
                      {filteredSubscribers
                        .filter(s => selectedGroup === 'all' || s.group === selectedGroup)
                        .map(sub => (
                          <label key={sub.id} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                            <input
                              type="checkbox"
                              checked={selectedRecipients.includes(sub.id)}
                              onChange={() => toggleRecipient(sub.id)}
                              className="w-4 h-4 text-[var(--crm-primary)]"
                            />
                            <div className="flex-1">
                              <p className="font-medium text-[var(--crm-text)]">{sub.name || sub.email}</p>
                              <p className="text-sm text-gray-500">
                                {sendMode === 'whatsapp' ? sub.whatsapp : sub.email}
                                {sub.group && ` • ${sub.group}`}
                              </p>
                            </div>
                          </label>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Send Button */}
              <button
                onClick={handleSend}
                disabled={sending || selectedRecipients.length === 0}
                className="w-full bg-[var(--crm-primary)] text-white py-3 rounded-full font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    שולח...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    שלח ל-{selectedRecipients.length} נמענים
                  </>
                )}
              </button>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="p-6">
              {logs.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">עדיין לא נשלחו ניוזלטרים</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {logs.map(log => (
                    <div
                      key={log.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      style={{ borderRadius: 'var(--crm-border-radius)' }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="font-bold text-[var(--crm-text)] text-lg">
                            {log.subject}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {new Date(log.sent_date).toLocaleString('he-IL')} • 
                            {log.sent_by} • 
                            {log.recipients_count} נמענים
                            {log.group && log.group !== 'all' && ` • ${log.group}`}
                          </p>
                        </div>
                        <div>
                          {log.status === 'נשלח בהצלחה' && (
                            <CheckCircle className="w-6 h-6 text-green-600" />
                          )}
                          {log.status === 'נכשל' && (
                            <AlertCircle className="w-6 h-6 text-red-600" />
                          )}
                          {log.status === 'נשלח חלקית' && (
                            <AlertCircle className="w-6 h-6 text-yellow-600" />
                          )}
                        </div>
                      </div>
                      
                      <div
                        className="text-sm text-gray-700 mt-3 prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: log.content }}
                      />
                      
                      {log.error_message && (
                        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                          {log.error_message}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}