"use strict";

$(document).ready(function () {
  // Sezioni della dashboard
  let perizieSection = $("#perizieSection");
  let cambiaPasswordSection = $("#cambiaPasswordSection").hide();
  let createUserSection = $("#nuovoUtenteSection").hide();
  let gestioneUtentiSection = $("#gestioneUtentiSection").hide();
  let tuttePerizieSection = $("#tuttePerizieSection").hide();
  let map;

  // Funzione per mostrare la sezione selezionata
  function showSection(section) {
    if (section === "perizie") {
      gestioneUtentiSection.hide();
      perizieSection.show();
      cambiaPasswordSection.hide();
      createUserSection.hide();
    } else if (section === "nuovoUtente") {
      gestioneUtentiSection.hide();
      perizieSection.hide();
      cambiaPasswordSection.hide();
      createUserSection.show();
    } else if (section === "cambiaPassword") {
      gestioneUtentiSection.hide();
      perizieSection.hide();
      cambiaPasswordSection.show();
      createUserSection.hide();
    } else if (section === "gestioneUtenti") {
      perizieSection.hide();
      cambiaPasswordSection.hide();
      createUserSection.hide();
      gestioneUtentiSection.show();
      caricaUtenti();
    } else if (section === "tuttePerizie") {
      perizieSection.hide();
      cambiaPasswordSection.hide();
      createUserSection.hide();
      gestioneUtentiSection.hide();
      tuttePerizieSection.show();
      caricaTuttePerizie();
    }
  }

  // Nasconde il menu offcanvas se aperto
  const offcanvasElement = document.querySelector("#menu");
  const offcanvasInstance = bootstrap.Offcanvas.getInstance(offcanvasElement);
  if (offcanvasInstance) offcanvasInstance.hide();

  window.showSection = showSection;

  // Logout
  $("#logout").on("click", function () {
    localStorage.removeItem("token");
    window.location.href = "/index.html";
  });

  // Gestione del cambio password
  $("#changePasswordForm").on("submit", async function (e) {
    e.preventDefault();

    const currentPassword = $("#currentPassword").val();
    const newPassword = $("#newPassword").val();
    const confirmPassword = $("#confirmPassword").val();

    if (newPassword !== confirmPassword) {
      alert("La nuova password e la conferma non coincidono.");
      return;
    }

    try {
      const response = await inviaRichiesta("POST", "/api/cambia-password", {
        currentPassword,
        nuovaPassword: newPassword,
      });

      if (response.status === 200) {
        alert(response.data.message || "Password aggiornata con successo.");
        $("#changePasswordForm")[0].reset();
      } else {
        alert(response.err || "Errore durante l'aggiornamento della password.");
      }
    } catch (err) {
      console.error("Errore durante il cambio della password:", err);
      alert("Errore durante la richiesta.");
    }
  });

  // Funzione per ottenere le coordinate di un indirizzo
  async function getCoordinates(uriAddress) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${uriAddress}`;
    const httpResponse = await inviaRichiesta("GET", url);

    if (httpResponse.data.length > 0) {
      return {
        lat: parseFloat(httpResponse.data[0].lat),
        lng: parseFloat(httpResponse.data[0].lon),
      };
    } else {
      throw new Error("Indirizzo non trovato");
    }
  }

  // Inizializzazione della mappa
  async function initializeMap() {
    const address = "Via San Michele 68, Fossano, Italia";
    const uriAddress = encodeURIComponent(address);

    const coords = await getCoordinates(uriAddress).catch((error) => {
      console.error(error);
    });

    if (!coords) {
      alert("Impossibile ottenere le coordinate per l'indirizzo specificato.");
      return;
    }

    const mapOptions = {
      container: "map",
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            maxzoom: 19,
            minzoom: 11,
          },
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      },
      center: [coords.lng, coords.lat],
      zoom: 15.95,
    };

    map = new maplibregl.Map(mapOptions);
    map.addControl(new maplibregl.NavigationControl());
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 80, unit: "metric" }));

    new maplibregl.Marker({ color: "red" })
      .setLngLat([coords.lng, coords.lat])
      .setPopup(new maplibregl.Popup().setHTML("<h4>Sede Centrale</h4>"))
      .addTo(map);

    loadMarkers(map);
  }

  async function caricaUtenti() {
    try {
      const response = await inviaRichiesta("GET", "/api/getUtenti");
      const userTableBody = $("#userTableBody");
      userTableBody.empty();

      // Ordina gli utenti: prima gli admin, poi gli altri
      const utentiOrdinati = response.data.sort((a, b) => {
        if (a.ruolo.toLowerCase() === "admin" && b.ruolo.toLowerCase() !== "admin") {
          return -1; // Gli admin vengono prima
        } else if (a.ruolo.toLowerCase() !== "admin" && b.ruolo.toLowerCase() === "admin") {
          return 1; // Gli altri vengono dopo
        }
        return 0; // Mantieni l'ordine per gli altri
      });

      // Crea le righe della tabella
      utentiOrdinati.forEach((utente) => {
        const isAdmin = utente.ruolo.toLowerCase() === "admin";
        const row = `
        <tr>
          <td>${utente.nome}</td>
          <td>${utente.cognome}</td>
          <td>${utente.email}</td>
          <td class="${isAdmin ? "text-danger fw-bold" : ""}">${utente.ruolo}</td>
          <td>
            <button class="btn btn-warning btn-sm" onclick="modificaUtente('${utente._id}')">Modifica</button>
            <button class="btn btn-danger btn-sm" onclick="eliminaUtente('${utente._id}')">Elimina</button>
          </td>
        </tr>
      `;
        userTableBody.append(row);
      });
    } catch (err) {
      console.error("Errore durante il caricamento degli utenti:", err);
      alert("Errore durante il caricamento degli utenti.");
    }
  }
  async function caricaTuttePerizie() {
    try {
      const response = await inviaRichiesta("GET", "/api/getPerizie");
      const allPerizieTableBody = $("#allPerizieTableBody");
      allPerizieTableBody.empty();

      if (!Array.isArray(response.data)) {
        alert("Errore: La risposta del server non è valida.");
        return;
      }

      response.data.forEach((perizia) => {
        const { codice_perizia, data_ora_perizia, stato } = perizia;
        const row = `
          <tr>
            <td>${codice_perizia}</td>
            <td>${perizia.operatore_id?.nome || "N/A"}</td>
            <td>${new Date(data_ora_perizia).toLocaleString()}</td>
            <td>${stato || "Non specificato"}</td>
            <td>
              <button class="btn btn-info btn-sm" onclick="visualizzaDettagliPerizia('${codice_perizia}')">Dettagli</button>
            </td>
          </tr>
        `;
        allPerizieTableBody.append(row);
      });
    } catch (err) {
      console.error("Errore durante il caricamento delle perizie:", err);
      alert("Errore durante il caricamento delle perizie.");
    }
  }

  // Funzione per visualizzare i dettagli di una perizia
  window.visualizzaDettagliPerizia = async function (codicePerizia) {
    try {
      // Effettua una richiesta per ottenere i dettagli della perizia
      const response = await inviaRichiesta("GET", `/api/getPerizia/${codicePerizia}`);
      const perizia = response.data;
  
      if (!perizia) {
        alert("Dettagli della perizia non trovati.");
        return;
      }
  
      // Crea il contenuto della modale
      const modalContent = `
        <div class="modal fade" id="dettagliPeriziaModal" tabindex="-1" aria-labelledby="dettagliPeriziaModalLabel" aria-hidden="true">
          <div class="modal-dialog modal-lg">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title" id="dettagliPeriziaModalLabel">Dettagli Perizia: ${perizia.codice_perizia}</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body">
                <p><strong>Descrizione:</strong> ${perizia.descrizione || "N/A"}</p>
                <p><strong>Data e Ora:</strong> ${new Date(perizia.data_ora_perizia).toLocaleString()}</p>
                <p><strong>Stato:</strong> ${perizia.stato || "Non specificato"}</p>
                <p><strong>Coordinate:</strong> ${perizia.coordinate?.latitudine}, ${perizia.coordinate?.longitudine}</p>
                <h5>Fotografie:</h5>
                <div class="row">
                  ${perizia.fotografie
                    .map(
                      (foto) => `
                    <div class="col-md-4">
                      <img src="${foto.url}" alt="Foto" class="img-fluid rounded mb-2" />
                      <p>${foto.commento || "Nessun commento"}</p>
                    </div>
                  `
                    )
                    .join("")}
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Chiudi</button>
              </div>
            </div>
          </div>
        </div>
      `;
  
      // Aggiungi la modale al DOM
      $("body").append(modalContent);
  
      // Mostra la modale
      const modal = new bootstrap.Modal(document.getElementById("dettagliPeriziaModal"));
      modal.show();
  
      // Rimuovi la modale dal DOM quando viene chiusa
      $("#dettagliPeriziaModal").on("hidden.bs.modal", function () {
        $(this).remove();
      });
    } catch (err) {
      console.error("Errore durante il caricamento dei dettagli della perizia:", err);
      alert("Errore durante il caricamento dei dettagli della perizia.");
    }
  };
  window.modificaUtente = async function (userId) {
    const row = $(`button[onclick="modificaUtente('${userId}')"]`).closest("tr");

    // Trasforma le celle in campi modificabili
    const nomeCell = row.find("td:nth-child(1)");
    const cognomeCell = row.find("td:nth-child(2)");
    const emailCell = row.find("td:nth-child(3)");
    const ruoloCell = row.find("td:nth-child(4)");
    const azioniCell = row.find("td:nth-child(5)");

    const nome = nomeCell.text().trim();
    const cognome = cognomeCell.text().trim();
    const email = emailCell.text().trim();
    const ruolo = ruoloCell.text().trim();

    // Trasforma le celle in input o select con la classe personalizzata
    nomeCell.html(`<input type="text" class="form-control table-input" value="${nome}" />`);
    cognomeCell.html(`<input type="text" class="form-control table-input" value="${cognome}" />`);
    emailCell.html(`<input type="email" class="form-control table-input" value="${email}" />`);
    ruoloCell.html(`
  <select class="form-select table-input">
    <option value="admin" ${ruolo.toLowerCase() === "admin" ? "selected" : ""}>Admin</option>
    <option value="user" ${ruolo.toLowerCase() === "user" ? "selected" : ""}>User</option>
  </select>
`);

    // Cambia il pulsante "Modifica" in "Conferma"
    azioniCell.html(`
      <button class="btn btn-success btn-sm" onclick="confermaModificaUtente('${userId}')">Conferma</button>
      <button class="btn btn-secondary btn-sm" onclick="annullaModificaUtente('${userId}', '${nome}', '${cognome}', '${email}', '${ruolo}')">Annulla</button>
    `);
  };

  window.confermaModificaUtente = async function (userId) {
    const row = $(`button[onclick="confermaModificaUtente('${userId}')"]`).closest("tr");

    // Ottieni i valori aggiornati
    const nome = row.find("td:nth-child(1) input").val().trim();
    const cognome = row.find("td:nth-child(2) input").val().trim();
    const email = row.find("td:nth-child(3) input").val().trim();
    const ruolo = row.find("td:nth-child(4) select").val();

    if (!nome || !cognome || !email || !ruolo) {
      alert("Tutti i campi sono obbligatori.");
      return;
    }

    try {
      const response = await inviaRichiesta("PUT", `/api/updateUser/${userId}`, {
        nome,
        cognome,
        email,
        ruolo,
      });

      if (response.status === 200) {

        // Recupera la cella del ruolo
        const ruoloCell = row.find("td:nth-child(4)");

        // Aggiorna la riga con i nuovi valori
        row.find("td:nth-child(1)").text(nome);
        row.find("td:nth-child(2)").text(cognome);
        row.find("td:nth-child(3)").text(email);
        ruoloCell.text(ruolo.charAt(0).toUpperCase() + ruolo.slice(1));

        // Aggiorna la classe in base al ruolo
        if (ruolo.toLowerCase() === "admin") {
          ruoloCell.addClass("text-danger fw-bold");
        } else {
          ruoloCell.removeClass("text-danger fw-bold");
        }

        // Ripristina i pulsanti
        row.find("td:nth-child(5)").html(`
          <button class="btn btn-warning btn-sm" onclick="modificaUtente('${userId}')">Modifica</button>
          <button class="btn btn-danger btn-sm" onclick="eliminaUtente('${userId}')">Elimina</button>
        `);
      } else {
        alert("Errore durante l'aggiornamento dell'utente.");
      }
    } catch (err) {
      console.error("Errore durante l'aggiornamento dell'utente:", err);
      alert("Errore durante l'aggiornamento dell'utente.");
    }
  };

  window.annullaModificaUtente = function (userId, nome, cognome, email, ruolo) {
    const row = $(`button[onclick="annullaModificaUtente('${userId}', '${nome}', '${cognome}', '${email}', '${ruolo}')"]`).closest("tr");

    // Ripristina i valori originali
    row.find("td:nth-child(1)").text(nome);
    row.find("td:nth-child(2)").text(cognome);
    row.find("td:nth-child(3)").text(email);
    row.find("td:nth-child(4)").text(ruolo);

    // Ripristina i pulsanti
    row.find("td:nth-child(5)").html(`
      <button class="btn btn-warning btn-sm" onclick="modificaUtente('${userId}')">Modifica</button>
      <button class="btn btn-danger btn-sm" onclick="eliminaUtente('${userId}')">Elimina</button>
    `);
  };
  window.eliminaUtente = async function (userId) {
    if (confirm("Sei sicuro di voler eliminare questo utente?")) {
      try {
        const response = await inviaRichiesta("DELETE", `/api/deleteUser/${userId}`);
        if (response.status === 200) {
          // Trova la riga corrispondente nella tabella e applica l'animazione
          const row = $(`button[onclick="eliminaUtente('${userId}')"]`).closest("tr");
          row.fadeOut(500, function () {
            $(this).remove(); // Rimuove la riga dalla DOM dopo l'animazione
          });
        } else {
          alert("Errore durante l'eliminazione dell'utente.");
        }
      } catch (err) {
        console.error("Errore durante l'eliminazione dell'utente:", err);
        alert("Errore durante l'eliminazione dell'utente.");
      }
    }
  }


  // Funzione per caricare i marker delle perizie
  async function loadMarkers(map) {
    try {
      const response = await inviaRichiesta("GET", "/api/getPerizie");
      const perizie = response.data;

      if (!Array.isArray(perizie)) {
        alert("Errore: La risposta del server non è valida.");
        return;
      }

      if (window.markers) window.markers.forEach((marker) => marker.remove());
      window.markers = [];

      perizie.forEach((perizia) => {
        const { latitudine, longitudine } = perizia.coordinate;

        const marker = new maplibregl.Marker()
          .setLngLat([longitudine, latitudine])
          .setPopup(new maplibregl.Popup({ maxWidth: "300px" }).setHTML(createPopupContent(perizia)))
          .addTo(map);

        window.markers.push(marker);
      });
    } catch (err) {
      alert("Errore durante il caricamento delle perizie.");
    }
  }

  // Funzione per creare il contenuto del popup
  function createPopupContent(perizia) {
    const { codice_perizia, descrizione, fotografie } = perizia;
    let content = `
      <div style="max-width: 300px; overflow-wrap: break-word;">
        <h4>Perizia: ${codice_perizia}</h4>
        <textarea id="descrizione" style="width: 100%; margin-bottom: 10px;">${descrizione}</textarea>
        <ul style="list-style-type: none; padding: 0;">
    `;
    fotografie.forEach((foto, index) => {
      content += `
        <li style="margin-bottom: 10px;">
          <img src="${foto.url}" alt="Foto" class="popup-image" style="max-width: 100%; height: auto; border: 1px solid #ccc; border-radius: 4px;" />
          <textarea id="commento-${index}" style="width: 100%; margin-top: 5px;">${foto.commento}</textarea>
        </li>
      `;
    });
    content += `
        </ul>
        <button id="salvaModifiche" 
            data-codice="${codice_perizia}" 
            data-fotografie='${JSON.stringify(fotografie)}'
            style="width: 100%; padding: 10px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Salva Modifiche
        </button>
      </div>
    `;
    return content;
  }

  // Gestione del salvataggio delle modifiche
  $(document).on("click", "#salvaModifiche", async function () {
    const codicePerizia = $(this).data("codice");
    const fotografie = $(this).data("fotografie");
    const nuovaDescrizione = $("#descrizione").val();
    const nuoviCommenti = [];

    $("textarea[id^='commento-']").each(function () {
      nuoviCommenti.push($(this).val());
    });

    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        alert("Sessione scaduta. Effettua nuovamente il login.");
        window.location.href = "/index.html";
        return;
      }

      const response = await inviaRichiesta(
        "PUT",
        `/api/updatePerizia/${codicePerizia}`,
        {
          descrizione: nuovaDescrizione,
          fotografie: nuoviCommenti.map((commento, index) => ({
            url: fotografie[index].url,
            commento: commento,
          })),
        },
        { Authorization: `Bearer ${token}` }
      );

      if (response.status === 200) {
        alert("Modifiche salvate con successo!");
        loadMarkers(map);
      } else {
        alert("Errore durante il salvataggio delle modifiche.");
      }
    } catch (err) {
      alert("Errore durante il salvataggio delle modifiche. Riprova.");
    }
  });

  // Gestione del form "Crea Utente"
  $("#createUserForm").on("submit", async function (event) {
    event.preventDefault();

    const nome = $("#nome").val();
    const cognome = $("#cognome").val();
    const email = $("#email").val();
    const telefono = $("#telefono").val();
    const ruolo = $("#ruolo").val();

    if (!nome || !cognome || !email || !telefono || !ruolo) {
      alert("Tutti i campi sono obbligatori.");
      return;
    }

    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        alert("Sessione scaduta. Effettua nuovamente il login.");
        window.location.href = "/index.html";
        return;
      }

      const response = await inviaRichiesta(
        "POST",
        "/api/createUser",
        { nome, cognome, email, telefono, ruolo },
        { Authorization: `Bearer ${token}` }
      );

      if (response.status === 201) {
        alert("Utente creato con successo!");
        $("#createUserForm")[0].reset();
      } else if (response.status === 409) {
        alert("Errore: Utente già esistente.");
      } else {
        alert("Errore: " + response.err);
      }
    } catch (err) {
      alert("Errore durante la creazione dell'utente. Riprova.");
    }
  });

  // Caricamento degli utenti nel filtro
  async function getUtenti() {
    try {
      const response = await inviaRichiesta("GET", "/api/getUtenti");
      const userFilter = $("#userFilter");
      userFilter.empty();
      userFilter.append(new Option("Tutti", "ALL"));

      response.data.forEach((utente) => {
        if (/Admin/i.test(utente.nome)) return;
        userFilter.append(new Option(`${utente.nome} ${utente.cognome}`, utente._id));
      });

      userFilter.on("change", async function () {
        let selectedUserId = $(this).val();
        if (!selectedUserId || selectedUserId === "ALL") selectedUserId = "ALL";

        try {
          const perizieResponse = await inviaRichiesta(
            "GET",
            `/api/getPerizie?userId=${selectedUserId}`
          );
          if (perizieResponse.data) updateMarkers(perizieResponse.data);
          else updateMarkers([]);
        } catch (err) {
          alert("Errore durante il caricamento delle perizie.");
        }
      });
    } catch (err) {
      alert("Errore durante il caricamento degli utenti.");
    }
  }

  // Funzione per aggiornare i marker sulla mappa
  function updateMarkers(perizie) {
    if (window.markers) window.markers.forEach((marker) => marker.remove());
    window.markers = [];

    perizie.forEach((perizia) => {
      const { coordinate } = perizia;
      if (!coordinate || !coordinate.latitudine || !coordinate.longitudine) return;

      const marker = new maplibregl.Marker()
        .setLngLat([coordinate.longitudine, coordinate.latitudine])
        .setPopup(new maplibregl.Popup({ maxWidth: "100px" }).setHTML(createPopupContent(perizia)))
        .addTo(map);

      window.markers.push(marker);
    });
  }

  initializeMap();
  getUtenti();
});