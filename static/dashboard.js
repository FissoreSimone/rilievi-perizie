"use strict";

$(document).ready(function () {
  // Sezioni della dashboard
  let perizieSection = $("#perizieSection");
  let cambiaPasswordSection = $("#cambiaPasswordSection").hide();
  let createUserSection = $("#nuovoUtenteSection").hide();
  let map;

  // Funzione per mostrare la sezione selezionata
  function showSection(section) {
    if (section === "perizie") {
      perizieSection.show();
      cambiaPasswordSection.hide();
      createUserSection.hide();
    } else if (section === "nuovoUtente") {
      perizieSection.hide();
      cambiaPasswordSection.hide();
      createUserSection.show();
    } else if (section === "cambiaPassword") {
      perizieSection.hide();
      cambiaPasswordSection.show();
      createUserSection.hide();
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
          .setPopup(new maplibregl.Popup().setHTML(createPopupContent(perizia)))
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
      <div>
        <h4>Perizia: ${codice_perizia}</h4>
        <textarea id="descrizione">${descrizione}</textarea>
        <ul>
    `;
    fotografie.forEach((foto, index) => {
      content += `
        <li>
          <img src="${foto.url}" alt="Foto" />
          <textarea id="commento-${index}">${foto.commento}</textarea>
        </li>
      `;
    });
    content += `
        </ul>
        <button id="salvaModifiche" data-codice="${codice_perizia}" data-fotografie='${JSON.stringify(
      fotografie
    )}'>Salva Modifiche</button>
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
        .setPopup(new maplibregl.Popup().setHTML(createPopupContent(perizia)))
        .addTo(map);

      window.markers.push(marker);
    });
  }

  initializeMap();
  getUtenti();
});