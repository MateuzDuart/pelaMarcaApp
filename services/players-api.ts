import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Player } from '../types/player';

const STORAGE_KEY = '@pelamarca:players';
let memoryPlayers: Player[] = [];
let useMemoryFallback = false;

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isNativeModuleNullError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.message.includes('Native module is null') ||
    error.message.includes('cannot access legacy storage')
  );
}

async function ensureStorageReady() {
  if (useMemoryFallback) return;

  try {
    await AsyncStorage.getItem('@pelamarca:healthcheck');
  } catch (error) {
    if (isNativeModuleNullError(error)) {
      useMemoryFallback = true;
      return;
    }
    throw error;
  }
}

async function readPlayers(): Promise<Player[]> {
  await ensureStorageReady();
  if (useMemoryFallback) return memoryPlayers;

  const data = await AsyncStorage.getItem(STORAGE_KEY);
  console.log(data)
  if (!data) return [];

  try {
    const parsed = JSON.parse(data) as Player[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function savePlayers(players: Player[]) {
  await ensureStorageReady();
  if (useMemoryFallback) {
    memoryPlayers = players;
    return;
  }

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(players));
}

export async function fetchPlayers(): Promise<Player[]> {
  // await wait(150);
  return readPlayers();
}

export async function createPlayer(name: string): Promise<Player> {
  await wait(150);

  const player: Player = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: name.trim(),
    createdAt: Date.now(),
  };

  const players = await readPlayers();
  const updatedPlayers = [...players, player];
  await savePlayers(updatedPlayers);

  return player;
}

export async function deletePlayerById(playerId: string): Promise<void> {
  await wait(150);

  const players = await readPlayers();
  const updatedPlayers = players.filter((player) => player.id !== playerId);
  await savePlayers(updatedPlayers);
}

export async function clearPlayers(): Promise<void> {
  await wait(150);
  await savePlayers([]);
}
