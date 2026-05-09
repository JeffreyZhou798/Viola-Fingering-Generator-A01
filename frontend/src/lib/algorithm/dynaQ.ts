// Complete Dyna-Q Algorithm Implementation

import { Note, State, Action, TrainingConfig, FingeringResult } from './types';
import { 
  OPEN_STRING_PITCHES, 
  PENALTY, 
  FINGER_COUNT,
  POSITION_COUNT,
  calculateRawPositionScore,
  calculateTotalPenalty 
} from './const';
import { PriorityQueue } from './priorityQueue';

export class DynaQAgent {
  private qTable: Map<string, Map<string, number>>;
  private model: Map<string, { reward: number; nextState: State }>;
  private pQueue: PriorityQueue<{ state: State; action: Action }>;
  private predict: Map<string, Set<string>>;  // Store serialized state-action pairs
  private initialStates: Set<string>;
  private config: TrainingConfig;
  private recentRewards: number[] = [];

  constructor(config: TrainingConfig) {
    this.qTable = new Map();
    this.model = new Map();
    this.pQueue = new PriorityQueue();
    this.predict = new Map();
    this.initialStates = new Set();
    this.config = config;
  }

  // Initialize with rules (zero-shot learning)
  initializeWithRules(notes: Note[]): void {
    console.log('🎻 Initializing Q-table with viola constraint rules...');
    
    for (let i = 0; i < notes.length; i++) {
      const actions = this.getLegalActions(notes[i].pitch);
      
      for (const action of actions) {
        const state = this.createState(notes[i], action, i);
        // Initialize with negative penalty as reward
        const penalty = calculateRawPositionScore(action.position, action.string, action.finger);
        const reward = -penalty;
        this.setQ(state, action, reward);
      }
    }
    
    console.log(`✅ Initialized ${this.qTable.size} states`);
  }

