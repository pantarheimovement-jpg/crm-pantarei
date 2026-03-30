import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const payload = await req.json();
    const { recipients, subject, html_content, from_name, from_email } = payload;

    // Check if newsletter sending is enabled
    const automationSettingsList = await base44.asServiceRole.entities.AutomationSettings.list();
    const automationSettings = automationSettingsList && automationSettingsList.length > 0 ? automationSettingsList[0] : null;
    if (!automationSettings || !automationSettings.newsletter_sending_enabled) {
      console.log('⚠️ Newsletter sending is disabled in AutomationSettings');
      return Response.json({ 
        error: 'מערכת הדיוור מושבתת. ניתן להפעיל בהגדרות CRM → אוטומציה',
        disabled: true 
      }, { status: 403 });
    }

    const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
    
    console.log('🔍 BREVO_API_KEY length:', BREVO_API_KEY ? BREVO_API_KEY.length : 'undefined');
    console.log('🔍 BREVO_API_KEY starts with:', BREVO_API_KEY ? BREVO_API_KEY.substring(0, 5) : 'undefined');
    
    if (!BREVO_API_KEY) {
      return Response.json({ 
        error: 'BREVO_API_KEY must be configured in Dashboard → Secrets' 
      }, { status: 500 });
    }

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return Response.json({ error: 'Recipients array is required and must not be empty' }, { status: 400 });
    }

    if (!subject || !from_email || !html_content) {
      return Response.json({ error: 'Subject, from_email, and html_content are required' }, { status: 400 });
    }

    let successCount = 0;
    let failedCount = 0;
    const failedDetails = [];

    // Send emails using Brevo API (one by one to personalize content)
    for (const recipient of recipients) {
      try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'api-key': BREVO_API_KEY,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            sender: {
              name: from_name || 'Newsletter',
              email: from_email
            },
            to: [
              {
                email: recipient.email,
                name: recipient.name || ''
              }
            ],
            subject: subject,
            htmlContent: recipient.html_content || html_content
          })
        });

        if (response.ok) {
          successCount++;
        } else {
          const errorData = await response.json();
          failedCount++;
          failedDetails.push({
            email: recipient.email,
            error: errorData.message || 'Unknown error'
          });
        }

        // Small delay between emails to avoid rate limiting
        if (recipients.indexOf(recipient) < recipients.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

      } catch (error) {
        failedCount++;
        failedDetails.push({
          email: recipient.email,
          error: error.message
        });
      }
    }

    return Response.json({
      success_count: successCount,
      failed_count: failedCount,
      failed_details: failedDetails,
      total: recipients.length
    });

  } catch (error) {
    console.error('Function error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});