import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@pelamarca:team-settings:max-players-per-team';
const DEFAULT_MAX_PLAYERS_PER_TEAM = 5;

type UseTeamSettingsReturn = {
  maxPlayersPerTeam: number;
  isLoading: boolean;
  setMaxPlayersPerTeam: (value: number) => Promise<void>;
};

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

export function useTeamSettings(): UseTeamSettingsReturn {
  const [maxPlayersPerTeam, setMaxPlayersPerTeamState] = useState(
    DEFAULT_MAX_PLAYERS_PER_TEAM
  );
  const [isLoading, setIsLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const savedValue = await AsyncStorage.getItem(STORAGE_KEY);
      setMaxPlayersPerTeamState(
        parsePositiveInt(savedValue, DEFAULT_MAX_PLAYERS_PER_TEAM)
      );
    } catch {
      setMaxPlayersPerTeamState(DEFAULT_MAX_PLAYERS_PER_TEAM);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useFocusEffect(
    useCallback(() => {
      void loadSettings();
    }, [loadSettings])
  );

  const setMaxPlayersPerTeam = useCallback(async (value: number) => {
    if (!Number.isInteger(value) || value <= 0) return;

    setMaxPlayersPerTeamState(value);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // no-op: keep state in memory if persistence fails
    }
  }, []);

  return { maxPlayersPerTeam, isLoading, setMaxPlayersPerTeam };
}
