// IndexedDB Cache for fingering results

import { openDB, IDBPDatabase } from 'idb';
import { Action, CachedResult } from '../algorithm/types';

const DB_NAME = 'ViolaFingeringDB';
const STORE_NAME = 'fingerings';
const DB_VERSION = 1;

export class IndexedDBCache {
  private db: IDBPDatabase | null = null;

  async init(): Promise<void> {
    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'hash' });
        }
      },
    });
  }

  async calculateHash(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async saveResult(hash: string, fingering: Action[], qTable?: Map<string, Map<string, number>>): Promise<void> {
    if (!this.db) await this.init();
    
    const data: CachedResult = {
      fingering,
      qTable: qTable ? this.serializeQTable(qTable) : undefined,
      timestamp: Date.now()
    };
    
    await this.db!.put(STORE_NAME, { hash, ...data });
    console.log('💾 Cached result saved');
  }

  async loadResult(hash: string): Promise<CachedResult | null> {
    if (!this.db) await this.init();
    
    const result = await this.db!.get(STORE_NAME, hash);
    
    if (result) {
      console.log('✅ Cache hit! Loading cached result');
      return {
        fingering: result.fingering,
        qTable: result.qTable,
        timestamp: result.timestamp
      };
    }
    
    console.log('❌ Cache miss. Starting new training');
    return null;
  }

  async clearCache(): Promise<void> {
    if (!this.db) await this.init();
    
    await this.db!.clear(STORE_NAME);
    console.log('🗑️ Cache cleared');
  }

  private serializeQTable(qTable: Map<string, Map<string, number>>): any {
    const obj: any = {};
    for (const [stateKey, actionMap] of qTable.entries()) {
      obj[stateKey] = {};
      for (const [actionKey, value] of actionMap.entries()) {
        obj[stateKey][actionKey] = value;
      }
    }
    return obj;
  }

  private deserializeQTable(obj: any): Map<string, Map<string, number>> {
    const qTable = new Map<string, Map<string, number>>();
    for (const stateKey in obj) {
      const actionMap = new Map<string, number>();
      for (const actionKey in obj[stateKey]) {
        actionMap.set(actionKey, obj[stateKey][actionKey]);
      }
      qTable.set(stateKey, actionMap);
    }
    return qTable;
  }
}
