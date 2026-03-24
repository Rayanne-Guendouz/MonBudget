import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, Modal } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import db from '../../database';
import { addMouvementEtRecurrence, addSousCategorie, getCategories, getFrequences, getSousCategories } from '../../services/budgetService';

export default function AddScreen() {
  const router = useRouter();
  
  const [nom, setNom] = useState('');
  const [valeur, setValeur] = useState('');
  const [valeurPrev, setValeurPrev] = useState('');
  const [type, setType] = useState<'Entrée' | 'Sortie'>('Sortie');
  const [etat, setEtat] = useState<'Encaissé' | 'En attente'>('En attente');
  const [nbOccurrences, setNbOccurrences] = useState('1');
  
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCat, setSelectedCat] = useState('');
  const [frequences, setFrequences] = useState<any[]>([]);
  const [selectedFreq, setSelectedFreq] = useState('');
  const [sousCategories, setSousCategories] = useState<any[]>([]);
  const [selectedSousCat, setSelectedSousCat] = useState('');
  const [modalSousCatVisible, setModalSousCatVisible] = useState(false);
  const [nouveauNomSousCat, setNouveauNomSousCat] = useState('');

  useEffect(() => {
    const loadData = async () => {
      const cats = await getCategories();
      const freqs = await getFrequences();
      setCategories(cats);
      setFrequences(freqs);
      if (cats.length > 0) setSelectedCat(cats[0].id.toString());
      if (freqs.length > 0) setSelectedFreq(freqs[0].id.toString());
    };
    loadData();
    
  }, []);

  useEffect(() => {
    const loadSousCats = async () => {
      if (selectedCat) {
        const data = await getSousCategories(parseInt(selectedCat));
        setSousCategories(data);
        if (data.length > 0) setSelectedSousCat(data[0].id.toString());
        else setSelectedSousCat('');
      }
    };
    loadSousCats();
  }, [selectedCat]);

  useEffect(() => {
    // On récupère le label de la fréquence actuelle
    const freqSelectionnee = frequences.find(f => f.id.toString() === selectedFreq);
    
    // Si c'est "Ponctuel" (ou "Ponctuelle"), on force le Nb de fois à 1
    if (freqSelectionnee?.nom.toLowerCase().includes('ponctuel')) {
      setNbOccurrences('1');
    }
  }, [selectedFreq, frequences]);

  const handleAddSousCat = async () => {
    if (!nouveauNomSousCat || !selectedCat) return;
    await addSousCategorie(nouveauNomSousCat, parseInt(selectedCat));
    const data = await getSousCategories(parseInt(selectedCat)); // Recharger
    setSousCategories(data);
    setNouveauNomSousCat('');
    setModalSousCatVisible(false);
  };

  const handleSave = async () => {
    if (!nom || (!valeur && !valeurPrev)) {
      Alert.alert("Erreur", "Champs obligatoires manquants.");
      return;
    }

    const occ = parseInt(nbOccurrences) || 1;
    const freqSelectionnee = frequences.find(f => f.id.toString() === selectedFreq);
    const labelFreq = freqSelectionnee ? freqSelectionnee.nom : 'Ponctuel';

    const baseMouvement = {
      nom,
      date: new Date().toISOString().split('T')[0],
      valeur: parseFloat(valeur) || 0,
      valeur_previsionnelle: parseFloat(valeurPrev) || 0,
      type,
      etat: etat,
      frequence_id: parseInt(selectedFreq),
      categorie_id: parseInt(selectedCat),
      sous_categorie_id: selectedSousCat ? parseInt(selectedSousCat) : null
    };

    await addMouvementEtRecurrence(baseMouvement, occ, labelFreq);
    Alert.alert("Succès", `${occ} mouvement(s) créé(s) !`);
    
    setNom(''); setValeur(''); setValeurPrev(''); setNbOccurrences('1');
    router.replace('/'); 
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Nouvelle Opération</Text>

      <Text style={styles.label}>Nom de l&apos;opération</Text>
      <TextInput style={styles.input} value={nom} onChangeText={setNom} placeholder="ex: Courses Leclerc" />

      <View style={styles.row}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={styles.label}>Valeur Réelle (€)</Text>
          <TextInput style={styles.input} value={valeur} onChangeText={setValeur} keyboardType="numeric" placeholder="0.00" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Valeur Prévue (€)</Text>
          <TextInput style={styles.input} value={valeurPrev} onChangeText={setValeurPrev} keyboardType="numeric" placeholder="0.00" />
        </View>
      </View>

      <Text style={styles.label}>Type & État</Text>
      <View style={styles.row}>
        <Picker style={styles.picker} selectedValue={type} onValueChange={(v) => setType(v as any)}>
          <Picker.Item label="Sortie (-)" value="Sortie" />
          <Picker.Item label="Entrée (+)" value="Entrée" />
        </Picker>
        <Picker style={styles.picker} selectedValue={etat} onValueChange={(v) => setEtat(v as any)}>
          <Picker.Item label="En attente" value="En attente" />
          <Picker.Item label="Encaissé" value="Encaissé" />
        </Picker>
      </View>

      <Text style={styles.label}>Catégorie</Text>
      <View style={styles.pickerContainer}>
        <Picker selectedValue={selectedCat} onValueChange={(v) => setSelectedCat(v)}>
          {categories.map(c => <Picker.Item key={c.id} label={c.nom} value={c.id.toString()} />)}
        </Picker>
      </View>

      <Text style={styles.label}>Sous-Catégorie</Text>
      <View style={styles.rowInline}>
        <View style={[styles.pickerContainer, { flex: 1 }]}>
          <Picker 
            selectedValue={selectedSousCat} 
            onValueChange={(v) => setSelectedSousCat(v)}
            enabled={sousCategories.length > 0}
          >
            {sousCategories.length > 0 ? (
              sousCategories.map(sc => <Picker.Item key={sc.id} label={sc.nom} value={sc.id.toString()} />)
            ) : (
              <Picker.Item label="Aucune sous-caté." value="" />
            )}
          </Picker>
        </View>
        <TouchableOpacity 
          style={styles.addButtonSmall} 
          onPress={() => setModalSousCatVisible(true)}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* MODALE AJOUT SOUS-CATÉGORIE */}
      <Modal visible={modalSousCatVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nouvelle Sous-Catégorie</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Nom (ex: Essence, Netflix...)" 
              value={nouveauNomSousCat}
              onChangeText={setNouveauNomSousCat}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setModalSousCatVisible(false)}>
                <Text>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnConfirm} onPress={handleAddSousCat}>
                <Text style={{ color: '#fff' }}>Créer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- NOUVELLE SECTION RÉCURRENCE --- */}
      <View style={styles.divider} />
      <Text style={styles.sectionTitle}>Récurrence (Paiement en plusieurs fois)</Text>
      
      <View style={styles.row}>
        <View style={{ flex: 2, marginRight: 10 }}>
          <Text style={styles.label}>Fréquence</Text>
          <View style={styles.pickerContainer}>
            <Picker selectedValue={selectedFreq} onValueChange={(v) => setSelectedFreq(v)}>
              {frequences.map(f => <Picker.Item key={f.id} label={f.nom} value={f.id.toString()} />)}
            </Picker>
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Nb de fois</Text>
          <TextInput 
            style={[
              styles.input, 
              // On grise le champ si c'est Ponctuel
              (frequences.find(f => f.id.toString() === selectedFreq)?.nom.toLowerCase().includes('ponctuel')) 
              && { backgroundColor: '#f1f2f6', color: '#bdc3c7' }
            ]} 
            value={nbOccurrences} 
            onChangeText={setNbOccurrences} 
            keyboardType="numeric" 
            placeholder="1"
            // Désactive la saisie si Ponctuel
            editable={!(frequences.find(f => f.id.toString() === selectedFreq)?.nom.toLowerCase().includes('ponctuel'))}
          />
        </View>
      </View>
      {/* ----------------------------------- */}

      <TouchableOpacity style={styles.button} onPress={handleSave}>
        <Text style={styles.buttonText}>Enregistrer</Text>
      </TouchableOpacity>
      
      <View style={{ height: 40 }} /> 
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: '#2c3e50' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#34495e', marginTop: 10 },
  label: { fontSize: 14, fontWeight: '600', color: '#7f8c8d', marginBottom: 5, marginTop: 15 },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, fontSize: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  picker: { flex: 1 },
  pickerContainer: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 5 },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 20 },
  button: { backgroundColor: '#3498db', padding: 15, borderRadius: 10, marginTop: 30, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  rowInline: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 10 
  },
  addButtonSmall: { 
    backgroundColor: '#3498db', 
    width: 50, 
    height: 50, 
    borderRadius: 8, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  addButtonText: { 
    color: '#fff', 
    fontSize: 24, 
    fontWeight: 'bold' 
  },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  modalContent: { 
    backgroundColor: '#fff', 
    padding: 20, 
    borderRadius: 15, 
    width: '80%' 
  },
  modalTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginBottom: 15 
  },
  modalButtons: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end', 
    gap: 15, 
    marginTop: 20 
  },
  btnCancel: { padding: 10 },
  btnConfirm: { backgroundColor: '#3498db', padding: 10, borderRadius: 5 }
});