import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { SNSClient, ListSubscriptionsByTopicCommand, SubscribeCommand } from 'npm:@aws-sdk/client-sns@^3';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { webhook_url } = await req.json();
    if (!webhook_url) {
      return Response.json({ error: 'Missing webhook_url parameter' }, { status: 400 });
    }

    const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID');
    const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');
    const region = Deno.env.get('AWS_REGION') || 'eu-north-1';
    const topicArn = 'arn:aws:sns:eu-north-1:716563790017:ses-email-events';

    const client = new SNSClient({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });

    // First check existing subscriptions
    const listResult = await client.send(new ListSubscriptionsByTopicCommand({ TopicArn: topicArn }));
    const existingSubs = (listResult.Subscriptions || []).map(s => ({
      endpoint: s.Endpoint,
      protocol: s.Protocol,
      status: s.SubscriptionArn,
    }));

    console.log('Existing subscriptions:', JSON.stringify(existingSubs, null, 2));

    // Check if already subscribed
    const alreadySubscribed = existingSubs.find(s => s.endpoint === webhook_url);
    if (alreadySubscribed) {
      return Response.json({
        status: 'already_subscribed',
        subscription: alreadySubscribed,
        all_subscriptions: existingSubs,
      });
    }

    // Subscribe
    const subscribeResult = await client.send(new SubscribeCommand({
      TopicArn: topicArn,
      Protocol: 'https',
      Endpoint: webhook_url,
    }));

    console.log('Subscribe result:', JSON.stringify(subscribeResult));

    return Response.json({
      status: 'subscription_created',
      subscriptionArn: subscribeResult.SubscriptionArn,
      webhook_url,
      note: 'The handleSesEvents function will auto-confirm the subscription when SNS sends the SubscriptionConfirmation request.',
      all_subscriptions: existingSubs,
    });

  } catch (error) {
    console.error('Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});