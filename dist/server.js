"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// import
const http_1 = __importDefault(require("http"));
const fs_1 = __importDefault(require("fs"));
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const mongodb_1 = require("mongodb");
const cors_1 = __importDefault(require("cors"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const cloudinary_1 = require("cloudinary");
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
// config
dotenv_1.default.config({ path: ".env" });
const app = (0, express_1.default)();
const HTTP_PORT = process.env.PORT || 3000;
const DBNAME = process.env.DBNAME;
const CONNECTION_STRING = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;
console.log("Nome del database:", DBNAME);
function testConnection() {
    return __awaiter(this, void 0, void 0, function* () {
        const client = new mongodb_1.MongoClient(CONNECTION_STRING);
        try {
            yield client.connect();
            console.log("Connessione al database riuscita!");
            const collection = client.db(DBNAME).collection("utenti");
            const utenti = yield collection.find({}).toArray();
            console.log("Utenti trovati:", utenti);
        }
        catch (err) {
            console.error("Errore di connessione:", err);
        }
        finally {
            yield client.close();
        }
    });
}
testConnection();
const whiteList = ["http://localhost:1337"];
const corsOptions = {
    origin: function (origin, callback) {
        return callback(null, true);
    },
    credentials: true,
};
const HTTPS_PORT = 1337;
const chiavePrivata = process.env.PRIVATE_KEY;
const privateKey = chiavePrivata === null || chiavePrivata === void 0 ? void 0 : chiavePrivata.replace(/\\n/g, "\n");
const certificato = process.env.CERTIFICATE;
const certificate = certificato === null || certificato === void 0 ? void 0 : certificato.replace(/\\n/g, "\n");
const credentials = { key: privateKey, cert: certificate };
// ********** Avvio ***************
const httpServer = http_1.default.createServer(app);
httpServer.listen(HTTP_PORT, function () {
    init();
    console.log("Server HTTP in ascolto sulla porta " + HTTP_PORT);
});
let paginaErrore = "";
function init() {
    fs_1.default.readFile("./static/error.html", function (err, data) {
        if (!err)
            paginaErrore = data.toString();
        else
            paginaErrore = "<h1>Risorsa non trovata</h1>";
    });
}
/* ******** (Sezione 2) Middleware ******** */
app.use("/", function (req, res, next) {
    console.log("* " + req.method + " * : " + req.originalUrl);
    next();
});
app.use("/", express_1.default.static("./static"));
app.use("/", express_1.default.json({ limit: "20mb" }));
app.use("/", express_1.default.urlencoded({ extended: true, limit: "20mb" }));
app.use("/", (0, cors_1.default)(corsOptions));
app.use(express_1.default.json({ limit: "20mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "20mb" }));
/* ******* (Sezione 3) USER ROUTES  ********** */
// GET /api/utenti
app.get("/api/getUtenti", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const client = new mongodb_1.MongoClient(CONNECTION_STRING);
    try {
        yield client.connect();
        const collection = client.db(DBNAME).collection("utenti");
        const utenti = yield collection.find({}).toArray();
        res.status(200).json(utenti);
    }
    catch (err) {
        console.error("Errore durante il caricamento degli utenti:", err);
        res.status(500).send("Errore interno del server.");
    }
    finally {
        yield client.close();
    }
}));
// POST /api/createUser
app.post("/api/createUser", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { nome, cognome, email, telefono, ruolo } = req.body;
    if (!nome || !cognome || !email || !telefono || !ruolo) {
        return res.status(400).send("Tutti i campi sono obbligatori.");
    }
    const client = new mongodb_1.MongoClient(CONNECTION_STRING);
    try {
        yield client.connect();
        const collection = client.db(DBNAME).collection("utenti");
        const username = `${nome.toLowerCase()}.${cognome.toLowerCase()}`;
        const existingUser = yield collection.findOne({ email });
        if (existingUser) {
            console.log("Utente già esistente:", existingUser);
            return res.status(409).json({ message: "Utente già esistente." });
        }
        const initialPassword = "password";
        const hashedPassword = yield bcryptjs_1.default.hash(initialPassword, 10);
        const newUser = {
            nome,
            cognome,
            username,
            email,
            telefono,
            passwordHash: hashedPassword,
            ruolo,
            firstLoginCompleted: false,
            data_creazione: new Date().toISOString(),
        };
        const result = yield collection.insertOne(newUser);
        if (result.acknowledged) {
            console.log("Utente creato con successo:", newUser);
            return res.status(201).json({
                message: "Utente creato con successo.",
                user: { nome, cognome, username, email, telefono, ruolo },
            });
        }
        else {
            console.error("Errore durante l'inserimento dell'utente.");
            return res.status(500).json({ message: "Errore durante la creazione dell'utente." });
        }
    }
    catch (err) {
        console.error("Errore durante la creazione dell'utente:", err);
        return res.status(500).json({ message: "Errore interno del server." });
    }
    finally {
        yield client.close();
    }
}));
// GET /api/getPerizie
app.get("/api/getPerizie", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.query.userId;
    const client = new mongodb_1.MongoClient(CONNECTION_STRING);
    try {
        yield client.connect();
        const collection = client.db(DBNAME).collection("perizie");
        let query = {};
        if (userId && userId !== "ALL") {
            if (!mongodb_1.ObjectId.isValid(userId)) {
                return res.status(400).send("ID utente non valido.");
            }
            query = { operatore_id: new mongodb_1.ObjectId(userId) };
        }
        const perizie = yield collection.find(query).toArray();
        console.log("Perizie inviate al client:", perizie); // Log per debug
        res.status(200).json(perizie);
    }
    catch (err) {
        console.error("Errore durante il caricamento delle perizie:", err);
        res.status(500).send("Errore interno del server.");
    }
    finally {
        yield client.close();
    }
}));
// POST /api/login
app.post("/api/login", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    console.log("Dati ricevuti:", { email, password });
    if (!email || !password) {
        return res.status(400).send("Email e password sono obbligatori.");
    }
    const client = new mongodb_1.MongoClient(CONNECTION_STRING);
    try {
        yield client.connect();
        const collection = client.db(DBNAME).collection("utenti");
        const user = yield collection.findOne({ email });
        console.log("Utente trovato:", user);
        if (!user) {
            return res.status(401).send("Utente non trovato.");
        }
        const isPasswordValid = yield bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            return res.status(401).send("Password errata.");
        }
        const token = jsonwebtoken_1.default.sign({ id: user._id, nome: user.nome, cognome: user.cognome, email: user.email, ruolo: user.ruolo }, JWT_SECRET, { expiresIn: "10s" });
        if (!user.firstLoginCompleted) {
            return res.status(200).json({
                token,
                message: "Accesso effettuato con successo. Primo accesso.",
                primo_accesso: true,
                redirect: "/cambia-password.html",
            });
        }
        else if (user.ruolo === "admin") {
            return res.status(200).json({
                token,
                message: "Accesso effettuato con successo.",
                redirect: "/dashboard.html",
            });
        }
        else if (user.ruolo === "user") {
            return res.status(200).json({
                token,
                message: "Accesso effettuato con successo.",
                primo_accesso: false,
                redirect: "/dashboard-utente.html",
            });
        }
        else {
            return res.status(403).send("Ruolo non riconosciuto.");
        }
    }
    catch (err) {
        console.error("Errore durante il login:", err);
        return res.status(500).send("Errore interno del server.");
    }
    finally {
        yield client.close();
    }
}));
// PUT /api/updatePerizia/:codice_perizia
app.put("/api/updatePerizia/:codice_perizia", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const codicePerizia = req.params.codice_perizia;
    const { descrizione, fotografie } = req.body;
    const client = new mongodb_1.MongoClient(CONNECTION_STRING);
    if (!descrizione || !fotografie || !Array.isArray(fotografie)) {
        return res.status(400).send("Descrizione e fotografie sono obbligatorie.");
    }
    try {
        yield client.connect();
        const collection = client.db(DBNAME).collection("perizie");
        const existingPerizia = yield collection.findOne({ codice_perizia: codicePerizia });
        if (!existingPerizia) {
            return res.status(404).send("Perizia non trovata.");
        }
        const updatedFotografie = fotografie.map((foto, index) => {
            const existingFoto = existingPerizia.fotografie[index];
            return {
                url: foto.url || (existingFoto ? existingFoto.url : null),
                commento: foto.commento || (existingFoto ? existingFoto.commento : ""),
            };
        });
        // Aggiorna la perizia
        const result = yield collection.updateOne({ codice_perizia: codicePerizia }, { $set: { descrizione, fotografie: updatedFotografie } });
        if (result.matchedCount === 0) {
            return res.status(404).send("Perizia non trovata.");
        }
        res.status(200).send("Perizia aggiornata con successo.");
    }
    catch (err) {
        console.error("Errore durante l'aggiornamento della perizia:", err);
        res.status(500).send("Errore interno del server.");
    }
    finally {
        yield client.close();
    }
}));
// POST /api/cambia-password
app.post("/api/cambia-password", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { currentPassword, nuovaPassword } = req.body;
    const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(" ")[1];
    console.log("Token ricevuto:", token);
    console.log("Nuova password ricevuta:", nuovaPassword);
    if (!nuovaPassword || !token) {
        return res.status(400).send("Tutti i campi sono obbligatori.");
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        console.log("Token decodificato:", decoded);
        const client = new mongodb_1.MongoClient(CONNECTION_STRING);
        yield client.connect();
        const collection = client.db(DBNAME).collection("utenti");
        const user = yield collection.findOne({ _id: new mongodb_1.ObjectId(decoded.id) });
        if (!user) {
            return res.status(404).json({ message: "Utente non trovato." });
        }
        if (!user.firstLoginCompleted) {
            console.log("Primo accesso rilevato, bypassando il controllo della password attuale.");
        }
        else {
            if (!currentPassword) {
                return res.status(400).json({ message: "La password attuale è obbligatoria." });
            }
            const isPasswordValid = yield bcryptjs_1.default.compare(currentPassword, user.passwordHash);
            if (!isPasswordValid) {
                return res.status(401).json({ message: "La password attuale non è corretta." });
            }
        }
        if (nuovaPassword.length < 8) {
            return res.status(400).json({ message: "La nuova password deve contenere almeno 8 caratteri." });
        }
        const hashedPassword = yield bcryptjs_1.default.hash(nuovaPassword, 10);
        const result = yield collection.updateOne({ _id: new mongodb_1.ObjectId(decoded.id) }, { $set: { passwordHash: hashedPassword, firstLoginCompleted: true } });
        if (result.modifiedCount === 1) {
            return res.status(200).json({ message: "Password aggiornata con successo." });
        }
        else {
            return res.status(500).json({ message: "Errore durante l'aggiornamento della password." });
        }
    }
    catch (err) {
        console.error("Errore durante il cambio della password:", err);
        return res.status(500).send("Errore interno del server.");
    }
}));
// POST /api/upload-perizia
app.post("/api/upload-perizia", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { descrizione, foto, coordinate, dataOra, codiceOperatore } = req.body;
    const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(" ")[1];
    if (!descrizione || !foto || foto.length === 0 || !coordinate || !dataOra || !codiceOperatore || !token) {
        return res.status(400).send("Tutti i campi sono obbligatori.");
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const client = new mongodb_1.MongoClient(CONNECTION_STRING);
        yield client.connect();
        const collection = client.db(DBNAME).collection("perizie");
        const codicePerizia = `PRZ-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;
        const perizia = {
            codice_perizia: codicePerizia,
            operatore_id: new mongodb_1.ObjectId(decoded.id),
            data_ora_perizia: new Date(dataOra),
            coordinate: {
                latitudine: parseFloat(coordinate.latitudine),
                longitudine: parseFloat(coordinate.longitudine),
            },
            descrizione,
            fotografie: foto,
        };
        const result = yield collection.insertOne(perizia);
        if (result.insertedId) {
            return res.status(200).json({ message: "Perizia caricata con successo.", periziaId: result.insertedId });
        }
        else {
            return res.status(500).send("Errore durante il salvataggio della perizia.");
        }
    }
    catch (err) {
        console.error("Errore durante l'upload della perizia:", err);
        return res.status(500).send("Errore interno del server.");
    }
}));
function generaPasswordCasuale(length = 10) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let password = "";
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}
bcryptjs_1.default.hash("adminpassword", 10, (err, hash) => {
    if (err) {
        console.error("Errore durante l'hashing:", err);
    }
    else {
        console.log("Password hashata:", hash);
    }
});
/* ******** (Sezione 4) DEFAULT ROUTE  ********* */
app.use("/", function (req, res, next) {
    res.status(404);
    if (req.originalUrl.startsWith("/api/")) {
        res.send("Risorsa non trovata");
    }
    else
        res.send(paginaErrore);
});
app.use("/", (err, req, res, next) => {
    res.status(500);
    res.send("ERRR: " + err.message);
    console.log("SERVER ERROR " + err.stack);
});
