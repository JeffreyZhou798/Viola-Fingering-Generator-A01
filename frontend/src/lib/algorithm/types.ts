// Type definitions for viola fingering

export interface Note {
  pitch: number;  // MIDI pitch number
  duration?: number;
}

export interface State {
  pitch: number;
  finger: number;    // 0-4 (0=open, 1-4=fingers, no thumb)
  string: number;    // 0-3
  position: number;  // 0-35
  noteIndex: number;
}

export interface Action {
  finger: number;    // 0-4 (0=open, 1-4=fingers, no thumb)
  string: number;    // 0-3
  position: number;  // 0-35
}

export interface TrainingConfig {
  nEpisodes: number;
  maxEpisodeLength?: number;
  learningRate: number;
  discountFactor: number;
  explorationRate: number;
  planningSteps: number;
  priorityThreshold: number;
  evaluationInterval: number;
  convergenceThreshold: number;
  convergenceWindow: number;
  randomSeed?: number;
}

export interface FingeringResult {
  fingering: Action[];
  totalReward: number;
  convergedAt?: number;
}

export interface CachedResult {
  fingering: Action[];
  qTable?: any;
  timestamp: number;
}

// Worker-related types for parallel training
export interface WorkerConfig {
  seed: number;
  episodes: number;
  planningSteps: number;
  learningRate: number;
  discountFactor: number;
  explorationRate: number;
  priorityThreshold: number;
  evaluationInterval: number;
  convergenceWindow: number;
  convergenceThreshold: number;
}

export interface WorkerResult {
  qTable: any;  // Serialized Q-table
  finalReward: number;
  episodesCompleted: number;
  converged: boolean;
}

export interface WorkerProgress {
  workerId: number;
  episode: number;
  reward: number;
  progress: number;  // 0-1
}
