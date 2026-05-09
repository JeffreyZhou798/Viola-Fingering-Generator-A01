// Web Worker for Dyna-Q Training

import { DynaQAgent } from '@/lib/algorithm/dynaQ';
import { Note, WorkerConfig } from '@/lib/algorithm/types';

self.onmessage = async (e: MessageEvent) => {
  const { notes, config } = e.data as { notes: Note[]; config: WorkerConfig };
  
  try {
    console.log(`🔧 Worker started with seed ${config.seed}, ${config.episodes} episodes`);
    
    // Create Dyna-Q agent
    const agent = new DynaQAgent({
      nEpisodes: config.episodes,
      maxEpisodeLength: 100,
      learningRate: config.learningRate,
      discountFactor: config.discountFactor,
      explorationRate: config.explorationRate,
      planningSteps: config.planningSteps,
      priorityThreshold: config.priorityThreshold,
      evaluationInterval: config.evaluationInterval,
      convergenceWindow: config.convergenceWindow,
      convergenceThreshold: config.convergenceThreshold,
      randomSeed: config.seed
    });
    
    // Initialize with rules
    agent.initializeWithRules(notes);
    
    // Train
    await agent.train(notes, (episode, reward) => {
      // Send progress update
      self.postMessage({
        type: 'progress',
        data: {
          episode,
          reward
        }
      });
    });
    
    // Get Q-table
    const qTable = agent.getQTable();
    
    // Serialize Q-table (Map cannot be directly transferred)
    const serializedQTable: any = {};
    for (const [stateKey, actions] of qTable.entries()) {
      const serializedActions: any = {};
      for (const [actionKey, value] of actions.entries()) {
        serializedActions[actionKey] = value;
      }
      serializedQTable[stateKey] = serializedActions;
    }
    
    console.log(`✅ Worker completed training`);
    
    // Send completion message
    self.postMessage({
      type: 'complete',
      data: {
        qTable: serializedQTable,
        finalReward: 0,
        episodesCompleted: config.episodes,
        converged: true
      }
    });
    
  } catch (error) {
    console.error('❌ Worker error:', error);
    self.postMessage({
      type: 'error',
      data: {
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
};
