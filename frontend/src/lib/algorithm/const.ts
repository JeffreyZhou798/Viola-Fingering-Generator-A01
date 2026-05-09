// Constants and constraint rules for viola fingering

export const PENALTY = {
  LOW: 1,
  MEDIUM: 50,
  HIGH: 1000,
  NEVER: 100000,
  MAX: Infinity
};

export const OPEN_STRING_PITCHES = [69, 62, 55, 48]; // A4, D4, G3, C3
// Index: [0=A string, 1=D string, 2=G string, 3=C string]

export const POSITION_COUNT = 36;
export const STRING_COUNT = 4;
export const FINGER_COUNT = 5;  // 0-4 (0=open, 1-4=fingers, no thumb)
export const UPPER_BOUT_CUTOFF = 6;

// Hand stretch distances (viola: 1-2-3-4 fingering, same as violin)
export const MIN_DISTANCE_TO_UPPER_FINGER = [0, 5, 3, 1, 0];
export const MAX_DISTANCE_TO_UPPER_FINGER = [36, 5, 4, 2, 0];
export const MIN_DISTANCE_TO_LOWER_FINGER = [1, 0, -2, -4, -5];
export const MAX_DISTANCE_TO_LOWER_FINGER = [36, 0, -1, -3, -5];

// Training configuration
export const DEFAULT_CONFIG = {
  nEpisodes: 10000,
  learningRate: 0.99,
  discountFactor: 0.985,  // Between violin (0.98) and cello (0.99)
  explorationRate: 0.8,
  planningSteps: 10,
  priorityThreshold: 3.0,
  evaluationInterval: 300,
  convergenceThreshold: 0.01,
  convergenceWindow: 3
};

// Comfortable finger change ranges
export function getMaxComfortableFingerChange(startFinger: number, endFinger: number): number {
  // Special case: starting from open string
  if (startFinger === 0) return POSITION_COUNT;
  
  // Special case: ending on open string
  if (endFinger === 0) return 0;
  
  const diff = endFinger - startFinger;
  // Viola: same 1-2-3-4 fingering as violin, half-tone intervals
  const changes: { [key: number]: number } = {
    '-3': -5, '-2': -3, '-1': -1,
    '0': 0, '1': 2, '2': 4, '3': 5
  };
  
  return changes[diff] ?? -POSITION_COUNT;
}

export function getMinComfortableFingerChange(startFinger: number, endFinger: number): number {
  return -getMaxComfortableFingerChange(endFinger, startFinger);
}

// Raw position score calculation
export function calculateRawPositionScore(position: number, string: number, finger: number): number {
  // Open string (viola: reward instead of penalty)
  if (position === 0) {
    if (finger !== 0) return PENALTY.NEVER;
    return -30;  // Reward open string use (between violin MEDIUM=50 and cello -50)
  }
  
  // Non-open position with finger 0
  if (finger === 0) return PENALTY.NEVER;
  
  // Low positions (1-6) with fingers 1-4: preferred, give reward
  // Viola-specific: better tone in low positions (Primrose principle)
  if (finger >= 1 && finger <= 4 && position >= 1 && position <= 6) {
    return -5;  // Slight reward for low positions
  }
  
  // High position penalty
  if (finger >= 1 && finger <= 4 && position >= 8) {
    return PENALTY.LOW * 3;  // Slight penalty for high positions
  }
  
  // Calculate finger positions
  const maxHighFingerPosition = position + MAX_DISTANCE_TO_UPPER_FINGER[finger];
  const minHighFingerPosition = position + MIN_DISTANCE_TO_UPPER_FINGER[finger];
  const maxLowFingerPosition = position + MAX_DISTANCE_TO_LOWER_FINGER[finger];
  const minLowFingerPosition = position + MIN_DISTANCE_TO_LOWER_FINGER[finger];
  
  // Position too low
  if (maxHighFingerPosition < 6 || maxLowFingerPosition <= 0) {
    return PENALTY.MEDIUM;
  }
  
  // Position too high (above UPPER_BOUT_CUTOFF=6)
  if (minHighFingerPosition > UPPER_BOUT_CUTOFF) {
    if (minLowFingerPosition >= UPPER_BOUT_CUTOFF) {
      // Whole hand over upper bout
      return 2 * PENALTY.MEDIUM + (minLowFingerPosition - UPPER_BOUT_CUTOFF);
    } else {
      // Hand partially over upper bout
      return (3 * PENALTY.MEDIUM) / 2 + (minHighFingerPosition - UPPER_BOUT_CUTOFF);
    }
  }
  
  return 0;
}

// String cross penalty (viola: coefficient 2.5, between violin 2 and cello 3)
export function calculateStringCrossPenalty(stringDiff: number): number {
  const absDiff = Math.abs(stringDiff);
  return absDiff > 0 ? 2.5 * PENALTY.LOW * absDiff : 0;
}

// Finger change penalty
export function calculateFingerChangePenalty(
  startPos: number,
  endPos: number,
  startFinger: number,
  endFinger: number
): number {
  const maxComfortableChange = getMaxComfortableFingerChange(startFinger, endFinger);
  const minComfortableChange = getMinComfortableFingerChange(startFinger, endFinger);
  const actualChange = endPos - startPos;
  
  if (actualChange < minComfortableChange) {
    return calculateShiftPenalty(actualChange - minComfortableChange);
  }
  if (actualChange > maxComfortableChange) {
    return calculateShiftPenalty(actualChange - maxComfortableChange);
  }
  return 0;
}

// Shift penalty (viola: coefficient 1.1, between violin 1.0 and cello 1.2)
export function calculateShiftPenalty(shiftAmount: number): number {
  const absShift = Math.abs(shiftAmount);
  return PENALTY.MEDIUM + PENALTY.LOW * absShift * 1.1;
}

// Calculate total penalty for a transition
export function calculateTotalPenalty(
  prevState: { position: number; finger: number; string: number },
  action: { position: number; finger: number; string: number }
): number {
  let penalty = 0;
  
  // Raw position penalty
  penalty += calculateRawPositionScore(action.position, action.string, action.finger);
  
  // String cross penalty
  penalty += calculateStringCrossPenalty(action.string - prevState.string);
  
  // Finger change penalty
  penalty += calculateFingerChangePenalty(
    prevState.position,
    action.position,
    prevState.finger,
    action.finger
  );
  
  return penalty;
}
