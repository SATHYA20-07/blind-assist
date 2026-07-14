/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Users, Plus, Camera, Trash2, Shield, Upload } from 'lucide-react';
import { FaceProfile } from '../types';
import { speech } from '../utils/speech';

interface FacesDatabaseProps {
  onProfilesChange: (profiles: FaceProfile[]) => void;
}

export default function FacesDatabase({ onProfilesChange }: FacesDatabaseProps) {
  const [profiles, setProfiles] = useState<FaceProfile[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  // Load profiles
  useEffect(() => {
    const saved = localStorage.getItem('registered_faces_database');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setProfiles(parsed);
        onProfilesChange(parsed);
      } catch (e) {
        console.error('Failed to parse face database:', e);
      }
    }
  }, []);

  // Sync profiles
  const updateProfiles = (updated: FaceProfile[]) => {
    setProfiles(updated);
    onProfilesChange(updated);
    localStorage.setItem('registered_faces_database', JSON.stringify(updated));
  };

  // Start face registration video
  const startCamera = async () => {
    setCameraActive(true);
    setTempImage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 400, height: 400 } });
      setLocalStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (e) {
      console.error('Selfie camera error:', e);
      speech.speak('Selfie camera error. Please select a photo from your files instead.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    setLocalStream(null);
    setCameraActive(false);
  };

  const handleCapture = () => {
    if (videoRef.current && localStream) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw centered square crop
        const size = Math.min(video.videoWidth, video.videoHeight);
        const startX = (video.videoWidth - size) / 2;
        const startY = (video.videoHeight - size) / 2;
        ctx.drawImage(video, startX, startY, size, size, 0, 0, 400, 400);
        
        const base64 = canvas.toDataURL('image/jpeg', 0.85);
        setTempImage(base64);
        stopCamera();
        speech.speak('Face snap captured successfully.');
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setTempImage(event.target?.result as string);
        speech.speak('Reference photo selected successfully.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput || !tempImage) return;

    const newProfile: FaceProfile = {
      id: Date.now().toString(),
      name: nameInput.trim(),
      imageUrl: tempImage,
      createdAt: new Date().toISOString(),
    };

    const updated = [...profiles, newProfile];
    updateProfiles(updated);
    
    speech.speak(`${nameInput} has been registered as a trusted person.`);
    setNameInput('');
    setTempImage(null);
    setShowAddForm(false);
  };

  const handleDeleteProfile = (id: string, name: string) => {
    const updated = profiles.filter((p) => p.id !== id);
    updateProfiles(updated);
    speech.speak(`Removed ${name} from face records.`);
  };

  // Cleanup on dismount
  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [localStream]);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl h-full flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h3 className="text-zinc-200 font-semibold tracking-tight text-sm md:text-base flex items-center gap-2">
          <Users size={18} className="text-emerald-400" />
          Face Match Registry
        </h3>
        <button
          id="add-face-toggle-btn"
          onClick={() => {
            setShowAddForm(!showAddForm);
            if (showAddForm) stopCamera();
          }}
          className="text-emerald-400 hover:text-emerald-300 text-xxs font-mono flex items-center gap-1"
        >
          <Plus size={10} /> Register Face
        </button>
      </div>

      <p className="text-zinc-400 text-xxs leading-relaxed">
        Register friends, family, or caretakers here. When Face scanning mode runs, the Gemini AI matches snapshots with these photos.
      </p>

      {showAddForm && (
        <form onSubmit={handleSaveProfile} className="bg-zinc-950 border border-zinc-850 p-4.5 rounded-2xl flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-zinc-500 font-bold uppercase font-mono">Person's Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g., Mom, Sister Emma, Caretaker John"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="bg-zinc-900 text-zinc-200 px-3 py-2.5 rounded-xl border border-zinc-800 text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 rounded-xl p-4 min-h-[160px] relative bg-zinc-900/40">
            {tempImage ? (
              <div className="relative w-28 h-28 rounded-2xl overflow-hidden border border-zinc-700">
                <img src={tempImage} alt="Face captured snapshot" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <button
                  type="button"
                  onClick={() => setTempImage(null)}
                  className="absolute bottom-1 right-1 bg-zinc-950/80 hover:bg-zinc-950 text-zinc-400 hover:text-white p-1 rounded-md text-[10px]"
                >
                  Clear
                </button>
              </div>
            ) : cameraActive ? (
              <div className="flex flex-col items-center gap-2.5">
                <video ref={videoRef} autoPlay playsInline muted className="w-28 h-28 object-cover rounded-2xl border border-zinc-800" />
                <button
                  id="snap-face-btn"
                  type="button"
                  onClick={handleCapture}
                  className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xxs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"
                >
                  <Camera size={12} /> Take Snap
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-[280px]">
                <button
                  id="selfie-camera-start-btn"
                  type="button"
                  onClick={startCamera}
                  className="flex-1 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 p-3 rounded-xl flex flex-col items-center justify-center gap-1.5 text-center text-xs"
                >
                  <Camera size={16} className="text-zinc-400" />
                  <span className="font-semibold text-xxs leading-none">Selfie camera</span>
                </button>

                <button
                  id="face-file-upload-btn"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 p-3 rounded-xl flex flex-col items-center justify-center gap-1.5 text-center text-xs"
                >
                  <Upload size={16} className="text-zinc-400" />
                  <span className="font-semibold text-xxs leading-none">Upload file</span>
                </button>
              </div>
            )}
          </div>

          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />

          <div className="flex gap-2">
            <button
              id="save-face-profile-btn"
              type="submit"
              disabled={!nameInput || !tempImage}
              className="flex-1 bg-emerald-500 text-zinc-950 text-xs font-bold py-2.5 rounded-xl disabled:bg-zinc-800 disabled:text-zinc-600 transition cursor-pointer"
            >
              Add to trusted records
            </button>
            <button
              id="cancel-add-face-btn"
              type="button"
              onClick={() => {
                setShowAddForm(false);
                stopCamera();
              }}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs px-4 rounded-xl transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Database profiles list */}
      <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
        {profiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 border border-dashed border-zinc-800 rounded-2xl bg-zinc-950/20">
            <Users size={20} className="text-zinc-600" />
            <p className="text-zinc-500 text-xxs font-mono">Match database is empty.</p>
          </div>
        ) : (
          profiles.map((profile) => (
            <div
              key={profile.id}
              className="bg-zinc-950 p-3.5 border border-zinc-850 rounded-2xl flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <img
                  src={profile.imageUrl}
                  alt={profile.name}
                  className="w-10 h-10 rounded-xl object-cover border border-zinc-800"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h4 className="text-zinc-200 text-xs font-bold leading-none">{profile.name}</h4>
                  <p className="text-zinc-500 text-xxs font-mono mt-1">
                    Registered: {new Date(profile.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button
                id={`delete-face-btn-${profile.id}`}
                onClick={() => handleDeleteProfile(profile.id, profile.name)}
                className="p-1.5 hover:bg-zinc-900 text-zinc-500 hover:text-red-400 rounded-lg transition"
                title="Delete profile"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
