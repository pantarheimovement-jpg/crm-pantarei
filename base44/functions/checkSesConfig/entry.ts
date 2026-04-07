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

    console.log(`checkSesConfig: region=${region}, configSet=${configSetName}, keyPrefix=${accessKeyId?.substring(0, 8)}...`);

    if (!accessKeyId || !secretAccessKey) {
      return Response.json({ error: 'AWS credentials not configured' }, { status: 400 });
    }

    const client = new SESv2Client({
      region,
      credentials: {
        accessKeyId: accessKeyId.trim(),
        secretAccessKey: secretAccessKey.trim(),
      },
    });

    let configResult, destResult;

    try {
      configResult = await client.send(new GetConfigurationSetCommand({
        ConfigurationSetName: configSetName,
      }));
    } catch (configErr) {
      console.error('GetConfigurationSet error:', configErr.name, configErr.message);
      
      // If access denied, return a helpful message
      if (configErr.name === 'AccessDeniedException' || configErr.message?.includes('security token') || configErr.message?.includes('not authorized')) {
        return Response.json({
          error: 'missing_permissions',
          message: `ה-IAM User שלך צריך הרשאה ses:GetConfigurationSet. כרגע יש לו רק הרשאת שליחה.`,
          details: configErr.message,
          suggestion: 'הוסיפי את ה-policy הבא ב-AWS IAM:\n{\n  "Effect": "Allow",\n  "Action": ["ses:GetConfigurationSet*", "ses:DescribeConfigurationSet"],\n  "Resource": "*"\n}'
        }, { status: 403 });
      }
      throw configErr;
    }

    destResult = await client.send(new GetConfigurationSetEventDestinationsCommand({
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
    console.error('checkSesConfig error:', error.name, error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});