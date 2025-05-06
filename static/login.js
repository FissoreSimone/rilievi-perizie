"use strict"; // Abilita la modalità rigorosa per una migliore gestione degli errori

$(document).ready(function () {
  // Attende che il DOM sia completamente caricato prima di eseguire il codice
  $("#loginForm").on("submit", async function (event) {
    event.preventDefault(); // Previene il comportamento predefinito del form (invio della pagina)

    // Recupera i valori inseriti nei campi email e password
    const password = $("#password").val();
    const email = $("#email").val();

    // Controlla che entrambi i campi siano compilati
    if (!password || !email) {
      $("#errorMessage").text("Tutti i campi sono obbligatori."); // Mostra un messaggio di errore
      return; // Interrompe l'esecuzione se i campi non sono validi
    }

    try {
      console.log("Invio richiesta di login..."); // Log per debug
      // Effettua una richiesta POST al server con i dati di login
      let response = await inviaRichiesta("POST", "/api/login", {
        password,
        email,
      });
      console.log("Risposta ricevuta:", response); // Log della risposta ricevuta

      // Controlla se la risposta ha uno status di successo (200)
      if (response.status === 200) {
        // Se è presente un URL di redirect, reindirizza l'utente
        if (response.data.redirect) {
          window.location.href = response.data.redirect; // Reindirizzamento
        } else {
          console.error("Nessun redirect specificato nella risposta."); // Log di errore se manca il redirect
        }

        // Se è presente un token nella risposta, lo salva nel localStorage
        if (response.data.token) {
          console.log("Token salvato:", response.data.token); // Log del token
          localStorage.setItem("authToken", response.data.token); // Salvataggio del token
        }
      } else {
        // Gestisce eventuali errori restituiti dal server
        console.error("Errore dal server:", response.err); // Log dell'errore
        $("#errorMessage").text("Errore: " + response.err); // Mostra un messaggio di errore all'utente
      }
    } catch (err) {
      // Gestisce errori imprevisti durante la richiesta
      console.error("Errore durante il login:", err); // Log dell'errore
      $("#errorMessage").text(
        "Credenziali non valide o errore di connessione. Riprova."
      ); // Mostra un messaggio di errore generico
    }
  });
});