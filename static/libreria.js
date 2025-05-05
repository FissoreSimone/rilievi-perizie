"use strict";
const _URL = "";

const requestInterceptor = function (request) {
    if (!request.headers) {
        request.headers = new Headers();
    }
    const authToken = localStorage.getItem("authToken");
    if (authToken) {
        console.log("Token inviato:", authToken); 
        request.headers.set("Authorization", `Bearer ${authToken}`);
    } else {
        console.warn("Token non trovato nel localStorage.");
    }
    return request;
};

const responseInterceptor = function (response) {
    if (response.headers) {
        let authToken = response.headers.get("authorization");
        if (authToken) {
            console.log("Token ricevuto:", authToken);
            localStorage.setItem("authToken", authToken);
        }
    }
};

async function inviaRichiesta(method, url = "", params = {}, headers = {}) {
    method = method.toUpperCase();
    let options = {
        method: method,
        headers: {
            ...headers,
        },
        mode: "cors", // default
        cache: "no-cache", // default
        credentials: "same-origin", // default
        redirect: "follow", // default
        referrerPolicy: "no-referrer", // default no-referrer-when-downgrade
    };

    if (method === "GET") {
        const queryParams = new URLSearchParams();
        for (let key in params) {
            let value = params[key];
            if (value && typeof value === "object") {
                queryParams.append(key, JSON.stringify(value));
            } else {
                queryParams.append(key, value);
            }
        }

        if (queryParams.toString()) {
            url += (url.includes("?") ? "&" : "?") + queryParams.toString();
        }

        options.headers["Content-Type"] = "application/x-www-form-urlencoded";
    } else {
        if (params instanceof FormData) {
            options.body = params; // Accept FormData, File, Blob
        } else {
            options.body = JSON.stringify(params);
            options.headers["Content-Type"] = "application/json";
        }
    }

    let request = new Request(_URL + url, options);
    request = requestInterceptor(request);
    console.log("Request headers dopo interceptor:", [...request.headers.entries()]); 

    try {
        const response = await fetch(request);
        const contentType = response.headers.get("Content-Type");

        if (!response.ok) {
            let err = await response.text();
            console.error("Errore HTTP:", response.status, err);
            return { status: response.status, err };
        }

        if (contentType && contentType.includes("application/json")) {
            let data = await response.json().catch((err) => {
                console.error("Errore nel parsing della risposta JSON:", err);
                return { status: 422, err: "Response contains an invalid JSON" };
            });
            responseInterceptor(response);
            return { status: response.status, data };
        } else {
            let text = await response.text();
            console.warn("Risposta non JSON ricevuta:", text);
            return { status: response.status, data: text };
        }
    } catch (err) {
        console.error("Errore durante la richiesta:", err);
        return { status: 408, err: "Connection Refused or Server Timeout" };
    }
}
