import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBznDbOyrr1HdzxMBGkfE6ZYC2MrUFAXEo",
  authDomain: "souq-plus-25b8d.firebaseapp.com",
  projectId: "souq-plus-25b8d",
  storageBucket: "souq-plus-25b8d.firebasestorage.app",
  messagingSenderId: "790427295803",
  appId: "1:790427295803:web:b28ff43fcc6e2d8e58fc1e",
  measurementId: "G-9S88BVVGR7"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
