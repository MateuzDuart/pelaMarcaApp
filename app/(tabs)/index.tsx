import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { usePlayers } from '../../hooks/use-players';

export default function Home() {
  const [name, setName] = useState('');
  const { players, isLoading, isSaving, addPlayer, removePlayer, removeAllPlayers } =
    usePlayers();

  async function handleAddPlayer() {
    // const added = await addPlayer(name);
    // if (added) setName('');
    Array.from({ length: 20 }, (_, index) => {
     addPlayer(`player-${index + 1}`)
    });

  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Players</Text>

      <TextInput
        placeholder="Nome do jogador"
        value={name}
        onChangeText={setName}
        style={styles.input}
        placeholderTextColor="#999"
      />

      <TouchableOpacity
        style={styles.button}
        onPress={() => void handleAddPlayer()}
        disabled={isSaving}
      >
        <Text style={styles.buttonText}>Adicionar</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.dangerButton]}
        onPress={() => void removeAllPlayers()}
        disabled={isSaving || players.length === 0}
      >
        <Text style={styles.buttonText}>Excluir todos</Text>
      </TouchableOpacity>

      {isLoading ? (
        <ActivityIndicator size="large" style={styles.loader} />
      ) : (
        <FlatList
          data={players}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <View style={styles.playerItem}>
              <Text style={styles.playerText}>
                {index + 1}. {item.name}
              </Text>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => void removePlayer(item.id)}
                disabled={isSaving}
              >
                <Text style={styles.deleteButtonText}>Excluir</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Nenhum jogador cadastrado</Text>
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
    marginBottom: 20,
    color: '#F9FAFB',
  },
  input: {
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#111827',
    color: '#999',

  },
  button: {
    backgroundColor: '#2563EB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  dangerButton: {
    backgroundColor: '#DC2626',
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loader: {
    marginTop: 24,
  },
  playerItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#1F2937',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  playerText: {
    fontSize: 16,
    flex: 1,
    color: '#E5E7EB',
  },
  deleteButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#EF4444',
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#9CA3AF',
  },
});