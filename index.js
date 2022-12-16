/**
 *    ____             __ _____
 *   / ___|___  _ __  / _| ____|   _ _ __ ___  _ __   __ _ 
 *  | |   / _ \| '_ \| |_|  _|| | | | '__/ _ \| '_ \ / _` |
 *  | |__| (_) | | | |  _| |__| |_| | | | (_) | |_) | (_| |
 *  _\____\___/|_| |_|_| |_____\__,_|_|  \___/| .__/ \__,_|
 *  \ \      / /_ _| |_ ___| |__   ___ _ __   |_|
 *   \ \ /\ / / _` | __/ __| '_ \ / _ \ '__|
 *    \ V  V / (_| | || (__| | | |  __/ |
 *     \_/\_/ \__,_|\__\___|_| |_|\___|_|
 */

import puppeteer from "puppeteer";
import readline from "readline";
import dotenv from "dotenv";

(async () => {
    dotenv.config();

    console.log("   ____             __ _____                            \r\n  \/ ___|___  _ __  \/ _| ____|   _ _ __ ___  _ __   __ _ \r\n | |   \/ _ \\| \'_ \\| |_|  _|| | | | \'__\/ _ \\| \'_ \\ \/ _` |\r\n | |__| (_) | | | |  _| |__| |_| | | | (_) | |_) | (_| |\r\n _\\____\\___\/|_| |_|_| |_____\\__,_|_|  \\___\/| .__\/ \\__,_|\r\n \\ \\      \/ \/_ _| |_ ___| |__   ___ _ __   |_|          \r\n  \\ \\ \/\\ \/ \/ _` | __\/ __| \'_ \\ \/ _ \\ \'__|               \r\n   \\ V  V \/ (_| | || (__| | | |  __\/ |                  \r\n    \\_\/\\_\/ \\__,_|\\__\\___|_| |_|\\___|_|                  \r\n                                                        ");
    console.log("[+] Sto avviando il browser");

    const browser = await puppeteer.launch({
        headless: true,
    });

    try {
        const page = await browser.newPage();

        // Accesso al sito
        await page.goto("https://www.confeuropacademy.org/fad/");
        await sleep(2000);

        const username = process.env.FAD_USERNAME || await readValueFromStdin("[*] Inserisci il tuo username: ");
        const password = process.env.FAD_PASSWORD || await readValueFromStdin("[*] Inserisci la tua password (non sarà memorizzata): ");

        // Login
        await page.type("#slider-email", username);
        await page.type("#slider-password", password);
        await page.click("input[value='ENTRA']");
        await sleep(2000);

        console.log("[+] Accesso effettuato");

        // Conferma anagrafica
        await page.click("button[type='submit']");
        await sleep(2000);

        console.log("[+] Anagrafica confermata");

        // Accesso al corso
        await page.click(".buttonenter");
        await sleep(2000);

        const courseName = await page.$eval("table > tbody > tr > td > strong", e => e.innerText.replace("\n", ""));
        console.log(`[+] Accesso al corso '${courseName}' effettuato`);

        // Controlla se c'è un test da effettuare
        const progress = await page.evaluate(() => Array.from(document.querySelectorAll("table > tbody > tr > td > strong")).find(e => Array.from(e.style).length === 2).innerText);
        if (progress.includes("TEST")) {
            console.log("[!] C'è da fare un test!");
            await browser.close();
            process.exit(0);
        }

        // Trova il primo step abilitato con relativo test disabilitato
        const step = await page.evaluateHandle(() => {
            const element = Array.from(document.querySelectorAll("#due tbody > tr > td > a.button2021"))
                .find((e, i, a) => a[i + 1]?.className.includes("bdisable") && a[i + 1]?.innerText.includes("TEST"));
            if (element.innerText.includes("VERIFICA FINALE")) {
                return null;
            }

            return element;
        });
        if (!step) {
            console.log("[!] Nessuno step da guardare trovato!");
            await browser.close();
            process.exit(0);
        }

        console.log("[+] Sto entrando nello step dal titolo '" + (await step.evaluate(e => e.innerText)) + "'");

        // Entra nello step
        await step.click();
        await sleep(2000);

        // Continua a ciclare finchè tutti i sotto-step sono completati
        let prevStepNumber = "";

        while (true) {
            // Fa caricare bene la pagina
            await sleep(3000);

            // Controlla se tutti i sotto-step sono stati completati
            // Se lo sono, torna alla home
            const subStepNumber = await page.$eval(".interno > strong", e => e.innerText);
            if (prevStepNumber === subStepNumber) {
                console.log("[+] Tutti i sotto-step sono stati completati, ritorno alla home");
                await page.click("input[value='HOME']");
                await sleep(2000);
                break;
            }

            // Trova il sotto-step in corso
            const subStep = (await page.$$("#menusx > a.button2021:not(.bdisable)")).at(-1);
            const subStepName = await subStep.evaluate(e => e.innerText);
            console.log(`[+] Sto entrando nel sotto-step dal titolo '${subStepName}'`);

            // Entra nel sotto-step e attende qualche secondo per far uscire il countdown
            await subStep.click();
            await sleep(2000);

            const waitSeconds = await page.$eval("body", body => +body.onload.toString().substring(body.onload.toString().indexOf(","), body.onload.toString().lastIndexOf(")")).replace(",", ""));
            console.log(`[+] Devo attendere circa ${waitSeconds} secondi...`);

            // Attende che il tasto per passare al successivo sotto-step diventi operativo
            await page.waitForSelector("input[value='PROSSIMA SLIDE>>']", { timeout: 43200000 });
            
            console.log("[+] Procedo al sotto-step successivo");
            prevStepNumber = subStepNumber;

            // Clicca il tasto per procedere
            await sleep(1000);
            await page.click("#menu_avanti");
        }
    } finally {
        await browser.close();
    }
})();

// Utility functions

export async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function readValueFromStdin(question) {
    return new Promise(resolve => rl.question(question, v => resolve(v)));
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});
