/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { Camera, Image as ImageIcon, RefreshCw, Volume2, VolumeX, Eye, HelpCircle } from 'lucide-react';
import { AssistantMode, UnifiedAnalysisResult } from '../types';
import { speech } from '../utils/speech';

interface CameraViewProps {
  currentMode: AssistantMode;
  onAnalysisResult: (result: UnifiedAnalysisResult) => void;
  registeredFaces: any[];
  translationTarget: string;
  appLanguage?: string;
}

export default function CameraView({
  currentMode,
  onAnalysisResult,
  registeredFaces,
  translationTarget,
  appLanguage,
}: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(true);
  const [shortcutPulse, setShortcutPulse] = useState(false);

  // Active overlays mapped from normalized coordinates
  const [overlays, setOverlays] = useState<{ label: string; top: number; left: number; width: number; height: number; value?: string }[]>([]);

  // Toggle speech synthesis state
  useEffect(() => {
    const settings = speech.getSettings();
    setIsSpeechEnabled(settings.enabled);
  }, []);

  const handleToggleSpeech = () => {
    const nextVal = !isSpeechEnabled;
    setIsSpeechEnabled(nextVal);
    speech.saveSettings({ enabled: nextVal });
    if (nextVal) {
      speech.speak("Voice guidance enabled.");
    } else {
      speech.stop();
    }
  };

  // Enumerate cameras
  useEffect(() => {
    async function getCameras() {
      try {
        const devicesList = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devicesList.filter((device) => device.kind === 'videoinput');
        setDevices(videoDevices);
        if (videoDevices.length > 0 && !selectedDeviceId) {
          // Default to the back camera on mobile if available, or first camera
          const backCamera = videoDevices.find(
            (d) => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment')
          );
          setSelectedDeviceId(backCamera ? backCamera.deviceId : videoDevices[0].deviceId);
        }
      } catch (err) {
        console.error('Error enumerating cameras:', err);
      }
    }
    getCameras();
  }, []);

  // Initialize camera stream
  useEffect(() => {
    if (capturedImage) return; // Keep captured snapshot static if showing it
    
    let activeStream: MediaStream | null = null;
    
    async function startCamera() {
      setCameraError(null);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      if (!selectedDeviceId) return;

      try {
        const constraints = {
          video: {
            deviceId: { exact: selectedDeviceId },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        };
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        activeStream = mediaStream;
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err: any) {
        console.error('Camera startup error:', err);
        // Fallback to any camera if exact ID fails
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
          activeStream = fallbackStream;
          setStream(fallbackStream);
          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream;
          }
        } catch (fallbackErr: any) {
          setCameraError('Unable to access camera stream. Please upload an image or check permissions.');
          speech.speak('Warning: Camera access failed. Please select an image manually.');
        }
      }
    }

    startCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [selectedDeviceId, capturedImage]);

  // Handle key listeners for blind-friendly controls (Space to scan)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setShortcutPulse(true);
        setTimeout(() => setShortcutPulse(false), 300);
        handleCaptureAndAnalyze();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stream, capturedImage, currentMode, registeredFaces, translationTarget]);

  const [isAutoScanActive, setIsAutoScanActive] = useState(false);

  // Automatically turn off auto-scan if we switch out of object or obstacle modes
  useEffect(() => {
    if (currentMode !== 'object' && currentMode !== 'obstacle') {
      setIsAutoScanActive(false);
    }
  }, [currentMode]);

  const isAnalyzingRef = useRef(isAnalyzing);
  const capturedImageRef = useRef(capturedImage);
  const streamRef = useRef(stream);
  const currentModeRef = useRef(currentMode);
  const registeredFacesRef = useRef(registeredFaces);
  const translationTargetRef = useRef(translationTarget);

  useEffect(() => {
    isAnalyzingRef.current = isAnalyzing;
    capturedImageRef.current = capturedImage;
    streamRef.current = stream;
    currentModeRef.current = currentMode;
    registeredFacesRef.current = registeredFaces;
    translationTargetRef.current = translationTarget;
  }, [isAnalyzing, capturedImage, stream, currentMode, registeredFaces, translationTarget]);

  // Auto scan interval implementation
  useEffect(() => {
    if (!isAutoScanActive) return;

    const intervalId = setInterval(() => {
      const mode = currentModeRef.current;
      if (mode !== 'object' && mode !== 'obstacle') return;
      if (isAnalyzingRef.current) return;
      if (capturedImageRef.current) return;
      if (!streamRef.current || !videoRef.current) return;

      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64Image = canvas.toDataURL('image/jpeg', 0.85);
        // Call the backend directly with isAuto=true to keep it silent and not freeze the video frame
        sendToBackend(base64Image, true);
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [isAutoScanActive]);

  // Switch between devices
  const handleSwitchCamera = () => {
    if (devices.length <= 1) return;
    const currentIndex = devices.findIndex((d) => d.deviceId === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % devices.length;
    setSelectedDeviceId(devices[nextIndex].deviceId);
    setCapturedImage(null);
    setOverlays([]);
    speech.speak(`Switching to camera: ${devices[nextIndex].label || 'Camera ' + (nextIndex + 1)}`);
  };

  // Main API post action
  const sendToBackend = async (base64Image: string, isAuto = false) => {
    setIsAnalyzing(true);
    setOverlays([]);
    if (!isAuto) {
      speech.speak('Analyzing image... Please wait.');
    }

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Image,
          mode: currentMode,
          faces: registeredFaces,
          translationTarget: currentMode === 'ocr' ? translationTarget : undefined,
          appLanguage: appLanguage,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Server analysis failed');
      }

      const result: UnifiedAnalysisResult = await response.json();
      onAnalysisResult(result);
      processOverlays(result);
      speakResultSummary(result);
    } catch (err: any) {
      console.error(err);
      if (!isAuto) {
        speech.speak('An error occurred during analysis: ' + err.message);
      }
      onAnalysisResult({
        mode: currentMode,
        timestamp: new Date().toISOString(),
        error: err.message,
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Convert Gemini boxes [ymin, xmin, ymax, xmax] (0-1000) into top, left, width, height percentages
  const processOverlays = (result: UnifiedAnalysisResult) => {
    const list: typeof overlays = [];

    if (result.mode === 'object' && result.objects?.objects) {
      result.objects.objects.forEach((obj) => {
        if (obj.box) {
          const [ymin, xmin, ymax, xmax] = obj.box;
          list.push({
            label: obj.label,
            top: ymin / 10,
            left: xmin / 10,
            width: (xmax - xmin) / 10,
            height: (ymax - ymin) / 10,
            value: `${Math.round(obj.confidence * 100)}%`,
          });
        }
      });
    } else if (result.mode === 'face_recognize' && result.face?.recognized) {
      result.face.recognized.forEach((f) => {
        if (f.box) {
          const [ymin, xmin, ymax, xmax] = f.box;
          list.push({
            label: f.name,
            top: ymin / 10,
            left: xmin / 10,
            width: (xmax - xmin) / 10,
            height: (ymax - ymin) / 10,
            value: `Friend/Family`,
          });
        }
      });
    } else if (result.mode === 'currency' && result.currency?.notes) {
      result.currency.notes.forEach((note) => {
        if (note.box) {
          const [ymin, xmin, ymax, xmax] = note.box;
          list.push({
            label: note.denomination,
            top: ymin / 10,
            left: xmin / 10,
            width: (xmax - xmin) / 10,
            height: (ymax - ymin) / 10,
            value: `Cash`,
          });
        }
      });
    } else if (result.mode === 'ocr' && result.ocr?.blocks) {
      result.ocr.blocks.forEach((block) => {
        if (block.box) {
          const [ymin, xmin, ymax, xmax] = block.box;
          list.push({
            label: block.text.slice(0, 20) + (block.text.length > 20 ? '...' : ''),
            top: ymin / 10,
            left: xmin / 10,
            width: (xmax - xmin) / 10,
            height: (ymax - ymin) / 10,
          });
        }
      });
    }

    setOverlays(list);
  };

  // Compile and speak readable text
  const speakResultSummary = (result: UnifiedAnalysisResult) => {
    let text = '';
    switch (result.mode) {
      case 'scene':
        text = result.scene?.description || 'Scene description complete, but no detail was found.';
        break;

      case 'object':
        if (result.objects?.objects && result.objects.objects.length > 0) {
          const names = result.objects.objects.map((o) => o.label);
          const uniqueNames = Array.from(new Set(names));
          text = `Detected ${names.length} items. Visible are: ${uniqueNames.join(', ')}.`;
        } else {
          text = 'No objects detected in the camera frame.';
        }
        break;

      case 'color':
        if (result.color) {
          text = `The center color is ${result.color.centerColor.description}. Dominant surrounding colors include: ${result.color.dominantColors.map((c) => c.name).slice(0, 3).join(', ')}.`;
        }
        break;

      case 'obstacle':
        if (result.obstacle?.obstacles && result.obstacle.obstacles.length > 0) {
          const hazardCount = result.obstacle.obstacles.filter(o => o.severity === 'high').length;
          const listText = result.obstacle.obstacles
            .map((o) => `${o.label}, ${o.distance} ${o.direction}`)
            .join('. ');
          text = `${hazardCount > 0 ? 'Warning!' : ''} Detected ${result.obstacle.obstacles.length} obstacles ahead. ${listText}`;
        } else {
          text = 'Clear path. No obstacles detected ahead.';
        }
        break;

      case 'ocr':
        if (result.ocr?.text) {
          if (result.ocr.translation) {
            text = `Detected ${result.ocr.language} text. Translated text reads: ${result.ocr.translation}`;
          } else {
            text = `Text found: ${result.ocr.text}`;
          }
        } else {
          text = 'No legible text found in the image.';
        }
        break;

      case 'face_recognize':
        if (result.face) {
          const recCount = result.face.recognized.length;
          const unkCount = result.face.unknownFacesCount;
          if (recCount === 0 && unkCount === 0) {
            text = 'No faces detected.';
          } else {
            const matches = result.face.recognized.map((f) => f.name).join(', ');
            text = `${recCount > 0 ? `Identified: ${matches}.` : ''} ${unkCount > 0 ? `${unkCount} unregistered person${unkCount > 1 ? 's' : ''} present.` : ''}`;
          }
        }
        break;

      case 'currency':
        if (result.currency && result.currency.notes.length > 0) {
          text = `Detected banknotes. Total value is ${result.currency.totalValue} ${result.currency.currencyCode}.`;
        } else {
          text = 'No currency notes or coins detected.';
        }
        break;

      case 'medicine':
        if (result.medicine) {
          const m = result.medicine;
          text = `Detected medicine: ${m.medicineName}. ${m.activeIngredients ? `Active ingredients: ${m.activeIngredients}.` : ''} ${
            m.expiryDate ? `Expiry date is ${m.expiryDate}. ${m.isExpired ? 'Warning: This medicine is expired!' : 'It is safe to use.'}` : 'No visible expiry date found.'
          } ${m.dosageInstruction ? `Directions: ${m.dosageInstruction}` : ''}`;
        } else {
          text = 'No medical container detected.';
        }
        break;
    }

    speech.speak(text);
  };

  // Frame Capture logic
  const handleCaptureAndAnalyze = () => {
    if (isAnalyzing) return;

    if (capturedImage) {
      // Re-scan static picture in the current mode
      sendToBackend(capturedImage);
      return;
    }

    if (videoRef.current && stream) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64Image = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedImage(base64Image);
        sendToBackend(base64Image);
      }
    } else {
      // No live feed, open file select
      triggerFileSelect();
    }
  };

  // Reset captured image and return to camera stream
  const handleResetCamera = () => {
    setCapturedImage(null);
    setOverlays([]);
    speech.speak('Live camera feed active.');
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setCapturedImage(base64);
        sendToBackend(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  // Drag and Drop support
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setCapturedImage(base64);
        sendToBackend(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl relative">
      {/* Header Info */}
      <div className="px-6 py-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="text-zinc-200 font-semibold tracking-tight text-sm md:text-base capitalize">
            {currentMode.replace('_', ' ')} scan
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Shortcuts note */}
          <span className="hidden md:flex text-xs text-zinc-500 items-center gap-1 bg-zinc-950 px-2.5 py-1.5 rounded-lg border border-zinc-800 font-mono">
            <HelpCircle size={12} /> Press [Space] to snap
          </span>
          <button
            id="toggle-speech-btn"
            onClick={handleToggleSpeech}
            className={`p-2.5 rounded-xl border transition-all ${
              isSpeechEnabled
                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40 hover:bg-emerald-900/40'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
            }`}
            title={isSpeechEnabled ? 'Disable Voice Guidance' : 'Enable Voice Guidance'}
            aria-label={isSpeechEnabled ? 'Disable Voice Guidance' : 'Enable Voice Guidance'}
          >
            {isSpeechEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>
      </div>

      {/* Camera Stream/Image canvas Container */}
      <div
        className="flex-1 bg-zinc-950 relative flex items-center justify-center overflow-hidden min-h-[300px] group"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {capturedImage ? (
          /* Static Image display */
          <img
            src={capturedImage}
            alt="Captured scene analysis"
            className="w-full h-full object-contain max-h-[550px]"
            referrerPolicy="no-referrer"
          />
        ) : (
          /* Live stream */
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover max-h-[550px]"
          />
        )}

        {/* Center pointer (aim sight) - crucial for visually impaired targeting color, medicine, currency etc */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-10 h-10 border-2 border-dashed border-zinc-400/30 rounded-full flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-zinc-400/40 rounded-full" />
          </div>
        </div>

        {/* Bounding box overlays */}
        <div className="absolute inset-0 pointer-events-none">
          {overlays.map((overlay, index) => (
            <div
              key={index}
              className="absolute border-2 border-emerald-500 bg-emerald-500/10 rounded flex flex-col justify-between"
              style={{
                top: `${overlay.top}%`,
                left: `${overlay.left}%`,
                width: `${overlay.width}%`,
                height: `${overlay.height}%`,
              }}
            >
              <div className="bg-emerald-500 text-zinc-950 text-[10px] font-mono px-1 py-0.5 rounded-br w-max max-w-full truncate font-bold leading-none shadow">
                {overlay.label} {overlay.value ? `(${overlay.value})` : ''}
              </div>
            </div>
          ))}
        </div>

        {/* Continuous Auto-Scan Toggle overlay (visible only in object and obstacle mode) */}
        {(currentMode === 'object' || currentMode === 'obstacle') && (
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
            <button
              id="toggle-auto-scan-btn"
              type="button"
              onClick={() => {
                const nextVal = !isAutoScanActive;
                setIsAutoScanActive(nextVal);
                speech.speak(nextVal ? "Continuous auto scan activated. Scanning every five seconds." : "Continuous auto scan deactivated.");
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-lg cursor-pointer ${
                isAutoScanActive
                  ? 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400 border border-emerald-600 font-extrabold animate-pulse'
                  : 'bg-zinc-900/95 text-zinc-200 hover:bg-zinc-800/95 border border-zinc-750 backdrop-blur-md'
              }`}
            >
              <RefreshCw size={13} className={isAutoScanActive ? 'animate-spin' : 'text-emerald-400'} />
              <span>{isAutoScanActive ? 'Auto-Scan Active (5s)' : 'Enable Auto-Scan'}</span>
            </button>
          </div>
        )}

        {/* Loading Overlay */}
        {isAnalyzing && (
          <div className="absolute inset-0 bg-zinc-950/85 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-20">
            <div className="relative flex items-center justify-center">
              <div className="w-16 h-16 rounded-full border-4 border-emerald-500/10 border-t-emerald-500 animate-spin" />
              <Eye className="absolute text-emerald-400 animate-pulse" size={24} />
            </div>
            <div className="text-center">
              <p className="text-zinc-200 font-medium tracking-tight">AI Smart Vision scanning...</p>
              <p className="text-zinc-500 text-xs mt-1 font-mono">Invoking Gemini 3.5 Flash</p>
            </div>
          </div>
        )}

        {/* Device select list & Error panels */}
        {cameraError && !capturedImage && (
          <div className="absolute inset-x-6 bottom-6 bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex flex-col items-center gap-2 text-center z-10 shadow-lg">
            <p className="text-zinc-400 text-xs md:text-sm">{cameraError}</p>
            <button
              id="upload-fallback-btn"
              onClick={triggerFileSelect}
              className="mt-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-2 rounded-xl text-xs font-semibold transition"
            >
              Upload Picture Manually
            </button>
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Bottom Action Controllers */}
      <div className="p-6 bg-zinc-900 border-t border-zinc-800 flex flex-col md:flex-row gap-4 items-center justify-between z-10">
        <div className="flex items-center gap-2 w-full md:w-auto">
          {devices.length > 1 && !capturedImage && (
            <button
              id="switch-camera-btn"
              onClick={handleSwitchCamera}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-zinc-950 hover:bg-zinc-800 text-zinc-400 border border-zinc-800 px-4 py-3 rounded-2xl text-xs font-medium transition"
              aria-label="Switch camera"
            >
              <RefreshCw size={14} /> Toggle Camera
            </button>
          )}

          {capturedImage && (
            <button
              id="reset-camera-btn"
              onClick={handleResetCamera}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-zinc-950 hover:bg-zinc-800 text-zinc-400 border border-zinc-800 px-4 py-3 rounded-2xl text-xs font-medium transition"
            >
              <RefreshCw size={14} /> Resume Live Video
            </button>
          )}
        </div>

        {/* Central Scan Button */}
        <button
          id="main-scan-btn"
          onClick={handleCaptureAndAnalyze}
          disabled={isAnalyzing}
          className={`w-full md:w-auto flex items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-bold px-8 py-4.5 rounded-2xl text-sm md:text-base tracking-tight transition shadow-lg shadow-emerald-500/10 cursor-pointer ${
            shortcutPulse ? 'scale-95 bg-emerald-300' : ''
          }`}
          aria-label="Analyze Current View"
        >
          <Camera size={20} />
          {capturedImage ? 'Re-Scan Snapshot' : 'Capture & Analyze'}
        </button>

        {/* Image selector shortcut */}
        <button
          id="select-file-btn"
          onClick={triggerFileSelect}
          disabled={isAnalyzing}
          className="w-full md:w-auto flex items-center justify-center gap-2 bg-zinc-950 hover:bg-zinc-800 disabled:text-zinc-600 text-zinc-300 border border-zinc-800 px-5 py-4 rounded-2xl text-xs font-medium transition"
          aria-label="Upload image from file"
        >
          <ImageIcon size={15} /> Upload Photo
        </button>
      </div>
    </div>
  );
}
