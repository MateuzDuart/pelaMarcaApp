import { useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { usePlayers } from '../../hooks/use-players';
import { useTeamSettings } from '../../hooks/use-team-settings';
import { useTeamState } from '../../hooks/use-team-state';
import type { Team } from '../../types/team';

type FillMode = 'menu' | 'reserve' | 'manual-team-list' | 'manual-player-list' | 'random-team-list' | 'random-preview';

function shufflePlayers<T>(list: T[]): T[] {
  const array = [...list];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export default function Transferencias() {
  const { players, isLoading: isPlayersLoading } = usePlayers();
  const { maxPlayersPerTeam } = useTeamSettings();
  const {
    teamState,
    isLoading,
    movePlayerToReserves,
    moveReserveToTeam,
    transferPlayersBetweenTeams,
  } = useTeamState(players, isPlayersLoading);
  const [selectedReservePlayerId, setSelectedReservePlayerId] = useState<string | null>(
    null
  );
  const [targetFillTeamId, setTargetFillTeamId] = useState<string | null>(null);
  const [fillMode, setFillMode] = useState<FillMode>('menu');
  const [selectedSourceTeamId, setSelectedSourceTeamId] = useState<string | null>(null);
  const [randomDrawPlayerIds, setRandomDrawPlayerIds] = useState<string[]>([]);

  const selectedReserve = useMemo(
    () => teamState.reserves.find((item) => item.player.id === selectedReservePlayerId) ?? null,
    [teamState.reserves, selectedReservePlayerId]
  );

  const availableTeams = useMemo(
    () => teamState.teams.filter((team) => team.players.length < maxPlayersPerTeam),
    [teamState.teams, maxPlayersPerTeam]
  );

  const targetFillTeam = useMemo(
    () => teamState.teams.find((team) => team.id === targetFillTeamId) ?? null,
    [teamState.teams, targetFillTeamId]
  );

  const fillMissingCount = useMemo(() => {
    if (!targetFillTeam) return 0;
    return Math.max(0, maxPlayersPerTeam - targetFillTeam.players.length);
  }, [targetFillTeam, maxPlayersPerTeam]);

  const manualSourceTeams = useMemo(() => {
    if (!targetFillTeamId) return [];
    return teamState.teams.filter(
      (team) => team.id !== targetFillTeamId && team.players.length > 0
    );
  }, [teamState.teams, targetFillTeamId]);

  const selectedSourceTeam = useMemo(
    () => manualSourceTeams.find((team) => team.id === selectedSourceTeamId) ?? null,
    [manualSourceTeams, selectedSourceTeamId]
  );

  async function handleAddReserveToTeam(teamId: string, reservePlayerId: string) {
    await moveReserveToTeam(reservePlayerId, teamId, maxPlayersPerTeam);
    if (selectedReservePlayerId === reservePlayerId) {
      setSelectedReservePlayerId(null);
    }
  }

  function openFillModal(teamId: string) {
    setTargetFillTeamId(teamId);
    setFillMode('menu');
    setSelectedSourceTeamId(null);
    setRandomDrawPlayerIds([]);
  }

  function closeFillModal() {
    setTargetFillTeamId(null);
    setFillMode('menu');
    setSelectedSourceTeamId(null);
    setRandomDrawPlayerIds([]);
  }

  async function handleManualTransfer(playerId: string) {
    if (!targetFillTeamId || !selectedSourceTeamId) return;
    await transferPlayersBetweenTeams(
      selectedSourceTeamId,
      targetFillTeamId,
      [playerId],
      maxPlayersPerTeam
    );
    if (fillMissingCount <= 1) {
      closeFillModal();
      return;
    }
    setFillMode('manual-player-list');
  }

  function handleRandomDraw(sourceTeam: Team) {
    if (fillMissingCount <= 0) return;
    const selectedPlayers = shufflePlayers(sourceTeam.players)
      .slice(0, fillMissingCount)
      .map((player) => player.id);
    setSelectedSourceTeamId(sourceTeam.id);
    setRandomDrawPlayerIds(selectedPlayers);
    setFillMode('random-preview');
  }

  async function handleConfirmRandomTransfer() {
    if (!targetFillTeamId || !selectedSourceTeamId || randomDrawPlayerIds.length === 0) return;
    await transferPlayersBetweenTeams(
      selectedSourceTeamId,
      targetFillTeamId,
      randomDrawPlayerIds,
      maxPlayersPerTeam
    );
    closeFillModal();
  }

  function formatDate(timestamp: number) {
    const date = new Date(timestamp);
  
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
  
    return `${hours}:${minutes}`;
  }



  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Transferencias</Text>
      <Text style={styles.subtitle}>
        Remova jogadores dos times para a lista de reservas.
      </Text>

      {isLoading ? (
        <Text style={styles.emptyText}>Carregando transferencias...</Text>
      ) : (
        <>
          <Text style={styles.sectionTitle}>Times</Text>
          {teamState.teams.length === 0 ? (
            <Text style={styles.emptyText}>Nenhum time sorteado.</Text>
          ) : (
            teamState.teams.map((team, teamIndex) => (
              <View key={team.id} style={styles.card}>
                <Text style={styles.cardTitle}>{team.name}</Text>
                {team.players.map((player, playerIndex) => (
                  <View key={player.id} style={styles.playerRow}>
                    <Text style={styles.playerText}>
                      {playerIndex + 1}. {player.name}
                    </Text>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => void movePlayerToReserves(team.id, player.id)}
                    >
                      <Text style={styles.removeButtonText}>Excluir do time</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                {team.players.length < maxPlayersPerTeam ? (
                  <TouchableOpacity
                    style={styles.fillButton}
                    onPress={() => openFillModal(team.id)}
                  >
                    <Text style={styles.fillButtonText}>
                      Preencher ({maxPlayersPerTeam - team.players.length} vaga(s))
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ))
          )}

          <Text style={styles.sectionTitle}>Reservas</Text>
          {teamState.reserves.length === 0 ? (
            <Text style={styles.emptyText}>Sem jogadores em reservas.</Text>
          ) : (
            <View style={styles.card}>
              {teamState.reserves.map((reserve, index) => (
                <View key={reserve.player.id} style={styles.playerRow}>
                  <View style={styles.reserveInfo}>
                    <Text style={styles.playerText}>
                      {index + 1}. {reserve.player.name}
                    </Text>
                    <Text style={styles.reserveTimeText}>
                      {reserve.reserveTimestamp === 0
                        ? '(sem time ainda)'
                        : `Saiu á: ${formatDate(reserve.reserveTimestamp)}`}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setSelectedReservePlayerId(reserve.player.id)}
                  >
                    <Text style={styles.addButtonText}>Adicionar</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      <Modal
        visible={selectedReservePlayerId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedReservePlayerId(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Adicionar em qual time?</Text>
            {selectedReserve ? (
              <Text style={styles.modalSubtitle}>{selectedReserve.player.name}</Text>
            ) : null}

            {availableTeams.length === 0 ? (
              <Text style={styles.emptyText}>Nenhum time com vaga disponivel.</Text>
            ) : (
              availableTeams.map((team) => (
                <TouchableOpacity
                  key={team.id}
                  style={styles.modalTeamButton}
                  onPress={() =>
                    selectedReserve
                      ? void handleAddReserveToTeam(team.id, selectedReserve.player.id)
                      : undefined
                  }
                >
                  <Text style={styles.modalTeamButtonText}>
                    {team.name}
                  </Text>
                </TouchableOpacity>
              ))
            )}

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setSelectedReservePlayerId(null)}
            >
              <Text style={styles.modalCancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={targetFillTeamId !== null}
        transparent
        animationType="fade"
        onRequestClose={closeFillModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Preencher time</Text>
            {targetFillTeam ? (
              <Text style={styles.modalSubtitle}>
                {targetFillTeam.name} | faltam {fillMissingCount} jogador(es)
              </Text>
            ) : null}

            {fillMode === 'menu' ? (
              <>
                <TouchableOpacity
                  style={styles.modalTeamButton}
                  onPress={() => setFillMode('reserve')}
                >
                  <Text style={styles.modalTeamButtonText}>Usar reserva</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalTeamButton}
                  onPress={() => setFillMode('manual-team-list')}
                >
                  <Text style={styles.modalTeamButtonText}>Qualquer jogador</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalTeamButton}
                  onPress={() => setFillMode('random-team-list')}
                >
                  <Text style={styles.modalTeamButtonText}>
                    Jogadores aleatorio de um time
                  </Text>
                </TouchableOpacity>
              </>
            ) : null}

            {fillMode === 'reserve' ? (
              <>
                {teamState.reserves.length === 0 ? (
                  <Text style={styles.emptyText}>Sem reservas disponiveis.</Text>
                ) : (
                  teamState.reserves.map((reserve) => (
                    <View key={reserve.player.id} style={styles.playerRow}>
                      <Text style={styles.playerText}>{reserve.player.name}</Text>
                      <TouchableOpacity
                        style={styles.addButton}
                        onPress={() =>
                          void handleAddReserveToTeam(
                            targetFillTeamId ?? '',
                            reserve.player.id
                          )
                        }
                      >
                        <Text style={styles.addButtonText}>Adicionar</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </>
            ) : null}

            {fillMode === 'manual-team-list' ? (
              <>
                {manualSourceTeams.length === 0 ? (
                  <Text style={styles.emptyText}>Sem times disponiveis para origem.</Text>
                ) : (
                  manualSourceTeams.map((team) => (
                    <TouchableOpacity
                      key={team.id}
                      style={styles.modalTeamButton}
                      onPress={() => {
                        setSelectedSourceTeamId(team.id);
                        setFillMode('manual-player-list');
                      }}
                    >
                      <Text style={styles.modalTeamButtonText}>
                        {team.name}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </>
            ) : null}

            {fillMode === 'manual-player-list' ? (
              <>
                {selectedSourceTeam ? (
                  <>
                    <Text style={styles.modalSubtitle}>
                      Origem: {selectedSourceTeam.name}
                    </Text>
                    {selectedSourceTeam.players.map((player) => (
                      <View key={player.id} style={styles.playerRow}>
                        <Text style={styles.playerText}>{player.name}</Text>
                        <TouchableOpacity
                          style={styles.addButton}
                          onPress={() => void handleManualTransfer(player.id)}
                        >
                          <Text style={styles.addButtonText}>Transferir</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </>
                ) : (
                  <Text style={styles.emptyText}>Selecione um time de origem.</Text>
                )}
              </>
            ) : null}

            {fillMode === 'random-team-list' ? (
              <>
                {manualSourceTeams.length === 0 ? (
                  <Text style={styles.emptyText}>Sem times disponiveis para sorteio.</Text>
                ) : (
                  manualSourceTeams.map((team) => (
                    <TouchableOpacity
                      key={team.id}
                      style={styles.modalTeamButton}
                      onPress={() => handleRandomDraw(team)}
                    >
                      <Text style={styles.modalTeamButtonText}>
                        {team.name}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </>
            ) : null}

            {fillMode === 'random-preview' ? (
              <>
                <Text style={styles.modalSubtitle}>Jogadores sorteados</Text>
                {selectedSourceTeam &&
                  selectedSourceTeam.players
                    .filter((player) => randomDrawPlayerIds.includes(player.id))
                    .map((player) => (
                      <Text key={player.id} style={styles.playerText}>
                        - {player.name}
                      </Text>
                    ))}
                <View style={styles.randomActions}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => setFillMode('random-team-list')}
                  >
                    <Text style={styles.modalCancelButtonText}>Voltar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalTeamButton}
                    onPress={() => void handleConfirmRandomTransfer()}
                  >
                    <Text style={styles.modalTeamButtonText}>Concluir transferencia</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : null}

            <TouchableOpacity style={styles.modalCancelButton} onPress={closeFillModal}>
              <Text style={styles.modalCancelButtonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
  },
  contentContainer: {
    padding: 16,
    paddingTop: 56,
    paddingBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 16,
    color: '#9CA3AF',
  },
  sectionTitle: {
    color: '#F9FAFB',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 8,
  },
  card: {
    backgroundColor: '#111827',
    borderColor: '#1F2937',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  cardTitle: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  playerText: {
    color: '#E5E7EB',
    fontSize: 15,
    flex: 1,
  },
  reserveInfo: {
    flex: 1,
  },
  reserveTimeText: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 2,
  },
  removeButton: {
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  removeButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  addButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  fillButton: {
    marginTop: 6,
    backgroundColor: '#D97706',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  fillButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  emptyText: {
    color: '#9CA3AF',
    marginBottom: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#0B1220',
    borderColor: '#1F2937',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  modalTitle: {
    color: '#F9FAFB',
    fontSize: 18,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: '#9CA3AF',
    marginTop: 6,
    marginBottom: 12,
  },
  modalTeamButton: {
    backgroundColor: '#1D4ED8',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  modalTeamButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  modalCancelButton: {
    marginTop: 6,
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: '#F9FAFB',
    fontWeight: '700',
  },
  randomActions: {
    marginTop: 8,
    gap: 8,
  },
});
