import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged
} from './firebase-config.js';
import { collection, doc, setDoc, getDoc, query, where, orderBy, limit, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

const SEED_USERS = [
  { uid: 'seed_tony_soprano', name: 'Tony Soprano', score: 30, photoUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=TonySoprano' },
  { uid: 'seed_jesus_gil', name: 'Jesús Gil', score: 20, photoUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Jesus' },
  { uid: 'seed_jhon_cobra', name: 'Jhon Cobra', score: 10, photoUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Cobra' }
];

export const RankingService = {
  formatUser(user) {
    if (!user) return null;
    const rawName = user.displayName || user.name || 'Jugador';
    const shortName = rawName.split(' ')[0] || 'Jugador';
    return {
      uid: user.uid,
      name: shortName,
      photoUrl: user.photoURL || user.photoUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(shortName)}`,
      isGuest: !!user.isGuest
    };
  },

  async getCurrentUser() {
    if (auth && auth.currentUser) {
      return this.formatUser(auth.currentUser);
    }
    if (auth && typeof auth.authStateReady === 'function') {
      try {
        await auth.authStateReady();
        if (auth.currentUser) {
          return this.formatUser(auth.currentUser);
        }
      } catch (_) {}
    }
    const savedGuest = localStorage.getItem('brainfit_guest_user');
    if (savedGuest) {
      try {
        return JSON.parse(savedGuest);
      } catch (_) {}
    }
    return null;
  },

  async login() {
    // Si ya hay usuario autenticado con Google, lo devolvemos directamente
    if (auth && auth.currentUser) {
      return this.formatUser(auth.currentUser);
    }
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return this.formatUser(result.user);
    } catch (error) {
      console.error("Error en login con Google:", error);
      throw error;
    }
  },

  async loginWithRedirect(pendingScore = null) {
    if (pendingScore) {
      sessionStorage.setItem('brainfit_pending_score', JSON.stringify(pendingScore));
    }
    return await signInWithRedirect(auth, googleProvider);
  },

  async checkRedirectResult() {
    try {
      const result = await getRedirectResult(auth);
      if (result && result.user) {
        return this.formatUser(result.user);
      }
    } catch (error) {
      console.warn("Error comprobando redirect:", error);
    }
    return null;
  },

  createGuestUser(alias) {
    const cleanName = (alias || 'Jugador').trim().slice(0, 16) || 'Jugador';
    let guestId = localStorage.getItem('brainfit_guest_uid');
    if (!guestId) {
      guestId = 'guest_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
      localStorage.setItem('brainfit_guest_uid', guestId);
    }
    const user = {
      uid: guestId,
      name: cleanName,
      photoUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanName)}`,
      isGuest: true
    };
    localStorage.setItem('brainfit_guest_user', JSON.stringify(user));
    return user;
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
