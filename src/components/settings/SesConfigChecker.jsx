import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';

export default function SesConfigChecker() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const checkConfig = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await base44.functions.invoke('checkSesConfig', {});
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-bold text-gray-900">🔍 בדיקת SES Configuration Set</h4>
          <p className="text-sm text-gray-600 mt-1">בודק אילו אירועים מוגדרים ב-AWS SES (Open, Click, Bounce...)</p>
        </div>
        <button
          onClick={checkConfig}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          בדוק עכשיו
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
          <div>
            <p className="font-medium text-red-800">שגיאה</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm font-medium text-gray-700">Configuration Set: <span className="font-bold">{result.configurationSetName}</span></p>
            <p className="text-sm text-gray-500">Region: {result.region}</p>
          </div>

          {result.trackingOptions && (
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-2">Tracking Options:</p>
              <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto" dir="ltr">{JSON.stringify(result.trackingOptions, null, 2)}</pre>
            </div>
          )}

          {result.eventDestinations?.length > 0 ? (
            result.eventDestinations.map((dest, idx) => (
              <div key={idx} className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  {dest.enabled ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                  <p className="font-medium text-gray-900">{dest.name} ({dest.enabled ? 'פעיל' : 'כבוי'})</p>
                </div>
                
                <p className="text-sm font-medium text-gray-700 mb-2">אירועים מוגדרים:</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {['SEND', 'OPEN', 'CLICK', 'BOUNCE', 'COMPLAINT', 'DELIVERY', 'REJECT'].map(type => {
                    const isActive = dest.matchingEventTypes?.includes(type);
                    return (
                      <span key={type} className={`px-3 py-1 text-xs font-medium rounded-full ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                        {isActive ? '✓' : '✗'} {type}
                      </span>
                    );
                  })}
                </div>

                {!dest.matchingEventTypes?.includes('CLICK') && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                    <p className="text-sm text-yellow-800">
                      <strong>CLICK לא מוגדר!</strong> צריך להוסיף CLICK לאירועים ב-AWS Console כדי לעקוב אחרי קליקים.
                    </p>
                  </div>
                )}

                {dest.snsDestination && (
                  <p className="text-xs text-gray-500 mt-2" dir="ltr">SNS Topic: {dest.snsDestination.TopicARN}</p>
                )}
              </div>
            ))
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <p className="text-sm text-yellow-800">אין Event Destinations מוגדרים! צריך להגדיר SNS destination עם אירועי Open, Click, Bounce.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}