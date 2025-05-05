$(document).ready(function () {
    $("#changePasswordForm").on("submit", async function (event) {
        event.preventDefault();

        const nuovaPassword = $("#nuovaPassword").val();
        const confermaPassword = $("#confermaPassword").val();

        if (nuovaPassword !== confermaPassword) {
            $("#errorMessage").text("Le password non coincidono.");
            return;
        }

        try {
            const token = localStorage.getItem("authToken");
            console.log("Token recuperato:", token); 
            if (!token) {
                alert("Sessione scaduta. Effettua nuovamente il login.");
                window.location.href = "/index.html";
                return;
            }

            const response = await inviaRichiesta("POST", "/api/cambia-password", {
                nuovaPassword,
            }, {
                Authorization: `Bearer ${token}`
            });

            if (response.status === 200) {
                alert("Password cambiata con successo! Ora puoi accedere.");
                localStorage.removeItem("authToken"); 
                window.location.href = "/index.html";
            } else {
                $("#errorMessage").text("Errore durante il cambio della password.");
            }
        } catch (err) {
            console.error("Errore durante il cambio della password:", err);
            $("#errorMessage").text("Errore durante il cambio della password. Riprova.");
        }
    });
});