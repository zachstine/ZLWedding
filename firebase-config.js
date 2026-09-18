// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDR3_omBC9_xl2EbslfF-mg4A2NwyA10kg",
  authDomain: "zlwedding-80ad5.firebaseapp.com",
  projectId: "zlwedding-80ad5",
  storageBucket: "zlwedding-80ad5.firebasestorage.app",
  messagingSenderId: "327934820661",
  appId: "1:327934820661:web:7fb12b608da766590fcc7c",
  measurementId: "G-0GE1JFLQ1Q"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);