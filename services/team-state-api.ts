import AsyncStorage from '@react-native-async-storage/async-storage';

import type { TeamState } from '../types/team';

const STORAGE_KEY = '@pelamarca:team-state';

let memoryTeamState: TeamState = { teams: [], reserves: [] };
let useMemoryFallback = false;

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
    await AsyncStorage.getItem('@pelamarca:team-state-healthcheck');
  } catch (error) {
    if (isNativeModuleNullError(error)) {
      useMemoryFallback = true;
      return;
    }
    throw error;
  }
}

export async function fetchTeamState(): Promise<TeamState> {
  await ensureStorageReady();
  if (useMemoryFallback) return memoryTeamState;

  const data = await AsyncStorage.getItem(STORAGE_KEY);
  if (!data) return { teams: [], reserves: [] };

  try {
    const parsed = JSON.parse(data) as TeamState;
    const parsedReserves = Array.isArray(parsed?.reserves) ? parsed.reserves : [];

    return {
      teams: Array.isArray(parsed?.teams) ? parsed.teams : [],
      reserves: parsedReserves
        .map((item) => {
          // Backward compatibility: old format stored Player directly.
          if (item && typeof item === 'object' && 'player' in item) {
            return {
              player: (item as TeamState['reserves'][number]).player,
              reserveTimestamp:
                (item as TeamState['reserves'][number]).reserveTimestamp ?? 0,
            };
          }

          return {
            player: item,
            reserveTimestamp: 0,
          };
        })
        .filter((item) => item.player && typeof item.player === 'object'),
    };
  } catch {
    return { teams: [], reserves: [] };
  }
}

export async function saveTeamState(teamState: TeamState): Promise<void> {
  await ensureStorageReady();

  if (useMemoryFallback) {
    memoryTeamState = teamState;
    return;
  }

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(teamState));
}
