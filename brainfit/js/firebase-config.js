import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDtSAeQ79KwCrtWiXMQ3IAT-5BOsMv9N5M",
  authDomain: "brainfit-a5aea.firebaseapp.com",
  projectId: "brainfit-a5aea",
  storageBucket: "brainfit-a5aea.firebasestorage.app",
  messagingSenderId: "291691830325",
  appId: "1:291691830325:web:fd3b1ec2aa6cb69328e57c"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, db, googleProvider, signInWithPopup };
