import React, { useState, useEffect } from 'react';
import { useLanguage } from '../components/LanguageContext';
import { base44 } from '@/api/base44Client';
import { useSiteSettings } from '../components/SiteSettingsContext';
import { Mail, Upload, Users, Send, Loader2, CheckCircle, XCircle, Calendar, Plus, FileCode, Layout, Edit3, MessageCircle } from 'lucide-react';
import RichTextEditor from '../components/admin/RichTextEditor';
import NewsletterLogs from '../components/newsletter/NewsletterLogs';
import ImportSubscribers from '../components/newsletter/ImportSubscribers';
import TestEmailModal from '../components/newsletter/TestEmailModal';
import SubscribersList from '../components/newsletter/SubscribersList';

const SUBSCRIBERS_PER_GROUP = 280;

export default function NewsletterManager() {
  const { language, t } = useLanguage();
  const { siteSettings } = useSiteSettings();
  const [activeTab, setActiveTab] = useState('subscribers');
  const [subscribers, setSubscribers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('קבוצה 1');
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState(null);
  const [sendChannel, setSendChannel] = useState('email');
  const [whatsappMessage, setWhatsappMessage] = useState('');

  const [designMode, setDesignMode] = useState('free');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [htmlContent, setHtmlContent] = useState('');
  const [ctaButtons, setCtaButtons] = useState([]);
  const [uploadingCtaImage, setUploadingCtaImage] = useState(false);

  const [showResendModal, setShowResendModal] = useState(false);
  const [resendData, setResendData] = useState(null);
  const [resendSubject, setResendSubject] = useState('');
  const [resendGroup, setResendGroup] = useState('קבוצה 1');
  const [resendContent, setResendContent] = useState('');
  const [showTestEmailModal, setShowTestEmailModal] = useState(false);

  useEffect(() => {
    loadSubscribers();
    loadLogs();
    loadEmailTemplates();
  }, []);

  const loadEmailTemplates = async () => {
    try {
      const data = await base44.entities.EmailTemplate.filter({ active: true });
      setEmailTemplates(data || []);
      if (data && data.length > 0 && !selectedTemplate) {
        setSelectedTemplate(data[0].id);
      }
    } catch (error) {
      console.error('Error loading email templates:', error);
    }
  };

  const loadSubscribers = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Subscribers.list('-created_date');
      setSubscribers(data || []);
    } catch (error) {
      console.error('Error loading subscribers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      const data = await base44.entities.NewsletterLogs.list('-sent_date', 50);
      const uniqueLogs = [];
      const seen = new Set();
      for (const log of (data || [])) {
        const key = `${log.subject}___${log.sent_date}___${log.group}`;
        if (!seen.has(key)) { seen.add(key); uniqueLogs.push(log); }
      }
      setLogs(uniqueLogs);
    } catch (error) {
      console.error('Error loading logs:', error);
    }
  };

  const newsletterStats = {
    totalNewslettersSent: logs.filter(log => log.status === 'נשלח בהצלחה' || (log.status && log.status.startsWith('נשלח חלקית'))).length,
    totalEmailsSent: logs.reduce((sum, log) => {
      if (log.status === 'נשלח בהצלחה' || (log.status && log.status.startsWith('נשלח חלקית'))) {
        return sum + (log.recipients_count || 0);
      }
      return sum;
    }, 0)
  };

  const activeGroups = [...new Set(subscribers.map(s => s.group).filter(Boolean))].sort((a, b) => {
    const numA = parseInt(a.replace('קבוצה ', ''));
    const numB = parseInt(b.replace('קבוצה ', ''));
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.localeCompare(b, language);
  });

  const addCtaButton = () => setCtaButtons([...ctaButtons, { text: '', link: '', imageUrl: '', style: 'primary' }]);
  const removeCtaButton = (index) => setCtaButtons(ctaButtons.filter((_, i) => i !== index));
  const updateCtaButton = (index, field, value) => {
    const newButtons = [...ctaButtons];
    newButtons[index] = { ...newButtons[index], [field]: value };
    setCtaButtons(newButtons);
  };

  const handleCtaImageUpload = async (e, buttonIndex) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const uploadedFile = await base44.integrations.Core.UploadFile({ file });
      const newButtons = [...ctaButtons];
      newButtons[buttonIndex] = { ...newButtons[buttonIndex], imageUrl: uploadedFile.file_url };
      setCtaButtons(newButtons);
    } catch (error) {
      alert(t('שגיאה בהעלאת התמונה', 'Error uploading image'));
    }
  };

  const generateCtaButtonsHTML = () => {
    if (!ctaButtons || ctaButtons.length === 0) return '';
    const primaryColor = siteSettings?.primary_color || '#005e6c';
    return ctaButtons.map((button, index) => {
      if (!button.text || !button.link) return '';
      const buttonStyles = {
        primary: { bg: primaryColor, color: '#ffffff', border: 'none' },
        secondary: { bg: '#ffffff', color: primaryColor, border: `2px solid ${primaryColor}` },
        outline: { bg: 'transparent', color: primaryColor, border: `2px solid ${primaryColor}` }
      };
      const style = buttonStyles[button.style] || buttonStyles.primary;
      return `<div style="text-align: center; margin: ${index === 0 ? '30px' : '15px'} 0; direction: rtl;">
        ${button.imageUrl ? `<img src="${button.imageUrl}" alt="${button.text}" width="200" style="max-width:200px;margin:0 auto 15px;display:block;border-radius:8px;">` : ''}
        <a href="${button.link}" style="background:${style.bg};color:${style.color};padding:15px 40px;text-decoration:none;border-radius:50px;display:inline-block;font-weight:bold;font-size:16px;border:${style.border};">${button.text}</a>
      </div>`;
    }).join('');
  };

  const generateTemplateHTML = () => {
    if (!selectedTemplate) return '';
    const template = emailTemplates.find(t => t.id === selectedTemplate);
    if (!template) return '';
    const ctaButtonsHtml = generateCtaButtonsHTML();
    let finalHtml = template.body || '';
    if (ctaButtonsHtml) {
      finalHtml = finalHtml.includes('</body>') ? finalHtml.replace('</body>', `${ctaButtonsHtml}</body>`) : finalHtml + ctaButtonsHtml;
    }
    return finalHtml;
  };

  const buildFinalEmailContent = () => {
    const ctaButtonsHtml = generateCtaButtonsHTML();
    if (designMode === 'template') return generateTemplateHTML();
    if (designMode === 'html') {
      let html = htmlContent;
      if (ctaButtonsHtml) html = html.includes('</body>') ? html.replace('</body>', `${ctaButtonsHtml}</body>`) : html + ctaButtonsHtml;
      return html;
    }
    return `<!DOCTYPE html>
<html dir="rtl" lang="he" xmlns="http://www.w3.org/1999/xhtml">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background-color:#FDF8F0;font-family:'Rubik',Arial,sans-serif;direction:rtl;text-align:right;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FDF8F0;">
<tr><td align="center" style="padding:20px 10px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
<tr><td style="padding:30px;font-family:'Rubik',Arial,sans-serif;font-size:15px;line-height:1.7;color:#5E4B35;">
${content}
${ctaButtonsHtml}
</td></tr>
<tr><td style="text-align:center;padding:20px;font-size:12px;color:#888;background-color:#f0f0f0;font-family:'Rubik',Arial,sans-serif;">
<p style="margin:0 0 8px;">קיבלת מייל זה כי נרשמת לרשימת התפוצה שלנו</p>
<p style="margin:0;"><a href="{{unsubscribe_link}}" style="color:#888;text-decoration:underline;">הסרה מהרשימה</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
  };

  const handleSendNewsletter = async () => {
    if ((sendChannel === 'email' || sendChannel === 'both') && !subject) { alert(t('אנא מלאי נושא לאימייל', 'Please fill in email subject')); return; }
    if ((sendChannel === 'whatsapp' || sendChannel === 'both') && !whatsappMessage.trim()) { alert(t('אנא מלאי הודעת וואטסאפ', 'Please fill in WhatsApp message')); return; }
    if ((sendChannel === 'email' || sendChannel === 'both') && designMode === 'html' && !htmlContent) { alert(t('אנא הדביקי את קוד ה-HTML', 'Please paste the HTML code')); return; }
    if ((sendChannel === 'email' || sendChannel === 'both') && designMode === 'free' && !content) { alert(t('אנא מלאי תוכן לאימייל', 'Please fill in email content')); return; }

    let filter = { subscribed: true };
    if (selectedGroup !== 'כל הרשימה') filter.group = selectedGroup;
    const recipients = await base44.entities.Subscribers.filter(filter);
    if (!recipients || recipients.length === 0) { alert(t('לא נמצאו מנויים פעילים בקבוצה זו', 'No active subscribers found')); return; }
    if (!confirm(t(`לשלוח ל-${recipients.length} מנויים בקבוצה "${selectedGroup}"?`, `Send to ${recipients.length} subscribers in "${selectedGroup}"?`))) return;

    setSending(true); setSendStatus(null);
    const finalEmailContent = buildFinalEmailContent();

    try {
      let emailSuccessCount = 0, emailErrorCount = 0, whatsappSuccessCount = 0, whatsappErrorCount = 0;
      const BATCH_SIZE = SUBSCRIBERS_PER_GROUP;
      const totalBatches = Math.ceil(recipients.length / BATCH_SIZE);

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const batchRecipients = recipients.slice(batchIndex * BATCH_SIZE, Math.min((batchIndex + 1) * BATCH_SIZE, recipients.length));

        if (sendChannel === 'email' || sendChannel === 'both') {
          const emailRecipients = batchRecipients.filter(r => r.email);
          for (const recipient of emailRecipients) {
            const personalizedHtml = finalEmailContent
              .replace(/\{\{unsubscribe_link\}\}/g, `${window.location.origin}/Unsubscribe?token=${recipient.unsubscribe_token}`)
              .replace(/\{\{name\}\}/g, recipient.name || '');
            try {
              await base44.functions.invoke('sendEmailGmail', {
                to: recipient.email,
                subject,
                html_content: personalizedHtml,
                from_name: 'פנטהריי'
              });
              emailSuccessCount++;
            } catch (error) {
              console.error('Gmail send error for', recipient.email, error);
              emailErrorCount++;
            }
          }
        }

        if (sendChannel === 'whatsapp' || sendChannel === 'both') {
          const whatsappRecipients = batchRecipients.filter(r => r.whatsapp).map(recipient => ({
            subscriber_id: recipient.id, subscriber_name: recipient.name || '',
            whatsapp_number: recipient.whatsapp,
            message_content: whatsappMessage.replace(/\{\{name\}\}/g, recipient.name || ''),
            status: 'pending'
          }));
          if (whatsappRecipients.length > 0) {
            try { await base44.entities.WhatsappQueue.bulkCreate(whatsappRecipients); whatsappSuccessCount += whatsappRecipients.length; }
            catch (error) { whatsappErrorCount += whatsappRecipients.length; }
          }
        }
      }

      const totalLogRecipients = (sendChannel !== 'whatsapp' ? emailSuccessCount : 0) + (sendChannel !== 'email' ? whatsappSuccessCount : 0);
      await base44.entities.NewsletterLogs.create({
        subject: subject || t('הודעת וואטסאפ', 'WhatsApp Message'),
        content: finalEmailContent || whatsappMessage,
        group: selectedGroup, recipients_count: totalLogRecipients,
        status: (emailErrorCount + whatsappErrorCount) > 0 ? `נשלח חלקית (${emailErrorCount + whatsappErrorCount} שגיאות)` : 'נשלח בהצלחה',
        sent_date: new Date().toISOString(),
        sent_by: sendChannel === 'both' ? 'Gmail + WhatsApp' : sendChannel === 'email' ? 'Gmail' : 'WhatsApp'
      });

      setSendStatus('success');
      alert(t(`✅ השליחה הושלמה!\n📧 אימיילים: ${emailSuccessCount}\n💬 וואטסאפ: ${whatsappSuccessCount}`, `✅ Done!\n📧 Emails: ${emailSuccessCount}\n💬 WhatsApp: ${whatsappSuccessCount}`));
      setSubject(''); setContent(''); setHtmlContent(''); setWhatsappMessage(''); setCtaButtons([]);
      loadLogs();
    } catch (error) {
      setSendStatus('error');
      await base44.entities.NewsletterLogs.create({ subject: subject || 'הודעת וואטסאפ', content: finalEmailContent || whatsappMessage, group: selectedGroup, recipients_count: 0, status: 'נכשל', sent_date: new Date().toISOString(), error_message: error.message });
      alert(t('שגיאה בשליחת הניוזלטר: ' + error.message, 'Error: ' + error.message));
    } finally { setSending(false); }
  };

  const handleResendNewsletter = async (log) => {
    if (!log.content) { alert(t('לא ניתן לשלוח מחדש - תוכן המייל לא נשמר', 'Cannot resend - content not saved')); return; }
    setResendData(log); setResendSubject(log.subject); setResendGroup(log.group); setResendContent(log.content); setShowResendModal(true);
  };

  const handleConfirmResend = async () => {
    if (!resendSubject.trim()) { alert(t('אנא הזיני נושא', 'Please enter a subject')); return; }
    let filter = { subscribed: true };
    if (resendGroup !== 'כל הרשימה') filter.group = resendGroup;
    const recipients = await base44.entities.Subscribers.filter(filter);
    if (!recipients || recipients.length === 0) { alert(t('לא נמצאו מנויים', 'No active subscribers')); return; }
    if (!confirm(t(`לשלוח מחדש ל-${recipients.length} מנויים?`, `Resend to ${recipients.length} subscribers?`))) return;

    setSending(true);
    try {
      const emailRecipients = recipients.filter(r => r.email).map(recipient => ({
        email: recipient.email, name: recipient.name || '',
        html_content: resendContent
          .replace(/\{\{unsubscribe_link\}\}/g, `${window.location.origin}/Unsubscribe?token=${recipient.unsubscribe_token}`)
          .replace(/\{\{name\}\}/g, recipient.name || '')
      }));

      let resendSuccess = 0, resendFailed = 0;
      for (const recipient of emailRecipients) {
        try {
          await base44.functions.invoke('sendEmailGmail', {
            to: recipient.email,
            subject: resendSubject,
            html_content: recipient.html_content || resendContent,
            from_name: 'פנטהריי'
          });
          resendSuccess++;
        } catch (error) {
          console.error('Gmail resend error for', recipient.email, error);
          resendFailed++;
        }
      }

      await base44.entities.NewsletterLogs.create({ subject: resendSubject + ' (שליחה מחדש)', content: resendContent, group: resendGroup, recipients_count: resendSuccess, status: resendFailed === 0 ? 'נשלח בהצלחה' : `נשלח חלקית (${resendFailed} שגיאות)`, sent_date: new Date().toISOString(), sent_by: 'Gmail (שליחה מחדש)' });
      alert(`הניוזלטר נשלח מחדש בהצלחה ל-${resendSuccess} מנויים!`);
      setShowResendModal(false); setResendData(null); setResendSubject(''); setResendGroup('קבוצה 1'); setResendContent('');
      loadLogs();
    } catch (error) {
      alert(t('שגיאה בשליחה מחדש', 'Error resending'));
    } finally { setSending(false); }
  };

  const currentEmailContent = buildFinalEmailContent();

  return (
    <div className="min-h-screen bg-[var(--crm-bg)] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Mail className="w-8 h-8 text-[var(--crm-primary)]" />
            <div>
              <h1 className="text-3xl font-bold text-[var(--crm-text)]" style={{ fontFamily: 'var(--font-headings)' }}>
                {t('ניהול ניוזלטר', 'Newsletter Management')}
              </h1>
              <p className="text-sm text-[var(--crm-text)] opacity-70">
                {t('נהלי את רשימת התפוצה ושלחי ניוזלטרים', 'Manage your mailing list and send newsletters')}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6" style={{ borderRadius: 'var(--crm-border-radius)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--crm-text)] opacity-70">{t('ניוזלטרים שנשלחו', 'Newsletters Sent')}</p>
                <p className="text-3xl font-bold text-[var(--crm-text)] mt-2">{newsletterStats.totalNewslettersSent}</p>
              </div>
              <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--crm-accent)' }}>
                <Mail size={24} style={{ color: 'white' }} />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6" style={{ borderRadius: 'var(--crm-border-radius)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--crm-text)] opacity-70">{t('סה"כ מיילים', 'Total Emails Sent')}</p>
                <p className="text-3xl font-bold text-[var(--crm-text)] mt-2">{newsletterStats.totalEmailsSent.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--crm-primary)' }}>
                <Send size={24} style={{ color: 'white' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8" style={{ borderRadius: 'var(--crm-border-radius)' }}>
          <div className="border-b border-gray-100">
            <div className="flex overflow-x-auto p-1 bg-gray-50/50">
              {[
                { key: 'subscribers', icon: Users, label: t('רשימת מנויים', 'Subscribers') },
                { key: 'send', icon: Send, label: t('שליחת ניוזלטר', 'Send Newsletter') },
                { key: 'import', icon: Upload, label: t('ייבוא', 'Import') },
                { key: 'logs', icon: Calendar, label: t('היסטוריה', 'History') },
              ].map(({ key, icon: Icon, label }) => (
                <button key={key} onClick={() => setActiveTab(key)}
                  className={`px-6 py-3 font-medium whitespace-nowrap rounded-full transition-all ${activeTab === key ? 'bg-[var(--crm-action)] text-[var(--crm-text)]' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                  style={{ borderRadius: activeTab === key ? 'var(--crm-button-radius)' : undefined }}
                >
                  <Icon className="w-5 h-5 inline-block ml-2" />{label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'subscribers' && (
              <SubscribersList subscribers={subscribers} loading={loading} activeGroups={activeGroups} onReload={loadSubscribers} />
            )}

            {activeTab === 'send' && (
              <div className="space-y-6 max-w-4xl">
                {/* Test email button */}
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowTestEmailModal(true)}
                    className="border-2 border-[var(--crm-primary)] text-[var(--crm-primary)] px-4 py-2 font-semibold flex items-center gap-2 hover:bg-[var(--crm-primary)]/10 transition-colors"
                    style={{ borderRadius: 'var(--crm-button-radius)' }}
                  >
                    <Mail className="w-4 h-4" />
                    {t('שלחי מייל ניסיון', 'Send Test Email')}
                  </button>
                </div>

                <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
                  <h3 className="font-semibold text-lg text-[var(--crm-text)] mb-4">{t('בחרי ערוץ שליחה', 'Choose Send Channel')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { key: 'email', icon: Mail, label: t('אימייל בלבד', 'Email Only') },
                      { key: 'whatsapp', icon: MessageCircle, label: t('וואטסאפ בלבד', 'WhatsApp Only') },
                      { key: 'both', label: t('שניהם', 'Both'), dual: true }
                    ].map(({ key, icon: Icon, label, dual }) => (
                      <button key={key} onClick={() => setSendChannel(key)}
                        className={`p-4 rounded-xl border-2 transition-all ${sendChannel === key ? 'bg-[var(--crm-primary)]/10' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
                        style={{ borderRadius: 'var(--crm-border-radius)', borderColor: sendChannel === key ? 'var(--crm-primary)' : undefined }}
                      >
                        {dual ? (
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <Mail className="w-6 h-6" style={{ color: sendChannel === key ? 'var(--crm-primary)' : '#9CA3AF' }} />
                            <MessageCircle className="w-6 h-6" style={{ color: sendChannel === key ? 'var(--crm-accent)' : '#9CA3AF' }} />
                          </div>
                        ) : (
                          <Icon className="w-8 h-8 mx-auto mb-2" style={{ color: sendChannel === key ? 'var(--crm-primary)' : '#9CA3AF' }} />
                        )}
                        <p className="font-medium text-[var(--crm-text)]">{label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {(sendChannel === 'email' || sendChannel === 'both') && (
                  <div className="bg-gray-50/50 p-1 rounded-full">
                    <div className="flex gap-2">
                      {[
                        { key: 'template', icon: Layout, label: t('תבנית מהירה', 'Quick Template') },
                        { key: 'html', icon: FileCode, label: t('HTML מתקדם', 'Advanced HTML') },
                        { key: 'free', icon: Edit3, label: t('עורך חופשי', 'Free Editor') }
                      ].map(({ key, icon: Icon, label }) => (
                        <button key={key} onClick={() => setDesignMode(key)}
                          className={`px-4 py-3 font-medium flex items-center gap-2 rounded-full transition-all flex-1 justify-center ${designMode === key ? 'bg-[var(--crm-action)] text-[var(--crm-text)]' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                          style={{ borderRadius: designMode === key ? 'var(--crm-button-radius)' : undefined }}
                        >
                          <Icon className="w-5 h-5" />{label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('בחרי קבוצת יעד', 'Select Target Group')}</label>
                  <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                    {activeGroups.map(group => <option key={group} value={group}>{group}</option>)}
                  </select>
                </div>

                {(sendChannel === 'email' || sendChannel === 'both') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('נושא האימייל', 'Email Subject')}</label>
                    <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t('לדוגמה: עדכון חודשי', 'Example: Monthly Update')} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                  </div>
                )}

                {(sendChannel === 'whatsapp' || sendChannel === 'both') && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <h3 className="font-semibold text-lg text-gray-900 mb-4 flex items-center gap-2"><MessageCircle className="w-6 h-6 text-green-600" />{t('הודעת וואטסאפ', 'WhatsApp Message')}</h3>
                    <textarea value={whatsappMessage} onChange={(e) => setWhatsappMessage(e.target.value)} placeholder={t('היי {{name}}, זה הניוזלטר שלנו...', 'Hi {{name}}, this is our newsletter...')} rows="5" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                    <p className="text-xs text-gray-600 mt-2">💡 {t('השתמשי ב-{{name}} לשם המנוי', 'Use {{name}} for subscriber name')}</p>
                  </div>
                )}

                {(sendChannel === 'email' || sendChannel === 'both') && designMode === 'template' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('בחרי תבנית', 'Choose Template')}</label>
                      <select value={selectedTemplate || ''} onChange={(e) => setSelectedTemplate(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                        {emailTemplates.length === 0 ? <option value="">{t('אין תבניות זמינות', 'No templates available')}</option> :
                          emailTemplates.map(template => <option key={template.id} value={template.id}>{template.name}</option>)}
                      </select>
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-sm text-yellow-800">💡 {t('ניתן לערוך את התבנית בהגדרות CRM', 'You can edit the template in CRM settings.')}</p>
                    </div>
                  </div>
                )}

                {(sendChannel === 'email' || sendChannel === 'both') && designMode === 'html' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('קוד HTML', 'HTML Code')}</label>
                    <textarea value={htmlContent} onChange={(e) => setHtmlContent(e.target.value)} placeholder={t('הדביקי את קוד ה-HTML כאן...', 'Paste your HTML code here...')} rows="15" className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm" />
                  </div>
                )}

                {(sendChannel === 'email' || sendChannel === 'both') && designMode === 'free' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('תוכן הניוזלטר', 'Newsletter Content')}</label>
                    <RichTextEditor value={content} onChange={setContent} />
                  </div>
                )}

                {sendStatus === 'success' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-green-800">{t('הניוזלטר נשלח בהצלחה!', 'Newsletter sent successfully!')}</span>
                  </div>
                )}
                {sendStatus === 'error' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                    <XCircle className="w-5 h-5 text-red-600" />
                    <span className="text-red-800">{t('שגיאה בשליחת הניוזלטר', 'Error sending newsletter')}</span>
                  </div>
                )}

                <button onClick={handleSendNewsletter}
                  disabled={sending || ((sendChannel === 'email' || sendChannel === 'both') && !subject) || ((sendChannel === 'email' || sendChannel === 'both') && designMode === 'html' && !htmlContent) || ((sendChannel === 'email' || sendChannel === 'both') && designMode === 'free' && !content) || ((sendChannel === 'whatsapp' || sendChannel === 'both') && !whatsappMessage.trim())}
                  className="w-full bg-[var(--crm-primary)] text-white py-3 font-semibold hover:bg-[var(--crm-primary)]/90 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ borderRadius: 'var(--crm-button-radius)' }}
                >
                  {sending ? <><Loader2 className="w-5 h-5 animate-spin" />{t('שולח...', 'Sending...')}</> : <><Send className="w-5 h-5" />{t('שלח ניוזלטר', 'Send Newsletter')}</>}
                </button>
              </div>
            )}

            {activeTab === 'import' && <ImportSubscribers onImportDone={loadSubscribers} />}
            {activeTab === 'logs' && <NewsletterLogs logs={logs} sending={sending} onResend={handleResendNewsletter} />}
          </div>
        </div>

        {showResendModal && resendData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-bold">{t('שליחה מחדש', 'Resend')}</h3>
                  <button onClick={() => { setShowResendModal(false); setResendData(null); }} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
                </div>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('נושא', 'Subject')}</label>
                  <input type="text" value={resendSubject} onChange={(e) => setResendSubject(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('קבוצת יעד', 'Target Group')}</label>
                  <select value={resendGroup} onChange={(e) => setResendGroup(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                    {activeGroups.map(group => <option key={group} value={group}>{group}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('תצוגה מקדימה', 'Preview')}</label>
                  <iframe srcDoc={resendContent} className="w-full h-96 border border-gray-300 rounded-lg" title="Preview" />
                </div>
                <div className="flex gap-3">
                  <button onClick={handleConfirmResend} disabled={sending || !resendSubject.trim()} className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2">
                    {sending ? <><Loader2 className="w-5 h-5 animate-spin" />{t('שולח...', 'Sending...')}</> : <><Send className="w-5 h-5" />{t('שלח עכשיו', 'Send Now')}</>}
                  </button>
                  <button onClick={() => { setShowResendModal(false); setResendData(null); }} className="px-6 py-3 border border-gray-300 rounded-lg">{t('ביטול', 'Cancel')}</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showTestEmailModal && (
          <TestEmailModal
            htmlContent={
              currentEmailContent ||
              emailTemplates.find(tmpl => tmpl.id === selectedTemplate)?.body ||
              ''
            }
            subject={subject || t('מייל ניסיון', 'Test Email')}
            onClose={() => setShowTestEmailModal(false)}
          />
        )}
      </div>
    </div>
  );
}