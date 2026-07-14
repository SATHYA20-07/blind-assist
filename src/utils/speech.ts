/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SpeechSettings } from '../types';

class SpeechService {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private settings: SpeechSettings = {
    voiceName: '',
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    enabled: true,
  };
  private listeners: Set<(speaking: boolean) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadSettings();
    }
  }

  private loadSettings() {
    const saved = localStorage.getItem('assistant_speech_settings');
    if (saved) {
      try {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      } catch (e) {
        console.error('Failed to parse speech settings:', e);
      }
    }
  }

  public saveSettings(settings: Partial<SpeechSettings>) {
    this.settings = { ...this.settings, ...settings };
    localStorage.setItem('assistant_speech_settings', JSON.stringify(this.settings));
  }

  public getSettings(): SpeechSettings {
    return this.settings;
  }

  public getVoices(): SpeechSynthesisVoice[] {
    if (!this.synth) return [];
    return this.synth.getVoices();
  }

  public subscribe(callback: (speaking: boolean) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify(speaking: boolean) {
    this.listeners.forEach((cb) => cb(speaking));
  }

  public speak(text: string, forceStop: boolean = true) {
    if (!this.synth || !this.settings.enabled) return;

    if (forceStop) {
      this.stop();
    }

    // Split text into smaller chunks if it is too long (Web Speech API behaves better this way)
    const chunks = this.splitText(text);
    this.speakChunks(chunks);
  }

  private splitText(text: string): string[] {
    // Split by punctuation and keep chunks reasonable (under 180 chars)
    const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+/g) || [text];
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length < 180) {
        currentChunk += ' ' + sentence;
      } else {
        if (currentChunk) chunks.push(currentChunk.trim());
        currentChunk = sentence;
      }
    }
    if (currentChunk) chunks.push(currentChunk.trim());
    return chunks;
  }

  private speakChunks(chunks: string[], index: number = 0) {
    if (!this.synth || index >= chunks.length) {
      this.notify(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(chunks[index]);
    this.currentUtterance = utterance;

    // Apply settings
    utterance.rate = this.settings.rate;
    utterance.pitch = this.settings.pitch;
    utterance.volume = this.settings.volume;

    // Pick voice if configured
    const voices = this.getVoices();
    if (this.settings.voiceName) {
      const voice = voices.find((v) => v.name === this.settings.voiceName);
      if (voice) {
        utterance.voice = voice;
      }
    } else {
      // Default to first English voice if available, or first default voice
      const engVoice = voices.find((v) => v.lang.startsWith('en') && v.localService);
      if (engVoice) {
        utterance.voice = engVoice;
      }
    }

    utterance.onstart = () => {
      this.notify(true);
    };

    utterance.onend = () => {
      this.speakChunks(chunks, index + 1);
    };

    utterance.onerror = (event) => {
      // Use console.warn instead of console.error because standard browser events like 'interrupted',
      // 'canceled', and 'not-allowed' are benign standard behaviors in a sandboxed preview iframe.
      console.warn('Speech synthesis event notice:', event.error || event);
      this.speakChunks(chunks, index + 1);
    };

    this.synth.speak(utterance);
  }

  public stop() {
    if (this.synth) {
      this.synth.cancel();
      this.notify(false);
    }
  }

  public pause() {
    if (this.synth && this.synth.speaking && !this.synth.paused) {
      this.synth.pause();
    }
  }

  public resume() {
    if (this.synth && this.synth.paused) {
      this.synth.resume();
    }
  }

  public isSpeaking(): boolean {
    return this.synth ? this.synth.speaking : false;
  }
}

export const speech = new SpeechService();
