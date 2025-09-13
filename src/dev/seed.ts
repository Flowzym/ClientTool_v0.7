/**
 * Dataset factory for performance testing
 */

import { generateClients } from './generateClients';
import type { Client } from '../domain/models';

export type DatasetSize = '100' | '1k' | '5k' | '10k';

export function makeDataset(size: DatasetSize): Client[] {
  const counts = {
    '100': 100,
    '1k': 1000,
    '5k': 5000,
    '10k': 10000
  };
  
  const count = counts[size];
  return generateClients(count, 42); // Fixed seed for reproducible results
}

export function small(): Client[] {
  return makeDataset('100');
}

export function medium(): Client[] {
  return makeDataset('1k');
}

export function large(): Client[] {
  return makeDataset('5k');
}

export function xlarge(): Client[] {
  return makeDataset('10k');
}