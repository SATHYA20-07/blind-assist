/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, HelpCircle } from 'lucide-react';
import { AssistantMode } from '../types';
import { speech } from '../utils/speech';

interface VoiceControllerProps {
  onModeChange: (mode: AssistantMode) => void;
  onTriggerCapture: () => void;
  onTriggerSOS: () => void;
  onTriggerLocationRead: () => void;
  appLanguage?: string;
}

export default function VoiceController({
  onModeChange,
  onTriggerCapture,
  onTriggerSOS,
  onTriggerLocationRead,
  appLanguage,
}: VoiceControllerProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check for webkitSpeechRecognition or speechRecognition support
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;

    // Set appropriate locale for speech-to-text
    let langCode = 'en-US';
    if (appLanguage === 'Tamil') langCode = 'ta-IN';
    else if (appLanguage === 'Hindi') langCode = 'hi-IN';
    else if (appLanguage === 'Malayalam') langCode = 'ml-IN';
    else if (appLanguage === 'Telugu') langCode = 'te-IN';
    else if (appLanguage === 'Kannada') langCode = 'kn-IN';
    rec.lang = langCode;

    rec.onstart = () => {
      setIsListening(true);
      let listMsg = 'Listening for command...';
      if (appLanguage === 'Tamil') listMsg = 'கட்டளைக்காகக் காத்திருக்கிறது...';
      if (appLanguage === 'Hindi') listMsg = 'आदेश की प्रतीक्षा की जा रही है...';
      if (appLanguage === 'Malayalam') listMsg = 'കല്പനയ്ക്കായി കാത്തിരിക്കുന്നു...';
      if (appLanguage === 'Telugu') listMsg = 'ఆజ్ఞ కోసం వేచి ఉంది...';
      if (appLanguage === 'Kannada') listMsg = 'ಆಜ್ಞೆಗಾಗಿ ಕಾಯಲಾಗುತ್ತಿದೆ...';
      setTranscript(listMsg);
    };

    rec.onresult = (event: any) => {
      const resultText = event.results[0][0].transcript.toLowerCase().trim();
      setTranscript(appLanguage === 'Tamil' ? `பெறப்பட்டது: "${resultText}"` : appLanguage === 'Hindi' ? `प्राप्त हुआ: "${resultText}"` : `Received: "${resultText}"`);
      handleCommand(resultText);
    };

    rec.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        speech.speak('Microphone access denied. Please enable mic permissions for voice control.');
      } else {
        speech.speak(appLanguage === 'Tamil' ? 'மீண்டும் முயற்சிக்கவும்.' : appLanguage === 'Hindi' ? 'कृपया फिर से प्रयास करें।' : 'Did not catch that. Please try again.');
      }
    };

    rec.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = rec;

    return () => {
      try {
        rec.abort();
      } catch (e) {}
    };
  }, [appLanguage]);

  const startListening = () => {
    if (!isSupported) {
      speech.speak('Voice control is not supported in this browser. Please use Chrome or Edge.');
      return;
    }
    
    // Stop speaking when listening starts to avoid microphone feedback
    speech.stop();

    try {
      if (isListening) {
        recognitionRef.current.stop();
      } else {
        recognitionRef.current.start();
      }
    } catch (e) {
      console.error('Failed to start speech recognition:', e);
    }
  };

  const handleCommand = (command: string) => {
    // 1. SOS commands
    if (command.includes('sos') || command.includes('emergency')) {
      speech.speak('Triggering emergency SOS alarm!');
      onTriggerSOS();
      return;
    }

    // 2. Navigation / Location commands
    if (command.includes('where am i') || command.includes('location') || command.includes('coordinates') || command.includes('gps')) {
      onTriggerLocationRead();
      return;
    }

    // 3. Scan command (Space trigger or 'capture' / 'scan' / 'snap')
    if (command === 'scan' || command === 'capture' || command === 'snap' || command === 'take picture') {
      onTriggerCapture();
      return;
    }

    // 4. Mode switcher commands
    let detectedMode: AssistantMode | null = null;
    let feedback = '';

    if (command.includes('scene') || command.includes('describe') || command.includes('surroundings')) {
      detectedMode = 'scene';
      feedback = 'Switching to scene description. Snapping photo.';
    } else if (command.includes('object') || command.includes('item') || command.includes('find')) {
      detectedMode = 'object';
      feedback = 'Switching to object detection. Snapping photo.';
    } else if (command.includes('color') || command.includes('colors')) {
      detectedMode = 'color';
      feedback = 'Switching to color identifier. Snapping photo.';
    } else if (command.includes('obstacle') || command.includes('hazard') || command.includes('blockage') || command.includes('path')) {
      detectedMode = 'obstacle';
      feedback = 'Switching to obstacle detection. Snapping photo.';
    } else if (command.includes('text') || command.includes('read') || command.includes('book') || command.includes('ocr')) {
      detectedMode = 'ocr';
      feedback = 'Switching to document text reader. Snapping photo.';
    } else if (command.includes('face') || command.includes('who is') || command.includes('recognize')) {
      detectedMode = 'face_recognize';
      feedback = 'Switching to face recognition. Snapping photo.';
    } else if (command.includes('currency') || command.includes('money') || command.includes('note') || command.includes('cash') || command.includes('bill')) {
      detectedMode = 'currency';
      feedback = 'Switching to currency counter. Snapping photo.';
    } else if (command.includes('medicine') || command.includes('pills') || command.includes('expiry') || command.includes('bottle')) {
      detectedMode = 'medicine';
      feedback = 'Switching to medicine details scanning. Snapping photo.';
    }

    if (detectedMode) {
      onModeChange(detectedMode);
      speech.speak(feedback);
      // Stagger capture slightly to let the voice announcement complete
      setTimeout(() => {
        onTriggerCapture();
      }, 1500);
    } else {
      speech.speak(`Unknown command: ${command}. Try saying "describe scene", "read text", "scan obstacle", or "trigger SOS".`);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
      <div className="flex-1 flex flex-col gap-1.5 text-center md:text-left">
        <h3 className="text-zinc-200 font-semibold tracking-tight text-sm md:text-base flex items-center justify-center md:justify-start gap-2">
          <Mic size={16} className="text-emerald-400" />
          Voice Control Module
        </h3>
        <p className="text-zinc-400 text-xs leading-relaxed">
          {transcript || 'Click mic or press Space key. Ask me: "Describe scene", "Identify objects", "Read text", or "Where am I".'}
        </p>
      </div>

      <div className="flex items-center gap-3 w-full md:w-auto justify-center">
        {/* Toggle Speech assistance trigger */}
        <button
          id="speech-voice-trigger-btn"
          onClick={() => {
            speech.speak('You can control me completely with your voice. Try saying: "Describe scene" or "Where am I".');
          }}
          className="p-3 bg-zinc-950 hover:bg-zinc-800 text-zinc-400 border border-zinc-800 rounded-2xl transition"
          title="Speak Instructions"
          aria-label="Speak Instructions"
        >
          <Volume2 size={18} />
        </button>

        {/* Mic Activation Button */}
        <button
          id="mic-listen-btn"
          onClick={startListening}
          className={`px-6 py-3.5 rounded-2xl flex items-center justify-center gap-2 font-bold text-xs tracking-wider uppercase transition cursor-pointer ${
            isListening
              ? 'bg-red-500 text-zinc-950 animate-pulse'
              : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950'
          }`}
          aria-label={isListening ? 'Stop Listening to Voice Commands' : 'Listen for Voice Commands'}
        >
          {isListening ? (
            <>
              <MicOff size={16} /> Listening...
            </>
          ) : (
            <>
              <Mic size={16} /> Spoken Commands
            </>
          )}
        </button>
      </div>
    </div>
  );
}
