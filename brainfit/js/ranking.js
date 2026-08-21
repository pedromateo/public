import { auth, db, googleProvider, signInWithPopup } from './firebase-config.js';
import { collection, doc, setDoc, getDoc, query, where, orderBy, limit, getDocs, serverTimestamp } from "firebase/firestore";

const SEED_USERS = [
  { uid: 'seed_tony_soprano', name: 'Tony Soprano', score: 30, photoUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=TonySoprano' },
  { uid: 'seed_jesus_gil', name: 'Jesús Gil', score: 20, photoUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Jesus' },
  { uid: 'seed_jhon_cobra', name: 'Jhon Cobra', score: 10, photoUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Cobra' }
];

export const RankingService = {
  async login() {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      // Get short name (first name)
      const shortName = user.displayName ? user.displayName.split(' ')[0] : 'Jugador';
      return {
        uid: user.uid,
        name: shortName,
        photoUrl: user.photoURL || ''
      };
    } catch (error) {
      console.error("Error en login:", error);
      throw error;
    }
  },

  async saveScore(user, difficulty, score) {
    if (!user) return;
    
    try {
      const docRef = doc(db, 'rankings', `${user.uid}_${difficulty}`);
      const docSnap = await getDoc(docRef);
      
      let shouldSave = true;
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.score >= score) {
          shouldSave = false; // Ya tiene una puntuación mejor o igual
        }
      }

      if (shouldSave) {
        await setDoc(docRef, {
          uid: user.uid,
          name: user.name,
          photoUrl: user.photoUrl,
          score: score,
          difficulty: difficulty,
          timestamp: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Error guardando puntuación:", error);
      throw error;
    }
  },

  async getTopScores(difficulty) {
    let topScores = [];
    try {
      // Intentamos primero con query ordenada
      const q = query(
        collection(db, 'rankings'),
        where('difficulty', '==', difficulty),
        orderBy('score', 'desc'),
        limit(7)
      );
      
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        topScores.push(doc.data());
      });
    } catch (error) {
      console.warn("Fallback sin orderBy para Firestore:", error);
      try {
        const fallbackQ = query(
          collection(db, 'rankings'),
          where('difficulty', '==', difficulty)
        );
        const querySnapshot = await getDocs(fallbackQ);
        querySnapshot.forEach((doc) => {
          topScores.push(doc.data());
        });
        topScores.sort((a, b) => (b.score || 0) - (a.score || 0));
      } catch (fallbackErr) {
        console.error("Error obteniendo ranking en fallback:", fallbackErr);
      }
    }

    // Combinar con los usuarios falsos asegurando que no se dupliquen si ya existen
    const combinedMap = new Map();
    
    // Primero añadimos los seed users para esta dificultad
    SEED_USERS.forEach(seed => {
      combinedMap.set(`${seed.uid}_${difficulty}`, {
        ...seed,
        difficulty: difficulty
      });
    });

    // Luego sobreescribimos / añadimos los de la base de datos
    topScores.forEach(item => {
      combinedMap.set(item.uid ? `${item.uid}_${difficulty}` : Math.random().toString(), item);
    });

    const finalScores = Array.from(combinedMap.values());
    finalScores.sort((a, b) => (b.score || 0) - (a.score || 0));

    return finalScores.slice(0, 7);
  }
};
