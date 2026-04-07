import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { SESv2Client, GetConfigurationSetCommand, GetConfigurationSetEventDestinationsCommand } from 'npm:@aws-sdk/client-sesv2@^3';

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

    console.log(`checkSesConfig: region=${region}, configSet=${configSetName}, hasKey=${!!accessKeyId}, hasSecret=${!!secretAccessKey}`);

    if (!accessKeyId || !secretAccessKey) {
      return Response.json({ error: 'AWS credentials not configured' }, { status: 400 });
    }

    const client = new SESv2Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });

    // Get configuration set info
    const configResult = await client.send(new GetConfigurationSetCommand({
      ConfigurationSetName: configSetName,
    }));

    // Get event destinations
    const destResult = await client.send(new GetConfigurationSetEventDestinationsCommand({
      ConfigurationSetName: configSetName,
    }));

    const eventDestinations = (destResult.EventDestinations || []).map(dest => ({
      name: dest.Name,
      enabled: dest.Enabled,
      matchingEventTypes: dest.MatchingEventTypes,
      snsDestination: dest.SnsDestination || null,
      cloudWatchDestination: dest.CloudWatchDestination || null,
    }));

    console.log('checkSesConfig: Success', JSON.stringify(eventDestinations));

    return Response.json({
      configurationSetName: configSetName,
      region,
      trackingOptions: configResult.TrackingOptions || 'not configured',
      sendingOptions: configResult.SendingOptions || null,
      eventDestinations,
    });

  } catch (error) {
    console.error('Error checking SES config:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});