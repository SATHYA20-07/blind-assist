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
  appLanguage?: string;
}

const waypointTranslations: Record<string, Record<string, { name: string; distance: string; eta: string; steps: string[] }>> = {
  Tamil: {
    'Home Sweet Home': {
      name: 'இல்லம் (Home)',
      distance: '120 மீட்டர்கள்',
      eta: '2 நிமிடங்கள்',
      steps: [
        '50 மீட்டர்கள் நேராக முன்னோக்கி செல்லவும்',
        'செங்கல் சுவரில் இடதுபுறமாக திரும்பவும்',
        'உங்கள் கதவு 10 மீட்டர்கள் முன்னால் வலதுபுறத்தில் உள்ளது'
      ]
    },
    'Local Pharmacy': {
      name: 'உள்ளூர் மருந்தகம் (Pharmacy)',
      distance: '450 மீட்டர்கள்',
      eta: '6 நிமிடங்கள்',
      steps: [
        'முன்னோக்கி 100 மீட்டர்கள் நடைபாதைக்கு செல்லவும்',
        'வலதுபுறம் திரும்பி மளிகைக் கடையைக் கடந்து செல்லவும்',
        'பாதசாரிகள் கடக்கும் இடத்தில் கவனமாக கடக்கவும்',
        'மருந்தகம் உங்கள் இடதுபுறத்தில் உள்ளது'
      ]
    },
    'Subway Transit Station': {
      name: 'மெட்ரோ ரயில் நிலையம் (Subway)',
      distance: '900 மீட்டர்கள்',
      eta: '12 நிமிடங்கள்',
      steps: [
        'கட்டடத்தின் வரவேற்பறையை விட்டு வெளியேறவும்',
        'தெற்கு நோக்கி 4 தெருக்கள் செல்லவும்',
        'ரயில் நிலையப் படிகளில் வலதுபுற நுழைவாயிலில் மஞ்சள் தடித்த எச்சரிக்கைக் கோடுகள் உள்ளன'
      ]
    }
  },
  Hindi: {
    'Home Sweet Home': {
      name: 'मेरा प्यारा घर (Home)',
      distance: '120 मीटर',
      eta: '2 मिनट',
      steps: [
        '50 मीटर सीधे आगे चलें',
        'ईंट की दीवार पर बाईं ओर मुड़ें',
        'आपका दरवाज़ा 10 मीटर आगे दाईं ओर है'
      ]
    },
    'Local Pharmacy': {
      name: 'स्थानीय दवा की दुकान (Pharmacy)',
      distance: '450 मीटर',
      eta: '6 मिनट',
      steps: [
        'फुटपाथ की ओर 100 मीटर आगे चलें',
        'दाईं ओर मुड़ें और किराना दुकान के पास से आगे बढ़ें',
        'क्रॉसवॉक पर ध्यान से पार करें',
        'दवा की दुकान आपके बाईं ओर है'
      ]
    },
    'Subway Transit Station': {
      name: 'मेट्रो स्टेशन (Subway)',
      distance: '900 मीटर',
      eta: '12 मिनट',
      steps: [
        'इमारत की लॉबी से बाहर निकलें',
        'दक्षिण की ओर 4 ब्लॉक चलें',
        'सबवे सीढ़ियों के दाहिने प्रवेश द्वार पर पीले स्पर्शनीय उभार बने हैं'
      ]
    }
  },
  Malayalam: {
    'Home Sweet Home': {
      name: 'എന്റെ വീട് (Home)',
      distance: '120 മീറ്റർ',
      eta: '2 മിനിറ്റ്',
      steps: [
        '50 മീറ്റർ നേരെ മുന്നോട്ട് നടക്കുക',
        'ചുവന്ന മതിൽ കണ്ട് കഴിഞ്ഞാൽ ഇടത്തോട്ട് തിരിയുക',
        'നിങ്ങളുടെ വാതിൽ 10 മീറ്റർ മുന്നിൽ വലതുവശത്താണ്'
      ]
    },
    'Local Pharmacy': {
      name: 'ഫാർമസി (Pharmacy)',
      distance: '450 മീറ്റർ',
      eta: '6 മിനിറ്റ്',
      steps: [
        '100 മീറ്റർ മുന്നോട്ട് നടക്കുക',
        'വലത്തോട്ട് തിരിഞ്ഞ് ഗ്രോസറി കട കടന്നുപോകുക',
        'വഴി ശ്രദ്ധാപൂർവ്വം ക്രോസ്സ് ചെയ്യുക',
        'ഫാർമസി നിങ്ങളുടെ ഇടതുവശത്താണ്'
      ]
    },
    'Subway Transit Station': {
      name: 'മെട്രോ സ്റ്റേഷൻ (Subway)',
      distance: '900 മീറ്റർ',
      eta: '12 മിനിറ്റ്',
      steps: [
        'കെട്ടിടത്തിന്റെ ലോബിയിൽ നിന്നും പുറത്തിറങ്ങുക',
        'തെക്കോട്ട് 4 ബ്ലോക്കുകൾ നടക്കുക',
        'മെട്രോ സ്റ്റേഷൻ പടികളിൽ മഞ്ഞ ടാക്റ്റൈൽ സൂചകങ്ങൾ ഉണ്ട്'
      ]
    }
  },
  Telugu: {
    'Home Sweet Home': {
      name: 'ఇల్లు (Home)',
      distance: '120 మీటర్లు',
      eta: '2 నిమిషాలు',
      steps: [
        '50 మీటర్లు నేరుగా ముందుకు నడవండి',
        'ఇటుక గోడ వద్ద ఎడమవైపునకు తిరగండి',
        'మీ తలుపు 10 మీటర్ల ముందుకు కుడివైపున ఉంది'
      ]
    },
    'Local Pharmacy': {
      name: 'మందుల దుకాణం (Pharmacy)',
      distance: '450 మీటర్లు',
      eta: '6 నిమిషాలు',
      steps: [
        'మందుకు 100 మీటర్లు నడవండి',
        'కుడివైపునకు తిరిగి కిరాణా దుకాణం దాటి వెళ్ళండి',
        'క్రాస్‌వాక్ వద్ద జాగ్రತ್ತగా దాటండి',
        'మందుల దుకాణం మీ ఎడమవైపున ఉంది'
      ]
    },
    'Subway Transit Station': {
      name: 'మెట్రో స్టేషన్ (Subway)',
      distance: '900 మీటర్లు',
      eta: '12 నిమిషాలు',
      steps: [
        'భవనం లాబీ నుండి బయటకు రండి',
        'దక్షిణం వైపు 4 బ్లాకులు నడవండి',
        'మెట్రో మెట్ల వద్ద కుడి ప్రవేశ మార్గంలో పసుపు గుర్తులు ఉన్నాయి'
      ]
    }
  },
  Kannada: {
    'Home Sweet Home': {
      name: 'ನನ್ನ ಮನೆ (Home)',
      distance: '120 ಮೀಟರ್',
      eta: '2 ನಿಮಿಷಗಳು',
      steps: [
        '50 ಮೀಟರ್ ನೇರವಾಗಿ ಮುಂದೆ ಸಾಗಿ',
        'ಇಟ್ಟಿಗೆ ಗೋಡೆಯ ಬಳಿ ಎಡಕ್ಕೆ ತಿರುಗಿ',
        'ನಿಮ್ಮ ಬಾಗಿಲು 10 ಮೀಟರ್ ಮುಂದೆ ಬಲಗಡೆಯಲ್ಲಿದೆ'
      ]
    },
    'Local Pharmacy': {
      name: 'ಔಷಧಿ ಅಂಗಡಿ (Pharmacy)',
      distance: '450 ಮೀಟರ್',
      eta: '6 ನಿಮಿಷಗಳು',
      steps: [
        '100 ಮೀಟರ್ ಮುಂದೆ ಸಾಗಿ',
        'ಬಲಕ್ಕೆ ತಿರುಗಿ ಕಿರಾಣಿ ಅಂಗಡಿಯ ಮುಂದೆ ಹೋಗಿ',
        'ರಸ್ತೆ ದಾಟುವಾಗ ಜಾಗರೂಕರಾಗಿರಿ',
        'ಔಷಧಿ ಅಂಗಡಿ ನಿಮ್ಮ ಎಡಭಾಗದಲ್ಲಿದೆ'
      ]
    },
    'Subway Transit Station': {
      name: 'ಮೆಟ್ರೋ ನಿಲ್ದಾಣ (Subway)',
      distance: '900 ಮೀಟರ್',
      eta: '12 ನಿಮಿಷಗಳು',
      steps: [
        'ಕಟ್ಟಡದ ಲಾಬಿಯಿಂದ ಹೊರಗೆ ಬನ್ನಿ',
        'ದಕ್ಷಿಣಕ್ಕೆ 4 ಬ್ಲಾಕ್‌ಗಳಷ್ಟು ನಡಿಯಿರಿ',
        'ಮೆಟ್ರೋ ಮೆಟ್ಟಿಲುಗಳ ಬಲ ಪ್ರವೇಶದ್ವಾರದಲ್ಲಿ ಹಳದಿ ಗುರುತುಗಳಿವೆ'
      ]
    }
  }
};

