// Parallel Dyna-Q Training with Web Workers

import { Note, Action, WorkerConfig, WorkerResult, WorkerProgress, State } from './types';
import { DynaQAgent } from './dynaQ';
import { DEFAULT_CONFIG } from './const';

export class ParallelDynaQTrainer {
  private workerCount: number;
  
  constructor() {
    this.workerCount = this.detectWorkerCount();
  }
  
  private detectWorkerCount(): number {
    // Check if Web Workers are supported
    if (typeof Worker === 'undefined') {
      console.log('⚠️ Web Workers not supported, using single thread');
      return 1;
    }
    
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const cores = navigator.hardwareConcurrency || 4;
    
    if (isMobile) {
      console.log('📱 Mobile device detected, using single thread');
      return 1;
    }
    
    if (cores >= 8) {
      console.log(`💻 High-end PC detected (${cores} cores), using 4 workers`);
      return 4;
    }
    
    if (cores >= 4) {
      console.log(`💻 Mid-range PC detected (${cores} cores), using 2 workers`);
      return 2;
    }
    
    console.log(`💻 Low-end PC detected (${cores} cores), using single thread`);
    return 1;
  }
  
  async train(
    notes: Note[],
    onProgress?: (progress: WorkerProgress) => void
  ): Promise<Action[]> {
    console.log(`🚀 Starting parallel training with ${this.workerCount} worker(s)`);
    
    if (this.workerCount === 1) {
      // Single-thread mode: use existing implementation
      return this.trainSingleThread(notes, onProgress);
    }
    
    // Multi-thread mode: start workers
    const workerConfigs = this.createWorkerConfigs();
    const workers = workerConfigs.map((config, i) => 
      this.startWorker(notes, config, i, onProgress)
    );
    
    // Wait for all workers to complete
    const results = await Promise.all(workers);
    
    // Merge Q-tables
    console.log('🔄 Merging Q-tables from all workers...');
    const qTables = results.map(r => this.deserializeQTable(r.qTable));
    const mergedQTable = this.mergeQTables(qTables);
    
    // Extract optimal policy
    console.log('🎯 Extracting optimal policy from merged Q-table...');
    return this.extractPolicy(mergedQTable, notes);
  }
  
  private createWorkerConfigs(): WorkerConfig[] {
    const episodesPerWorker = Math.floor(10000 / this.workerCount);
    
    return Array.from({ length: this.workerCount }, (_, i) => ({
      seed: Date.now() + i * 1000,
      episodes: episodesPerWorker,
      planningSteps: DEFAULT_CONFIG.planningSteps,
      learningRate: DEFAULT_CONFIG.learningRate,
      discountFactor: DEFAULT_CONFIG.discountFactor,
      explorationRate: DEFAULT_CONFIG.explorationRate,
      priorityThreshold: DEFAULT_CONFIG.priorityThreshold,
      evaluationInterval: DEFAULT_CONFIG.evaluationInterval,
      convergenceWindow: DEFAULT_CONFIG.convergenceWindow,
      convergenceThreshold: DEFAULT_CONFIG.convergenceThreshold
    }));
  }
  
  private async startWorker(
    notes: Note[],
    config: WorkerConfig,
    workerId: number,
    onProgress?: (progress: WorkerProgress) => void
  ): Promise<WorkerResult> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(
        new URL('../../workers/dynaQ.worker.ts', import.meta.url)
      );
      
      worker.onmessage = (e: MessageEvent) => {
        const { type, data } = e.data;
        
        if (type === 'progress') {
          onProgress?.({
            workerId,
            episode: data.episode,
            reward: data.reward,
            progress: data.episode / config.episodes
          });
        } else if (type === 'complete') {
          worker.terminate();
          resolve({
            qTable: data.qTable,
            finalReward: data.finalReward,
            episodesCompleted: data.episodesCompleted,
            converged: data.converged
          });
        } else if (type === 'error') {
          worker.terminate();
          reject(new Error(data.message));
        }
      };
      
      worker.onerror = (error) => {
        worker.terminate();
        reject(error);
      };
      
      // Send training task
      worker.postMessage({
        notes: notes,
        config: config
      });
    });
  }
  
  private async trainSingleThread(
    notes: Note[],
    onProgress?: (progress: WorkerProgress) => void
  ): Promise<Action[]> {
    const agent = new DynaQAgent({
      ...DEFAULT_CONFIG,
      nEpisodes: 10000
    });
    
    agent.initializeWithRules(notes);
    
    await agent.train(notes, (episode, reward) => {
      onProgress?.({
        workerId: 0,
        episode,
        reward,
        progress: episode / 10000
      });
    });
    
    return agent.getOptimalFingering(notes);
  }
  
  private mergeQTables(
    qTables: Map<string, Map<string, number>>[]
  ): Map<string, Map<string, number>> {
    const merged = new Map<string, Map<string, number>>();
    
    // Collect all state keys
    const allStateKeys = new Set<string>();
    for (const qTable of qTables) {
      for (const stateKey of qTable.keys()) {
        allStateKeys.add(stateKey);
      }
    }
    
    // Merge each state
    for (const stateKey of allStateKeys) {
      const mergedActions = new Map<string, number>();
      
      // Collect all action keys for this state
      const allActionKeys = new Set<string>();
      for (const qTable of qTables) {
        const actions = qTable.get(stateKey);
        if (actions) {
          for (const actionKey of actions.keys()) {
            allActionKeys.add(actionKey);
          }
        }
      }
      
      // Calculate average Q-value for each action
      for (const actionKey of allActionKeys) {
        const values: number[] = [];
        for (const qTable of qTables) {
          const actions = qTable.get(stateKey);
          if (actions && actions.has(actionKey)) {
            values.push(actions.get(actionKey)!);
          }
        }
        
        if (values.length > 0) {
          const avg = values.reduce((a, b) => a + b, 0) / values.length;
          mergedActions.set(actionKey, avg);
        }
      }
      
      merged.set(stateKey, mergedActions);
    }
    
    console.log(`✅ Merged ${merged.size} states from ${qTables.length} worker(s)`);
    return merged;
  }
  
  private extractPolicy(
    qTable: Map<string, Map<string, number>>,
    notes: Note[]
  ): Action[] {
    // Create a temporary agent with the merged Q-table
    const agent = new DynaQAgent({
      ...DEFAULT_CONFIG,
      nEpisodes: 1
    });
    
    // Inject merged Q-table
    agent.setQTable(qTable);
    
    // Extract optimal policy
    return agent.getOptimalFingering(notes);
  }
  
  private deserializeQTable(
    serialized: any
  ): Map<string, Map<string, number>> {
    const qTable = new Map<string, Map<string, number>>();
    
    for (const [stateKey, actions] of Object.entries(serialized)) {
      const actionMap = new Map<string, number>();
      for (const [actionKey, value] of Object.entries(actions as any)) {
        actionMap.set(actionKey, value as number);
      }
      qTable.set(stateKey, actionMap);
    }
    
    return qTable;
  }
  
  getWorkerCount(): number {
    return this.workerCount;
  }
}
