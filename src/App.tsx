/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Eye,
  Box,
  Palette,
  TriangleAlert,
  FileText,
  UserCheck,
  CircleDollarSign,
  Pill,
  ShieldAlert,
  Navigation,
  Compass,
  Sliders,
  History,
  Activity,
  Calendar,
  AlertOctagon,
  Languages
} from 'lucide-react';
import { AssistantMode, UnifiedAnalysisResult, FaceProfile, LocationInfo, SpeechSettings, HistoryItem } from './types';
import CameraView from './components/CameraView';
import VoiceController from './components/VoiceController';
import NavigationPanel from './components/NavigationPanel';
import EmergencyPanel from './components/EmergencyPanel';
import FacesDatabase from './components/FacesDatabase';
import SettingsPanel from './components/SettingsPanel';
import { speech } from './utils/speech';

export default function App() {
  const [activeTab, setActiveTab] = useState<'scan' | 'nav' | 'sos' | 'faces' | 'settings'>('scan');
  const [currentMode, setCurrentMode] = useState<AssistantMode>('scene');
  const [translationTarget, setTranslationTarget] = useState('Spanish');
  const [appLanguage, setAppLanguage] = useState<'English' | 'Tamil' | 'Hindi' | 'Malayalam' | 'Telugu' | 'Kannada'>('English');
  const [lastResult, setLastResult] = useState<UnifiedAnalysisResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [registeredFaces, setRegisteredFaces] = useState<FaceProfile[]>([]);
  const [currentLocation, setCurrentLocation] = useState<LocationInfo | null>(null);
  const [activeSOS, setActiveSOS] = useState(false);

  // Initialize speech guidance on load
  useEffect(() => {
    speech.speak('Welcome to AI Smart Vision Assistant. Main scan deck is active. Touch any button to begin scanning.');
  }, []);

  // Update last analysis history items
  const handleAnalysisResult = (result: UnifiedAnalysisResult) => {
    setLastResult(result);

    let summary = '';
    let details = '';

    if (result.error) {
      summary = 'Scan failed';
      details = result.error;
    } else {
      switch (result.mode) {
        case 'scene':
          summary = result.scene?.categories.join(', ') || 'Scene scanned';
          details = result.scene?.description || '';
          break;
        case 'object':
          summary = `${result.objects?.objects.length || 0} objects detected`;
          details = result.objects?.objects.map(o => o.label).join(', ') || 'No objects';
          break;
        case 'color':
          summary = `Center: ${result.color?.centerColor.name}`;
          details = `Center Hex: ${result.color?.centerColor.hex}. Dominant surrounding colors: ${result.color?.dominantColors.map(c => c.name).join(', ')}`;
          break;
        case 'obstacle':
          summary = `${result.obstacle?.obstacles.length || 0} obstacles found`;
          details = result.obstacle?.obstacles.map(o => `${o.label} (${o.distance})`).join('. ') || 'All clear';
          break;
        case 'ocr':
          summary = `Text in ${result.ocr?.language}`;
          details = result.ocr?.translation ? `Translation: ${result.ocr.translation}` : `Extracted text: ${result.ocr?.text}`;
          break;
        case 'face_recognize':
          summary = `Identified ${result.face?.recognized.length || 0} people`;
          details = `${result.face?.recognized.map(f => f.name).join(', ')} / Unknowns: ${result.face?.unknownFacesCount || 0}`;
          break;
        case 'currency':
          summary = `Cash Value: ${result.currency?.totalValue} ${result.currency?.currencyCode}`;
          details = result.currency?.notes.map(n => n.denomination).join(', ') || 'No cash';
          break;
        case 'medicine':
          summary = result.medicine?.medicineName || 'Medicine scanned';
          details = `${result.medicine?.expiryDate ? `Expiry: ${result.medicine.expiryDate}. ` : ''}${result.medicine?.isExpired ? 'WARNING: EXPIRED. ' : ''}${result.medicine?.dosageInstruction || ''}`;
          break;
      }
    }

    const newItem: HistoryItem = {
      id: Date.now().toString(),
      mode: result.mode,
      timestamp: new Date().toISOString(),
      summary,
      details,
    };

    setHistory(prev => [newItem, ...prev].slice(0, 15)); // Limit to last 15 scans
  };

  const handleVoiceModeChange = (mode: AssistantMode) => {
    setCurrentMode(mode);
    setActiveTab('scan');
  };

  const speakLocationDetails = () => {
    if (currentLocation) {
      speech.speak(`Your current location is: ${currentLocation.address || 'Loading coordinate street link'}`);
    } else {
      speech.speak('GPS lock is currently offline. Please wait while satellite signals configure.');
    }
  };

  // Sound cue on clicking scanner tabs
  const handleModeChangeWithVoice = (mode: AssistantMode, desc: string) => {
    setCurrentMode(mode);
    speech.speak(`Switching scanner to ${desc}`);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans antialiased selection:bg-emerald-500 selection:text-zinc-950">
      
      {/* Dynamic alarm pulse banner */}
      {activeSOS && (
        <div className="bg-red-600 text-white px-4 py-2 text-center text-xs font-black uppercase tracking-widest animate-pulse flex items-center justify-center gap-2 z-40">
          <ShieldAlert size={14} className="animate-spin" /> WARNING: EMERGENCY ACOUSTIC DISPATCH BEACON SIGNALING ACTIVE <ShieldAlert size={14} className="animate-spin" />
        </div>
      )}

      {/* Top navbar */}
      <header className="px-6 py-5 bg-zinc-900 border-b border-zinc-850 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-zinc-950 shadow-lg shadow-emerald-500/10">
              <Eye size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-zinc-100 font-extrabold tracking-tight text-lg md:text-xl">
                AI Smart Vision <span className="text-emerald-400 font-medium">Assistant</span>
              </h1>
              <p className="text-zinc-500 text-xxs font-mono uppercase tracking-wider mt-0.5">Tactile Eyes-Free Navigation Hub</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Global Multilingual Selector */}
            <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-2xl px-3 py-2 text-zinc-300">
              <Languages size={13} className="text-emerald-400" />
              <select
                id="global-language-select"
                value={appLanguage}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setAppLanguage(val);
                  let speakPhrase = `Language set to ${val}.`;
                  if (val === 'Tamil') speakPhrase = 'மொழி தமிழ் என அமைக்கப்பட்டுள்ளது.';
                  if (val === 'Hindi') speakPhrase = 'भाषा हिंदी सेट की गई है।';
                  if (val === 'Malayalam') speakPhrase = 'ഭാഷ മലയാളമായി സജ്ജീകരിച്ചിരിക്കുന്നു.';
                  if (val === 'Telugu') speakPhrase = 'భాష తెలుగుగా అమర్చబడింది.';
                  if (val === 'Kannada') speakPhrase = 'ಭಾಷೆಯನ್ನು ಕನ್ನಡಕ್ಕೆ ಹೊಂದಿಸಲಾಗಿದೆ.';
                  speech.speak(speakPhrase);
                }}
                className="bg-transparent text-xs font-bold font-sans text-zinc-200 focus:outline-none cursor-pointer pr-1"
              >
                <option value="English" className="bg-zinc-950 text-zinc-200">English</option>
                <option value="Tamil" className="bg-zinc-950 text-zinc-200">தமிழ் (Tamil)</option>
                <option value="Hindi" className="bg-zinc-950 text-zinc-200">हिन्दी (Hindi)</option>
                <option value="Malayalam" className="bg-zinc-950 text-zinc-200">മലയാളം (Malayalam)</option>
                <option value="Telugu" className="bg-zinc-950 text-zinc-200">తెలుగు (Telugu)</option>
                <option value="Kannada" className="bg-zinc-950 text-zinc-200">ಕನ್ನಡ (Kannada)</option>
              </select>
            </div>

            {/* Accessibility tabs switcher */}
          <nav className="flex bg-zinc-950 p-1.5 rounded-2xl border border-zinc-800">
            {[
              { id: 'scan', label: 'Scanner', icon: Eye },
              { id: 'nav', label: 'Navigation', icon: Navigation },
              { id: 'faces', label: 'Face Book', icon: UserCheck },
              { id: 'sos', label: 'Distress (SOS)', icon: ShieldAlert },
              { id: 'settings', label: 'Speech Set', icon: Sliders },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    speech.speak(`Entering ${tab.label} section.`);
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === tab.id
                      ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/5 font-extrabold'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                  }`}
                >
                  <Icon size={14} className={tab.id === 'nav' ? 'rotate-45' : ''} />
                  <span className="hidden md:inline">{tab.label}</span>
                </button>
              );
            })}
          </nav>
          </div>
        </div>
      </header>

      {/* Main dashboard content container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Grid Section: Stage & Controllers */}
        <section className="lg:col-span-7 flex flex-col gap-6 h-full">
          {activeTab === 'scan' && (
            <>
              {/* Scan modes selection rail */}
              <div className="bg-zinc-900 border border-zinc-800 p-4.5 rounded-3xl">
                <h3 className="text-zinc-400 text-xxs font-mono uppercase tracking-wider mb-3">Scanner Vision Capabilities</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'scene', label: 'Describe Scene', desc: 'scene descriptor', icon: Eye },
                    { id: 'object', label: 'Detect Objects', desc: 'object finder', icon: Box },
                    { id: 'color', label: 'Identify Colors', desc: 'color scanner', icon: Palette },
                    { id: 'obstacle', label: 'Scan Obstacles', desc: 'obstacle path radar', icon: TriangleAlert },
                    { id: 'ocr', label: 'Read Text / OCR', desc: 'document text reader', icon: FileText },
                    { id: 'face_recognize', label: 'Match Faces', desc: 'face recognition matching', icon: UserCheck },
                    { id: 'currency', label: 'Count Currency', desc: 'cash banknotes counter', icon: CircleDollarSign },
                    { id: 'medicine', label: 'Scan Medicine', desc: 'prescription bottle scanner', icon: Pill },
                  ].map(mode => {
                    const Icon = mode.icon;
                    return (
                      <button
                        key={mode.id}
                        onClick={() => handleModeChangeWithVoice(mode.id as AssistantMode, mode.desc)}
                        className={`p-3 rounded-2xl border flex flex-col items-center text-center gap-2.5 transition cursor-pointer ${
                          currentMode === mode.id
                            ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500 shadow shadow-emerald-500/5 font-extrabold'
                            : 'bg-zinc-950 text-zinc-400 border-zinc-850 hover:bg-zinc-900/60'
                        }`}
                      >
                        <Icon size={18} className={currentMode === mode.id ? 'text-emerald-400 scale-110' : 'text-zinc-500'} />
                        <span className="text-[10px] md:text-xxs tracking-tight font-sans leading-none">{mode.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Additional Translation Option for OCR mode */}
                {currentMode === 'ocr' && (
                  <div className="mt-4 pt-4 border-t border-zinc-850 flex items-center justify-between gap-3">
                    <span className="text-zinc-400 text-xxs font-mono uppercase tracking-wider flex items-center gap-1.5">
                      <Languages size={12} className="text-emerald-400" /> Documents translation target
                    </span>
                    <select
                      id="translation-target-select"
                      value={translationTarget}
                      onChange={(e) => {
                        setTranslationTarget(e.target.value);
                        speech.speak(`Translation destination set to ${e.target.value}`);
                      }}
                      className="bg-zinc-950 text-zinc-300 border border-zinc-800 rounded-xl px-3 py-1.5 text-xxs focus:outline-none"
                    >
                      <option value="Spanish">Spanish</option>
                      <option value="French">French</option>
                      <option value="German">German</option>
                      <option value="Hindi">Hindi</option>
                      <option value="Tamil">Tamil</option>
                      <option value="Arabic">Arabic</option>
                      <option value="Chinese">Chinese</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Central Camera Display module */}
              <div className="flex-1">
                <CameraView
                  currentMode={currentMode}
                  onAnalysisResult={handleAnalysisResult}
                  registeredFaces={registeredFaces}
                  translationTarget={translationTarget}
                  appLanguage={appLanguage}
                />
              </div>

              {/* Voice Command Module */}
              <VoiceController
                onModeChange={handleVoiceModeChange}
                onTriggerCapture={() => {
                  const captureBtn = document.getElementById('main-scan-btn');
                  captureBtn?.click();
                }}
                onTriggerSOS={() => {
                  setActiveSOS(true);
                }}
                onTriggerLocationRead={speakLocationDetails}
                appLanguage={appLanguage}
              />
            </>
          )}

          {activeTab === 'nav' && (
            <NavigationPanel onLocationUpdate={(info) => setCurrentLocation(info)} appLanguage={appLanguage} />
          )}

          {activeTab === 'faces' && (
            <FacesDatabase onProfilesChange={(profiles) => setRegisteredFaces(profiles)} />
          )}

          {activeTab === 'sos' && (
            <EmergencyPanel
              currentLocation={currentLocation}
              activeSOS={activeSOS}
              onActiveSOSChange={(active) => setActiveSOS(active)}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsPanel onSettingsUpdate={() => {}} />
          )}
        </section>

        {/* Right Grid Section: Intelligence Logs & Metrics */}
        <section className="lg:col-span-5 flex flex-col gap-6 h-full">
          
          {/* Active / Last Scan results card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl flex flex-col gap-4.5 min-h-[220px]">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-zinc-200 font-semibold tracking-tight text-sm md:text-base flex items-center gap-2">
                <Activity size={16} className="text-emerald-400" />
                Live Analysis Stream
              </h3>
              <span className="text-zinc-500 text-xxs font-mono uppercase tracking-wider">Gemini 3.5 Flash</span>
            </div>

            {lastResult ? (
              <div className="flex flex-col gap-3.5">
                {/* Mode Indicator badge */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] bg-zinc-950 text-emerald-400 border border-emerald-900/30 px-3 py-1 rounded-full font-mono font-bold uppercase tracking-wider">
                    {lastResult.mode.replace('_', ' ')} scan Complete
                  </span>
                  <span className="text-zinc-500 text-xxs font-mono">
                    {new Date(lastResult.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                {/* Sub-structures of Gemini results mapped dynamically */}
                <div className="bg-zinc-950 border border-zinc-850 p-4.5 rounded-2xl max-h-[300px] overflow-y-auto">
                  {lastResult.error ? (
                    <div className="text-red-400 text-xs flex items-start gap-2">
                      <AlertOctagon size={16} className="shrink-0 mt-0.5" />
                      <span>{lastResult.error}</span>
                    </div>
                  ) : (
                    <>
                      {/* Scene mode */}
                      {lastResult.mode === 'scene' && lastResult.scene && (
                        <div className="space-y-3.5">
                          <p className="text-zinc-100 text-xs md:text-sm leading-relaxed font-sans">{lastResult.scene.description}</p>
                          <div className="flex flex-wrap gap-1.5 pt-2">
                            {lastResult.scene.categories.map((cat, idx) => (
                              <span key={idx} className="text-[10px] bg-zinc-900 text-zinc-400 border border-zinc-800 px-2.5 py-1 rounded-md font-mono">
                                #{cat}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Object mode */}
                      {lastResult.mode === 'object' && lastResult.objects && (
                        <div className="flex flex-col gap-2">
                          <div className="grid grid-cols-2 text-xxs text-zinc-500 font-mono border-b border-zinc-850 pb-1 font-bold">
                            <span>DETECTED ITEM</span>
                            <span className="text-right">CONFIDENCE</span>
                          </div>
                          {lastResult.objects.objects.map((obj, idx) => (
                            <div key={idx} className="grid grid-cols-2 text-xs text-zinc-200 border-b border-zinc-900 py-1.5 last:border-0 font-sans">
                              <span className="font-bold">{obj.label}</span>
                              <span className="text-right font-mono text-emerald-400 font-medium">
                                {Math.round(obj.confidence * 100)}%
                              </span>
                            </div>
                          ))}
                          {lastResult.objects.objects.length === 0 && (
                            <p className="text-zinc-500 text-xxs py-3 text-center">No objects identified.</p>
                          )}
                        </div>
                      )}

                      {/* Color mode */}
                      {lastResult.mode === 'color' && lastResult.color && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-12 h-12 rounded-xl border border-zinc-700 shadow shrink-0"
                              style={{ backgroundColor: lastResult.color.centerColor.hex }}
                            />
                            <div>
                              <p className="text-xxs text-zinc-400 font-mono">AIM/CENTER COLOR</p>
                              <h4 className="text-zinc-100 text-xs font-bold mt-0.5">{lastResult.color.centerColor.description}</h4>
                              <p className="text-zinc-500 text-xxs font-mono uppercase mt-0.5">{lastResult.color.centerColor.hex}</p>
                            </div>
                          </div>

                          <div className="border-t border-zinc-900 pt-3 flex flex-col gap-2">
                            <p className="text-xxs text-zinc-500 font-mono font-bold">DOMINANT CANVAS COLORS</p>
                            <div className="flex flex-col gap-2">
                              {lastResult.color.dominantColors.map((color, idx) => (
                                <div key={idx} className="flex items-center justify-between gap-4 text-xs">
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded border border-zinc-850" style={{ backgroundColor: color.hex }} />
                                    <span className="text-zinc-300 font-semibold">{color.name}</span>
                                  </div>
                                  <span className="text-zinc-500 font-mono">{color.percentage}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Obstacle mode */}
                      {lastResult.mode === 'obstacle' && lastResult.obstacle && (
                        <div className="flex flex-col gap-2.5">
                          {lastResult.obstacle.obstacles.map((obs, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between border-b border-zinc-900 pb-2 last:border-0 last:pb-0"
                            >
                              <div>
                                <h4 className="text-zinc-200 text-xs font-bold flex items-center gap-1.5">
                                  <span className={`w-2 h-2 rounded-full ${
                                    obs.severity === 'high' ? 'bg-red-500' : obs.severity === 'medium' ? 'bg-amber-500' : 'bg-blue-400'
                                  }`} />
                                  {obs.label}
                                </h4>
                                <p className="text-zinc-500 text-xxs font-mono mt-1">
                                  Direction: {obs.direction}
                                </p>
                              </div>
                              <div className="text-right">
                                <span className="text-emerald-400 text-xs font-mono font-bold">{obs.distance}</span>
                                <p className={`text-[9px] uppercase font-mono mt-0.5 ${
                                  obs.severity === 'high' ? 'text-red-400' : obs.severity === 'medium' ? 'text-amber-400' : 'text-blue-300'
                                }`}>
                                  {obs.severity} Risk
                                </p>
                              </div>
                            </div>
                          ))}
                          {lastResult.obstacle.obstacles.length === 0 && (
                            <p className="text-zinc-400 text-xs text-center py-4">All clear. No obstacles ahead.</p>
                          )}
                        </div>
                      )}

                      {/* OCR mode */}
                      {lastResult.mode === 'ocr' && lastResult.ocr && (
                        <div className="space-y-3.5">
                          <div>
                            <p className="text-xxs text-zinc-500 font-mono">EXTRACTED {lastResult.ocr.language.toUpperCase()}</p>
                            <p className="text-zinc-200 text-xs mt-1.5 font-sans whitespace-pre-wrap leading-relaxed">{lastResult.ocr.text}</p>
                          </div>
                          {lastResult.ocr.translation && (
                            <div className="border-t border-zinc-900 pt-3.5 mt-3.5">
                              <p className="text-xxs text-emerald-400 font-mono uppercase tracking-wider">TRANSLATED TO {translationTarget.toUpperCase()}</p>
                              <p className="text-zinc-100 text-xs mt-1.5 font-sans whitespace-pre-wrap leading-relaxed italic">{lastResult.ocr.translation}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Face recognition mode */}
                      {lastResult.mode === 'face_recognize' && lastResult.face && (
                        <div className="flex flex-col gap-3">
                          {lastResult.face.recognized.map((f, idx) => (
                            <div key={idx} className="flex items-center justify-between border-b border-zinc-900 pb-2 last:border-0 last:pb-0">
                              <div>
                                <h4 className="text-emerald-400 text-xs font-black">{f.name}</h4>
                                <p className="text-zinc-500 text-xxs font-mono mt-0.5">Trusted Circle Contact</p>
                              </div>
                              <span className="text-zinc-400 text-xs font-mono font-bold">
                                {Math.round(f.confidence * 100)}% Match
                              </span>
                            </div>
                          ))}

                          {lastResult.face.unknownFacesCount > 0 && (
                            <div className="bg-zinc-900/60 border border-zinc-850 p-3 rounded-xl flex items-center gap-3 mt-1">
                              <AlertOctagon size={16} className="text-amber-500 shrink-0" />
                              <span className="text-zinc-300 text-xs">
                                {lastResult.face.unknownFacesCount} unregistered face{lastResult.face.unknownFacesCount > 1 ? 's' : ''} detected in frame.
                              </span>
                            </div>
                          )}

                          {lastResult.face.recognized.length === 0 && lastResult.face.unknownFacesCount === 0 && (
                            <p className="text-zinc-500 text-xxs text-center py-4">No faces seen in snapshot.</p>
                          )}
                        </div>
                      )}

                      {/* Currency mode */}
                      {lastResult.mode === 'currency' && lastResult.currency && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between bg-zinc-900 px-4 py-3.5 rounded-xl border border-zinc-800">
                            <span className="text-xs text-zinc-400">TOTAL CASH SUM</span>
                            <span className="text-emerald-400 text-base font-black font-mono">
                              {lastResult.currency.totalValue} {lastResult.currency.currencyCode}
                            </span>
                          </div>

                          <div className="flex flex-col gap-2">
                            <p className="text-xxs text-zinc-500 font-mono font-bold uppercase">Cash details</p>
                            {lastResult.currency.notes.map((note, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs py-1">
                                <span className="text-zinc-200 font-bold">{note.denomination}</span>
                                <span className="text-zinc-500 font-mono">{Math.round(note.confidence * 100)}% match</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Medicine mode */}
                      {lastResult.mode === 'medicine' && lastResult.medicine && (
                        <div className="space-y-4">
                          <div>
                            <p className="text-xxs text-zinc-400 font-mono">MEDICINE DETECTED</p>
                            <h4 className="text-zinc-100 text-sm font-black mt-1">{lastResult.medicine.medicineName}</h4>
                            {lastResult.medicine.activeIngredients && (
                              <p className="text-zinc-400 text-xs mt-1">Ingredients: {lastResult.medicine.activeIngredients}</p>
                            )}
                          </div>

                          {lastResult.medicine.expiryDate && (
                            <div className={`p-3.5 rounded-xl border flex items-center gap-3 ${
                              lastResult.medicine.isExpired
                                ? 'bg-red-950/40 border-red-900/60 text-red-400'
                                : 'bg-emerald-950/20 border-emerald-900/40 text-emerald-400'
                            }`}>
                              <Calendar size={18} className="shrink-0" />
                              <div className="text-xs">
                                <p className="font-bold">Expiry Date: {lastResult.medicine.expiryDate}</p>
                                <p className="text-xxs mt-0.5 opacity-80">
                                  {lastResult.medicine.isExpired ? 'WARNING: EXPIRED! Do not ingest.' : 'Ingredients within safe date.'}
                                </p>
                              </div>
                            </div>
                          )}

                          {lastResult.medicine.dosageInstruction && (
                            <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800 text-xs">
                              <p className="text-zinc-400 font-bold mb-1 uppercase font-mono text-[9px]">Dosage instructions</p>
                              <p className="text-zinc-300 leading-normal">{lastResult.medicine.dosageInstruction}</p>
                            </div>
                          )}

                          {lastResult.medicine.warnings && (
                            <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-850 text-xs text-amber-400">
                              <p className="text-amber-500 font-bold mb-1 uppercase font-mono text-[9px]">Contraindications / Warnings</p>
                              <p className="leading-normal">{lastResult.medicine.warnings}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Speak button again */}
                <button
                  id="re-speak-result-btn"
                  onClick={() => lastResult && speech.speak(
                    lastResult.error
                      ? `Scan failed due to: ${lastResult.error}`
                      : document.getElementById('osm-map-iframe') ? 'Location details on view' : 'Synthesized audio ready.'
                  )}
                  className="w-full bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 py-3 rounded-xl text-xs font-semibold font-mono tracking-wide uppercase transition"
                >
                  Repeat Spoken Result
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-zinc-500 gap-2 py-8">
                <Eye size={24} className="text-zinc-700 animate-pulse" />
                <p className="text-xs leading-normal">No snapshot analyzed in this session yet.</p>
                <p className="text-[10px] font-mono text-zinc-600">Snap a picture or say a spoken command.</p>
              </div>
            )}
          </div>

          {/* History log tracker */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl flex-1 flex flex-col gap-4 min-h-[220px]">
            <h3 className="text-zinc-200 font-semibold tracking-tight text-sm md:text-base flex items-center gap-2 border-b border-zinc-800 pb-3">
              <History size={16} className="text-emerald-400" />
              Tactile Scan History
            </h3>

            <div className="flex-1 flex flex-col gap-2.5 max-h-[300px] overflow-y-auto pr-1">
              {history.length === 0 ? (
                <p className="text-zinc-600 text-xxs font-mono text-center py-10">Scan log is currently empty.</p>
              ) : (
                history.map((item) => (
                  <button
                    id={`view-history-item-${item.id}`}
                    key={item.id}
                    onClick={() => {
                      speech.speak(`${item.mode} scan: ${item.summary}. Details: ${item.details}`);
                    }}
                    className="text-left bg-zinc-950/60 hover:bg-zinc-950 p-3.5 border border-zinc-850 rounded-2xl flex flex-col gap-1 transition"
                  >
                    <div className="flex items-center justify-between text-xxs font-mono">
                      <span className="text-emerald-400 font-bold uppercase">{item.mode.replace('_', ' ')}</span>
                      <span className="text-zinc-500">{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-zinc-200 text-xs font-bold truncate mt-1">{item.summary}</p>
                    <p className="text-zinc-400 text-[10px] truncate leading-normal mt-0.5">{item.details}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Footer system status */}
      <footer className="px-6 py-4 bg-zinc-900 border-t border-zinc-850 mt-12 text-center text-[10px] font-mono text-zinc-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <p>© 2026 AI Smart Vision Assistant. Designed for full tactile eyes-free accessibility.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> API: GEMINI 3.5 FLASH</span>
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> STATUS: LOCAL ACCESSIBLE NODE</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
