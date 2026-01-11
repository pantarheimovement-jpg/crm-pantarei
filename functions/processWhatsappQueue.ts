import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') { 
        return Response.json({error: 'Forbidden'}, {status: 403}); 
    }
    
    const pendingMessages = await base44.asServiceRole.entities.WhatsappQueue.filter({ 
        status: 'pending' 
    }, 'created_date', 1); 
    
    if (!pendingMessages || pendingMessages.length === 0) {
        return Response.json({ message: 'No pending messages found in queue.' });
    }
    
    const message = pendingMessages[0];
    console.log(`Processing message ID: ${message.id} for subscriber: ${message.subscriber_name}`);
    
    const GREEN_ID = Deno.env.get("GREEN_ID");
    const GREEN_TOKEN = Deno.env.get("GREEN_TOKEN");
    
    if (!GREEN_ID || !GREEN_TOKEN) {
        return Response.json({ error: 'Configuration Error: Missing API Credentials' }, { status: 500 });
    }
    
    try {
        const response = await fetch(
            `https://api.green-api.com/waInstance${GREEN_ID}/sendMessage/${GREEN_TOKEN}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatId: `${message.whatsapp_number}@c.us`,
                    message: message.message_content
                })
            }
        );
        
        const result = await response.json();
        
        if (response.ok) {
            await base44.asServiceRole.entities.WhatsappQueue.update(message.id, { 
                status: 'sent',
                sent_at: new Date().toISOString()
            });
            return Response.json({ success: true, sent_to: message.subscriber_name });
        } else {
            await base44.asServiceRole.entities.WhatsappQueue.update(message.id, { 
                status: 'failed',
                error_message: result.message || JSON.stringify(result) || 'Unknown error'
            });
            return Response.json({ success: false, error: result.message });
        }
    } catch (error) {
        await base44.asServiceRole.entities.WhatsappQueue.update(message.id, { 
            status: 'failed',
            error_message: error.message
        });
        return Response.json({ success: false, error: error.message });
    }
});