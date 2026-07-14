/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sliders, Volume2, User, Eye, Info } from 'lucide-react';
import { SpeechSettings } from '../types';
import { speech } from '../utils/speech';

interface SettingsPanelProps {
  onSettingsUpdate: (settings: SpeechSettings) => void;
}

export default function SettingsPanel({ onSettingsUpdate }: SettingsPanelProps) {
  const [settings, setSettings] = useState<SpeechSettings>({
    voiceName: '',
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    enabled: true,
  });

  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    // Load setting states
    setSettings(speech.getSettings());

    // Load synth voices
    const loadVoices = () => {
      const voices = speech.getVoices();
      // Filter for English or clean speaking voices for a clear assist
      const cleanVoices = voices.filter(v => v.lang.startsWith('en') || v.lang.startsWith('es') || v.lang.startsWith('hi'));
      setAvailableVoices(cleanVoices.length > 0 ? cleanVoices : voices);
    };

    loadVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const handleChangeRate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rate = parseFloat(e.target.value);
    const updated = { ...settings, rate };
    setSettings(updated);
    speech.saveSettings({ rate });
    onSettingsUpdate(updated);
  };

  const handleChangePitch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pitch = parseFloat(e.target.value);
    const updated = { ...settings, pitch };
    setSettings(updated);
    speech.saveSettings({ pitch });
    onSettingsUpdate(updated);
  };

  const handleChangeVoice = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const voiceName = e.target.value;
    const updated = { ...settings, voiceName };
    setSettings(updated);
    speech.saveSettings({ voiceName });
    onSettingsUpdate(updated);
    
    // Play test speech
    speech.speak(`Voice updated. rate set to ${settings.rate} speed.`);
  };

  const handleTestSpeech = () => {
    speech.speak('This is a test of the AI Smart Vision vocal assistant. Synthesized lock active.');
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl h-full flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h3 className="text-zinc-200 font-semibold tracking-tight text-sm md:text-base flex items-center gap-2">
          <Sliders size={18} className="text-emerald-400" />
          Speech & Vocal Settings
        </h3>
        <button
          id="test-speech-btn"
          onClick={handleTestSpeech}
          className="bg-zinc-950 hover:bg-zinc-800 text-emerald-400 border border-zinc-850 px-3.5 py-1.5 rounded-xl text-xxs font-mono font-bold transition flex items-center gap-1.5"
        >
          <Volume2 size={12} /> Test Speech
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {/* Voice Selector */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] text-zinc-500 font-bold uppercase font-mono flex items-center gap-1">
            <User size={10} /> Reader Voice Profile
          </label>
          <select
            id="voice-select"
            value={settings.voiceName}
            onChange={handleChangeVoice}
            className="w-full bg-zinc-950 text-zinc-200 border border-zinc-800 px-3 py-2.5 rounded-xl text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="">Default English Voice</option>
            {availableVoices.map((voice, idx) => (
              <option key={idx} value={voice.name}>
                {voice.name} ({voice.lang})
              </option>
            ))}
          </select>
        </div>

        {/* Speed / Rate control */}
        <div className="flex flex-col gap-2 bg-zinc-950 p-4 rounded-2xl border border-zinc-850">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-400 font-bold uppercase font-mono">Speech Speed (Rate)</span>
            <span className="text-emerald-400 text-xs font-mono font-bold">{settings.rate.toFixed(1)}x</span>
          </div>
          <input
            id="speech-rate-range"
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={settings.rate}
            onChange={handleChangeRate}
            className="w-full accent-emerald-400 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
          />
        </div>

        {/* Pitch control */}
        <div className="flex flex-col gap-2 bg-zinc-950 p-4 rounded-2xl border border-zinc-850">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-400 font-bold uppercase font-mono">Voice Pitch</span>
            <span className="text-emerald-400 text-xs font-mono font-bold">{settings.pitch.toFixed(1)}</span>
          </div>
          <input
            id="speech-pitch-range"
            type="range"
            min="0.5"
            max="1.5"
            step="0.1"
            value={settings.pitch}
            onChange={handleChangePitch}
            className="w-full accent-emerald-400 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
          />
        </div>

        {/* Accessibility & contrast tips */}
        <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-2xl flex gap-3 text-zinc-400">
          <Info size={16} className="text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h5 className="text-zinc-200 text-xxs font-bold uppercase font-mono tracking-wider">Acoustic Navigation Guide</h5>
            <p className="text-[10px] leading-relaxed">
              This application utilizes high contrast Slate and pitch-dark hues to make elements easily readable. Double-tap buttons or invoke the spoken command module for ears-free assistance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
