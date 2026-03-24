import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView, TouchableOpacity, Alert, Modal, TextInput, Pressable } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import db from '../../database';
import { deleteMouvement, pointerMouvement } from '@/services/budgetService';

interface Mouvement {
  id: number;
  nom: string;
  date: string;
  type: 'Entrée' | 'Sortie';
  valeur: number;
  valeur_previsionnelle: number;
  etat: 'Encaissé' | 'En attente';
  categorie_nom: string;
  sous_categorie_nom: string;
}

export default function HomeScreen() {
  const [mouvements, setMouvements] = useState<Mouvement[]>([]);
  const [soldeReel, setSoldeReel] = useState(0);
  const [soldePrev, setSoldePrev] = useState(0);
  // États pour la navigation temporelle
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'mensuel' | 'annuel'>('mensuel');

  // États pour la Modale de pointage
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Mouvement | null>(null);
  const [montantSaisi, setMontantSaisi] = useState('');

  const [refreshing, setRefreshing] = useState(false);

  const [triParType, setTriParType] = useState(false);
  const [triParCategorie, setTriParCategorie] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const loadData = async () => {
    const year = currentDate.getFullYear();
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    
    const baseQuery = `
      SELECT 
        m.*, 
        c.nom AS categorie_nom,
        sc.nom AS sous_categorie_nom
      FROM mouvements m
      LEFT JOIN categories c ON m.categorie_id = c.id
      LEFT JOIN sous_categories sc ON m.sous_categorie_id = sc.id
    `;

    let query = '';
    let params: any[] = [];

    if (viewMode === 'mensuel') {
      query = `${baseQuery} WHERE m.date LIKE ? ORDER BY m.date DESC`;
      params = [`${year}-${month}%`];
    } else {
      query = `${baseQuery} WHERE m.date LIKE ? ORDER BY m.date DESC`;
      params = [`${year}-%`];
    }

    try {
      const data = await db.getAllAsync(query, params) as Mouvement[];
      
      // Calcul des soldes sur les données brutes
      calculerSoldes(data);

      // Tri des données
      let dataTriee = [...data];

      if (triParCategorie || triParType) {
        dataTriee.sort((a, b) => {
          // 1. Tri par Type (Entrée avant Sortie)
          if (triParType) {
            if (a.type === 'Entrée' && b.type === 'Sortie') return -1;
            if (a.type === 'Sortie' && b.type === 'Entrée') return 1;
          }

          // 2. Tri par Catégorie
          if (triParCategorie) {
            const catA = (a.categorie_nom || "Sans catégorie").toLowerCase();
            const catB = (b.categorie_nom || "Sans catégorie").toLowerCase();
            
            if (catA !== catB) return catA.localeCompare(catB);

            // Si même catégorie, tri par sous-catégorie
            const subA = (a.sous_categorie_nom || "").toLowerCase();
            const subB = (b.sous_categorie_nom || "").toLowerCase();
            return subA.localeCompare(subB);
          }
          return 0;
        });
      }

      // MISE À JOUR DU STATE (Vérifie bien que cette ligne est DANS loadData)
      setMouvements(dataTriee);

    } catch (error) {
      console.error("Erreur SQL loadData:", error);
    }
  };

  const calculerSoldes = (data: Mouvement[]) => {
    let reel = 0;
    let attentePrev = 0;
    data.forEach((m) => {
      const mR = m.type === 'Sortie' ? -m.valeur : m.valeur;
      const mP = m.type === 'Sortie' ? -m.valeur_previsionnelle : m.valeur_previsionnelle;
      if (m.etat === 'Encaissé') reel += mR;
      else attentePrev += mP;
    });
    setSoldeReel(reel);
    setSoldePrev(reel + attentePrev);
  };

  const changeDate = (direction: 'next' | 'prev') => {
  const newDate = new Date(currentDate);
    if (viewMode === 'mensuel') {
      newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else {
      newDate.setFullYear(currentDate.getFullYear() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const formatHeaderDate = () => {
    if (viewMode === 'mensuel') {
      return currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    }
    return `Année ${currentDate.getFullYear()}`;
  };

  useFocusEffect(
  useCallback(() => { 
    loadData(); 
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, viewMode,triParType,triParCategorie])
);

  // Ouvrir la modale de pointage
  const openPointerModal = (item: Mouvement) => {
    if (item.etat === 'Encaissé') return;
    setSelectedItem(item);
    setMontantSaisi(item.valeur_previsionnelle.toString()); // Pré-remplissage
    setModalVisible(true);
  };

  // Valider le pointage
  const validerPointage = async () => {
    if (!selectedItem) return;
    const valeurFinale = parseFloat(montantSaisi.replace(',', '.'));
    
    if (isNaN(valeurFinale)) {
      Alert.alert("Erreur", "Nombre invalide");
      return;
    }

    await pointerMouvement(selectedItem.id, valeurFinale);
    setModalVisible(false);
    loadData();
  };

  const renderRightActions = (id: number) => (
    <TouchableOpacity 
      style={styles.deleteButton} 
      onPress={() => {
        Alert.alert(
          "Suppression", 
          "Voulez-vous vraiment supprimer cette opération ?", 
          [
            { text: "Annuler", style: "cancel" },
            { 
              text: "Supprimer", 
              style: "destructive", 
              onPress: async () => { 
                await deleteMouvement(id); 
                loadData(); 
              } 
            }
          ]
        );
      }}
    >
      <Text style={styles.deleteText}>🗑️ Effacer</Text>
    </TouchableOpacity>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        {/* Affichage des soldes */}
        
        <View style={styles.headerNav}>
          {/* Bouton pour basculer Mois / Année */}
          <TouchableOpacity onPress={() => setViewMode(viewMode === 'mensuel' ? 'annuel' : 'mensuel')} style={styles.modeToggle}>
            <Text style={styles.modeToggleText}>{viewMode === 'mensuel' ? 'MOIS' : 'ANNÉE'}</Text>
          </TouchableOpacity>

          {/* Flèches et Date centrale */}
          <View style={styles.dateSelector}>
            <TouchableOpacity onPress={() => changeDate('prev')}>
              <Text style={styles.navArrow}>◀</Text>
            </TouchableOpacity>
            
            <Text style={styles.currentDateText}>{formatHeaderDate()}</Text>
            
            <TouchableOpacity onPress={() => changeDate('next')}>
              <Text style={styles.navArrow}>▶</Text>
            </TouchableOpacity>
          </View>
        </View>

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
        <View style={styles.filterBar}>
          {/* Tri par Type */}
          <TouchableOpacity 
            style={styles.filterItem} 
            onPress={() => setTriParType(!triParType)}
          >
            <View style={[styles.checkbox, triParType && styles.checkboxActive]}>
              {triParType && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.filterLabel}>Par Type</Text>
          </TouchableOpacity>

          {/* Tri par Catégorie */}
          <TouchableOpacity 
            style={styles.filterItem} 
            onPress={() => setTriParCategorie(!triParCategorie)}
          >
            <View style={[styles.checkbox, triParCategorie && styles.checkboxActive]}>
              {triParCategorie && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.filterLabel}>Par Catégorie</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={mouvements}
          keyExtractor={(item) => item.id.toString()}
          refreshing={refreshing} // État du chargement
          onRefresh={onRefresh}   // Fonction déclenchée au tirage
          renderItem={({ item }) => (
            <Swipeable renderRightActions={() => renderRightActions(item.id)} overshootRight={false}>
              <TouchableOpacity 
                activeOpacity={0.7}
                style={[styles.card, item.etat === 'Encaissé' ? styles.cardEncaissee : styles.cardAttente]}
                onPress={() => openPointerModal(item)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {/* ICÔNE DYNAMIQUE SELON LE TYPE */}
                  <Text style={{ fontSize: 20, marginRight: 12 }}>
                    {item.type === 'Sortie' ? '💸' : '💰'}
                  </Text>
                  
                  <View>
                    <Text style={styles.nom}>{item.nom}</Text>
                    <Text style={styles.date}>
                      {item.date} 
                      {item.categorie_nom ? ` • ${item.categorie_nom}` : ''}
                      {item.sous_categorie_nom ? ` > ${item.sous_categorie_nom}` : ''}
                    </Text>
                  </View>
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
          )}
          contentContainerStyle={{ paddingHorizontal: 20 }}
        />

        {/* MODALE DE POINTAGE COMPATIBLE ANDROID */}
        <Modal transparent visible={modalVisible} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Encaisser l&apos;opération</Text>
              <Text style={styles.modalSub}>{selectedItem?.nom}</Text>
              
              <Text style={styles.label}>Montant Réel Final (€) :</Text>
              <TextInput 
                style={styles.modalInput}
                value={montantSaisi}
                onChangeText={setMontantSaisi}
                keyboardType="numeric"
                selectTextOnFocus
                autoFocus
              />

              <View style={styles.modalButtons}>
                <Pressable style={[styles.btn, styles.btnCancel]} onPress={() => setModalVisible(false)}>
                  <Text style={styles.btnText}>Annuler</Text>
                </Pressable>
                <Pressable style={[styles.btn, styles.btnConfirm]} onPress={validerPointage}>
                  <Text style={styles.btnTextConfirm}>Encaisser</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

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
  card: { backgroundColor: '#fff', padding: 15, flexDirection: 'row', justifyContent: 'space-between', borderLeftWidth: 5, marginBottom: 1, height: 70 },
  cardEncaissee: { borderLeftColor: '#2ecc71', opacity: 0.6 },
  cardAttente: { borderLeftColor: '#f39c12' },
  nom: { fontSize: 15, fontWeight: '600' },
  date: { fontSize: 12, color: '#bdc3c7' },
  valeurItem: { fontSize: 15, fontWeight: 'bold' },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
  badgeGreen: { backgroundColor: '#def7ec' },
  badgeOrange: { backgroundColor: '#fef3c7' },
  badgeText: { fontSize: 9, fontWeight: 'bold', color: '#333' },
  deleteButton: { backgroundColor: '#e74c3c', justifyContent: 'center', alignItems: 'center', width: 100, height: 70 },
  deleteText: { color: '#fff', fontWeight: 'bold' },
  headerNav: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f2f6'
  },
  modeToggle: { 
    backgroundColor: '#ebf5fb', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3498db'
  },
  modeToggleText: { 
    color: '#3498db', 
    fontSize: 10, 
    fontWeight: 'bold' 
  },
  dateSelector: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    flex: 1, 
    justifyContent: 'flex-end' 
  },
  currentDateText: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#2c3e50', 
    marginHorizontal: 15,
    textTransform: 'capitalize', // Pour mettre la première lettre du mois en majuscule
    minWidth: 120,
    textAlign: 'center'
  },
  navArrow: { 
    fontSize: 20, 
    color: '#3498db', 
    paddingHorizontal: 10 
  },
  
  // STYLES DE LA MODALE
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', width: '85%', borderRadius: 20, padding: 25, elevation: 10 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  modalSub: { textAlign: 'center', color: '#7f8c8d', marginBottom: 20 },
  label: { fontSize: 12, color: '#95a5a6', marginBottom: 5 },
  modalInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 20, textAlign: 'center', marginBottom: 20 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  btn: { flex: 1, padding: 15, borderRadius: 10, alignItems: 'center' },
  btnCancel: { backgroundColor: '#f1f2f6', marginRight: 10 },
  btnConfirm: { backgroundColor: '#2ecc71' },
  btnText: { fontWeight: 'bold', color: '#7f8c8d' },
  btnTextConfirm: { fontWeight: 'bold', color: '#fff' },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  filterLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginRight: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: '#3498db',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  checkboxActive: {
    backgroundColor: '#3498db',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  filterItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});