import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
// BIEN VÉRIFIER CES IMPORTS
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import db from '../../database';
import { deleteMouvement, pointerMouvement } from '@/services/budgetService';

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
  const [soldeReel, setSoldeReel] = useState(0);
  const [soldePrev, setSoldePrev] = useState(0);

  const loadData = async () => {
    try {
      const data = await db.getAllAsync('SELECT * FROM mouvements ORDER BY date DESC;') as Mouvement[];
      setMouvements(data);
      calculerSoldes(data);
    } catch (e) {
      console.error(e);
    }
  };

  const calculerSoldes = (data: Mouvement[]) => {
    let reel = 0;
    let attentePrev = 0;
    data.forEach((m) => {
      const montantReel = m.type === 'Sortie' ? -m.valeur : m.valeur;
      const montantPrev = m.type === 'Sortie' ? -m.valeur_previsionnelle : m.valeur_previsionnelle;
      if (m.etat === 'Encaissé') reel += montantReel;
      else attentePrev += montantPrev;
    });
    setSoldeReel(reel);
    setSoldePrev(reel + attentePrev);
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const confirmDelete = (id: number) => {
    Alert.alert("Supprimer", "Voulez-vous supprimer définitivement ce mouvement ?", [
      { text: "Annuler", style: "cancel" },
      { 
        text: "Supprimer", 
        style: "destructive", 
        onPress: async () => {
          await deleteMouvement(id);
          loadData();
        } 
      }
    ]);
  };

  // Ajout de la fonction de rendu des actions à droite (Swipe)
  const renderRightActions = (id: number) => (
    <TouchableOpacity 
      style={styles.deleteButton} 
      onPress={() => confirmDelete(id)}
      activeOpacity={0.6}
    >
      <Text style={styles.deleteText}>🗑️ Effacer</Text>
    </TouchableOpacity>
  );

  const renderItem = ({ item }: { item: Mouvement }) => (
    <Swipeable
      renderRightActions={() => renderRightActions(item.id)}
      overshootRight={false} // Empêche de glisser trop loin à droite
      friction={2}
    >
      <TouchableOpacity 
        activeOpacity={1} // Changé à 1 pour ne pas clignoter pendant le swipe
        style={[styles.card, item.etat === 'Encaissé' ? styles.cardEncaissee : styles.cardAttente]}
        onPress={() => {
            if (item.etat === 'En attente') {
                Alert.alert("Encaisser", `Passer "${item.nom}" en encaissé ?`, [
                    { text: "Annuler", style: "cancel" },
                    { text: "Confirmer", onPress: async () => {
                        await pointerMouvement(item.id, item.valeur_previsionnelle);
                        loadData();
                    }}
                ]);
            }
        }}
      >
        <View>
          <Text style={styles.nom}>{item.nom}</Text>
          <Text style={styles.date}>{item.date}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.valeurItem, { color: item.type === 'Sortie' ? '#e74c3c' : '#2ecc71' }]}>
            {item.type === 'Sortie' ? '-' : '+'} {item.etat === 'Encaissé' ? item.valeur.toFixed(2) : item.valeur_previsionnelle.toFixed(2)} €
          </Text>
          <View style={[styles.badge, item.etat === 'Encaissé' ? styles.badgeGreen : styles.badgeOrange]}>
            <Text style={styles.badgeText}>{item.etat}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <View style={styles.summaryContainer}>
           <View style={styles.soldeBox}>
            <Text style={styles.soldeLabel}>SOLDE RÉEL</Text>
            <Text style={[styles.soldeValeur, { color: soldeReel >= 0 ? '#2ecc71' : '#e74c3c' }]}>{soldeReel.toFixed(2)} €</Text>
          </View>
          <View style={[styles.soldeBox, styles.borderLeft]}>
            <Text style={styles.soldeLabel}>PRÉVISIONNEL</Text>
            <Text style={[styles.soldeValeur, { color: soldePrev >= 0 ? '#3498db' : '#e74c3c' }]}>{soldePrev.toFixed(2)} €</Text>
          </View>
        </View>

        <FlatList
          data={mouvements}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }} // Ajout de padding en bas
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  summaryContainer: { flexDirection: 'row', backgroundColor: '#fff', margin: 15, borderRadius: 15, padding: 20, elevation: 3 },
  soldeBox: { flex: 1, alignItems: 'center' },
  borderLeft: { borderLeftWidth: 1, borderLeftColor: '#eee' },
  soldeLabel: { fontSize: 10, color: '#95a5a6', fontWeight: 'bold' },
  soldeValeur: { fontSize: 18, fontWeight: 'bold' },
  card: { 
    backgroundColor: '#fff', 
    padding: 15, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    borderLeftWidth: 5, 
    height: 70, // Fixer une hauteur aide le Swipeable à s'aligner
    marginBottom: 1 
  },
  cardEncaissee: { borderLeftColor: '#2ecc71', opacity: 0.8 },
  cardAttente: { borderLeftColor: '#f39c12' },
  nom: { fontSize: 15, fontWeight: '600' },
  date: { fontSize: 12, color: '#bdc3c7' },
  valeurItem: { fontSize: 15, fontWeight: 'bold' },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
  badgeGreen: { backgroundColor: '#def7ec' },
  badgeOrange: { backgroundColor: '#fef3c7' },
  badgeText: { fontSize: 9, fontWeight: 'bold', color: '#333' },
  deleteButton: { 
    backgroundColor: '#e74c3c', 
    justifyContent: 'center', 
    alignItems: 'center', 
    width: 100, 
    height: 70, // Doit être identique à la hauteur de la card
    marginBottom: 1 
  },
  deleteText: { color: '#fff', fontWeight: 'bold' }
});