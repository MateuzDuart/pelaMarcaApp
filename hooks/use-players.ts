import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';

import {
  clearPlayers,
  createPlayer,
  deletePlayerById,
  fetchPlayers,
} from '../services/players-api';
import type { Player } from '../types/player';

type UsePlayersReturn = {
  players: Player[];
  isLoading: boolean;
  isSaving: boolean;
  addPlayer: (name: string) => Promise<boolean>;
  removePlayer: (id: string) => Promise<void>;
  removeAllPlayers: () => Promise<void>;
};

export function usePlayers(): UsePlayersReturn {
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadPlayers = useCallback(async () => {
    setIsLoading(true);
    try {
      const loadedPlayers = await fetchPlayers();
      setPlayers(loadedPlayers);
    } catch (error) {
      console.error('Erro ao carregar players:', error);
      setPlayers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlayers();
  }, [loadPlayers]);

  useFocusEffect(
    useCallback(() => {
      void loadPlayers();
    }, [loadPlayers])
  );

  const addPlayer = useCallback(async (name: string) => {
    if (!name.trim()) return false;

    setIsSaving(true);
    try {
      const newPlayer = await createPlayer(name);
      setPlayers((prev) => [...prev, newPlayer]);
      return true;
    } catch (error) {
      console.error('Erro ao adicionar player:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const removePlayer = useCallback(async (id: string) => {
    setIsSaving(true);
    try {
      await deletePlayerById(id);
      setPlayers((prev) => prev.filter((player) => player.id !== id));
    } catch (error) {
      console.error('Erro ao remover player:', error);
    } finally {
      setIsSaving(false);
    }
  }, []);

  const removeAllPlayers = useCallback(async () => {
    setIsSaving(true);
    try {
      await clearPlayers();
      setPlayers([]);
    } catch (error) {
      console.error('Erro ao remover todos os players:', error);
    } finally {
      setIsSaving(false);
    }
  }, []);

  return {
    players,
    isLoading,
    isSaving,
    addPlayer,
    removePlayer,
    removeAllPlayers,
  };
}
