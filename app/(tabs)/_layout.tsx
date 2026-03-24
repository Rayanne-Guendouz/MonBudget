import React, { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Platform } from 'react-native';
import db from '@/database';

export default function TabLayout() {
  const [pendingCount, setPendingCount] = useState(0);
  const insets = useSafeAreaInsets(); // Récupère les bordures de sécurité du téléphone

  // Fonction pour compter les opérations en attente
  const updatePendingCount = async () => {
    try {
      const result = await db.getAllAsync(
        "SELECT COUNT(*) as count FROM mouvements WHERE etat = 'En attente'"
      ) as any[];
      if (result && result.length > 0) {
        setPendingCount(result[0].count);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // On met à jour le badge régulièrement
  useEffect(() => {
    updatePendingCount();
    // On peut ajouter un intervalle ou se baser sur le focus
    const interval = setInterval(updatePendingCount, 3000); 
    return () => clearInterval(interval);
  }, []);
  
  return (
    <Tabs
      screenOptions={{
        headerShown: true, // On l'active pour voir le titre
        headerTitle: "Mon Budget Perso", // Remplace par le nom de ton choix
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerTitleStyle: {
          fontWeight: 'bold',
          color: '#2c3e50',
        },
        tabBarActiveTintColor: '#3498db',
        tabBarInactiveTintColor: '#95a5a6',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#f1f2f6',
          
          // --- LA CORRECTION MAGIQUE ICI ---
          // On ajoute la zone de sécurité (insets.bottom) à une hauteur de base
          height: 60 + insets.bottom, 
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
          paddingTop: 10,
          
          // Optionnel : Ombre pour bien décoller la barre visuellement
          elevation: 5,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginBottom: Platform.OS === 'ios' ? 0 : 5, // Ajustement texte Android
        },
      }}
    >
      
      {/* 1. ACCUEIL AVEC BADGE */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color }) => <Ionicons name="home" size={26} color={color} />,
          // Affiche le badge seulement s'il y a plus de 0 éléments
          tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
          tabBarBadgeStyle: { backgroundColor: '#e74c3c' }, 
        }}
      />

      

      <Tabs.Screen
        name="explore"
        options={{
          title: 'Ajouter',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'add-circle' : 'add-circle-outline'} size={28} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="statsScreen" 
        options={{
          title: 'Stats', // Le texte qui s'affichera sous l'icône
          tabBarIcon: ({ color }) => (
            <Ionicons name="bar-chart" size={28} color={color} /> 
          ),
          headerTitle: 'Statistiques Détaillées', // Le titre en haut de la page
        }}
      />
    </Tabs>
  );
}