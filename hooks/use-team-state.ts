import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { fetchTeamState, saveTeamState } from '../services/team-state-api';
import type { Player } from '../types/player';
import type { Team, TeamState } from '../types/team';

type UseTeamStateReturn = {
  teamState: TeamState;
  isLoading: boolean;
  setGeneratedTeams: (teams: Team[]) => Promise<void>;
  createEmptyTeam: () => Promise<void>;
  movePlayerToReserves: (teamId: string, playerId: string) => Promise<void>;
  moveReserveToTeam: (
    playerId: string,
    teamId: string,
    maxPlayersPerTeam: number
  ) => Promise<void>;
  transferPlayersBetweenTeams: (
    sourceTeamId: string,
    targetTeamId: string,
    playerIds: string[],
    maxPlayersPerTeam: number
  ) => Promise<void>;
};

function normalizeByPlayers(teamState: TeamState, players: Player[]): TeamState {
  const existingPlayerIds = new Set(players.map((player) => player.id));

  const teams = teamState.teams.map((team) => ({
    ...team,
    players: team.players.filter((player) => existingPlayerIds.has(player.id)),
  }));

  const assignedPlayerIds = new Set(teams.flatMap((team) => team.players.map((p) => p.id)));
  const reserves = teamState.reserves.filter(
    (reserve) =>
      existingPlayerIds.has(reserve.player.id) && !assignedPlayerIds.has(reserve.player.id)
  );

  const sortedReserves = [...reserves].sort(
    (a, b) => a.reserveTimestamp - b.reserveTimestamp
  );

  return { teams, reserves: sortedReserves };
}

function getNextTeamId(teams: Team[]): string {
  const usedIds = new Set(teams.map((team) => team.id));
  let index = teams.length + 1;
  let candidate = `team-${index}`;
  while (usedIds.has(candidate)) {
    index += 1;
    candidate = `team-${index}`;
  }
  return candidate;
}

export function useTeamState(players: Player[]): UseTeamStateReturn {
  const [teamState, setTeamState] = useState<TeamState>({ teams: [], reserves: [] });
  const [isLoading, setIsLoading] = useState(true);

  const loadTeamState = useCallback(async () => {
    setIsLoading(true);
    try {
      const savedState = await fetchTeamState();
      setTeamState(normalizeByPlayers(savedState, players));
    } finally {
      setIsLoading(false);
    }
  }, [players]);

  useEffect(() => {
    void loadTeamState();
  }, [loadTeamState]);

  useFocusEffect(
    useCallback(() => {
      void loadTeamState();
    }, [loadTeamState])
  );

  useEffect(() => {
    setTeamState((prevState) => {
      const nextState = normalizeByPlayers(prevState, players);
      if (JSON.stringify(prevState) === JSON.stringify(nextState)) {
        return prevState;
      }
      void saveTeamState(nextState);
      return nextState;
    });
  }, [players]);

  const setGeneratedTeams = useCallback(
    async (teams: Team[]) => {
      const assignedIds = new Set(teams.flatMap((team) => team.players.map((player) => player.id)));
      const unassignedReserves = players
        .filter((player) => !assignedIds.has(player.id))
        .map((player) => ({ player, reserveTimestamp: 0 }));

      const nextState = normalizeByPlayers({ teams, reserves: unassignedReserves }, players);
      setTeamState(nextState);
      await saveTeamState(nextState);
    },
    [players]
  );

  const createEmptyTeam = useCallback(async () => {
    const newTeam: Team = {
      id: getNextTeamId(teamState.teams),
      players: [],
    };

    const nextState = normalizeByPlayers(
      { teams: [...teamState.teams, newTeam], reserves: teamState.reserves },
      players
    );

    setTeamState(nextState);
    await saveTeamState(nextState);
  }, [teamState, players]);

  const movePlayerToReserves = useCallback(
    async (teamId: string, playerId: string) => {
      const currentPlayer =
        teamState.teams
          .find((team) => team.id === teamId)
          ?.players.find((player) => player.id === playerId) ?? null;

      if (!currentPlayer) return;

      const nextTeams = teamState.teams
        .map((team) =>
          team.id === teamId
            ? {
                ...team,
                players: team.players.filter((player) => player.id !== playerId),
              }
            : team
        );

      const alreadyInReserves = teamState.reserves.some(
        (reserve) => reserve.player.id === playerId
      );
      const nextReserves = alreadyInReserves
        ? teamState.reserves
        : [
            ...teamState.reserves,
            {
              player: currentPlayer,
              reserveTimestamp: Date.now(),
            },
          ];

      const nextState = normalizeByPlayers(
        { teams: nextTeams, reserves: nextReserves },
        players
      );
      setTeamState(nextState);
      await saveTeamState(nextState);
    },
    [teamState, players]
  );

  const moveReserveToTeam = useCallback(
    async (playerId: string, teamId: string, maxPlayersPerTeam: number) => {
      const reserve = teamState.reserves.find((item) => item.player.id === playerId);
      if (!reserve) return;

      const targetTeam = teamState.teams.find((team) => team.id === teamId);
      if (!targetTeam) return;
      if (targetTeam.players.length >= maxPlayersPerTeam) return;

      const nextTeams = teamState.teams.map((team) =>
        team.id === teamId ? { ...team, players: [...team.players, reserve.player] } : team
      );

      const nextReserves = teamState.reserves.filter((item) => item.player.id !== playerId);
      const nextState = normalizeByPlayers(
        { teams: nextTeams, reserves: nextReserves },
        players
      );

      setTeamState(nextState);
      await saveTeamState(nextState);
    },
    [teamState, players]
  );

  const transferPlayersBetweenTeams = useCallback(
    async (
      sourceTeamId: string,
      targetTeamId: string,
      playerIds: string[],
      maxPlayersPerTeam: number
    ) => {
      if (sourceTeamId === targetTeamId) return;
      if (playerIds.length === 0) return;

      const sourceTeam = teamState.teams.find((team) => team.id === sourceTeamId);
      const targetTeam = teamState.teams.find((team) => team.id === targetTeamId);
      if (!sourceTeam || !targetTeam) return;

      const sourcePlayersById = new Map(sourceTeam.players.map((player) => [player.id, player]));
      const playersToMove = playerIds
        .map((playerId) => sourcePlayersById.get(playerId))
        .filter((player): player is Player => Boolean(player));

      if (playersToMove.length === 0) return;

      const availableSlots = Math.max(0, maxPlayersPerTeam - targetTeam.players.length);
      if (availableSlots === 0) return;

      const boundedPlayers = playersToMove.slice(0, availableSlots);
      const boundedIds = new Set(boundedPlayers.map((player) => player.id));

      const nextTeams = teamState.teams.map((team) => {
        if (team.id === sourceTeamId) {
          return {
            ...team,
            players: team.players.filter((player) => !boundedIds.has(player.id)),
          };
        }
        if (team.id === targetTeamId) {
          return {
            ...team,
            players: [...team.players, ...boundedPlayers],
          };
        }
        return team;
      });

      const nextState = normalizeByPlayers(
        { teams: nextTeams, reserves: teamState.reserves },
        players
      );
      setTeamState(nextState);
      await saveTeamState(nextState);
    },
    [teamState, players]
  );

  return {
    teamState,
    isLoading,
    setGeneratedTeams,
    createEmptyTeam,
    movePlayerToReserves,
    moveReserveToTeam,
    transferPlayersBetweenTeams,
  };
}
