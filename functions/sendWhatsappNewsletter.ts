import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

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
    const GREEN_ID = Deno.env.get('GREEN_ID');
    const GREEN_TOKEN = Deno.env.get('GREEN_TOKEN');
    
    console.log('GREEN_ID:', GREEN_ID ? `Set (${GREEN_ID})` : '❌ NOT SET');
    console.log('GREEN_TOKEN:', GREEN_TOKEN ? `Set (${GREEN_TOKEN.substring(0, 10)}...)` : '❌ NOT SET');
    
    if (!GREEN_ID) {
      console.log('❌ GREEN_ID is missing');
      return Response.json({ 
        error: 'GREEN_ID must be configured in Dashboard → Secrets'
      }, { status: 500 });
    }
    
    if (!GREEN_TOKEN) {
      console.log('❌ GREEN_TOKEN is missing');
      return Response.json({ 
        error: 'GREEN_TOKEN must be configured in Dashboard → Secrets'
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

    // Build Green API URL
    const greenApiUrl = `https://api.green-api.com/waInstance${GREEN_ID}/sendMessage/${GREEN_TOKEN}`;
    console.log('🌐 Green API URL:', greenApiUrl.replace(GREEN_TOKEN, 'TOKEN_HIDDEN'));

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
        
        console.log('💬 Message preview:', messageToSend.substring(0, 100) + (messageToSend.length > 100 ? '...' : ''));

        const requestBody = {
          chatId: `${phoneNumber}@c.us`,
          message: messageToSend
        };
        
        console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));
        console.log('📤 Sending request to Green API...');

        const response = await fetch(greenApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        console.log('📥 Response status:', response.status);
        console.log('📥 Response headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));
        
        const responseText = await response.text();
        console.log('📥 Response body (raw):', responseText);
        
        let responseData;
        try {
          responseData = JSON.parse(responseText);
          console.log('📥 Response body (parsed):', JSON.stringify(responseData, null, 2));
        } catch (e) {
          console.log('⚠️ Failed to parse response as JSON');
          responseData = { rawResponse: responseText };
        }

        if (response.ok && responseData.idMessage) {
          successCount++;
          console.log(`✅ SUCCESS for ${phoneNumber} - Message ID: ${responseData.idMessage}`);
        } else {
          failedCount++;
          const errorMessage = responseData.message || responseData.error || responseData.rawResponse || `HTTP ${response.status}`;
          failedDetails.push({
            name: recipient.name || 'Unknown',
            whatsapp: phoneNumber,
            error: errorMessage,
            http_status: response.status,
            response_data: responseData
          });
          console.log(`❌ FAILED for ${phoneNumber}`);
          console.log(`   Error: ${errorMessage}`);
          console.log(`   Full response:`, JSON.stringify(responseData, null, 2));
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