import * as SQLite from 'expo-sqlite';

// Ouverture de la base de données locale (stockée sur le téléphone)
const db = SQLite.openDatabaseSync('mon_budget.db');

export const initDatabase = async () => {
  try {
    // 1. Activation des clés étrangères (important pour les relations)
    await db.execAsync('PRAGMA foreign_keys = ON;');

    // 2. Création de la table Fréquences
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS frequences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nom TEXT NOT NULL UNIQUE
      );
    `);

    // 3. Création de la table Catégories
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nom TEXT NOT NULL UNIQUE
      );
    `);

    // 4. Création de la table Sous-Catégories
    // Elle est liée à une catégorie parente
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS sous_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nom TEXT NOT NULL,
        categorie_id INTEGER,
        FOREIGN KEY (categorie_id) REFERENCES categories (id) ON DELETE CASCADE
      );
    `);

    // 5. Création de la table Mouvements (La table principale)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS mouvements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nom TEXT NOT NULL,
        date TEXT NOT NULL,
        valeur REAL DEFAULT 0,
        valeur_previsionnelle REAL DEFAULT 0,
        type TEXT CHECK(type IN ('Entrée', 'Sortie')),
        etat TEXT CHECK(etat IN ('Encaissé', 'En attente')),
        frequence_id INTEGER,
        categorie_id INTEGER,
        sous_categorie_id INTEGER,
        FOREIGN KEY (frequence_id) REFERENCES frequences (id),
        FOREIGN KEY (categorie_id) REFERENCES categories (id),
        FOREIGN KEY (sous_categorie_id) REFERENCES sous_categories (id)
      );
    `);

    // --- INSERTION DES DONNÉES PAR DÉFAUT (Si elles n'existent pas) ---

    // Liste des fréquences selon tes notes
    const freqList = ['Ponctuel', 'Mensuel', 'Trimestriel', 'Semestriel', 'Annuel'];
    for (const f of freqList) {
      await db.runAsync('INSERT OR IGNORE INTO frequences (nom) VALUES (?);', [f]);
    }

    // Liste des catégories selon ton énumération {Revenue, Vie Courante, Sante, Protection, Transport, Sortie, Obligatoire}
    const catList = ['Revenu', 'Vie Courante', 'Santé', 'Protection', 'Transport', 'Sortie', 'Obligatoire'];
    for (const c of catList) {
      await db.runAsync('INSERT OR IGNORE INTO categories (nom) VALUES (?);', [c]);
    }

    console.log("✅ Base de données initialisée avec succès !");
  } catch (error) {
    console.error("❌ Erreur lors de l'initialisation de la base :", error);
  }
};

export default db;