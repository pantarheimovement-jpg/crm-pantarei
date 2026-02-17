import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    console.log('📧 Sending test email...');
    
    const base44 = createClientFromRequest(req);
    
    // שליחת מייל פשוט דרך Core.SendEmail
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: 'pantarhei.movement@gmail.com',
      subject: 'בדיקת מייל - Pantarhei CRM',
      from_name: 'Pantarhei CRM',
      body: `
        <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>✅ מייל הבדיקה עבר בהצלחה!</h2>
          <p>תאריך ושעה: ${new Date().toLocaleString('he-IL')}</p>
          <p>אם את רואה את המייל הזה, זה אומר שמערכת המייל עובדת כראוי.</p>
          <hr style="margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">מייל בדיקה אוטומטי מ-Pantarhei CRM</p>
        </div>
      `
    });

    console.log('✅ Test email sent successfully');

    return Response.json({
      success: true,
      message: 'Test email sent to pantarhei.movement@gmail.com',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error sending test email:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});