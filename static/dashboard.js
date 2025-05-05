"use strict";

$(document).ready(function () {
  let map;
  getUtenti();

  // Logout
  $("#logout").on("click", function () {
    localStorage.removeItem("token");
    window.location.href = "/index.html";
  });

  // Sezione Cambia Password
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

  // Inizializzazione della mappa con MapLibre
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

    console.log("Coordinate:", coords);
    const lat = coords.lat;
    const lng = coords.lng;
    const zoom = 15.95;

    const style = {
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
      layers: [
        {
          id: "osm",
          type: "raster",
          source: "osm",
        },
      ],
    };

    const mapOptions = {
      container: "map",
      style: style,
      center: [lng, lat],
      zoom: zoom,
    };

    map = new maplibregl.Map(mapOptions);
    map.addControl(new maplibregl.NavigationControl());
    const scaleOptions = { maxWidth: 80, unit: "metric" };
    map.addControl(new maplibregl.ScaleControl(scaleOptions));

    const sedeCentraleMarker = new maplibregl.Marker({ color: "red" })
      .setLngLat([lng, lat])
      .setPopup(new maplibregl.Popup().setHTML("<h4>Sede Centrale</h4>"))
      .addTo(map);

    loadMarkers(map);
  }

  // Funzione per caricare i marker delle perizie
  async function loadMarkers(map) {
    try {
      const response = await inviaRichiesta("GET", "/api/getPerizie");
      console.log("Risposta API:", response);

      const perizie = response.data;

      if (!Array.isArray(perizie)) {
        console.error("La risposta non è un array:", perizie);
        alert("Errore: La risposta del server non è valida.");
        return;
      }

      if (window.markers) {
        window.markers.forEach((marker) => marker.remove());
      }
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
      console.error("Errore durante il caricamento delle perizie:", err);
      alert("Errore durante il caricamento delle perizie.");
    }
  }
  // Funzione per creare il contenuto del popup
  function createPopupContent(perizia) {
    const { codice_perizia, descrizione, fotografie } = perizia;

    let content = `
    <div>
        <h4>Perizia: ${codice_perizia}</h4>
        <h5>Modifica descrizione:</h5>
        <textarea id="descrizione" style="width: 100%; margin-bottom: 10px;">${descrizione}</textarea>
        <h5>Fotografie:</h5>
        <ul>
    `;

    fotografie.forEach((foto, index) => {
      content += `
        <li>
            <img src="${foto.url}" alt="Foto" style="width: 100px; height: auto;" />
            <textarea id="commento-${index}" style="width: 100%; margin-top: 5px;">${foto.commento}</textarea>
        </li>
        `;
    });

    content += `
        </ul>
        <button id="salvaModifiche" 
            data-codice="${codice_perizia}" 
            data-fotografie='${JSON.stringify(fotografie)}'>
            Salva Modifiche
        </button>
    </div>
    `;

    return content;
  }
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
        {
          Authorization: `Bearer ${token}`,
        }
      );

      if (response.status === 200) {
        alert("Modifiche salvate con successo!");

        loadMarkers(map);
      } else {
        alert("Errore durante il salvataggio delle modifiche.");
      }
    } catch (err) {
      console.error("Errore durante il salvataggio delle modifiche:", err);
      alert("Errore durante il salvataggio delle modifiche. Riprova.");
    }
  });

  initializeMap();

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

      let response = await inviaRichiesta(
        "POST",
        "/api/createUser",
        {
          nome,
          cognome,
          email,
          telefono,
          ruolo,
        },
        {
          Authorization: `Bearer ${token}`,
        }
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
      console.error("Errore durante la creazione dell'utente:", err);
      alert("Errore durante la creazione dell'utente. Riprova.");
    }
  });

  // Caricamento degli utenti nel filtro
  async function getUtenti() {
    try {
      const response = await inviaRichiesta("GET", "/api/getUtenti");
      console.log("Utenti caricati:", response);

      const userFilter = $("#userFilter");
      userFilter.empty();
      userFilter.append(new Option("Tutti", "ALL"));

      response.data.forEach((utente) => {
        if (/Admin/i.test(utente.nome)) {
          console.log("Utente escluso dal filtro:", utente);
          return;
        }

        userFilter.append(
          new Option(`${utente.nome} ${utente.cognome}`, utente._id)
        );
      });

      userFilter.on("change", async function () {
        let selectedUserId = $(this).val();
        console.log("Utente selezionato:", selectedUserId);

        if (!selectedUserId || selectedUserId === "ALL") {
          selectedUserId = "ALL";
        }

        selectedUserId = selectedUserId.trim();

        try {
          const perizieResponse = await inviaRichiesta(
            "GET",
            `/api/getPerizie?userId=${selectedUserId}`
          );
          console.log("Perizie caricate:", perizieResponse);

          if (perizieResponse.data) {
            updateMarkers(perizieResponse.data);
          } else {
            console.warn("Nessuna perizia trovata.");
            updateMarkers([]);
          }
        } catch (err) {
          console.error("Errore durante il caricamento delle perizie:", err);
          alert("Errore durante il caricamento delle perizie.");
        }
      });
    } catch (err) {
      console.error("Errore durante il caricamento degli utenti:", err);
      alert("Errore durante il caricamento degli utenti.");
    }
  }

  // Funzione per aggiornare i marker sulla mappa
  function updateMarkers(perizie) {
    if (window.markers) {
      window.markers.forEach((marker) => marker.remove());
    }
    window.markers = [];

    perizie.forEach((perizia) => {
      const { coordinate } = perizia;

      if (!coordinate || !coordinate.latitudine || !coordinate.longitudine) {
        console.warn("Perizia con coordinate non valide:", perizia);
        return;
      }

      const marker = new maplibregl.Marker()
        .setLngLat([coordinate.longitudine, coordinate.latitudine])
        .setPopup(new maplibregl.Popup().setHTML(createPopupContent(perizia)))
        .addTo(map);

      window.markers.push(marker);
    });
  }
});
