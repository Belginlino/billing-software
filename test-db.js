import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCdFwUANFLNYYv2wqtqNQq86R_Ac-YC0rk",
  authDomain: "lino-clothing-billing-system.firebaseapp.com",
  projectId: "lino-clothing-billing-system",
  storageBucket: "lino-clothing-billing-system.firebasestorage.app",
  messagingSenderId: "404331540188",
  appId: "1:404331540188:web:6e60237917ff87c7ca4e19"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

try {
  console.log("Logging in...");
  const cred = await signInWithEmailAndPassword(auth, "admin@voguemenswear.com", "Admin123");
  console.log("Logged in successfully. UID:", cred.user.uid);
  
  console.log("Fetching users...");
  const snap = await getDocs(collection(db, 'users'));
  console.log("Successfully fetched users:", snap.docs.map(d => ({ id: d.id, ...d.data() })));
} catch (err) {
  console.error("Error:", err);
}
process.exit(0);
