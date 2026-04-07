import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { SESClient, DescribeConfigurationSetCommand } from 'npm:@aws-sdk/client-ses@^3';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID');
    const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');
    const region = Deno.env.get('AWS_REGION') || 'eu-north-1';
    const configSetName = Deno.env.get('SES_CONFIGURATION_SET') || 'pantarhei-tracking';

    if (!accessKeyId || !secretAccessKey) {
      return Response.json({ error: 'AWS credentials not configured' }, { status: 400 });
    }

    const client = new SESClient({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });

    const result = await client.send(new DescribeConfigurationSetCommand({
      ConfigurationSetName: configSetName,
      ConfigurationSetAttributeNames: ['eventDestinations', 'trackingOptions']
    }));

    return Response.json({
      configurationSetName: configSetName,
      region,
      trackingOptions: result.TrackingOptions || 'not configured',
      eventDestinations: (result.EventDestinations || []).map(dest => ({
        name: dest.Name,
        enabled: dest.Enabled,
        matchingEventTypes: dest.MatchingEventTypes,
        snsDestination: dest.SNSDestination || null,
        cloudWatchDestination: dest.CloudWatchDestination || null,
      }))
    });

  } catch (error) {
    console.error('Error checking SES config:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});