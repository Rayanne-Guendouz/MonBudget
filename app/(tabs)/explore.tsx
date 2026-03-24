import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import db from '../../database';
import { addMouvementEtRecurrence, getCategories, getFrequences } from '../../services/budgetService';

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
      sous_categorie_id: null
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
            style={styles.input} 
            value={nbOccurrences} 
            onChangeText={setNbOccurrences} 
            keyboardType="numeric" 
            placeholder="1"
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
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});