/* Orbit 360 Firebase Auth LAB config example.
   Copy to auth-firebase.config.local.js for local validation only.
   The commercial demo remains the default unless ?orbitAuth=firebase is present. */
window.OrbitFirebaseAuthConfig = {
  apiKey: "YOUR_FIREBASE_WEB_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_FIREBASE_WEB_APP_ID"
};

window.OrbitFirebaseAuthLab = {
  mode: "firebase",
  projectLabel: "YOUR_FIREBASE_LAB_LABEL",
  allowedProjectId: "YOUR_PROJECT_ID"
};