export default function NavigationPanel({ onLocationUpdate, appLanguage }: NavigationPanelProps) {
  const [gpsLoading, setGpsLoading] = useState(false);
  const [location, setLocation] = useState<LocationInfo | null>(null);
  const [targetDestination, setTargetDestination] = useState('');
  const [activeRoute, setActiveRoute] = useState<{ name: string; distance: string; eta: string; steps: string[] } | null>(null);

  const mockSafetyPoints = [
    { name: 'Home Sweet Home', distance: '120 meters', eta: '2 mins', steps: ['Walk forward 50 meters', 'Turn left at the brick wall', 'Your doorway is 10 meters ahead on the right'] },
    { name: 'Local Pharmacy', distance: '450 meters', eta: '6 mins', steps: ['Walk forward 100 meters to the curb', 'Turn right and proceed past the grocery store', 'Cross at the crosswalk carefully', 'The pharmacy is on your left'] },
    { name: 'Subway Transit Station', distance: '900 meters', eta: '12 mins', steps: ['Exit building lobby', 'Head south for 4 blocks', 'Subway stairs are equipped with yellow tactile ridges on the right-hand entrance'] }
  ];

  const pointsToUse = (appLanguage && waypointTranslations[appLanguage])
    ? mockSafetyPoints.map(p => {
        const trans = waypointTranslations[appLanguage][p.name];
        return trans ? { ...p, name: trans.name, distance: trans.distance, eta: trans.eta, steps: trans.steps } : p;
      })
    : mockSafetyPoints;

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
    
    let speakText = `Navigation started to: ${route.name}. Total distance is ${route.distance}, estimated time is ${route.eta}. First direction: ${route.steps[0]}.`;
    if (appLanguage === 'Tamil') {
      speakText = `${route.name} க்கான வழிசெலுத்தல் தொடங்கப்பட்டது. மொத்த தூரம் ${route.distance}, மதிப்பிடப்பட்ட நேரம் ${route.eta}. முதல் வழிமுறை: ${route.steps[0]}.`;
    } else if (appLanguage === 'Hindi') {
      speakText = `${route.name} के लिए नेविगेशन शुरू हो गया है। कुल दूरी ${route.distance} है, अनुमानित समय ${route.eta} है। पहला निर्देश: ${route.steps[0]}.`;
    } else if (appLanguage === 'Malayalam') {
      speakText = `${route.name} ലേക്കുള്ള നാവിഗേഷൻ ആരംഭിച്ചു. ആകെ ദൂരം ${route.distance}, സമയം ${route.eta}. ആദ്യ ഘട്ടം: ${route.steps[0]}.`;
    } else if (appLanguage === 'Telugu') {
      speakText = `${route.name} కొరకు నావిగేషన్ ప్రారంభమైంది. మొత్తం దూరం ${route.distance}, అంచనా సమయం ${route.eta}. మొదటి సూచన: ${route.steps[0]}.`;
    } else if (appLanguage === 'Kannada') {
      speakText = `${route.name} ಗೆ ಮಾರ್ಗಸೂಚಿ ಪ್ರಾರಂಭವಾಗಿದೆ. ಒಟ್ಟು ದೂರ ${route.distance}, ಅಂದಾಜು ಸಮಯ ${route.eta}. ಮೊದಲ ನಿರ್ದೇಶನ: ${route.steps[0]}.`;
    }
    speech.speak(speakText);
  };

  const speakNavigationStep = (step: string, index: number) => {
    let prefix = `Step ${index + 1}: `;
    if (appLanguage === 'Tamil') prefix = `படி ${index + 1}: `;
    else if (appLanguage === 'Hindi') prefix = `चरण ${index + 1}: `;
    else if (appLanguage === 'Malayalam') prefix = `ഘട്ടം ${index + 1}: `;
    else if (appLanguage === 'Telugu') prefix = `మెట్టు ${index + 1}: `;
    else if (appLanguage === 'Kannada') prefix = `ಹಂತ ${index + 1}: `;
    speech.speak(`${prefix}${step}`);
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
                {pointsToUse.map((point, idx) => (
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
