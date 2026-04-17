import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { usePlayers } from '../../hooks/use-players';
import { useTeamSettings } from '../../hooks/use-team-settings';
import { useTeamState } from '../../hooks/use-team-state';
import type { Player } from '../../types/player';
import type { Team } from '../../types/team';

function shufflePlayers(list: Player[]): Player[] {
  const array = [...list];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function buildTeams(
  players: Player[],
  playersPerTeam: number,
  maxTeams: number,
  priorityUntil: number
): Team[] {
  if (playersPerTeam <= 0 || maxTeams <= 0 || players.length === 0) return [];

  const totalCapacity = playersPerTeam * maxTeams;
  const playersToUse = players.slice(0, totalCapacity);
  const priorityList = shufflePlayers(playersToUse.slice(0, priorityUntil));
  const nonPriorityList = shufflePlayers(playersToUse.slice(priorityUntil));

  const teams: Team[] = [];
  for (let i = 0; i < maxTeams; i += 1) {
    teams.push({
      id: `team-${i + 1}`,
      name: `Time ${i + 1}`,
      players: [],
    });
  }

  // Prioritarios fecham os primeiros times primeiro.
  let priorityIndex = 0;
  for (let teamIndex = 0; teamIndex < teams.length; teamIndex += 1) {
    while (
      teams[teamIndex].players.length < playersPerTeam &&
      priorityIndex < priorityList.length
    ) {
      teams[teamIndex].players.push(priorityList[priorityIndex]);
      priorityIndex += 1;
    }
  }

  // Se sobrar prioritario, ele vira sem prioridade e sorteia de novo.
  const remainingPriority = priorityList.slice(priorityIndex);
  const drawPool = shufflePlayers([...nonPriorityList, ...remainingPriority]);

  let poolIndex = 0;
  for (let teamIndex = 0; teamIndex < teams.length; teamIndex += 1) {
    while (
      teams[teamIndex].players.length < playersPerTeam &&
      poolIndex < drawPool.length
    ) {
      teams[teamIndex].players.push(drawPool[poolIndex]);
      poolIndex += 1;
    }
  }

  return teams.filter((team) => team.players.length > 0);
}

function readPositiveInt(value: string, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

export default function Teams() {
  const { players, isLoading: isPlayersLoading } = usePlayers();
  const { maxPlayersPerTeam, isLoading: isLoadingSettings, setMaxPlayersPerTeam } =
    useTeamSettings();
  const { teamState, isLoading, setGeneratedTeams, createEmptyTeam, deleteTeam } = useTeamState(players, isPlayersLoading);
  const [playersPerTeamInput, setPlayersPerTeamInput] = useState(
    String(maxPlayersPerTeam)
  );
  const [maxTeamsInput, setMaxTeamsInput] = useState('4');
  const [priorityUntilInput, setPriorityUntilInput] = useState('10');
  const [isSortSectionCollapsed, setIsSortSectionCollapsed] = useState(false);
  const [emptyTeamNameInput, setEmptyTeamNameInput] = useState('');

  useEffect(() => {
    if (isLoadingSettings) return;
    setPlayersPerTeamInput(String(maxPlayersPerTeam));
  }, [isLoadingSettings, maxPlayersPerTeam]);

  function handleSortTeams() {
    const playersPerTeam = readPositiveInt(playersPerTeamInput, 5);
    const maxTeams = readPositiveInt(maxTeamsInput, 2);
    const priorityUntil = readPositiveInt(priorityUntilInput, 10);
    const maxPriority = Math.min(priorityUntil, players.length);

    Alert.alert(
      'Confirmar sorteio',
      `Continuar com ${playersPerTeam} player(s) por time, maximo de ${maxTeams} time(s) e prioridade ate ${maxPriority}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar',
          style: 'default',
          onPress: () => {
            void setMaxPlayersPerTeam(playersPerTeam);
            const generatedTeams = buildTeams(
              players,
              playersPerTeam,
              maxTeams,
              maxPriority
            );
            void setGeneratedTeams(generatedTeams);
          },
        },
      ]
    );
  }

  function handleDeleteTeam(teamId: string) {
    Alert.alert(
      'Deletar time',
      'Tem certeza que deseja deletar este time?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Deletar',
          style: 'destructive',
          onPress: () => {
            void deleteTeam(teamId);
          },
        },
      ]
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dividir em times</Text>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Sessao de sorteio</Text>
          <TouchableOpacity
            style={styles.collapseButton}
            onPress={() => setIsSortSectionCollapsed((prev) => !prev)}
          >
            <Text style={styles.collapseButtonText}>
              {isSortSectionCollapsed ? 'Expandir' : 'Colapsar'}
            </Text>
          </TouchableOpacity>
        </View>

        {!isSortSectionCollapsed && (
          <>
            <Text style={styles.label}>Quantidade de players por time</Text>
            <TextInput
              value={playersPerTeamInput}
              onChangeText={setPlayersPerTeamInput}
              keyboardType="number-pad"
              style={styles.input}
              placeholder="Ex: 5"
              placeholderTextColor="#6B7280"
            />

            <Text style={styles.label}>Numero maximo de times</Text>
            <TextInput
              value={maxTeamsInput}
              onChangeText={setMaxTeamsInput}
              keyboardType="number-pad"
              style={styles.input}
              placeholder="Ex: 2"
              placeholderTextColor="#6B7280"
            />

            <Text style={styles.label}>Prioridade ate (top N da lista)</Text>
            <TextInput
              value={priorityUntilInput}
              onChangeText={setPriorityUntilInput}
              keyboardType="number-pad"
              style={styles.input}
              placeholder="Ex: 10"
              placeholderTextColor="#6B7280"
            />

            <TouchableOpacity style={styles.button} onPress={handleSortTeams}>
              <Text style={styles.buttonText}>Sortear Times</Text>
            </TouchableOpacity>
            <View style={{ marginTop: 24 }}>
              <Text style={styles.label}>Nome do novo time vazio</Text>
              <TextInput
                value={emptyTeamNameInput}
                onChangeText={setEmptyTeamNameInput}
                style={styles.input}
                placeholder="Ex: Time dos Amigos"
                placeholderTextColor="#6B7280"
              />
              <TouchableOpacity style={styles.secondaryButton} onPress={() => {
                const name = emptyTeamNameInput.trim() || `Time ${teamState.teams.length + 1}`;
                void createEmptyTeam(name);
                setEmptyTeamNameInput('');
              }}>
                <Text style={styles.buttonText}>Criar time vazio</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      <Text style={styles.subtitle}>
        {players.length} player(s) | {teamState.teams.length} time(s) sorteado(s)
      </Text>

      {isLoading ? (
        <Text style={styles.emptyText}>Carregando times...</Text>
      ) : (
        <FlatList
          data={teamState.teams}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <View style={styles.teamCard}>
              <View style={styles.teamHeader}>
                <Text style={styles.teamTitle}>{item.name}</Text>
          
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteTeam(item.id)}
                >
                  <Text style={styles.deleteButtonText}>Excluir</Text>
                </TouchableOpacity>
              </View>
          
              {item.players.map((player, playerIndex) => (
                <Text key={player.id} style={styles.playerText}>
                  {playerIndex + 1}. {player.name}
                </Text>
              ))}
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              Configure a sessao e toque em Sortear Times.
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 56,
    backgroundColor: '#030712',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F9FAFB',
    marginBottom: 20,
  },
  section: {
    backgroundColor: '#0B1220',
    borderColor: '#1F2937',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  sectionTitle: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  collapseButton: {
    backgroundColor: '#1D4ED8',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  collapseButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  label: {
    color: '#D1D5DB',
    marginBottom: 8,
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#111827',
    color: '#F9FAFB',
  },
  button: {
    backgroundColor: '#2563EB',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 2,
  },
  secondaryButton: {
    backgroundColor: '#4B5563',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  subtitle: {
    marginTop: 14,
    marginBottom: 14,
    color: '#9CA3AF',
  },
  teamCard: {
    backgroundColor: '#111827',
    borderColor: '#1F2937',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  teamTitle: {
    color: '#F9FAFB',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  playerText: {
    color: '#E5E7EB',
    fontSize: 15,
    marginBottom: 4,
  },
  emptyText: {
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 24,
  },
  teamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  
  deleteButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  
  deleteButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
