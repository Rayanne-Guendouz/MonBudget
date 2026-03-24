import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { initDatabase } from '../database'; // Assure-toi que database.js est à la racine

export default function RootLayout() {
  
  useEffect(() => {
    // Initialise la base de données au tout premier lancement
    initDatabase()
      .then(() => console.log("Système prêt"))
      .catch((err) => console.error("Échec du démarrage", err));
  }, []);

  // Le composant <Stack /> gère la navigation entre tes pages
  return (
    <Stack>
      {/* On cible le dossier (tabs) et on cache son header */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
