import React, { useState, useEffect } from 'react';
import { useLanguage } from '../components/LanguageContext';
import { base44 } from '@/api/base44Client';
import { useSiteSettings } from '../components/SiteSettingsContext';
import {
  Mail, Upload, Users, Send, Loader2, CheckCircle,
  XCircle, Download, Search, Filter, Calendar, Trash2, Eye, Plus, X, FileCode, Layout, Edit3, Settings, Image, MessageCircle
} from 'lucide-react';
import RichTextEditor from '../components/admin/RichTextEditor';

const SUBSCRIBERS_PER_GROUP = 280;

export default function NewsletterManager() {
  const { language, t } = useLanguage();
  const { siteSettings } = useSiteSettings();
  const [activeTab, setActiveTab] = useState('subscribers');
  const [subscribers, setSubscribers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGroup, setFilterGroup] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterChannel, setFilterChannel] = useState('all');

  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('קבוצה 1');
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState(null);
  
  const [sendChannel, setSendChannel] = useState('email');
  const [whatsappMessage, setWhatsappMessage] = useState('');

  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState(null);

  const [showAddSubscriber, setShowAddSubscriber] = useState(false);
  const [newSubscriber, setNewSubscriber] = useState({
    email: '',
    whatsapp: '',
    name: '',
    job_title: '',
    company: '',
    notes: '',
    group: 'קבוצה 1'
  });
  const [addingSubscriber, setAddingSubscriber] = useState(false);
  const [addToContacts, setAddToContacts] = useState(false);

  const [showEditSubscriber, setShowEditSubscriber] = useState(false);
  const [editingSubscriber, setEditingSubscriber] = useState(null);
  const [updatingSubscriber, setUpdatingSubscriber] = useState(false);

  const [designMode, setDesignMode] = useState('free');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [templateData, setTemplateData] = useState({
    title: '',
    subtitle: '',
    mainText: '',
    imageUrl: ''
  });
  const [htmlContent, setHtmlContent] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  const [ctaButtons, setCtaButtons] = useState([]);
  const [uploadingCtaImage, setUploadingCtaImage] = useState(false);

  const [showResendModal, setShowResendModal] = useState(false);
  const [resendData, setResendData] = useState(null);
  const [resendSubject, setResendSubject] = useState('');
  const [resendGroup, setResendGroup] = useState('קבוצה 1');
  const [resendContent, setResendContent] = useState('');

  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

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
        if (!seen.has(key)) {
          seen.add(key);
          uniqueLogs.push(log);
        }
      }

      setLogs(uniqueLogs);
    } catch (error) {
      console.error('Error loading logs:', error);
    }
  };

  const getAvailableGroup = async () => {
    const allSubs = await base44.entities.Subscribers.list();

    const groupCounts = {};
    allSubs.forEach(sub => {
      const group = sub.group || 'קבוצה 1';
      groupCounts[group] = (groupCounts[group] || 0) + 1;
    });

    let groupNum = 1;
    while (true) {
      const groupName = `קבוצה ${groupNum}`;
      const count = groupCounts[groupName] || 0;

      if (count < SUBSCRIBERS_PER_GROUP) {
        return groupName;
      }

      groupNum++;

      if (groupNum > 1000) {
        return `קבוצה ${groupNum}`;
      }
    }
  };

  const newsletterStats = {
    totalNewslettersSent: logs.filter(log =>
      log.status === 'נשלח בהצלחה' || (log.status && log.status.startsWith('נשלח חלקית'))
    ).length,
    totalEmailsSent: logs.reduce((sum, log) => {
      if (log.status === 'נשלח בהצלחה' || (log.status && log.status.startsWith('נשלח חלקית'))) {
        return sum + (log.recipients_count || 0);
      }
      return sum;
    }, 0)
  };

  const generateToken = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const handleAddSubscriber = async () => {
    if (!newSubscriber.email && !newSubscriber.whatsapp) {
      alert(t('אנא הזיני כתובת מייל או מספר וואטסאפ', 'Please enter an email address or WhatsApp number'));
      return;
    }

    setAddingSubscriber(true);
    try {
      if (newSubscriber.email) {
        const existing = await base44.entities.Subscribers.filter({ email: newSubscriber.email });
        if (existing && existing.length > 0) {
          alert(t('המייל כבר קיים ברשימה', 'Email already exists in the list'));
          setAddingSubscriber(false);
          return;
        }
      }
      if (newSubscriber.whatsapp) {
        const existing = await base44.entities.Subscribers.filter({ whatsapp: newSubscriber.whatsapp });
        if (existing && existing.length > 0) {
          alert(t('מספר הוואטסאפ כבר קיים ברשימה', 'WhatsApp number already exists in the list'));
          setAddingSubscriber(false);
          return;
        }
      }

      const assignedGroup = await getAvailableGroup();

      await base44.entities.Subscribers.create({
        email: newSubscriber.email || '',
        whatsapp: newSubscriber.whatsapp || '',
        name: newSubscriber.name || '',
        job_title: newSubscriber.job_title || '',
        company: newSubscriber.company || '',
        notes: newSubscriber.notes || '',
        group: assignedGroup,
        subscribed: true,
        unsubscribe_token: generateToken(),
        source: 'הוספה ידנית'
      });

      if (addToContacts && newSubscriber.name) {
        await base44.entities.Contact.create({
          full_name: newSubscriber.name,
          email: newSubscriber.email || '',
          phone: newSubscriber.whatsapp || '',
          job_title: newSubscriber.job_title || '',
          organization_name: newSubscriber.company || '',
          notes: newSubscriber.notes || ''
        });
      }

      alert(t(
        addToContacts && newSubscriber.name 
          ? `המנוי נוסף בהצלחה לקבוצה: ${assignedGroup} וגם לאנשי הקשר!`
          : `המנוי נוסף בהצלחה לקבוצה: ${assignedGroup}!`, 
        addToContacts && newSubscriber.name
          ? `Subscriber added successfully to group: ${assignedGroup} and also to Contacts!`
          : `Subscriber added successfully to group: ${assignedGroup}!`
      ));
      setShowAddSubscriber(false);
      setNewSubscriber({ email: '', whatsapp: '', name: '', job_title: '', company: '', notes: '', group: 'קבוצה 1' });
      setAddToContacts(false);
      loadSubscribers();
    } catch (error) {
      console.error('Error adding subscriber:', error);
      alert(t('שגיאה בהוספת המנוי', 'Error adding subscriber'));
    } finally {
      setAddingSubscriber(false);
    }
  };

  const handleImportCSV = async () => {
    if (!importFile || (!importFile.file && !importFile.text)) {
      alert(t('אנא הדביקי נתונים או בחרי קובץ להעלאה', 'Please paste data or select a file to upload'));
      return;
    }

    setImporting(true);
    try {
      let items = [];

      if (importFile.type === 'text' && importFile.text) {
        const lines = importFile.text.trim().split('\n');

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;

          const parts = trimmedLine.split(',').map(p => p.trim());
          const email = parts[0];
          const whatsapp = parts[1] || '';
          const name = parts[2] || '';
          const job_title = parts[3] || '';
          const company = parts[4] || '';
          const notes = parts[5] || '';

          if (email || whatsapp) {
            items.push({ email, whatsapp, name, job_title, company, notes });
          }
        }
      }
      else if (importFile.type === 'file' && importFile.file) {
        const uploadedFile = await base44.integrations.Core.UploadFile({ file: importFile.file });

        const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url: uploadedFile.file_url,
          json_schema: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    email: { type: "string" },
                    whatsapp: { type: "string" },
                    name: { type: "string" },
                    job_title: { type: "string" },
                    company: { type: "string" },
                    notes: { type: "string" }
                  }
                }
              }
            }
          }
        });

        if (extractResult.status === 'success' && extractResult.output && extractResult.output.items) {
          items = extractResult.output.items;
        } else {
          alert(t('שגיאה בקריאת הקובץ. נסי את שיטת ההעתקה וההדבקה.', 'Error reading file. Try the copy-paste method.'));
          setImporting(false);
          return;
        }
      }

      if (items.length === 0) {
        alert(t('לא נמצאו כתובות מייל או מספרי וואטסאפ תקינים', 'No valid email addresses or WhatsApp numbers found'));
        setImporting(false);
        return;
      }

      let successCount = 0;
      let errorCount = 0;
      let duplicateCount = 0;

      for (const item of items) {
        if (item.email || item.whatsapp) {
          try {
            let existing = [];
            if (item.email) {
              existing = await base44.entities.Subscribers.filter({ email: item.email });
            }
            if (existing.length === 0 && item.whatsapp) {
              existing = await base44.entities.Subscribers.filter({ whatsapp: item.whatsapp });
            }

            if (existing && existing.length > 0) {
              duplicateCount++;
              continue;
            }

            const assignedGroup = await getAvailableGroup();

            await base44.entities.Subscribers.create({
              email: item.email || '',
              whatsapp: item.whatsapp || '',
              name: item.name || '',
              job_title: item.job_title || '',
              company: item.company || '',
              notes: item.notes || '',
              group: assignedGroup,
              subscribed: true,
              unsubscribe_token: generateToken(),
              source: importFile.type === 'text' ? 'הדבקה ידנית' : 'ייבוא CSV'
            });
            successCount++;
          } catch (err) {
            console.error('Error creating subscriber:', err);
            errorCount++;
          }
        }
      }

      alert(t(
        `✅ הייבוא הושלם!\n\n` +
        `נוספו: ${successCount} מנויים חדשים\n` +
        `כבר קיימים: ${duplicateCount}\n` +
        `שגיאות: ${errorCount}\n\n` +
        `המנויים חולקו אוטומטית לקבוצות של ${SUBSCRIBERS_PER_GROUP} מנויים`,

        `✅ Import completed!\n\n` +
        `Added: ${successCount} new subscribers\n` +
        `Already exist: ${duplicateCount}\n` +
        `Errors: ${errorCount}\n\n` +
        `Subscribers were automatically distributed to groups of ${SUBSCRIBERS_PER_GROUP} members`
      ));

      loadSubscribers();
      setImportFile(null);
    } catch (error) {
      console.error('Import error:', error);

      const errorMessage = error?.message || error?.toString() || '';
      if (errorMessage.includes('encoding') || errorMessage.includes('unicode') || errorMessage.includes('UTF')) {
        alert(t(
          '❌ שגיאת קידוד בקובץ!\n\n' +
          '💡 פתרון: השתמשי בשיטת ההעתקה וההדבקה במקום.\n' +
          'פשוט העתיקי את הנתונים מהאקסל והדביקי בשדה הטקסט.',

          '❌ File encoding error!\n\n' +
          '💡 Solution: Use the copy-paste method instead.\n' +
          'Just copy the data from Excel and paste it in the text field.'
        ));
      } else {
        alert(t(
          'שגיאה בייבוא. נסי את שיטת ההעתקה וההדבקה.',
          'Import error. Try the copy-paste method.'
        ));
      }
    } finally {
      setImporting(false);
    }
  };

  const handleEditSubscriber = (subscriber) => {
    setEditingSubscriber({
      id: subscriber.id,
      email: subscriber.email,
      whatsapp: subscriber.whatsapp || '',
      name: subscriber.name || '',
      job_title: subscriber.job_title || '',
      company: subscriber.company || '',
      notes: subscriber.notes || '',
      group: subscriber.group,
      subscribed: subscriber.subscribed
    });
    setShowEditSubscriber(true);
  };

  const handleUpdateSubscriber = async () => {
    if (!editingSubscriber.email && !editingSubscriber.whatsapp) {
      alert(t('אנא הזיני כתובת מייל או מספר וואטסאפ', 'Please enter an email address or WhatsApp number'));
      return;
    }

    setUpdatingSubscriber(true);
    try {
      await base44.entities.Subscribers.update(editingSubscriber.id, {
        email: editingSubscriber.email || '',
        whatsapp: editingSubscriber.whatsapp || '',
        name: editingSubscriber.name || '',
        job_title: editingSubscriber.job_title || '',
        company: editingSubscriber.company || '',
        notes: editingSubscriber.notes || '',
        group: editingSubscriber.group,
        subscribed: editingSubscriber.subscribed
      });

      alert(t('המנוי עודכן בהצלחה!', 'Subscriber updated successfully!'));
      setShowEditSubscriber(false);
      setEditingSubscriber(null);
      loadSubscribers();
    } catch (error) {
      console.error('Error updating subscriber:', error);
      alert(t('שגיאה בעדכון המנוי', 'Error updating subscriber'));
    } finally {
      setUpdatingSubscriber(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert(t('אנא בחרי קובץ תמונה', 'Please select an image file'));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert(t('התמונה גדולה מדי. מקסימום 5MB', 'Image is too large. Maximum 5MB'));
      return;
    }

    setUploadingImage(true);
    try {
      const uploadedFile = await base44.integrations.Core.UploadFile({ file });
      setTemplateData({...templateData, imageUrl: uploadedFile.file_url});
      alert(t('התמונה הועלתה בהצלחה!', 'Image uploaded successfully!'));
    } catch (error) {
      console.error('Error uploading image:', error);
      alert(t('שגיאה בהעלאת התמונה', 'Error uploading image'));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCtaImageUpload = async (e, buttonIndex) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert(t('אנא בחרי קובץ תמונה', 'Please select an image file'));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert(t('התמונה גדולה מדי. מקסימום 5MB', 'Image is too large. Maximum 5MB'));
      return;
    }

    setUploadingCtaImage(true);
    try {
      const uploadedFile = await base44.integrations.Core.UploadFile({ file });
      const newButtons = [...ctaButtons];
      newButtons[buttonIndex] = { ...newButtons[buttonIndex], imageUrl: uploadedFile.file_url };
      setCtaButtons(newButtons);
      alert(t('התמונה הועלתה בהצלחה!', 'Image uploaded successfully!'));
    } catch (error) {
      console.error('Error uploading image:', error);
      alert(t('שגיאה בהעלאת התמונה', 'Error uploading image'));
    } finally {
      setUploadingCtaImage(false);
    }
  };

  const addCtaButton = () => {
    setCtaButtons([...ctaButtons, { text: '', link: '', imageUrl: '', style: 'primary' }]);
  };

  const removeCtaButton = (index) => {
    setCtaButtons(ctaButtons.filter((_, i) => i !== index));
  };

  const updateCtaButton = (index, field, value) => {
    const newButtons = [...ctaButtons];
    newButtons[index] = { ...newButtons[index], [field]: value };
    setCtaButtons(newButtons);
  };

  const generateTemplateHTML = () => {
    if (!selectedTemplate) return '';
    
    const template = emailTemplates.find(t => t.id === selectedTemplate);
    if (!template) return '';
    
    const ctaButtonsHtml = generateCtaButtonsHTML();
    let finalHtml = template.body || '';
    
    // הוספת כפתורי CTA לפני הפוטר
    if (ctaButtonsHtml) {
      if (finalHtml.includes('</body>')) {
        finalHtml = finalHtml.replace('</body>', `${ctaButtonsHtml}</body>`);
      } else {
        finalHtml += ctaButtonsHtml;
      }
    }
    
    return finalHtml;
  };

  const generateCtaButtonsHTML = () => {
    if (!ctaButtons || ctaButtons.length === 0) return '';

    return ctaButtons.map((button, index) => {
      if (!button.text || !button.link) return '';

      const primaryColor = siteSettings?.primary_color || '#005e6c';

      const buttonStyles = {
        primary: {
          bg: primaryColor,
          color: '#ffffff',
          border: 'none'
        },
        secondary: {
          bg: '#ffffff',
          color: primaryColor,
          border: `2px solid ${primaryColor}`
        },
        outline: {
          bg: 'transparent',
          color: primaryColor,
          border: `2px solid ${primaryColor}`
        }
      };

      const style = buttonStyles[button.style] || buttonStyles.primary;

      return `
        <div style="text-align: center; margin: ${index === 0 ? '30px' : '15px'} 0; padding: ${index === 0 ? '20px' : '10px'} 0; direction: rtl;">
          ${button.imageUrl ? `<img src="${button.imageUrl}" alt="${button.text}" width="200" border="0" style="max-width: 200px; width: 200px; margin-bottom: 15px; border-radius: 8px; display: block !important; margin-left: auto; margin-right: auto; height: auto; border: none; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic;">` : ''}
          <a href="${button.link}" style="background: ${style.bg}; color: ${style.color}; padding: 15px 40px; text-decoration: none; border-radius: 50px; display: inline-block; font-weight: bold; font-size: 16px; border: ${style.border}; mso-padding-alt: 0px; direction: rtl;">
              <!--[if mso]>
              <i style="letter-spacing: 40px; mso-font-width:-100%; mso-text-raise:30px;" hidden>&nbsp;</i>
              <![endif]-->
              <span style="mso-text-raise:15px;">${button.text}</span>
              <!--[if mso]>
              <i style="letter-spacing: 40px; mso-font-width:-100%;" hidden>&nbsp;</i>
              <![endif]-->
          </a>
        </div>
      `;
    }).join('');
  };

  const handleSendNewsletter = async () => {
    if ((sendChannel === 'email' || sendChannel === 'both') && !subject) {
      alert(t('אנא מלאי נושא לאימייל', 'Please fill in email subject'));
      return;
    }
    if ((sendChannel === 'whatsapp' || sendChannel === 'both') && !whatsappMessage.trim()) {
      alert(t('אנא מלאי הודעת וואטסאפ', 'Please fill in WhatsApp message'));
      return;
    }
    if ((sendChannel === 'email' || sendChannel === 'both') && designMode === 'html' && !htmlContent) {
      alert(t('אנא הדביקי את קוד ה-HTML', 'Please paste the HTML code'));
      return;
    }
    if ((sendChannel === 'email' || sendChannel === 'both') && designMode === 'free' && !content) {
      alert(t('אנא מלאי תוכן לאימייל', 'Please fill in email content'));
      return;
    }
    if (sendChannel === 'email' && !subject) {
      alert(t('אנא מלאי נושא לניוזלטר', 'Please fill in subject'));
      return;
    }

    let filter = { subscribed: true };
    if (selectedGroup !== 'כל הרשימה') {
      filter.group = selectedGroup;
    }

    const recipients = await base44.entities.Subscribers.filter(filter);
    const recipientCount = recipients ? recipients.length : 0;

    if (recipientCount === 0) {
      alert(t('לא נמצאו מנויים פעילים בקבוצה זו', 'No active subscribers found in this group'));
      return;
    }

    if (!confirm(t(
      `האם את בטוחה שאת רוצה לשלוח ${sendChannel === 'email' ? 'אימייל' : sendChannel === 'whatsapp' ? 'הודעת וואטסאפ' : 'אימייל והודעת וואטסאפ'}?\n\nקבוצה: ${selectedGroup}\nמספר מנויים: ${recipientCount}`,
      `Are you sure you want to send ${sendChannel === 'email' ? 'an email' : sendChannel === 'whatsapp' ? 'a WhatsApp message' : 'an email and WhatsApp message'}?\n\nGroup: ${selectedGroup}\nSubscribers: ${recipientCount}`
    ))) {
      return;
    }

    setSending(true);
    setSendStatus(null);

    let finalEmailContent = '';
    const ctaButtonsHtml = generateCtaButtonsHTML();

    if (sendChannel === 'email' || sendChannel === 'both') {
      if (designMode === 'template') {
        finalEmailContent = generateTemplateHTML();
      } else if (designMode === 'html') {
        finalEmailContent = htmlContent;
        if (ctaButtonsHtml) {
          if (finalEmailContent.includes('</body>')) {
            finalEmailContent = finalEmailContent.replace('</body>', `${ctaButtonsHtml}</body>`);
          } else {
            finalEmailContent += ctaButtonsHtml;
          }
        }
      } else {
        finalEmailContent = `
          <!DOCTYPE html>
          <html dir="rtl" lang="he">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f1ee; margin: 0; padding: 20px; direction: rtl; }
              .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: right; direction: rtl; }
              .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #666; font-size: 14px; direction: rtl; }
              h1, h2, h3, h4, h5, h6 { text-align: right; direction: rtl; }
              p { text-align: right; line-height: 1.8; direction: rtl; }
              ul, ol { text-align: right; direction: rtl; padding-right: 20px; padding-left: 0; }
              li { text-align: right; direction: rtl; }
            </style>
          </head>
          <body>
            <div class="container">
              ${content}
              ${ctaButtonsHtml}
              <div class="footer">
                <p>${t('קיבלת מייל זה כי נרשמת לרשימת התפוצה שלנו', 'You received this email because you subscribed to our newsletter')}</p>
                <p><a href="{{unsubscribe_link}}" style="color: #005e6c;">${t('הסרה מהרשימה', 'Unsubscribe')}</a></p>
              </div>
            </div>
          </body>
          </html>
        `;
      }
    }

    try {
      const BATCH_SIZE = SUBSCRIBERS_PER_GROUP;
      const BATCH_DELAY_MS = 24 * 60 * 60 * 1000;
      const totalRecipients = recipients.length;
      const totalBatches = Math.ceil(totalRecipients / BATCH_SIZE);

      let emailSuccessCount = 0;
      let emailErrorCount = 0;
      let whatsappSuccessCount = 0;
      let whatsappErrorCount = 0;
      const allErrorDetails = [];

      const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const batchStart = batchIndex * BATCH_SIZE;
        const batchEnd = Math.min(batchStart + BATCH_SIZE, totalRecipients);
        const batchRecipients = recipients.slice(batchStart, batchEnd);

        if (totalBatches > 1) {
          alert(t(
            `שולח מנה ${batchIndex + 1} מתוך ${totalBatches}...\n${batchRecipients.length} מנויים במנה זו\n\n⏰ בין מנות תהיה השהיה של 24 שעות`,
            `Sending batch ${batchIndex + 1} of ${totalBatches}...\n${batchRecipients.length} subscribers in this batch\n\n⏰ There will be a 24-hour delay between batches`
          ));
        }

        if (sendChannel === 'email' || sendChannel === 'both') {
          const emailRecipientsForBatch = batchRecipients.filter(r => r.email).map(recipient => {
            const unsubscribeLink = `${window.location.origin}/Unsubscribe?token=${recipient.unsubscribe_token}`;
            const personalizedEmailContent = finalEmailContent
              .replace(/\{\{unsubscribe_link\}\}/g, unsubscribeLink)
              .replace(/\{\{name\}\}/g, recipient.name || '');
            return {
              email: recipient.email,
              name: recipient.name || '',
              html_content: personalizedEmailContent
            };
          });

          if (emailRecipientsForBatch.length > 0) {
            try {
              const result = await base44.functions.invoke('sendNewsletterBrevo', {
                recipients: emailRecipientsForBatch,
                subject: subject,
                html_content: finalEmailContent,
                from_name: 'פורצות קדימה - MOVEUP',
                from_email: 'hello@moveup.today'
              });
              emailSuccessCount += result.data.success_count;
              emailErrorCount += result.data.failed_count;
              if (result.data.failed_details && result.data.failed_details.length > 0) {
                result.data.failed_details.forEach(fail => {
                  allErrorDetails.push(`Email - ${fail.email}: ${fail.error}`);
                });
              }
            } catch (error) {
              console.error('Error sending emails in batch:', error);
              emailErrorCount += emailRecipientsForBatch.length;
              allErrorDetails.push(`Email batch ${batchIndex + 1} failed: ${error.message}`);
            }
          }
        }

        if (sendChannel === 'whatsapp' || sendChannel === 'both') {
          const whatsappRecipientsForBatch = batchRecipients
            .filter(r => r.whatsapp)
            .map(recipient => ({
              subscriber_id: recipient.id,
              subscriber_name: recipient.name || '',
              whatsapp_number: recipient.whatsapp,
              message_content: whatsappMessage.replace(/\{\{name\}\}/g, recipient.name || ''),
              status: 'pending'
            }));

          if (whatsappRecipientsForBatch.length > 0) {
            try {
              await base44.entities.WhatsappQueue.bulkCreate(whatsappRecipientsForBatch);
              whatsappSuccessCount += whatsappRecipientsForBatch.length;
              console.log(`Added ${whatsappRecipientsForBatch.length} WhatsApp messages to queue`);
            } catch (error) {
              console.error('Error adding WhatsApp messages to queue:', error);
              whatsappErrorCount += whatsappRecipientsForBatch.length;
              allErrorDetails.push(`WhatsApp queue batch ${batchIndex + 1} failed: ${error.message}`);
            }
          }
        }

        if (batchIndex < totalBatches - 1) {
          const hoursToWait = BATCH_DELAY_MS / (60 * 60 * 1000);
          alert(t(
            `✅ מנה ${batchIndex + 1} הושלמה!\n\n⏰ ממתין ${hoursToWait} שעות לפני המנה הבאה...`,
            `✅ Batch ${batchIndex + 1} completed!\n\n⏰ Waiting ${hoursToWait} hours before next batch...`
          ));
          await delay(BATCH_DELAY_MS);
        }
      }

      let logStatus = 'נשלח בהצלחה';
      let totalLogRecipients = 0;
      if (emailErrorCount > 0 || whatsappErrorCount > 0) {
        logStatus = `נשלח חלקית (${emailErrorCount + whatsappErrorCount} שגיאות)`;
      }

      if (sendChannel === 'email' || sendChannel === 'both') {
        totalLogRecipients += emailSuccessCount;
      }
      if (sendChannel === 'whatsapp' || sendChannel === 'both') {
        totalLogRecipients += whatsappSuccessCount;
      }

      await base44.entities.NewsletterLogs.create({
        subject: subject || t('הודעת וואטסאפ', 'WhatsApp Message'),
        content: finalEmailContent || whatsappMessage,
        group: selectedGroup,
        recipients_count: totalLogRecipients,
        status: logStatus,
        sent_date: new Date().toISOString(),
        sent_by: sendChannel === 'both' ? 'Brevo + WhatsApp' : sendChannel === 'email' ? 'Brevo' : 'WhatsApp',
        error_message: (emailErrorCount + whatsappErrorCount) > 0 ? `${allErrorDetails.length} הודעות נכשלו:\n${allErrorDetails.slice(0, 5).join('\n')}${allErrorDetails.length > 5 ? '\n...' : ''}` : null
      });

      setSendStatus('success');

      let successMessage = t('✅ השליחה הושלמה בהצלחה!\n\n', '✅ Sending completed successfully!\n\n');
      if (sendChannel === 'email' || sendChannel === 'both') {
        successMessage += t(`📧 אימיילים: ${emailSuccessCount} נשלחו`, `📧 Emails: ${emailSuccessCount} sent`);
        if (emailErrorCount > 0) successMessage += t(`, ${emailErrorCount} נכשלו`, `, ${emailErrorCount} failed`);
        successMessage += '\n';
      }
      if (sendChannel === 'whatsapp' || sendChannel === 'both') {
        successMessage += t(`💬 וואטסאפ: ${whatsappSuccessCount} הודעות נוספו לתור`, `💬 WhatsApp: ${whatsappSuccessCount} messages added to queue`);
        if (whatsappErrorCount > 0) successMessage += t(`, ${whatsappErrorCount} נכשלו`, `, ${whatsappErrorCount} failed`);
        successMessage += '\n';
        successMessage += t('\n⏰ ההודעות יישלחו אחת כל 5 דקות על ידי המשימה המתוזמנת', '\n⏰ Messages will be sent one every 5 minutes by the scheduled task');
      }
      alert(successMessage);

      setSubject('');
      setContent('');
      setHtmlContent('');
      setWhatsappMessage('');
      setTemplateData({
        title: '',
        subtitle: '',
        mainText: '',
        imageUrl: ''
      });
      setCtaButtons([]);
      loadLogs();
    } catch (error) {
      console.error('Send error:', error);
      setSendStatus('error');

      await base44.entities.NewsletterLogs.create({
        subject: subject || t('הודעת וואטסאפ', 'WhatsApp Message'),
        content: finalEmailContent || whatsappMessage,
        group: selectedGroup,
        recipients_count: 0,
        status: 'נכשל',
        sent_date: new Date().toISOString(),
        error_message: error.message || 'Unknown error',
        sent_by: sendChannel === 'both' ? 'Brevo + WhatsApp' : sendChannel === 'email' ? 'Brevo' : 'WhatsApp'
      });

      alert(t('שגיאה בשליחת הניוזלטר: ' + error.message, 'Error sending newsletter: ' + error.message));
    } finally {
      setSending(false);
    }
  };

  const handleResendNewsletter = async (log) => {
    if (!log.content) {
      alert(t('לא ניתן לשלוח מחדש - תוכן המייל לא נשמר', 'Cannot resend - email content not saved'));
      return;
    }

    setResendData(log);
    setResendSubject(log.subject);
    setResendGroup(log.group);
    setResendContent(log.content);
    setShowResendModal(true);
  };

  const handleConfirmResend = async () => {
    if (!resendSubject.trim()) {
      alert(t('אנא הזיני נושא לניוזלטר', 'Please enter a subject'));
      return;
    }

    let filter = { subscribed: true };
    if (resendGroup !== 'כל הרשימה') {
      filter.group = resendGroup;
    }

    const recipients = await base44.entities.Subscribers.filter(filter);
    const recipientCount = recipients ? recipients.length : 0;

    if (recipientCount === 0) {
      alert(t('לא נמצאו מנויים פעילים בקבוצה זו', 'No active subscribers found in this group'));
      return;
    }

    if (!confirm(t(
      `האם את בטוחה שאת רוצה לשלוח מחדש את "${resendSubject}"?\n\nקבוצה: ${resendGroup}\nמספר מנויים: ${recipientCount}`,
      `Are you sure you want to resend "${resendSubject}"?\n\nGroup: ${resendGroup}\nSubscribers: ${recipientCount}`
    ))) {
      return;
    }

    setSending(true);

    try {
      const BATCH_SIZE = SUBSCRIBERS_PER_GROUP;
      const BATCH_DELAY_MS = 24 * 60 * 60 * 1000;
      const totalRecipients = recipients.length;
      const totalBatches = Math.ceil(totalRecipients / BATCH_SIZE);

      let totalSuccessCount = 0;
      let totalErrorCount = 0;
      const allErrorDetails = [];

      const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const batchStart = batchIndex * BATCH_SIZE;
        const batchEnd = Math.min(batchStart + BATCH_SIZE, totalRecipients);
        const batchRecipients = recipients.slice(batchStart, batchEnd);

        if (totalBatches > 1) {
          alert(t(
            `שולח מנה ${batchIndex + 1} מתוך ${totalBatches} (שליחה מחדש)...\n${batchRecipients.length} מיילים במנה זו\n\n⏰ בין מנות יהיה השהיה של 24 שעות`,
            `Resending batch ${batchIndex + 1} of ${totalBatches}...\n${batchRecipients.length} emails in this batch\n\n⏰ There will be a 24-hour delay between batches`
          ));
        }

        const batchEmailRecipientsWithUnsubscribe = batchRecipients.filter(r => r.email).map(recipient => {
          const unsubscribeLink = `${window.location.origin}/Unsubscribe?token=${recipient.unsubscribe_token}`;
          const personalizedContent = resendContent
            .replace(/\{\{unsubscribe_link\}\}/g, unsubscribeLink)
            .replace(/\{\{name\}\}/g, recipient.name || '');

          return {
            email: recipient.email,
            name: recipient.name || '',
            html_content: personalizedContent
          };
        });

        try {
          const result = await base44.functions.invoke('sendNewsletterBrevo', {
            recipients: batchEmailRecipientsWithUnsubscribe,
            subject: resendSubject,
            html_content: resendContent,
            from_name: 'פורצות קדימה - MOVEUP',
            from_email: 'hello@moveup.today'
          });

          totalSuccessCount += result.data.success_count;
          totalErrorCount += result.data.failed_count;

          if (result.data.failed_details && result.data.failed_details.length > 0) {
            result.data.failed_details.forEach(fail => {
              allErrorDetails.push(`${fail.email}: ${fail.error}`);
            });
          }
        } catch (error) {
          console.error('Error in resend batch:', error);
          totalErrorCount += batchEmailRecipientsWithUnsubscribe.length;
          allErrorDetails.push(`Resend Batch ${batchIndex + 1} failed: ${error.message}`);
        }

        if (batchIndex < totalBatches - 1) {
          const hoursToWait = BATCH_DELAY_MS / (60 * 60 * 1000);
          alert(t(
            `✅ מנה ${batchIndex + 1} הושלמה (שליחה מחדש)!\n\n⏰ ממתין ${hoursToWait} שעות לפני המנה הבאה...`,
            `✅ Resend Batch ${batchIndex + 1} completed!\n\n⏰ Waiting ${hoursToWait} hours before next batch...`
          ));
          await delay(BATCH_DELAY_MS);
        }
      }

      await base44.entities.NewsletterLogs.create({
        subject: resendSubject + ' (שליחה מחדש)',
        content: resendContent,
        group: resendGroup,
        recipients_count: totalSuccessCount,
        status: totalErrorCount === 0 ? 'נשלח בהצלחה' : `נשלח חלקית (${totalErrorCount} שגיאות)`,
        sent_date: new Date().toISOString(),
        sent_by: totalBatches > 1 ? `Brevo (שליחה מחדש, ${totalBatches} מנות)` : 'Brevo (שליחה מחדש)',
        error_message: totalErrorCount > 0 ? `${allErrorDetails.length} מיילים נכשלו:\n${allErrorDetails.slice(0, 5).join('\n')}${allErrorDetails.length > 5 ? '\n...' : ''}` : null
      });

      if (totalErrorCount === 0) {
        alert(t(
          `הניוזלטר נשלח מחדש בהצלחה ל-${totalSuccessCount} מנויים!`,
          `Newsletter resent successfully to ${totalSuccessCount} subscribers!`
        ));
      } else {
        alert(t(
          `הניוזלטר נשלח מחדש ל-${totalRecipients} מנויים.\n${totalErrorCount} נכשלו.`,
          `Newsletter resent to ${totalRecipients} subscribers.\n${totalErrorCount} failed.`
        ));
      }

      setShowResendModal(false);
      setResendData(null);
      setResendSubject('');
      setResendGroup('קבוצה 1');
      setResendContent('');
      loadLogs();
    } catch (error) {
      console.error('Resend error:', error);
      alert(t('שגיאה בשליחה מחדש', 'Error resending newsletter'));
    } finally {
      setSending(false);
    }
  };

  const deleteSubscriber = async (id) => {
    if (!confirm(t('האם את בטוחה שאת רוצה למחוק מנוי זה?', 'Are you sure you want to delete this subscriber?'))) {
      return;
    }

    try {
      await base44.entities.Subscribers.delete(id);
      loadSubscribers();
      alert(t('המנוי נמחק בהצלחה', 'Subscriber deleted successfully'));
    } catch (error) {
      console.error('Error deleting subscriber:', error);
      alert(t('שגיאה במחיקת המנוי', 'Error deleting subscriber'));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(t(`האם למחוק ${selectedIds.length} מנויים?`, `Delete ${selectedIds.length} subscribers?`))) return;
    
    try {
      for (const id of selectedIds) {
        await base44.entities.Subscribers.delete(id);
      }
      setSelectedIds([]);
      loadSubscribers();
    } catch (error) {
      console.error('Error bulk deleting:', error);
      alert(t('שגיאה במחיקה', 'Error deleting'));
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredSubscribers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredSubscribers.map(s => s.id));
    }
  };

  const handleUpdateSubscriberGroup = async (subscriberId, newGroup) => {
    try {
      await base44.entities.Subscribers.update(subscriberId, { group: newGroup });
      loadSubscribers();
    } catch (error) {
      console.error('Error updating subscriber group:', error);
      alert(t('שגיאה בעדכון קבוצת המנוי', 'Error updating subscriber group'));
    }
  };

  const handleAddGroup = async () => {
    if (!newGroupName.trim()) {
      alert(t('אנא הזיני שם קבוצה', 'Please enter a group name'));
      return;
    }
    
    if (activeGroups.includes(newGroupName.trim())) {
      alert(t('קבוצה בשם זה כבר קיימת', 'A group with this name already exists'));
      return;
    }
    
    try {
      await base44.entities.Subscribers.create({
        email: `_placeholder_${Date.now()}@group.internal`,
        name: `[מחזיק מקום - ${newGroupName.trim()}]`,
        group: newGroupName.trim(),
        subscribed: false,
        unsubscribe_token: generateToken(),
        source: 'קבוצה חדשה',
        notes: 'רשומה זו נוצרה אוטומטית ליצירת קבוצה. ניתן למחוק אותה לאחר הוספת מנויים לקבוצה.'
      });
      
      alert(t(
        `הקבוצה "${newGroupName.trim()}" נוספה בהצלחה!`,
        `Group "${newGroupName.trim()}" added successfully!`
      ));
      
      setShowAddGroup(false);
      setNewGroupName('');
      loadSubscribers();
    } catch (error) {
      console.error('Error creating group:', error);
      alert(t('שגיאה ביצירת הקבוצה', 'Error creating group'));
    }
  };

  const filteredSubscribers = subscribers.filter(sub => {
    const matchesSearch = !searchTerm ||
      sub.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.whatsapp?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.job_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.company?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesGroup = filterGroup === 'all' || sub.group === filterGroup;
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'active' && sub.subscribed) ||
      (filterStatus === 'inactive' && !sub.subscribed);

    const matchesChannel = filterChannel === 'all' ||
      (filterChannel === 'email' && sub.email && !sub.whatsapp) ||
      (filterChannel === 'whatsapp' && sub.whatsapp && !sub.email) ||
      (filterChannel === 'has_whatsapp' && sub.whatsapp) ||
      (filterChannel === 'has_email' && sub.email) ||
      (filterChannel === 'both' && sub.email && sub.whatsapp);

    return matchesSearch && matchesGroup && matchesStatus && matchesChannel;
  });

  const stats = {
    total: subscribers.length,
    active: subscribers.filter(s => s.subscribed).length,
    inactive: subscribers.filter(s => !s.subscribed).length,
  };

  const getGroupSubscriberCount = (groupName) => {
    return subscribers.filter(s => s.group === groupName).length;
  };

  const activeGroups = [...new Set(subscribers.map(s => s.group).filter(Boolean))].sort((a, b) => {
    const numA = parseInt(a.replace('קבוצה ', ''));
    const numB = parseInt(b.replace('קבוצה ', ''));

    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    return a.localeCompare(b, language);
  });

  return (
    <div className="min-h-screen bg-[var(--crm-bg)] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Mail className="w-8 h-8 text-[var(--crm-primary)]" />
            <div>
              <h1 className="text-3xl font-bold text-[var(--crm-text)]" style={{ fontFamily: 'var(--font-headings)' }}>
                {t('ניהול ניוזלטר', 'Newsletter Management')}
              </h1>
              <p className="text-sm text-[var(--crm-text)] opacity-70">
                {t('נהלי את רשימת התפוצה ושלחי ניוזלטרים באימייל ובוואטסאפ', 'Manage your mailing list and send newsletters via email and WhatsApp')}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
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
                <p className="text-sm font-medium text-[var(--crm-text)] opacity-70">{t('סה"כ מיילים ששלחתי', 'Total Emails Sent')}</p>
                <p className="text-3xl font-bold text-[var(--crm-text)] mt-2">{newsletterStats.totalEmailsSent.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--crm-primary)' }}>
                <Send size={24} style={{ color: 'white' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Info Note */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6" style={{ borderRadius: 'var(--crm-border-radius)' }}>
          <p className="text-sm text-[var(--crm-text)] opacity-70">
            💡 {t(`המנויים מחולקים אוטומטית לקבוצות של ${SUBSCRIBERS_PER_GROUP} מנויים`, `Subscribers are automatically divided into groups of ${SUBSCRIBERS_PER_GROUP} members`)}
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8" style={{ borderRadius: 'var(--crm-border-radius)' }}>
          <div className="border-b border-gray-100">
            <div className="flex overflow-x-auto p-1 bg-gray-50/50">
              <button
                onClick={() => setActiveTab('subscribers')}
                className={`px-6 py-3 font-medium whitespace-nowrap rounded-full transition-all ${
                  activeTab === 'subscribers'
                    ? 'bg-[var(--crm-action)] text-[var(--crm-text)]'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
                style={{ borderRadius: activeTab === 'subscribers' ? 'var(--crm-button-radius)' : undefined }}
              >
                <Users className="w-5 h-5 inline-block ml-2" />
                {t('רשימת מנויים', 'Subscribers')}
              </button>
              <button
                onClick={() => setActiveTab('send')}
                className={`px-6 py-3 font-medium whitespace-nowrap rounded-full transition-all ${
                  activeTab === 'send'
                    ? 'bg-[var(--crm-action)] text-[var(--crm-text)]'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
                style={{ borderRadius: activeTab === 'send' ? 'var(--crm-button-radius)' : undefined }}
              >
                <Send className="w-5 h-5 inline-block ml-2" />
                {t('שליחת ניוזלטר', 'Send Newsletter')}
              </button>
              <button
                onClick={() => setActiveTab('import')}
                className={`px-6 py-3 font-medium whitespace-nowrap rounded-full transition-all ${
                  activeTab === 'import'
                    ? 'bg-[var(--crm-action)] text-[var(--crm-text)]'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
                style={{ borderRadius: activeTab === 'import' ? 'var(--crm-button-radius)' : undefined }}
              >
                <Upload className="w-5 h-5 inline-block ml-2" />
                {t('ייבוא', 'Import')}
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`px-6 py-3 font-medium whitespace-nowrap rounded-full transition-all ${
                  activeTab === 'logs'
                    ? 'bg-[var(--crm-action)] text-[var(--crm-text)]'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
                style={{ borderRadius: activeTab === 'logs' ? 'var(--crm-button-radius)' : undefined }}
              >
                <Calendar className="w-5 h-5 inline-block ml-2" />
                {t('היסטוריה', 'History')}
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'subscribers' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm" style={{ borderRadius: 'var(--crm-border-radius)' }}>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg text-[var(--crm-text)]">
                      {t('סטטיסטיקת קבוצות', 'Group Statistics')}
                    </h3>
                    <button
                      onClick={() => setShowAddGroup(true)}
                      className="bg-[var(--crm-action)] text-[var(--crm-text)] px-4 py-2 text-sm font-semibold hover:bg-[var(--crm-action)]/90 flex items-center gap-2"
                      style={{ borderRadius: 'var(--crm-button-radius)' }}
                    >
                      <Plus className="w-4 h-4" />
                      {t('הוסף קבוצה', 'Add Group')}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {activeGroups.length === 0 ? (
                      <p className="text-gray-600 text-center col-span-full">
                        {t('אין קבוצות פעילות. הוסיפי מנויים כדי ליצור קבוצות.', 'No active groups. Add subscribers to create groups.')}
                      </p>
                    ) : (
                      activeGroups.map(group => (
                        <div key={group} className="bg-gray-50 rounded-xl p-4 border border-gray-100" style={{ borderRadius: 'var(--crm-border-radius)' }}>
                          <div className="text-2xl font-bold text-[var(--crm-primary)]">
                            {getGroupSubscriberCount(group)}
                          </div>
                          <div className="text-sm text-[var(--crm-text)] opacity-70">{group}</div>
                          <div className="mt-2 bg-gray-200 rounded-full h-2">
                            <div
                              className="h-2 rounded-full transition-all duration-300"
                              style={{
                                backgroundColor: 'var(--crm-primary)',
                                width: `${Math.min(100, (getGroupSubscriberCount(group) / SUBSCRIBERS_PER_GROUP) * 100)}%`
                              }}
                            />
                          </div>
                          <div className="text-xs text-[var(--crm-text)] opacity-60 mt-1">
                            {Math.round((getGroupSubscriberCount(group) / SUBSCRIBERS_PER_GROUP) * 100)}% {t('מלא', 'full')}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {showAddGroup && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-gray-900">
                          {t('הוסף קבוצה חדשה', 'Add New Group')}
                        </h3>
                        <button
                          onClick={() => {
                            setShowAddGroup(false);
                            setNewGroupName('');
                          }}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-6 h-6" />
                        </button>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('שם הקבוצה', 'Group Name')}
                          </label>
                          <input
                            type="text"
                            value={newGroupName}
                            onChange={(e) => setNewGroupName(e.target.value)}
                            placeholder={t('לדוגמה: VIP לקוחות', 'Example: VIP Customers')}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div className="flex gap-3 pt-4">
                          <button
                            onClick={handleAddGroup}
                            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 flex items-center justify-center gap-2"
                          >
                            <Plus className="w-5 h-5" />
                            {t('הוסף קבוצה', 'Add Group')}
                          </button>
                          <button
                            onClick={() => {
                              setShowAddGroup(false);
                              setNewGroupName('');
                            }}
                            className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
                          >
                            {t('ביטול', 'Cancel')}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    {selectedIds.length > 0 && (
                      <button
                        onClick={handleBulkDelete}
                        className="border-red-500 text-red-500 bg-white border px-4 py-2 font-semibold hover:bg-red-50 flex items-center gap-2"
                        style={{ borderRadius: 'var(--crm-button-radius)' }}
                      >
                        <Trash2 className="w-5 h-5" />
                        {t('מחק', 'Delete')} {selectedIds.length}
                      </button>
                    )}
                    <button
                      onClick={() => setShowAddSubscriber(true)}
                      className="bg-[var(--crm-action)] text-[var(--crm-text)] px-4 py-2 font-semibold hover:bg-[var(--crm-action)]/90 flex items-center gap-2"
                      style={{ borderRadius: 'var(--crm-button-radius)' }}
                    >
                      <Plus className="w-5 h-5" />
                      {t('הוסף מנוי', 'Add Subscriber')}
                    </button>
                  </div>
                </div>

                {showAddSubscriber && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-gray-900">
                          {t('הוסף מנוי חדש', 'Add New Subscriber')}
                        </h3>
                        <button
                          onClick={() => setShowAddSubscriber(false)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-6 h-6" />
                        </button>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('מייל', 'Email')}
                          </label>
                          <input
                            type="email"
                            value={newSubscriber.email}
                            onChange={(e) => setNewSubscriber({...newSubscriber, email: e.target.value})}
                            placeholder="example@email.com"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('וואטסאפ', 'WhatsApp')}
                          </label>
                          <input
                            type="text"
                            value={newSubscriber.whatsapp}
                            onChange={(e) => setNewSubscriber({...newSubscriber, whatsapp: e.target.value})}
                            placeholder="972501234567"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {t('פורמט בינלאומי: 972501234567', 'International format: 972501234567')}
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('שם', 'Name')}
                          </label>
                          <input
                            type="text"
                            value={newSubscriber.name}
                            onChange={(e) => setNewSubscriber({...newSubscriber, name: e.target.value})}
                            placeholder={t('שם פרטי', 'First name')}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('תפקיד', 'Job Title')}
                          </label>
                          <input
                            type="text"
                            value={newSubscriber.job_title || ''}
                            onChange={(e) => setNewSubscriber({...newSubscriber, job_title: e.target.value})}
                            placeholder={t('תפקיד', 'Job Title')}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('חברה', 'Company')}
                          </label>
                          <input
                            type="text"
                            value={newSubscriber.company || ''}
                            onChange={(e) => setNewSubscriber({...newSubscriber, company: e.target.value})}
                            placeholder={t('שם החברה', 'Company name')}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('הערות', 'Notes')}
                          </label>
                          <textarea
                            value={newSubscriber.notes || ''}
                            onChange={(e) => setNewSubscriber({...newSubscriber, notes: e.target.value})}
                            placeholder={t('הערות נוספות', 'Additional notes')}
                            rows="3"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <input
                            type="checkbox"
                            id="add-to-contacts"
                            checked={addToContacts}
                            onChange={(e) => setAddToContacts(e.target.checked)}
                            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <label htmlFor="add-to-contacts" className="text-sm font-medium text-gray-700 cursor-pointer">
                            {t('הוסף גם לאנשי קשר (CRM)', 'Also add to Contacts (CRM)')}
                          </label>
                        </div>

                        <div className="flex gap-3 pt-4">
                          <button
                            onClick={handleAddSubscriber}
                            disabled={addingSubscriber}
                            className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            {addingSubscriber ? (
                              <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                {t('מוסיף...', 'Adding...')}
                              </>
                            ) : (
                              <>
                                <Plus className="w-5 h-5" />
                                {t('הוסף', 'Add')}
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setShowAddSubscriber(false);
                              setAddToContacts(false);
                            }}
                            className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
                          >
                            {t('ביטול', 'Cancel')}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {showEditSubscriber && editingSubscriber && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-gray-900">
                          {t('ערוך מנוי', 'Edit Subscriber')}
                        </h3>
                        <button
                          onClick={() => {
                            setShowEditSubscriber(false);
                            setEditingSubscriber(null);
                          }}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-6 h-6" />
                        </button>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('מייל', 'Email')}
                          </label>
                          <input
                            type="email"
                            value={editingSubscriber.email}
                            onChange={(e) => setEditingSubscriber({...editingSubscriber, email: e.target.value})}
                            placeholder="example@email.com"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('וואטסאפ', 'WhatsApp')}
                          </label>
                          <input
                            type="text"
                            value={editingSubscriber.whatsapp}
                            onChange={(e) => setEditingSubscriber({...editingSubscriber, whatsapp: e.target.value})}
                            placeholder="972501234567"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {t('פורמט בינלאומי: 972501234567', 'International format: 972501234567')}
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('שם', 'Name')}
                          </label>
                          <input
                            type="text"
                            value={editingSubscriber.name}
                            onChange={(e) => setEditingSubscriber({...editingSubscriber, name: e.target.value})}
                            placeholder={t('שם פרטי', 'First name')}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('תפקיד', 'Job Title')}
                          </label>
                          <input
                            type="text"
                            value={editingSubscriber.job_title}
                            onChange={(e) => setEditingSubscriber({...editingSubscriber, job_title: e.target.value})}
                            placeholder={t('תפקיד', 'Job Title')}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('חברה', 'Company')}
                          </label>
                          <input
                            type="text"
                            value={editingSubscriber.company}
                            onChange={(e) => setEditingSubscriber({...editingSubscriber, company: e.target.value})}
                            placeholder={t('שם החברה', 'Company name')}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('הערות', 'Notes')}
                          </label>
                          <textarea
                            value={editingSubscriber.notes}
                            onChange={(e) => setEditingSubscriber({...editingSubscriber, notes: e.target.value})}
                            placeholder={t('הערות נוספות', 'Additional notes')}
                            rows="3"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('קבוצה', 'Group')}
                          </label>
                          <select
                            value={editingSubscriber.group}
                            onChange={(e) => setEditingSubscriber({...editingSubscriber, group: e.target.value})}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            {activeGroups.map(group => (
                              <option key={group} value={group}>{group}</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id="subscribed-checkbox"
                            checked={editingSubscriber.subscribed}
                            onChange={(e) => setEditingSubscriber({...editingSubscriber, subscribed: e.target.checked})}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <label htmlFor="subscribed-checkbox" className="text-sm font-medium text-gray-700">
                            {t('מנוי פעיל', 'Active Subscriber')}
                          </label>
                        </div>

                        <div className="flex gap-3 pt-4">
                          <button
                            onClick={handleUpdateSubscriber}
                            disabled={updatingSubscriber}
                            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            {updatingSubscriber ? (
                              <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                {t('מעדכן...', 'Updating...')}
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-5 h-5" />
                                {t('עדכן', 'Update')}
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setShowEditSubscriber(false);
                              setEditingSubscriber(null);
                            }}
                            className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
                          >
                            {t('ביטול', 'Cancel')}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        placeholder={t('חיפוש לפי שם, מייל או וואטסאפ...', 'Search by name, email or WhatsApp...')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <select
                    value={filterGroup}
                    onChange={(e) => setFilterGroup(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">{t('כל הקבוצות', 'All Groups')}</option>
                    {activeGroups.map(group => (
                      <option key={group} value={group}>
                        {group} ({getGroupSubscriberCount(group)})
                      </option>
                    ))}
                  </select>

                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">{t('הכל', 'All')}</option>
                    <option value="active">{t('פעילים', 'Active')}</option>
                    <option value="inactive">{t('לא פעילים', 'Inactive')}</option>
                  </select>

                  <select
                    value={filterChannel}
                    onChange={(e) => setFilterChannel(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">{t('כל הערוצים', 'All Channels')}</option>
                    <option value="has_whatsapp">{t('יש וואטסאפ', 'Has WhatsApp')}</option>
                    <option value="has_email">{t('יש מייל', 'Has Email')}</option>
                    <option value="both">{t('יש שניהם', 'Has Both')}</option>
                    <option value="whatsapp">{t('וואטסאפ בלבד', 'WhatsApp Only')}</option>
                    <option value="email">{t('מייל בלבד', 'Email Only')}</option>
                  </select>
                </div>

                {loading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                  </div>
                ) : filteredSubscribers.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    {t('לא נמצאו מנויים', 'No subscribers found')}
                  </div>
                ) : (
                  <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-gray-100" style={{ borderRadius: 'var(--crm-border-radius)' }}>
                    <table className="w-full">
                      <thead className="bg-gray-50/50 border-b border-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-center w-12">
                            <input
                              type="checkbox"
                              checked={selectedIds.length === filteredSubscribers.length && filteredSubscribers.length > 0}
                              onChange={toggleSelectAll}
                              className="w-5 h-5 text-[var(--crm-primary)] border-gray-300 rounded"
                            />
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-normal text-gray-400 uppercase tracking-wider" style={{ minWidth: '180px' }}>
                            {t('מייל', 'Email')}
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-normal text-gray-400 uppercase tracking-wider" style={{ minWidth: '120px' }}>
                            {t('וואטסאפ', 'WhatsApp')}
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-normal text-gray-400 uppercase tracking-wider" style={{ minWidth: '100px' }}>
                            {t('שם', 'Name')}
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-normal text-gray-400 uppercase tracking-wider" style={{ minWidth: '120px' }}>
                            {t('תפקיד', 'Job Title')}
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-normal text-gray-400 uppercase tracking-wider" style={{ minWidth: '100px' }}>
                            {t('חברה', 'Company')}
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-normal text-gray-400 uppercase tracking-wider" style={{ minWidth: '150px' }}>
                            {t('הערות', 'Notes')}
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-normal text-gray-400 uppercase tracking-wider" style={{ minWidth: '120px' }}>
                            {t('קבוצה', 'Group')}
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-normal text-gray-400 uppercase tracking-wider" style={{ minWidth: '80px' }}>
                            {t('סטטוס', 'Status')}
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-normal text-gray-400 uppercase tracking-wider" style={{ minWidth: '100px' }}>
                            {t('פעולות', 'Actions')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {filteredSubscribers.map((sub) => (
                          <tr key={sub.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-4 text-center">
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(sub.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedIds([...selectedIds, sub.id]);
                                  } else {
                                    setSelectedIds(selectedIds.filter(id => id !== sub.id));
                                  }
                                }}
                                className="w-5 h-5 text-[var(--crm-primary)] border-gray-300 rounded"
                              />
                            </td>
                            <td className="px-4 py-4 text-sm text-[var(--crm-text)] font-medium" style={{ wordBreak: 'break-all' }}>
                              {sub.email || '-'}
                            </td>
                            <td className="px-4 py-4 text-sm text-[var(--crm-text)]" style={{ wordBreak: 'break-all' }}>
                              {sub.whatsapp || '-'}
                            </td>
                            <td className="px-4 py-4 text-sm text-[var(--crm-text)] font-medium">
                              {sub.name || '-'}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-500">
                              {sub.job_title || '-'}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-500">
                              {sub.company || '-'}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-500">
                              {sub.notes || '-'}
                            </td>
                            <td className="px-4 py-4 text-sm">
                              <select
                                value={sub.group}
                                onChange={(e) => handleUpdateSubscriberGroup(sub.id, e.target.value)}
                                className="w-full px-3 py-1.5 text-xs font-medium rounded-full text-white border-0 focus:ring-2 focus:ring-[var(--crm-primary)]"
                                style={{ 
                                  backgroundColor: 'var(--crm-primary)',
                                  borderRadius: 'var(--crm-button-radius)'
                                }}
                              >
                                {activeGroups.map(group => (
                                  <option key={group} value={group}>{group}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-4 text-sm">
                              {sub.subscribed ? (
                                <span className="px-3 py-1 text-xs font-medium rounded-full text-white whitespace-nowrap" style={{ backgroundColor: 'var(--crm-accent)' }}>
                                  {t('פעיל', 'Active')}
                                </span>
                              ) : (
                                <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-200 text-gray-600 whitespace-nowrap">
                                  {t('לא פעיל', 'Inactive')}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-4 text-sm">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleEditSubscriber(sub)}
                                  className="text-[var(--crm-primary)] hover:text-[var(--crm-primary)]/80 p-2 hover:bg-[var(--crm-primary)]/10 rounded-lg transition-colors"
                                  title={t('ערוך', 'Edit')}
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => deleteSubscriber(sub.id)}
                                  className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                  title={t('מחק', 'Delete')}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'send' && (
              <div className="space-y-6 max-w-4xl">
                <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm" style={{ borderRadius: 'var(--crm-border-radius)' }}>
                  <h3 className="font-semibold text-lg text-[var(--crm-text)] mb-4">
                    {t('בחרי ערוץ שליחה', 'Choose Send Channel')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      onClick={() => setSendChannel('email')}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        sendChannel === 'email'
                          ? 'bg-[var(--crm-primary)] bg-opacity-10'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                      style={{ 
                        borderRadius: 'var(--crm-border-radius)',
                        borderColor: sendChannel === 'email' ? 'var(--crm-primary)' : undefined
                      }}
                    >
                      <Mail className="w-8 h-8 mx-auto mb-2" style={{ color: sendChannel === 'email' ? 'var(--crm-primary)' : '#9CA3AF' }} />
                      <p className="font-medium text-[var(--crm-text)]">{t('אימייל בלבד', 'Email Only')}</p>
                    </button>
                    
                    <button
                      onClick={() => setSendChannel('whatsapp')}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        sendChannel === 'whatsapp'
                          ? 'bg-[var(--crm-accent)] bg-opacity-10'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                      style={{ 
                        borderRadius: 'var(--crm-border-radius)',
                        borderColor: sendChannel === 'whatsapp' ? 'var(--crm-accent)' : undefined
                      }}
                    >
                      <MessageCircle className="w-8 h-8 mx-auto mb-2" style={{ color: sendChannel === 'whatsapp' ? 'var(--crm-accent)' : '#9CA3AF' }} />
                      <p className="font-medium text-[var(--crm-text)]">{t('וואטסאפ בלבד', 'WhatsApp Only')}</p>
                    </button>
                    
                    <button
                      onClick={() => setSendChannel('both')}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        sendChannel === 'both'
                          ? 'bg-[var(--crm-primary)] bg-opacity-10'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                      style={{ 
                        borderRadius: 'var(--crm-border-radius)',
                        borderColor: sendChannel === 'both' ? 'var(--crm-primary)' : undefined
                      }}
                    >
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Mail className="w-6 h-6" style={{ color: sendChannel === 'both' ? 'var(--crm-primary)' : '#9CA3AF' }} />
                        <MessageCircle className="w-6 h-6" style={{ color: sendChannel === 'both' ? 'var(--crm-accent)' : '#9CA3AF' }} />
                      </div>
                      <p className="font-medium text-[var(--crm-text)]">{t('שניהם', 'Both')}</p>
                    </button>
                  </div>
                </div>

                {(sendChannel === 'email' || sendChannel === 'both') && (
                  <div className="bg-gray-50/50 p-1 rounded-full mb-6">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDesignMode('template')}
                        className={`px-4 py-3 font-medium flex items-center gap-2 rounded-full transition-all flex-1 justify-center ${
                          designMode === 'template'
                            ? 'bg-[var(--crm-action)] text-[var(--crm-text)]'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                        }`}
                        style={{ borderRadius: designMode === 'template' ? 'var(--crm-button-radius)' : undefined }}
                      >
                        <Layout className="w-5 h-5" />
                        {t('תבנית מהירה', 'Quick Template')}
                      </button>
                      <button
                        onClick={() => setDesignMode('html')}
                        className={`px-4 py-3 font-medium flex items-center gap-2 rounded-full transition-all flex-1 justify-center ${
                          designMode === 'html'
                            ? 'bg-[var(--crm-action)] text-[var(--crm-text)]'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                        }`}
                        style={{ borderRadius: designMode === 'html' ? 'var(--crm-button-radius)' : undefined }}
                      >
                        <FileCode className="w-5 h-5" />
                        {t('HTML מתקדם', 'Advanced HTML')}
                      </button>
                      <button
                        onClick={() => setDesignMode('free')}
                        className={`px-4 py-3 font-medium flex items-center gap-2 rounded-full transition-all flex-1 justify-center ${
                          designMode === 'free'
                            ? 'bg-[var(--crm-action)] text-[var(--crm-text)]'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                        }`}
                        style={{ borderRadius: designMode === 'free' ? 'var(--crm-button-radius)' : undefined }}
                      >
                        <Edit3 className="w-5 h-5" />
                        {t('עורך חופשי', 'Free Editor')}
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('בחרי קבוצת יעד', 'Select Target Group')}
                  </label>
                  <select
                    value={selectedGroup}
                    onChange={(e) => setSelectedGroup(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {activeGroups.map(group => (
                      <option key={group} value={group}>{group}</option>
                    ))}
                  </select>
                </div>

                {(sendChannel === 'email' || sendChannel === 'both') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('נושא האימייל', 'Email Subject')}
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder={t('לדוגמה: עדכון חודשי - יולי 2025', 'Example: Monthly Update - July 2025')}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}

                {(sendChannel === 'whatsapp' || sendChannel === 'both') && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <h3 className="font-semibold text-lg text-gray-900 mb-4 flex items-center gap-2">
                      <MessageCircle className="w-6 h-6 text-green-600" />
                      {t('הודעת וואטסאפ', 'WhatsApp Message')}
                    </h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('תוכן ההודעה', 'Message Content')}
                      </label>
                      <textarea
                        value={whatsappMessage}
                        onChange={(e) => setWhatsappMessage(e.target.value)}
                        placeholder={t('היי {{name}}, זה הניוזלטר שלנו...', 'Hi {{name}}, this is our newsletter...')}
                        rows="6"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-600 mt-2">
                        💡 {t('ניתן להשתמש ב-{{name}} להחלפה דינמית של שם המנוי', 'You can use {{name}} for dynamic replacement of subscriber name')}
                      </p>
                    </div>
                  </div>
                )}

                {(sendChannel === 'email' || sendChannel === 'both') && designMode === 'template' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('בחרי תבנית', 'Choose Template')}
                      </label>
                      <select
                        value={selectedTemplate || ''}
                        onChange={(e) => setSelectedTemplate(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {emailTemplates.length === 0 ? (
                          <option value="">{t('אין תבניות זמינות', 'No templates available')}</option>
                        ) : (
                          emailTemplates.map(template => (
                            <option key={template.id} value={template.id}>{template.name}</option>
                          ))
                        )}
                      </select>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-sm text-yellow-800">
                        💡 {t('תבנית זו מכילה HTML מוכן. ניתן לערוך אותה בהגדרות CRM או להשתמש בה כפי שהיא.', 'This template contains ready HTML. You can edit it in CRM settings or use it as is.')}
                      </p>
                    </div>
                  </div>
                )}

                {(sendChannel === 'email' || sendChannel === 'both') && designMode === 'html' && (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="font-semibold text-blue-900 mb-3">
                        {t('איך להשתמש', 'How to Use')}
                      </h3>
                      <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                        <li>{t('עצבי ניוזלטר בקנבה (או כל כלי אחר)', 'Design newsletter in Canva (or any other tool)')}</li>
                        <li>{t('ייצאי כ-HTML או העתיקי את הקוד', 'Export as HTML or copy the code')}</li>
                        <li>{t('הדביקי את הקוד בשדה למטה', 'Paste the code in the field below')}</li>
                        <li>{t('לינק הסרה יתווסף אוטומטית', 'Unsubscribe link will be added automatically')}</li>
                      </ol>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('קוד HTML', 'HTML Code')}
                      </label>
                      <textarea
                        value={htmlContent}
                        onChange={(e) => setHtmlContent(e.target.value)}
                        placeholder={t('הדביקי את קוד ה-HTML כאן...', 'Paste your HTML code here...')}
                        rows="15"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                      />
                    </div>
                  </div>
                )}

                {(sendChannel === 'email' || sendChannel === 'both') && designMode === 'free' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('תוכן הניוזלטר', 'Newsletter Content')}
                      </label>
                      <RichTextEditor
                        value={content}
                        onChange={setContent}
                      />
                      <p className="mt-2 text-xs text-gray-500">
                        {t('לינק להסרה מהרשימה יתווסף אוטומטית בסוף המייל', 'Unsubscribe link will be added automatically at the end')}
                      </p>
                    </div>
                  </div>
                )}

                {(sendChannel === 'email' || sendChannel === 'both') && (designMode === 'free' || designMode === 'html') && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-semibold text-green-900">
                        {t('כפתורי קריאה לפעולה (אופציונלי)', 'CTA Buttons (Optional)')}
                      </h3>
                      <button
                        onClick={addCtaButton}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        {t('הוסף כפתור', 'Add Button')}
                      </button>
                    </div>

                    {ctaButtons.length === 0 ? (
                      <p className="text-sm text-gray-600 text-center py-4">
                        {t('לחצי על "הוסף כפתור" להוספת כפתור קריאה לפעולה', 'Click "Add Button" to add a CTA button')}
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {ctaButtons.map((button, index) => (
                          <div key={index} className="bg-white rounded-lg p-4 border border-green-200">
                            <div className="flex justify-between items-start mb-3">
                              <h4 className="font-medium text-gray-900">
                                {t('כפתור', 'Button')} {index + 1}
                              </h4>
                              <button
                                onClick={() => removeCtaButton(index)}
                                className="text-red-600 hover:text-red-800 p-1"
                                title={t('מחק כפתור', 'Delete Button')}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="space-y-3">
                              <div className="grid md:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t('טקסט כפתור', 'Button Text')}
                                  </label>
                                  <input
                                    type="text"
                                    value={button.text}
                                    onChange={(e) => updateCtaButton(index, 'text', e.target.value)}
                                    placeholder={t('לחצי כאן', 'Click Here')}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t('קישור', 'Link')}
                                  </label>
                                  <input
                                    type="text"
                                    value={button.link}
                                    onChange={(e) => updateCtaButton(index, 'link', e.target.value)}
                                    placeholder="https://moveup.today"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  {t('סגנון כפתור', 'Button Style')}
                                  </label>
                                  <select
                                    value={button.style}
                                    onChange={(e) => updateCtaButton(index, 'style', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                  >
                                    <option value="primary">{t('ראשי - רקע מלא', 'Primary - Full Background')}</option>
                                    <option value="secondary">{t('משני - רקע לבן', 'Secondary - White Background')}</option>
                                    <option value="outline">{t('מסגרת - שקוף', 'Outline - Transparent')}</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {t('תמונה לכפתור (אופציונלי)', 'Button Image (Optional)')}
                                  </label>
                                  <div className="flex gap-3">
                                    <input
                                      type="text"
                                      value={button.imageUrl}
                                      onChange={(e) => updateCtaButton(index, 'imageUrl', e.target.value)}
                                      placeholder="https://example.com/image.jpg"
                                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    />
                                    <label className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 cursor-pointer flex items-center gap-2 whitespace-nowrap">
                                      {uploadingCtaImage ? (
                                        <>
                                          <Loader2 className="w-5 h-5 animate-spin" />
                                          {t('מעלה...', 'Uploading...')}
                                        </>
                                      ) : (
                                        <>
                                          <Image className="w-5 h-5" />
                                          {t('העלה', 'Upload')}
                                        </>
                                      )}
                                      <input
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={(e) => handleCtaImageUpload(e, index)}
                                        disabled={uploadingCtaImage}
                                      />
                                    </label>
                                  </div>
                                  {button.imageUrl && (
                                    <img
                                      src={button.imageUrl}
                                      alt="Preview"
                                      className="mt-2 w-32 rounded border"
                                      onError={(e) => e.target.style.display = 'none'}
                                    />
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-gray-600 mt-4">
                        {t('הכפתורים יופיעו בתחתית המייל, מעל לינק ההסרה. ניתן להוסיף מספר כפתורים.', 'Buttons will appear at the bottom of the email, above the unsubscribe link. You can add multiple buttons.')}
                      </p>
                    </div>
                  )}

                {sendStatus === 'success' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-green-800">
                      {t('הניוזלטר נשלח בהצלחה!', 'Newsletter sent successfully!')}
                    </span>
                  </div>
                )}

                {sendStatus === 'error' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                    <XCircle className="w-5 h-5 text-red-600" />
                    <span className="text-red-800">
                      {t('שגיאה בשליחת הניוזלטר', 'Error sending newsletter')}
                    </span>
                  </div>
                )}

                <button
                  onClick={handleSendNewsletter}
                  disabled={
                    sending ||
                    ((sendChannel === 'email' || sendChannel === 'both') && !subject) ||
                    ((sendChannel === 'email' || sendChannel === 'both') && designMode === 'html' && !htmlContent) ||
                    ((sendChannel === 'email' || sendChannel === 'both') && designMode === 'free' && !content) ||
                    ((sendChannel === 'whatsapp' || sendChannel === 'both') && !whatsappMessage.trim())
                  }
                  className="w-full bg-[var(--crm-primary)] text-white py-3 font-semibold hover:bg-[var(--crm-primary)]/90 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ borderRadius: 'var(--crm-button-radius)' }}
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t('שולח...', 'Sending...')}
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      {t('שלח ניוזלטר', 'Send Newsletter')}
                    </>
                  )}
                </button>
              </div>
            )}

            {activeTab === 'import' && (
              <div className="space-y-6 max-w-2xl">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">
                    {t('שתי דרכים לייבוא מנויים', 'Two ways to import subscribers')}
                  </h3>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>{t('העתק והדבק ישירות (מומלץ!)', 'Copy & Paste directly (Recommended!)')}</li>
                    <li>{t('או העלה קובץ CSV', 'Or upload a CSV file')}</li>
                  </ul>
                  <p className="text-xs text-blue-700 mt-2">
                    {t(`המנויים המיובאים יחולקו אוטומטית לקבוצות של ${SUBSCRIBERS_PER_GROUP} מנויים`, `Imported subscribers will be automatically divided into groups of ${SUBSCRIBERS_PER_GROUP} members`)}
                  </p>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                    ✨ {t('דרך 1: העתק והדבק (הכי פשוט!)', 'Method 1: Copy & Paste (Easiest!)')}
                  </h3>

                  <div className="bg-white rounded p-3 mb-4">
                    <p className="text-sm text-gray-700 mb-2 font-semibold">
                      {t('פורמט:', 'Format:')}
                    </p>
                    <code className="text-xs bg-gray-100 p-2 rounded block" dir="ltr">
                      email1@example.com,972501234567,שם,תפקיד,חברה,הערות<br/>
                      email2@example.com,972501234568,שם,תפקיד,חברה<br/>
                      email3@example.com,,שם<br/>
                      ,972501234569,שם
                    </code>
                    <p className="text-xs text-gray-600 mt-2">
                      {t('• כל שורה = מנוי אחד', '• Each line = one subscriber')}<br/>
                      {t('• פורמט: email,whatsapp,name,job_title,company,notes', '• Format: email,whatsapp,name,job_title,company,notes')}<br/>
                      {t('• שדות אופציונליים: וואטסאפ, שם, תפקיד, חברה, הערות', '• Optional fields: whatsapp, name, job_title, company, notes')}
                      <br/>
                      {t('• יש להזין לפחות מייל או וואטסאפ', '• Must provide at least an email or WhatsApp number')}
                    </p>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('הדביקי את רשימת המנויים כאן:', 'Paste your subscriber list here:')}
                    </label>
                    <textarea
                      value={importFile?.type === 'text' ? importFile.text : ''}
                      onChange={(e) => setImportFile({ type: 'text', text: e.target.value })}
                      placeholder={t(
                        'לדוגמה:\nexample1@gmail.com,972501234567,שרה כהן,מנהלת מכירות,חברת ABC,לקוחה חדשה\nexample2@gmail.com,972501234568,רחל לוי,מנכ"לית,חברת XYZ\nexample3@gmail.com,,דוד ישראלי\n,972501234569,מרים כהן',
                        'Example:\nexample1@gmail.com,972501234567,Sarah Cohen,Sales Manager,ABC Company,New client\nexample2@gmail.com,972501234568,Rachel Levi,CEO,XYZ Company\nexample3@gmail.com,,David Israeli\n,972501234569,Miriam Cohen'
                      )}
                      rows="10"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
                      dir="ltr"
                    />
                  </div>

                  <button
                    onClick={handleImportCSV}
                    disabled={importing || !(importFile?.type === 'text' && importFile.text.trim())}
                    className="w-full mt-4 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {importing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {t('מייבא...', 'Importing...')}
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        {t('ייבא מנויים', 'Import Subscribers')}
                      </>
                    )}
                  </button>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    {t('דרך 2: העלאת קובץ CSV', 'Method 2: Upload CSV File')}
                  </h3>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-yellow-800 mb-2">
                      ⚠️ {t('שימי לב: העלאת קובץ עלולה לגרום לבעיות קידוד', 'Note: File upload may cause encoding issues')}
                    </p>
                    <p className="text-xs text-yellow-700">
                      {t('אם זה לא עובד, השתמשי בשיטת ההעתקה וההדבקה למעלה', 'If this doesn\'t work, use the copy-paste method above')}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('בחרי קובץ CSV', 'Select CSV File')}
                    </label>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => setImportFile({ type: 'file', file: e.target.files[0] })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <button
                    onClick={handleImportCSV}
                    disabled={importing || !(importFile?.type === 'file' && importFile.file)}
                    className="w-full mt-4 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {importing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {t('מייבא...', 'Importing...')}
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        {t('ייבא קובץ', 'Import File')}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'logs' && (
              <NewsletterLogs logs={logs} sending={sending} onResend={handleResendNewsletter} />
            )}
          </div>
        </div>

        {showResendModal && resendData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
                <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-bold text-gray-900">
                    {t('עריכה ושליחה מחדש', 'Edit and Resend')}
                  </h3>
                  <button
                    onClick={() => {
                      setShowResendModal(false);
                      setResendData(null);
                      setResendSubject('');
                      setResendGroup('קבוצה 1');
                      setResendContent('');
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('נושא הניוזלטר', 'Newsletter Subject')}
                  </label>
                  <input
                    type="text"
                    value={resendSubject}
                    onChange={(e) => setResendSubject(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('בחרי קבוצת יעד', 'Select Target Group')}
                  </label>
                  <select
                    value={resendGroup}
                    onChange={(e) => setResendGroup(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {activeGroups.map(group => (
                      <option key={group} value={group}>{group}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('תצוגה מקדימה של התוכן', 'Content Preview')}
                  </label>
                  <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto">
                    <iframe
                      srcDoc={resendContent}
                      className="w-full h-96 border-0"
                      title="Newsletter Preview"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {t('לעריכת התוכן, צרי ניוזלטר חדש בטאב "שליחת ניוזלטר"', 'To edit content, create a new newsletter in the "Send Newsletter" tab')}
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    {t(
                      `הניוזלטר יישלח לכל המנויים הפעילים בקבוצה "${resendGroup}"`,
                      `Newsletter will be sent to all active subscribers in group "${resendGroup}"`
                    )}
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleConfirmResend}
                    disabled={sending || !resendSubject.trim()}
                    className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {sending ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {t('שולח...', 'Sending...')}
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        {t('שלח עכשיו', 'Send Now')}
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowResendModal(false);
                      setResendData(null);
                      setResendSubject('');
                      setResendGroup('קבוצה 1');
                      setResendContent('');
                    }}
                    disabled={sending}
                    className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-50"
                  >
                    {t('ביטול', 'Cancel')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}