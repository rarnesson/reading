// Gemensam Firebase-konfiguration – en plats att ändra vid byte av projekt
(function () {
  if (typeof firebase === "undefined") return;
  if (firebase.apps && firebase.apps.length > 0) return; // Redan init
  var firebaseConfig = {
    apiKey: "AIzaSyCX9KeqxAmspG2hm4y161WPJxp2fn3LMug",
    authDomain: "mattematchen.firebaseapp.com",
    projectId: "mattematchen",
    storageBucket: "mattematchen.firebasestorage.app",
    messagingSenderId: "808790642635",
    appId: "1:808790642635:web:58b84df432b85af6f9b04e",
    measurementId: "G-GRYPBKH54R"
  };
  firebase.initializeApp(firebaseConfig);
})();
