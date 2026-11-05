/**
 * Gestion du stockage local exclusif des images/logos de modèles dans IndexedDB.
 * RÈGLE NON NÉGOCIABLE : Ces images ne sont JAMAIS envoyées au serveur ni à une IA.
 * Clé = modele_id + "_" + id de l'emplacement
 */

const DB_NAME = 'visora_modeles_db';
const DB_VERSION = 1;
const STORE_NAME = 'images';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB non supporté'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Erreur ouverture IndexedDB'));
  });
}

/**
 * Enregistre une image en data URL pour un emplacement donné
 */
export async function saveModeleImage(modeleId: string, slotId: string, dataUrl: string): Promise<void> {
  try {
    const db = await openDb();
    const key = `${modeleId}_${slotId}`;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(dataUrl, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Erreur saveModeleImage:', err);
  }
}

/**
 * Récupère une image enregistrée pour un emplacement
 */
export async function getModeleImage(modeleId: string, slotId: string): Promise<string | null> {
  try {
    const db = await openDb();
    const key = `${modeleId}_${slotId}`;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as string) || null);
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('Erreur getModeleImage:', err);
    return null;
  }
}

/**
 * Récupère toutes les images d'un modèle pour les emplacements demandés
 */
export async function getModeleImages(modeleId: string, slotIds: string[]): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  if (!slotIds || slotIds.length === 0) return result;

  try {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    await Promise.all(
      slotIds.map((slotId) => {
        return new Promise<void>((resolve) => {
          const key = `${modeleId}_${slotId}`;
          const req = store.get(key);
          req.onsuccess = () => {
            if (req.result && typeof req.result === 'string') {
              result[slotId] = req.result;
            }
            resolve();
          };
          req.onerror = () => resolve();
        });
      })
    );
  } catch (err) {
    console.warn('Erreur getModeleImages:', err);
  }

  return result;
}

/**
 * Supprime une image d'un emplacement
 */
export async function deleteModeleImage(modeleId: string, slotId: string): Promise<void> {
  try {
    const db = await openDb();
    const key = `${modeleId}_${slotId}`;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch (err) {
    console.warn('Erreur deleteModeleImage:', err);
  }
}

/**
 * Supprime toutes les images locales associées à un modèle (lors de la suppression du modèle)
 */
export async function deleteModeleAllImages(modeleId: string): Promise<void> {
  try {
    const db = await openDb();
    const prefix = `${modeleId}_`;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.openCursor();

      req.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest).result as IDBCursorWithValue;
        if (cursor) {
          if (typeof cursor.key === 'string' && cursor.key.startsWith(prefix)) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      req.onerror = () => resolve();
    });
  } catch (err) {
    console.warn('Erreur deleteModeleAllImages:', err);
  }
}
