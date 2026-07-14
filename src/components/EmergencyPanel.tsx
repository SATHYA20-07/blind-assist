/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Plus, Trash2, Mail, Phone, ShieldAlert, Siren } from 'lucide-react';
import { EmergencyContact, LocationInfo } from '../types';
import { speech } from '../utils/speech';

interface EmergencyPanelProps {
  currentLocation: LocationInfo | null;
  activeSOS: boolean;
  onActiveSOSChange: (active: boolean) => void;
}

export default function EmergencyPanel({
  currentLocation,
  activeSOS,
  onActiveSOSChange,
}: EmergencyPanelProps) {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRelation, setNewRelation] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');

  // Countdown for active SOS dispatch
  const [countdown, setCountdown] = useState(5);
  const countdownIntervalRef = useRef<any>(null);

  // Web Audio oscillator state
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sirenIntervalRef = useRef<any>(null);

  // Load registered contacts
  useEffect(() => {
    const saved = localStorage.getItem('emergency_contacts');
    if (saved) {
      try {
        setContacts(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse emergency contacts:', e);
      }
    } else {
      // Default placeholder contact for demo
      const defaultContacts: EmergencyContact[] = [
        {
          id: '1',
          name: 'Sarah Connor',
          relationship: 'Guardian / Sister',
          phone: '+1 (555) 019-2834',
          email: 'sarah.connor@safety-link.org',
        },
      ];
      setContacts(defaultContacts);
      localStorage.setItem('emergency_contacts', JSON.stringify(defaultContacts));
    }
  }, []);

  // Handle active SOS states
  useEffect(() => {
    if (activeSOS) {
      setCountdown(5);
      speech.speak('Warning! Emergency SOS trigger initiated. dispatching alert beacon in 5 seconds. Tap anywhere to abort.');
      
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current);
            dispatchSOSAlerts();
            startSirenAudio();
            return 0;
          }
          speech.speak(`${prev - 1}...`);
          return prev - 1;
        });
      }, 1000);
    } else {
      stopSOS();
    }

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      stopSirenAudio();
    };
  }, [activeSOS]);

  const stopSOS = () => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    stopSirenAudio();
    onActiveSOSChange(false);
  };

  // Synthesize alarm siren using Web Audio API
  const startSirenAudio = () => {
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new AudioContextClass();
      }
      
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      let toggle = false;
      sirenIntervalRef.current = setInterval(() => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        // Alternate frequencies for high-pitch panic siren
        osc.frequency.setValueAtTime(toggle ? 950 : 650, ctx.currentTime);
        toggle = !toggle;

        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }, 350);

    } catch (e) {
      console.error('Failed to play web audio siren:', e);
    }
  };

  const stopSirenAudio = () => {
    if (sirenIntervalRef.current) {
      clearInterval(sirenIntervalRef.current);
      sirenIntervalRef.current = null;
    }
  };

  const dispatchSOSAlerts = () => {
    const mapUrl = currentLocation
      ? `https://www.google.com/maps/search/?api=1&query=${currentLocation.latitude},${currentLocation.longitude}`
      : 'GPS signal blocked';

    const messageBody = `EMERGENCY ALERT: AI Smart Vision Assistant user triggered SOS distress beacon! Location coordinates: ${
      currentLocation ? `${currentLocation.latitude.toFixed(5)}, ${currentLocation.longitude.toFixed(5)}` : 'Unknown'
    }. Address: ${currentLocation?.address || 'Searching...'}. View Map: ${mapUrl}`;

    speech.speak('SOS beacon dispatched! Alert messages and GPS map pointers have been simulated to your registered guardians.');
    
    // Output simulated SMS and Email logs
    console.log('%c--- DISPATCHING MOCK SMS ---', 'color: #ef4444; font-weight: bold;');
    contacts.forEach((c) => {
      console.log(`To: ${c.name} (${c.phone})\nContent: ${messageBody}\n`);
    });
  };

  // Add Contact helper
  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPhone) return;

    const newContact: EmergencyContact = {
      id: Date.now().toString(),
      name: newName,
      relationship: newRelation || 'Friend',
      phone: newPhone,
      email: newEmail || 'no-email@safety-link.org',
    };

    const updated = [...contacts, newContact];
    setContacts(updated);
    localStorage.setItem('emergency_contacts', JSON.stringify(updated));

    speech.speak(`Emergency contact ${newName} has been added.`);
    setNewName('');
    setNewRelation('');
    setNewPhone('');
    setNewEmail('');
    setShowAddContact(false);
  };

  // Delete Contact
  const handleDeleteContact = (id: string, name: string) => {
    const updated = contacts.filter((c) => c.id !== id);
    setContacts(updated);
    localStorage.setItem('emergency_contacts', JSON.stringify(updated));
    speech.speak(`Contact ${name} deleted.`);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl h-full flex flex-col gap-6 relative overflow-hidden">
      
      {/* Active emergency dispatch banner overlay */}
      {activeSOS && (
        <div className="absolute inset-0 bg-red-950/95 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 text-center gap-6">
          <div className="w-20 h-20 bg-red-600/20 border-2 border-red-500 rounded-full flex items-center justify-center animate-bounce text-red-500">
            <Siren size={40} className="animate-pulse" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-red-500 text-2xl font-black uppercase tracking-wider">SOS ALERT TRIGGERED</h3>
            <p className="text-zinc-300 text-sm max-w-sm mx-auto leading-relaxed">
              Dispatching live location and Map coordinates to emergency guardians in:
            </p>
          </div>

          <div className="text-6xl font-black text-red-500 font-mono tracking-tighter bg-zinc-950 px-8 py-4 rounded-3xl border border-red-900">
            {countdown > 0 ? `${countdown}s` : 'DISPATCHED'}
          </div>

          <button
            id="abort-sos-btn"
            onClick={() => {
              stopSOS();
              speech.speak('Emergency alert cancelled. All distress beacons stand down.');
            }}
            className="w-full max-w-xs bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-extrabold py-4.5 rounded-2xl tracking-wide uppercase shadow-lg transition cursor-pointer"
          >
            Abort distress beacon
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-zinc-200 font-semibold tracking-tight text-sm md:text-base flex items-center gap-2">
          <ShieldAlert size={18} className="text-red-500" />
          Acoustic SOS Panic Subsystem
        </h3>
        <span className="text-zinc-500 text-xxs font-mono border border-zinc-800 bg-zinc-950 px-2.5 py-1 rounded-lg">
          Web Audio Siren
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Massive emergency trigger button */}
        <div className="bg-zinc-950 border border-zinc-850 p-6 rounded-2xl flex flex-col items-center justify-center text-center gap-4 min-h-[220px]">
          <button
            id="panic-button-trigger"
            onClick={() => onActiveSOSChange(true)}
            className="w-28 h-28 bg-red-600 hover:bg-red-500 border-4 border-red-900 text-white rounded-full flex items-center justify-center flex-col gap-1 shadow-lg shadow-red-500/20 active:scale-95 transition cursor-pointer group"
            aria-label="Trigger SOS Distress Alarm"
          >
            <AlertTriangle size={32} className="group-hover:rotate-12 transition-transform" />
            <span className="text-xs font-black tracking-wider uppercase font-sans">PANIC</span>
          </button>
          <div>
            <p className="text-zinc-200 text-xs font-bold">Pressing triggers a countdown alerts</p>
            <p className="text-zinc-500 text-xxs mt-1">
              Sends your live location coordinates to all contacts listed on the right.
            </p>
          </div>
        </div>

        {/* Guardians list & Adding controls */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-zinc-300 text-xs font-bold">SOS Emergency Contacts</span>
            <button
              id="add-contact-toggle-btn"
              onClick={() => setShowAddContact(!showAddContact)}
              className="text-emerald-400 text-xxs hover:underline flex items-center gap-1 font-mono"
            >
              <Plus size={10} /> Add Guardian
            </button>
          </div>

          {showAddContact && (
            <form onSubmit={handleAddContact} className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl flex flex-col gap-3">
              <input
                type="text"
                placeholder="Name (Required)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                className="bg-zinc-900 text-zinc-200 px-3 py-2.5 rounded-xl border border-zinc-800 text-xs focus:outline-none focus:border-emerald-500"
              />
              <input
                type="text"
                placeholder="Relationship (e.g. Sister, Doctor)"
                value={newRelation}
                onChange={(e) => setNewRelation(e.target.value)}
                className="bg-zinc-900 text-zinc-200 px-3 py-2.5 rounded-xl border border-zinc-800 text-xs focus:outline-none"
              />
              <input
                type="tel"
                placeholder="Phone Number (Required)"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                required
                className="bg-zinc-900 text-zinc-200 px-3 py-2.5 rounded-xl border border-zinc-800 text-xs focus:outline-none focus:border-emerald-500"
              />
              <input
                type="email"
                placeholder="Email Address"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="bg-zinc-900 text-zinc-200 px-3 py-2.5 rounded-xl border border-zinc-800 text-xs focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  id="save-contact-btn"
                  type="submit"
                  className="flex-1 bg-emerald-500 text-zinc-950 text-xs font-bold py-2 rounded-xl"
                >
                  Save contact
                </button>
                <button
                  id="cancel-add-contact-btn"
                  type="button"
                  onClick={() => setShowAddContact(false)}
                  className="bg-zinc-800 text-zinc-300 text-xs px-3 rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="flex flex-col gap-2 max-h-[180px] overflow-y-auto pr-1">
            {contacts.length === 0 ? (
              <p className="text-zinc-500 text-xs text-center py-4">No emergency guardians registered.</p>
            ) : (
              contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="bg-zinc-950 p-3.5 border border-zinc-850 rounded-2xl flex items-start justify-between gap-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-zinc-200 text-xs font-bold leading-none">{contact.name}</h4>
                      <span className="text-[9px] bg-zinc-900 text-zinc-400 border border-zinc-800 px-2 py-0.5 rounded-md uppercase font-mono font-bold leading-none">
                        {contact.relationship}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1.5 mt-2.5">
                      <p className="text-zinc-400 text-xxs flex items-center gap-1.5 font-mono">
                        <Phone size={10} className="text-zinc-500" /> {contact.phone}
                      </p>
                      <p className="text-zinc-400 text-xxs flex items-center gap-1.5 font-mono">
                        <Mail size={10} className="text-zinc-500" /> {contact.email}
                      </p>
                    </div>
                  </div>
                  <button
                    id={`delete-contact-btn-${contact.id}`}
                    onClick={() => handleDeleteContact(contact.id, contact.name)}
                    className="p-1.5 hover:bg-zinc-900 text-zinc-500 hover:text-red-400 rounded-lg transition"
                    title="Delete guardian"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
