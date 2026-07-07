import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Provider switch: send via uChat (WhatsApp Cloud API) or Green API by WHATSAPP_PROVIDER secret
async function sendWhatsapp(phone972, text) {
  const provider = (Deno.env.get('WHATSAPP_PROVIDER') || 'green').toLowerCase();

  if (provider === 'uchat') {
    const token = Deno.env.get('UCHAT_API_TOKEN');
    if (!token) return { ok: false, error: 'uchat: UCHAT_API_TOKEN not configured' };
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
    const infoResp = await fetch(`https://www.uchat.com.au/api/subscriber/get-info-by-user-id?user_id=${encodeURIComponent(phone972)}`, { headers });
    let info = {};
    try { info = await infoResp.json(); } catch (_e) { info = {}; }
    const userNs = info?.user_ns || info?.data?.user_ns;
    if (!userNs) {
      console.log(`uchat: subscriber not found for ${phone972}`);
      return { ok: false, error: `uchat: subscriber not found for ${phone972}` };
    }
    const sendResp = await fetch('https://www.uchat.com.au/api/subscriber/send-text', {
      method: 'POST',
      headers,
      body: JSON.stringify({ user_ns: userNs, text })
    });
    if (sendResp.ok) return { ok: true };
    const errText = await sendResp.text();
    return { ok: false, error: `uchat send failed: ${errText}` };
  }

  const GREEN_ID = Deno.env.get('GREEN_ID');
  const GREEN_TOKEN = Deno.env.get('GREEN_TOKEN');
  if (!GREEN_ID || !GREEN_TOKEN) return { ok: false, error: 'Missing Green API credentials' };
  const response = await fetch(`https://api.green-api.com/waInstance${GREEN_ID}/sendMessage/${GREEN_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId: `${phone972}@c.us`, message: text })
  });
  let result = {};
  try { result = await response.json(); } catch (_e) { result = {}; }
  if (response.ok && result.idMessage) return { ok: true };
  return { ok: false, error: result.message || JSON.stringify(result) || 'Unknown error' };
}

Deno.serve(async (req) => {
  console.log('=== 🚀 sendWhatsappNewsletter Function started ===');
  
  try {
    console.log('Step 1: Creating base44 client...');
    const base44 = createClientFromRequest(req);
    
    console.log('Step 2: Checking user authentication...');
    const user = await base44.auth.me();
    console.log('User:', user ? `${user.email} (${user.role})` : 'Not authenticated');
    
    if (!user || user.role !== 'admin') {
      console.log('❌ Unauthorized - User is not admin');
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    console.log('Step 3: Reading request body...');
    const payload = await req.json();
    console.log('📦 Full payload received:', JSON.stringify(payload, null, 2));
    
    const { recipients, message_template } = payload;
    
    // Check if we received message_template or if message is embedded in recipients
    const hasEmbeddedMessages = recipients && recipients[0] && recipients[0].message_content;
    console.log('Has embedded messages:', hasEmbeddedMessages);

    console.log('Step 4: Reading environment variables...');
    const PROVIDER = (Deno.env.get('WHATSAPP_PROVIDER') || 'green').toLowerCase();
    console.log('WhatsApp provider:', PROVIDER);

    if (PROVIDER === 'green') {
      if (!Deno.env.get('GREEN_ID') || !Deno.env.get('GREEN_TOKEN')) {
        return Response.json({
          error: 'GREEN_ID and GREEN_TOKEN must be configured in Dashboard → Secrets'
        }, { status: 500 });
      }
    } else if (!Deno.env.get('UCHAT_API_TOKEN')) {
      return Response.json({
        error: 'UCHAT_API_TOKEN must be configured in Dashboard → Secrets'
      }, { status: 500 });
    }

    console.log('Step 5: Validating input parameters...');
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      console.log('❌ Recipients validation failed');
      return Response.json({ 
        error: 'Recipients array is required and must not be empty' 
      }, { status: 400 });
    }

    if (!hasEmbeddedMessages && !message_template) {
      console.log('❌ Message template validation failed');
      return Response.json({ 
        error: 'message_template is required (or message_content in recipients)' 
      }, { status: 400 });
    }

    console.log(`✅ All validations passed. Processing ${recipients.length} recipients...`);

    let successCount = 0;
    let failedCount = 0;
    const failedDetails = [];

    // Send messages to each recipient
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      console.log(`\n--- 📱 Processing recipient ${i + 1}/${recipients.length} ---`);
      console.log('Recipient:', JSON.stringify(recipient, null, 2));
      
      try {
        // Check for WhatsApp number
        if (!recipient.whatsapp) {
          console.log('❌ Missing WhatsApp number');
          failedCount++;
          failedDetails.push({
            name: recipient.name || 'Unknown',
            whatsapp: 'N/A',
            error: 'Missing WhatsApp number'
          });
          continue;
        }

        // Clean and format phone number
        let phoneNumber = recipient.whatsapp.toString().trim().replace(/[\s\-\(\)\.]/g, '');
        console.log('📞 Original phone:', recipient.whatsapp);
        console.log('📞 After cleanup:', phoneNumber);
        
        if (phoneNumber.startsWith('+')) {
          phoneNumber = phoneNumber.substring(1);
          console.log('📞 After removing +:', phoneNumber);
        }
        
        if (phoneNumber.startsWith('0')) {
          phoneNumber = '972' + phoneNumber.substring(1);
          console.log('📞 After 0 → 972:', phoneNumber);
        }
        
        if (!phoneNumber.startsWith('972')) {
          console.log(`❌ Invalid phone format: ${phoneNumber}`);
          failedCount++;
          failedDetails.push({
            name: recipient.name || 'Unknown',
            whatsapp: recipient.whatsapp,
            error: `Invalid phone format. Must start with 972 or 0. Got: ${phoneNumber}`
          });
          continue;
        }

        if (!/^\d+$/.test(phoneNumber)) {
          console.log(`❌ Phone contains non-digits: ${phoneNumber}`);
          failedCount++;
          failedDetails.push({
            name: recipient.name || 'Unknown',
            whatsapp: recipient.whatsapp,
            error: `Phone number contains invalid characters: ${phoneNumber}`
          });
          continue;
        }

        console.log('✅ Final phone number:', phoneNumber);

        // Get the message (either from recipient or template)
        let messageToSend;
        if (hasEmbeddedMessages) {
          messageToSend = recipient.message_content;
          console.log('💬 Using embedded message from recipient');
        } else {
          messageToSend = message_template.replace(/\{\{name\}\}/g, recipient.name || 'שלום');
          console.log('💬 Using template with name replacement');
        }

        // Append unsubscribe link if available
        if (recipient.unsubscribe_url) {
          messageToSend += `\n\n---\nלהסרה מרשימת התפוצה: ${recipient.unsubscribe_url}`;
          console.log('🔗 Appended unsubscribe link');
        }
        
        console.log('💬 Message preview:', messageToSend.substring(0, 100) + (messageToSend.length > 100 ? '...' : ''));

        const sendResult = await sendWhatsapp(phoneNumber, messageToSend);

        if (sendResult.ok) {
          successCount++;
          console.log(`✅ SUCCESS for ${phoneNumber}`);
        } else {
          failedCount++;
          failedDetails.push({
            name: recipient.name || 'Unknown',
            whatsapp: phoneNumber,
            error: sendResult.error
          });
          console.log(`❌ FAILED for ${phoneNumber}: ${sendResult.error}`);
        }

        // Delay between messages
        if (i < recipients.length - 1) {
          console.log('⏳ Waiting 1.5 seconds before next message...');
          await new Promise(resolve => setTimeout(resolve, 1500));
        }

      } catch (error) {
        failedCount++;
        failedDetails.push({
          name: recipient.name || 'Unknown',
          whatsapp: recipient.whatsapp || 'N/A',
          error: error.message,
          stack: error.stack
        });
        console.log(`❌ EXCEPTION for recipient:`, error.message);
        console.log('Stack trace:', error.stack);
      }
    }

    console.log('\n=== 📊 FINAL RESULTS ===');
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Failed: ${failedCount}`);
    console.log(`📊 Total: ${recipients.length}`);
    if (failedDetails.length > 0) {
      console.log('❌ Failed details:', JSON.stringify(failedDetails, null, 2));
    }

    const result = {
      success_count: successCount,
      failed_count: failedCount,
      failed_details: failedDetails,
      total: recipients.length,
      message: `נשלחו בהצלחה ${successCount} מתוך ${recipients.length} הודעות וואטסאפ`
    };

    console.log('✅ Returning result');
    return Response.json(result);

  } catch (error) {
    console.error('=== ❌ FATAL ERROR IN FUNCTION ===');
    console.error('Error message:', error.message);
    console.error('Stack trace:', error.stack);
    return Response.json({ 
      error: error.message,
      stack: error.stack,
      details: 'Check function logs for more information'
    }, { status: 500 });
  }
});