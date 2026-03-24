import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView } from 'react-native';
import db from '../../database'; // Note le '../../' car on est plus profond dans les dossiers

// Définition du type selon ton schéma
interface Mouvement {
  id: number;
  nom: string;
  date: string;
  valeur: number;
  valeur_previsionnelle: number;
  type: 'Entrée' | 'Sortie';
  etat: 'Encaissé' | 'En attente';
}

export default function HomeScreen() {
  const [mouvements, setMouvements] = useState<Mouvement[]>([]);

  const chargerMouvements = async () => {
    try {
      // Récupération des données
      const tousLesMouvements = await db.getAllAsync('SELECT * FROM mouvements ORDER BY date DESC;') as Mouvement[];
      setMouvements(tousLesMouvements);
    } catch (error) {
      console.error("Erreur chargement SQLite:", error);
    }
  };

  useEffect(() => {
    chargerMouvements();
  }, []);

  const renderItem = ({ item }: { item: Mouvement }) => (
    <View style={styles.card}>
      <View>
        <Text style={styles.nom}>{item.nom}</Text>
        <Text style={styles.date}>{item.date}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[styles.valeur, { color: item.type === 'Sortie' ? '#e74c3c' : '#2ecc71' }]}>
          {item.type === 'Sortie' ? '-' : '+'} {item.valeur.toFixed(2)} €
        </Text>
        <Text style={styles.etat}>{item.etat}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Mon Portefeuille</Text>
      </View>
      
      {mouvements.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>Aucune transaction pour le moment.</Text>
        </View>
      ) : (
        <FlatList
          data={mouvements}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 15 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  headerContainer: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
  header: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a' },
  card: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  nom: { fontSize: 16, fontWeight: '600' },
  date: { fontSize: 13, color: '#888', marginTop: 4 },
  valeur: { fontSize: 16, fontWeight: '700' },
  etat: { fontSize: 11, color: '#aaa', marginTop: 4, textTransform: 'uppercase' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { color: '#bbb' }
});