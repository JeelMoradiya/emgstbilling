import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Your Firebase configuration object
const firebaseConfig = {
  apiKey: "AIzaSyCGTPSQi5fLLtqqk_rcfRiXA28mp-99McM",
  authDomain: "emgstbilling.firebaseapp.com",
  projectId: "emgstbilling",
  storageBucket: "emgstbilling.firebasestorage.app",
  messagingSenderId: "787010394216",
  appId: "1:787010394216:web:91c0db6211eeea514243dd",
  measurementId: "G-DKGSDCSHD3"
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

// Initialize Authentication
const auth = getAuth(app);

// Export the services
export { db, auth };