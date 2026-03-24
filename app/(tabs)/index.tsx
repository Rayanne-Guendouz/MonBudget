import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import db from '../../database';

export default function HomeScreen() {
  const [mouvements, setMouvements] = useState<any[]>([]);

  // Cette fonction s'exécutera à chaque fois que tu affiches cet onglet
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const load = async () => {
        const data = await db.getAllAsync('SELECT * FROM mouvements ORDER BY date DESC;');
        if (isActive) setMouvements(data);
      };
      load();
      return () => { isActive = false; };
    }, [])
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={mouvements}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}><Text>{item.nom} - {item.valeur}€</Text></View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  card: { padding: 15, backgroundColor: '#eee', marginBottom: 10, borderRadius: 8 }
});