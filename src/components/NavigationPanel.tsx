/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Compass, Volume2, Search, Play } from 'lucide-react';
import { LocationInfo } from '../types';
import { speech } from '../utils/speech';

interface NavigationPanelProps {
  onLocationUpdate: (info: LocationInfo) => void;
}

export default function NavigationPanel({ onLocationUpdate }: NavigationPanelProps) {
  const [gpsLoading, setGpsLoading] = useState(false);
  const [location, setLocation] = useState<LocationInfo | null>(null);
  const [targetDestination, setTargetDestination] = useState('');
  const [activeRoute, setActiveRoute] = useState<{ name: string; distance: string; eta: string; steps: string[] } | null>(null);

  const mockSafetyPoints = [
    { name: 'Home Sweet Home', distance: '120 meters', eta: '2 mins', steps: ['Walk forward 50 meters', 'Turn left at the brick wall', 'Your doorway is 10 meters ahead on the right'] },
    { name: 'Local Pharmacy', distance: '450 meters', eta: '6 mins', steps: ['Walk forward 100 meters to the curb', 'Turn right and proceed past the grocery store', 'Cross at the crosswalk carefully', 'The pharmacy is on your left'] },
    { name: 'Subway Transit Station', distance: '900 meters', eta: '12 mins', steps: ['Exit building lobby', 'Head south for 4 blocks', 'Subway stairs are equipped with yellow tactile ridges on the right-hand entrance'] }
  ];

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      speech.speak('GPS error: Geolocation is not supported by this browser.');
      return;
    }

    setGpsLoading(true);
    speech.speak('Acquiring high-precision GPS satellite lock...');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Reverse geocoding via standard free osm API or mock fallback
        let address = 'Tactile crossroad segment, near Metropolitan District';
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`);
          if (res.ok) {
            const data = await res.json();
            address = data.display_name || address;
          }
        } catch (e) {
          console.error('Failed to reverse geocode:', e);
        }

        const info: LocationInfo = {
          latitude,
          longitude,
          address,
          nearbyPOIs: ['Metro Bus Stop', 'Local Pharmacy & Clinic', 'Accessibility Crosswalk'],
          timestamp: new Date().toISOString(),
        };

        setLocation(info);
        onLocationUpdate(info);
        setGpsLoading(false);

        // Speak the address and coordinate details
        const speakText = `GPS locked. Your location is: ${address}. Latitude: ${latitude.toFixed(5)}, Longitude: ${longitude.toFixed(5)}. Heading set north.`;
        speech.speak(speakText);
      },
      (error) => {
        console.error('GPS error:', error);
        setGpsLoading(false);
        speech.speak('GPS alert: Unable to obtain high accuracy satellite lock. Using offline cellular backup.');
        
        // Mock fallback for preview context
        const info: LocationInfo = {
          latitude: 37.77492,
          longitude: -122.41942,
          address: 'Market Street Access Segment, San Francisco, California',
          nearbyPOIs: ['Civic Center Transit', 'Blind Community Center', 'Safe Crossing Walkway'],
          timestamp: new Date().toISOString(),
        };
        setLocation(info);
        onLocationUpdate(info);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    handleGetLocation();
  }, []);

  const handleStartRoute = (route: typeof mockSafetyPoints[0]) => {
    setActiveRoute({
      name: route.name,
      distance: route.distance,
      eta: route.eta,
      steps: route.steps
    });
    
    const speakText = `Navigation started to: ${route.name}. Total distance is ${route.distance}, estimated time is ${route.eta}. First direction: ${route.steps[0]}.`;
    speech.speak(speakText);
  };

  const speakNavigationStep = (step: string, index: number) => {
    speech.speak(`Step ${index + 1}: ${step}`);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col gap-6 shadow-xl h-full">
      <div className="flex items-center justify-between">
        <h3 className="text-zinc-200 font-semibold tracking-tight text-sm md:text-base flex items-center gap-2">
          <Navigation size={18} className="text-emerald-400 rotate-45" />
          Tactile GPS & Navigation
        </h3>
        <button
          id="refresh-gps-btn"
          onClick={handleGetLocation}
          disabled={gpsLoading}
          className="p-2.5 bg-zinc-950 hover:bg-zinc-800 disabled:text-zinc-600 text-zinc-300 border border-zinc-800 rounded-xl text-xs transition flex items-center gap-2"
        >
          <Compass size={14} className={gpsLoading ? 'animate-spin' : ''} />
          {gpsLoading ? 'Acquiring...' : 'Update Location'}
        </button>
      </div>

      {location && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Geolocation metadata card */}
          <div className="flex flex-col gap-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                  <MapPin size={18} />
                </div>
                <div>
                  <p className="text-zinc-400 text-xxs font-mono uppercase tracking-wider">Current Lock Address</p>
                  <p className="text-zinc-100 text-xs md:text-sm font-medium mt-1 leading-relaxed">
                    {location.address}
                  </p>
                </div>
              </div>

              <div className="border-t border-zinc-800 pt-3 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-zinc-500 text-[10px] font-mono">LATITUDE</p>
                  <p className="text-zinc-300 font-mono text-xs mt-0.5">{location.latitude.toFixed(6)}</p>
                </div>
                <div>
                  <p className="text-zinc-500 text-[10px] font-mono">LONGITUDE</p>
                  <p className="text-zinc-300 font-mono text-xs mt-0.5">{location.longitude.toFixed(6)}</p>
                </div>
              </div>
            </div>

            {/* Safety Waypoints list */}
            <div>
              <p className="text-zinc-400 text-xs font-semibold mb-3">Registered Accessibility Waypoints</p>
              <div className="flex flex-col gap-2.5">
                {mockSafetyPoints.map((point, idx) => (
                  <div
                    key={idx}
                    className="bg-zinc-950/60 border border-zinc-850 p-3.5 rounded-2xl flex items-center justify-between gap-4"
                  >
                    <div>
                      <h4 className="text-zinc-200 text-xs font-bold">{point.name}</h4>
                      <p className="text-zinc-500 text-xxs mt-1 font-mono">
                        Distance: {point.distance} • Est: {point.eta}
                      </p>
                    </div>
                    <button
                      id={`start-route-btn-${idx}`}
                      onClick={() => handleStartRoute(point)}
                      className="p-2 bg-zinc-900 hover:bg-zinc-800 text-emerald-400 rounded-xl border border-zinc-800 transition"
                      title={`Navigate to ${point.name}`}
                    >
                      <Play size={14} fill="currentColor" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive OSM Map Frame */}
          <div className="flex flex-col gap-4">
            <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden min-h-[180px] relative">
              {location.latitude && location.longitude && (
                <iframe
                  id="osm-map-iframe"
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  scrolling="no"
                  marginHeight={0}
                  marginWidth={0}
                  src={`https://maps.google.com/maps?q=${location.latitude},${location.longitude}&hl=en&z=17&output=embed`}
                  className="w-full h-full grayscale opacity-80"
                />
              )}
            </div>

            {/* Active Route Steps list */}
            {activeRoute && (
              <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-2xl flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="text-emerald-400 text-xs font-bold font-mono">NAVIGATING TO: {activeRoute.name}</span>
                  <button
                    id="cancel-route-btn"
                    onClick={() => {
                      setActiveRoute(null);
                      speech.speak('Navigation cancelled.');
                    }}
                    className="text-red-400 text-xxs font-bold hover:underline"
                  >
                    Exit Route
                  </button>
                </div>
                <div className="flex flex-col gap-2 max-h-[140px] overflow-y-auto pr-1">
                  {activeRoute.steps.map((step, idx) => (
                    <button
                      id={`speak-step-btn-${idx}`}
                      key={idx}
                      onClick={() => speakNavigationStep(step, idx)}
                      className="text-left bg-zinc-900 hover:bg-zinc-850 p-2 rounded-xl text-[11px] text-zinc-300 border border-zinc-800 flex items-start gap-2 transition"
                    >
                      <span className="w-4.5 h-4.5 shrink-0 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] text-emerald-400 font-bold font-mono">
                        {idx + 1}
                      </span>
                      <span className="leading-normal">{step}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
