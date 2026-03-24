import db from '../database';

// --- FONCTION POUR AJOUTER UNE SOUS-CATÉGORIE ---
export const addSousCategorie = async (nom, categorieId) => {
  try {
    const result = await db.runAsync(
      'INSERT INTO sous_categories (nom, categorie_id) VALUES (?, ?);',
      [nom, categorieId]
    );
    return result.lastInsertRowId; // Retourne l'ID créé
  } catch (error) {
    console.error("Erreur ajout sous-catégorie:", error);
  }
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