  // Main training loop
  async train(
    notes: Note[], 
    onProgress?: (episode: number, reward: number) => void
  ): Promise<void> {
    console.log('🚀 Starting Dyna-Q training (single-threaded)');
    console.log(`Episodes: ${this.config.nEpisodes}, Planning steps: ${this.config.planningSteps}`);
    
    const startTime = Date.now();
    
    for (let episode = 0; episode < this.config.nEpisodes; episode++) {
      const episodeReward = await this.runEpisode(notes);
      this.recentRewards.push(episodeReward);
      
      // Progress reporting
      if (episode % this.config.evaluationInterval === 0) {
        console.log(`On Iteration ${episode}, Returns: ${episodeReward.toFixed(2)}`);
        onProgress?.(episode, episodeReward);
        
        // Allow UI update
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      
      // Convergence check
      if (episode >= this.config.evaluationInterval * this.config.convergenceWindow) {
        if (this.checkConvergence()) {
          console.log(`Converged at episode ${episode}`);
          const duration = ((Date.now() - startTime) / 1000).toFixed(0);
          console.log(`✅ Training completed! Duration: ${duration}s`);
          return;
        }
      }
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(0);
    console.log(`✅ Training completed! Duration: ${duration}s`);
  }

  // Run single episode
  private async runEpisode(notes: Note[]): Promise<number> {
    let totalReward = 0;
    
    // Initialize first state
    const firstActions = this.getLegalActions(notes[0].pitch);
    if (firstActions.length === 0) {
      console.error('No legal actions for first note!');
      return -PENALTY.NEVER;
    }
    
    let state = this.createState(notes[0], firstActions[0], 0);
    this.initialStates.add(this.stateKey(state));
    
    for (let i = 0; i < notes.length - 1; i++) {
      // 1. Select action (ε-greedy)
      const action = this.selectAction(state, notes[i].pitch);
      
      // 2. Execute action
      const nextState = this.createState(notes[i + 1], action, i + 1);
      const reward = this.calculateReward(state, action, nextState);
      totalReward += reward;
      
      // 3. Calculate TD error
      const tdError = this.calculateTDError(state, action, reward, nextState);
      
      // 4. Q-learning update
      this.updateQ(state, action, tdError);
      
      // 5. Model learning
      this.updateModel(state, action, reward, nextState);
      
      // 6. Predecessor tracking
      this.updatePredict(state, action, nextState);
      
      // 7. Prioritized replay
      if (Math.abs(tdError) > this.config.priorityThreshold) {
        this.pQueue.push(Math.abs(tdError), { state, action });
      }
      
      state = nextState;
    }
    
    // 8. Planning loop
    this.planningLoop();
    
    return totalReward;
  }

  // Planning loop (key component of Dyna-Q)
  private planningLoop(): void {
    for (let k = 0; k < this.config.planningSteps; k++) {
      if (this.pQueue.isEmpty()) break;
      
      const item = this.pQueue.pop();
      if (!item) break;
      
      const { state, action } = item;
      const stateActionKey = this.stateActionKey(state, action);
      
      if (!this.model.has(stateActionKey)) continue;
      
      const { reward, nextState } = this.model.get(stateActionKey)!;
      
      // Simulated update
      const tdError = this.calculateTDError(state, action, reward, nextState);
      this.updateQ(state, action, tdError);
      
      // Backward propagation to predecessor states
      const stateKey = this.stateKey(state);
      if (this.predict.has(stateKey) && !this.initialStates.has(stateKey)) {
        const predecessors = this.predict.get(stateKey)!;
        
        for (const predKey of predecessors) {
          const [prevState, prevAction] = this.deserializeStateAction(predKey);
          const prevSAKey = this.stateActionKey(prevState, prevAction);
          
          if (!this.model.has(prevSAKey)) continue;
          
          const { reward: prevReward } = this.model.get(prevSAKey)!;
          const prevTDError = this.calculateTDError(prevState, prevAction, prevReward, state);
          
          if (Math.abs(prevTDError) > this.config.priorityThreshold) {
            this.pQueue.push(Math.abs(prevTDError), { state: prevState, action: prevAction });
          }
        }
      }
    }
  }

  // Get optimal fingering sequence
  getOptimalFingering(notes: Note[]): Action[] {
    console.log('🎯 Extracting optimal fingering...');
    const fingering: Action[] = [];
    
    const firstActions = this.getLegalActions(notes[0].pitch);
    if (firstActions.length === 0) {
      console.error('No legal actions for first note!');
      return [];
    }
    
    let state = this.createState(notes[0], firstActions[0], 0);
    
    for (let i = 0; i < notes.length; i++) {
      const actions = this.getLegalActions(notes[i].pitch);
      let bestAction = actions[0];
      let bestQ = this.getQ(state, actions[0]);
      
      for (let j = 1; j < actions.length; j++) {
        const q = this.getQ(state, actions[j]);
        if (q > bestQ) {
          bestQ = q;
          bestAction = actions[j];
        }
      }
      
      fingering.push(bestAction);
      
      if (i < notes.length - 1) {
        state = this.createState(notes[i + 1], bestAction, i + 1);
      }
    }
    
    console.log(`✅ Generated fingering for ${fingering.length} notes`);
    return fingering;
  }

  // Helper methods
  private selectAction(state: State, pitch: number): Action {
    if (Math.random() < this.config.explorationRate) {
      // Explore: random legal action
      const actions = this.getLegalActions(pitch);
      return actions[Math.floor(Math.random() * actions.length)];
    } else {
      // Exploit: best action
      const actions = this.getLegalActions(pitch);
      let bestAction = actions[0];
      let bestQ = this.getQ(state, actions[0]);
      
      for (let i = 1; i < actions.length; i++) {
        const q = this.getQ(state, actions[i]);
        if (q > bestQ) {
          bestQ = q;
          bestAction = actions[i];
        }
      }
      
      return bestAction;
    }
  }

  private getLegalActions(pitch: number): Action[] {
    const actions: Action[] = [];
    
    for (let string = 0; string < 4; string++) {
      const position = pitch - OPEN_STRING_PITCHES[string];
      if (position < 0 || position >= POSITION_COUNT) continue;
      
      for (let finger = 0; finger < FINGER_COUNT; finger++) {
        const penalty = calculateRawPositionScore(position, string, finger);
        if (penalty < PENALTY.NEVER) {
          actions.push({ finger, string, position });
        }
      }
    }
    
    return actions;
  }

  private createState(note: Note, action: Action, noteIndex: number): State {
    return {
      pitch: note.pitch,
      finger: action.finger,
      string: action.string,
      position: action.position,
      noteIndex
    };
  }

  private calculateReward(state: State, action: Action, nextState: State): number {
    // Use negative penalty as reward (no normalization)
    const penalty = calculateTotalPenalty(
      { position: state.position, finger: state.finger, string: state.string },
      { position: action.position, finger: action.finger, string: action.string }
    );
    return -penalty;
  }

  private calculateTDError(state: State, action: Action, reward: number, nextState: State): number {
    const currentQ = this.getQ(state, action);
    const maxNextQ = this.getMaxQ(nextState);
    return reward + this.config.discountFactor * maxNextQ - currentQ;
  }

  private updateQ(state: State, action: Action, tdError: number): void {
    const currentQ = this.getQ(state, action);
    const newQ = currentQ + this.config.learningRate * tdError;
    this.setQ(state, action, newQ);
  }

  private updateModel(state: State, action: Action, reward: number, nextState: State): void {
    const key = this.stateActionKey(state, action);
    this.model.set(key, { reward, nextState });
  }

  private updatePredict(state: State, action: Action, nextState: State): void {
    const nextKey = this.stateKey(nextState);
    if (!this.predict.has(nextKey)) {
      this.predict.set(nextKey, new Set());
    }
    const saKey = this.serializeStateAction(state, action);
    this.predict.get(nextKey)!.add(saKey);
  }

  private checkConvergence(): boolean {
    const windowSize = this.config.evaluationInterval;
    const numWindows = this.config.convergenceWindow;
    
    if (this.recentRewards.length < windowSize * numWindows) return false;
    
    const recent = this.recentRewards.slice(-windowSize * numWindows);
    const chunks: number[][] = [];
    
    for (let i = 0; i < numWindows; i++) {
      chunks.push(recent.slice(i * windowSize, (i + 1) * windowSize));
    }
    
    const means = chunks.map(chunk => chunk.reduce((a, b) => a + b, 0) / chunk.length);
    
    for (let i = 1; i < means.length; i++) {
      const change = Math.abs(means[i] - means[i - 1]) / Math.abs(means[i - 1]);
      if (change >= this.config.convergenceThreshold) {
        return false;
      }
    }
    
    return true;
  }

  // Q-table operations
  private getQ(state: State, action: Action): number {
    const sKey = this.stateKey(state);
    const aKey = this.actionKey(action);
    return this.qTable.get(sKey)?.get(aKey) ?? 0;
  }

  private setQ(state: State, action: Action, value: number): void {
    const sKey = this.stateKey(state);
    const aKey = this.actionKey(action);
    
    if (!this.qTable.has(sKey)) {
      this.qTable.set(sKey, new Map());
    }
    this.qTable.get(sKey)!.set(aKey, value);
  }

  private getMaxQ(state: State): number {
    const actions = this.getLegalActions(state.pitch);
    if (actions.length === 0) return 0;
    
    let maxQ = -Infinity;
    for (const action of actions) {
      const q = this.getQ(state, action);
      if (q > maxQ) maxQ = q;
    }
    
    return maxQ === -Infinity ? 0 : maxQ;
  }

  // Key generation
  private stateKey(state: State): string {
    return `${state.pitch}_${state.finger}_${state.string}_${state.position}_${state.noteIndex}`;
  }

  private actionKey(action: Action): string {
    return `${action.finger}_${action.string}_${action.position}`;
  }

  private stateActionKey(state: State, action: Action): string {
    return `${this.stateKey(state)}_${this.actionKey(action)}`;
  }

  private serializeStateAction(state: State, action: Action): string {
    return this.stateActionKey(state, action);
  }

  private deserializeStateAction(key: string): [State, Action] {
    const parts = key.split('_');
    const state: State = {
      pitch: parseInt(parts[0]),
      finger: parseInt(parts[1]),
      string: parseInt(parts[2]),
      position: parseInt(parts[3]),
      noteIndex: parseInt(parts[4])
    };
    const action: Action = {
      finger: parseInt(parts[5]),
      string: parseInt(parts[6]),
      position: parseInt(parts[7])
    };
    return [state, action];
  }

  // Expose Q-table for caching
  getQTable(): Map<string, Map<string, number>> {
    return this.qTable;
  }

  // Set Q-table (for parallel training merge)
  setQTable(qTable: Map<string, Map<string, number>>): void {
    this.qTable = qTable;
  }
}
