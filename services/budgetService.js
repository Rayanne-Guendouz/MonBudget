import db from '../database';

// --- FONCTION POUR AJOUTER UNE SOUS-CATÉGORIE ---
export const getSousCategories = async (categorieId) => {
  return await db.getAllAsync(
    'SELECT * FROM sous_categories WHERE categorie_id = ? ORDER BY nom ASC;',
    [categorieId]
  );
};

export const addSousCategorie = async (nom, categorieId) => {
  return await db.runAsync(
    'INSERT INTO sous_categories (nom, categorie_id) VALUES (?, ?);',
    [nom, categorieId]
  );
};

// --- FONCTION POUR AJOUTER UN MOUVEMENT (Ton schéma complet) ---
export const addMouvement = async (mouvement) => {
  const {
    nom,
    date,
    valeur,
    valeur_previsionnelle,
    type,
    etat,
    frequence_id,
    categorie_id,
    sous_categorie_id
  } = mouvement;

  try {
    const result = await db.runAsync(
      `INSERT INTO mouvements (
        nom, date, valeur, valeur_previsionnelle, type, etat, 
        frequence_id, categorie_id, sous_categorie_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [nom, date, valeur, valeur_previsionnelle, type, etat, frequence_id, categorie_id, sous_categorie_id]
    );
    return result.lastInsertRowId;
  } catch (error) {
    console.error("Erreur ajout mouvement:", error);
  }
};

export const addMouvementEtRecurrence = async (mouvement, occurrences = 1, frequenceLabel = 'Ponctuel') => {
  try {
    // Déterminer le nombre de mois à ajouter selon la fréquence
    let sautMois = 1; 
    if (frequenceLabel.toLowerCase().includes('trimestriel')) sautMois = 3;
    if (frequenceLabel.toLowerCase().includes('semestriel')) sautMois = 6;
    if (frequenceLabel.toLowerCase().includes('annuel')) sautMois = 12;
    if (frequenceLabel.toLowerCase().includes('hebdomadaire')) sautMois = 0; // Cas particulier si besoin (7 jours)

    for (let i = 0; i < occurrences; i++) {
      let dateCalcul = new Date(mouvement.date);
      
      if (sautMois === 0) {
        // Logique par semaine (7 jours * i)
        dateCalcul.setDate(dateCalcul.getDate() + (i * 7));
      } else {
        // Logique par mois (saut * i)
        dateCalcul.setMonth(dateCalcul.getMonth() + (i * sautMois));
      }

      const dateString = dateCalcul.toISOString().split('T')[0];

      await db.runAsync(
        `INSERT INTO mouvements (
          nom, date, valeur, valeur_previsionnelle, type, etat, 
          frequence_id, categorie_id, sous_categorie_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          occurrences > 1 ? `${mouvement.nom} (${i + 1}/${occurrences})` : mouvement.nom, 
          dateString, 
          mouvement.valeur, 
          mouvement.valeur_previsionnelle, 
          mouvement.type, 
          mouvement.etat, 
          mouvement.frequence_id, 
          mouvement.categorie_id, 
          mouvement.sous_categorie_id
        ]
      );
    }
  } catch (error) {
    console.error("Erreur ajout récurrence complexe:", error);
  }
};

  // Récupérer toutes les catégories pour ton menu déroulant
export const getCategories = async () => {
  return await db.getAllAsync('SELECT * FROM categories;');
};

// Récupérer les sous-catégories filtrées par catégorie
export const getSousCategoriesByCat = async (categorieId) => {
  return await db.getAllAsync('SELECT * FROM sous_categories WHERE categorie_id = ?;', [categorieId]);
};

// Récupérer les fréquences
export const getFrequences = async () => {
  return await db.getAllAsync('SELECT * FROM frequences;');

};

// Changer l'état d'un mouvement (Passer de 'En attente' à 'Encaissé')
export const pointerMouvement = async (id, valeurReelle) => {
  try {
    await db.runAsync(
      'UPDATE mouvements SET etat = "Encaissé", valeur = ? WHERE id = ?;',
      [valeurReelle, id]
    );
  } catch (error) {
    console.error("Erreur lors du pointage:", error);
  }
};

// Supprimer un mouvement
export const deleteMouvement = async (id) => {
  try {
    await db.runAsync('DELETE FROM mouvements WHERE id = ?;', [id]);
  } catch (error) {
    console.error("Erreur lors de la suppression:", error);
  }
};

export const resetDatabase = async () => {
  try {
    // L'ordre est important à cause des clés étrangères
    await db.execAsync('DELETE FROM mouvements');
    await db.execAsync('DELETE FROM sous_categories');
    // On peut choisir de garder ou non les catégories de base
    // await db.execAsync('DELETE FROM categories'); 
    
    // Optionnel : Réinitialiser les compteurs d'ID à 1
    await db.execAsync("DELETE FROM sqlite_sequence WHERE name='mouvements'");
    
    console.log("Base de données vidée avec succès");
  } catch (error) {
    console.error("Erreur lors du nettoyage :", error);
  }
};

