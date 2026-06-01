import React, { useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { Globe } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

export default function GeoHeatmap({ events }) {
  const geoData = useMemo(() => {
    // Group events by city+country
    const locationMap = {};
    for (const ev of events) {
      if (!ev.latitude || !ev.longitude) continue;
      const key = `${ev.city || 'Unknown'},${ev.country || 'Unknown'}`;
      if (!locationMap[key]) {
        locationMap[key] = {
          city: ev.city || 'לא ידוע',
          country: ev.country || 'לא ידוע',
          lat: ev.latitude,
          lng: ev.longitude,
          opens: 0,
          clicks: 0,
          total: 0,
        };
      }
      if (ev.event_type === 'open') locationMap[key].opens++;
      if (ev.event_type === 'click') locationMap[key].clicks++;
      locationMap[key].total++;
    }
    return Object.values(locationMap).sort((a, b) => b.total - a.total);
  }, [events]);

  const hasGeoData = geoData.length > 0;

  // Country summary for the table
  const countrySummary = useMemo(() => {
    const map = {};
    for (const loc of geoData) {
      if (!map[loc.country]) map[loc.country] = { country: loc.country, opens: 0, clicks: 0, total: 0 };
      map[loc.country].opens += loc.opens;
      map[loc.country].clicks += loc.clicks;
      map[loc.country].total += loc.total;
    }
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [geoData]);

  const maxTotal = geoData.length > 0 ? Math.max(...geoData.map(d => d.total)) : 1;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Globe className="w-5 h-5 text-[var(--crm-primary)]" />
        <h2 className="text-xl font-bold text-[var(--crm-text)]" style={{ fontFamily: 'var(--font-headings)' }}>
          מפת פתיחות גאוגרפית
        </h2>
      </div>

      {!hasGeoData ? (
        <div className="bg-gray-50 rounded-xl p-8 text-center">
          <Globe className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 font-medium">אין עדיין נתונים גאוגרפיים</p>
          <p className="text-gray-400 text-sm mt-1">נתוני מיקום ייאספו אוטומטית מפתיחות מייל חדשות</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Map */}
          <div className="rounded-xl overflow-hidden border border-gray-200" style={{ height: 400 }}>
            <MapContainer
              center={[31.5, 34.8]}
              zoom={3}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {geoData.map((loc, i) => {
                const radius = 8 + (loc.total / maxTotal) * 22;
                return (
                  <CircleMarker
                    key={i}
                    center={[loc.lat, loc.lng]}
                    radius={radius}
                    fillColor="#6D436D"
                    fillOpacity={0.6}
                    color="#6D436D"
                    weight={1}
                    opacity={0.8}
                  >
                    <Popup>
                      <div className="text-right" dir="rtl">
                        <strong>{loc.city}, {loc.country}</strong>
                        <br />
                        פתיחות: {loc.opens} | קליקים: {loc.clicks}
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>

          {/* Country table */}
          <div>
            <h3 className="font-bold text-[var(--crm-text)] mb-2 text-sm">פילוח לפי מדינה</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-600">
                    <th className="text-right px-3 py-2 rounded-tr-lg">מדינה</th>
                    <th className="text-center px-3 py-2">פתיחות</th>
                    <th className="text-center px-3 py-2">קליקים</th>
                    <th className="text-center px-3 py-2 rounded-tl-lg">סה״כ</th>
                  </tr>
                </thead>
                <tbody>
                  {countrySummary.map((row, i) => (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium">{row.country}</td>
                      <td className="text-center px-3 py-2">{row.opens}</td>
                      <td className="text-center px-3 py-2">{row.clicks}</td>
                      <td className="text-center px-3 py-2 font-bold text-[var(--crm-primary)]">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top cities */}
          <div>
            <h3 className="font-bold text-[var(--crm-text)] mb-2 text-sm">ערים מובילות</h3>
            <div className="flex flex-wrap gap-2">
              {geoData.slice(0, 10).map((loc, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-50 text-purple-800 rounded-full text-xs font-medium"
                >
                  {loc.city}, {loc.country}
                  <span className="bg-purple-200 text-purple-900 rounded-full px-1.5 text-xs">{loc.total}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}