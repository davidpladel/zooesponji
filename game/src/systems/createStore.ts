import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import type { KeyValueStore } from '../core/save';
import { createCapacitorStore, createWebStore } from './storage';

export function createStore(): KeyValueStore {
  return Capacitor.isNativePlatform() ? createCapacitorStore(Preferences) : createWebStore();
}
