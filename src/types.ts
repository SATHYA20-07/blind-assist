/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AssistantMode =
  | 'scene'
  | 'object'
  | 'color'
  | 'obstacle'
  | 'ocr'
  | 'face_recognize'
  | 'currency'
  | 'medicine';

export interface BoundingBox2D {
  // Coordinates as [ymin, xmin, ymax, xmax] normalized to range [0, 1000]
  box: [number, number, number, number];
  label: string;
}

export interface SceneAnalysis {
  description: string;
  categories: string[];
  elements: {
    label: string;
    position: string; // e.g. "front left", "center", "background"
  }[];
}

export interface ObjectDetectionAnalysis {
  objects: {
    label: string;
    confidence: number;
    // box is [ymin, xmin, ymax, xmax] from 0 to 1000
    box: [number, number, number, number];
  }[];
}

export interface ColorAnalysis {
  dominantColors: {
    name: string;
    hex: string;
    percentage: number;
  }[];
  centerColor: {
    name: string;
    hex: string;
    description: string; // e.g., "Deep ocean blue", "Vibrant crimson red"
  };
}

export interface ObstacleAnalysis {
  obstacles: {
    label: string;
    distance: string; // e.g., "0.5 meters", "2 steps"
    direction: 'front-left' | 'directly ahead' | 'front-right' | 'below' | 'above' | 'left' | 'right';
    severity: 'low' | 'medium' | 'high';
  }[];
}

export interface OcrAnalysis {
  text: string;
  language: string;
  translation?: string;
  blocks?: {
    text: string;
    box?: [number, number, number, number];
  }[];
}

export interface FaceAnalysis {
  recognized: {
    name: string;
    confidence: number;
    box: [number, number, number, number];
  }[];
  unknownFacesCount: number;
}

export interface CurrencyAnalysis {
  currencyCode: string;
  notes: {
    denomination: string;
    confidence: number;
    box: [number, number, number, number];
  }[];
  totalValue: number;
}

export interface MedicineAnalysis {
  medicineName: string;
  activeIngredients?: string;
  expiryDate?: string;
  isExpired?: boolean;
  dosageInstruction?: string;
  warnings?: string;
}

export interface UnifiedAnalysisResult {
  mode: AssistantMode;
  timestamp: string;
  scene?: SceneAnalysis;
  objects?: ObjectDetectionAnalysis;
  color?: ColorAnalysis;
  obstacle?: ObstacleAnalysis;
  ocr?: OcrAnalysis;
  face?: FaceAnalysis;
  currency?: CurrencyAnalysis;
  medicine?: MedicineAnalysis;
  error?: string;
}

export interface SpeechSettings {
  voiceName: string;
  rate: number; // speed: 0.5 to 2
  pitch: number; // pitch: 0.5 to 2
  volume: number; // 0 to 1
  enabled: boolean;
}

export interface FaceProfile {
  id: string;
  name: string;
  imageUrl: string; // Base64 data url
  createdAt: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email: string;
}

export interface HistoryItem {
  id: string;
  mode: AssistantMode;
  timestamp: string;
  summary: string;
  details: string;
  imageUrl?: string;
}

export interface LocationInfo {
  latitude: number;
  longitude: number;
  address?: string;
  nearbyPOIs?: string[];
  timestamp: string;
}
