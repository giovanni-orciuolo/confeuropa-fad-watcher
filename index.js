import puppeteer from "puppeteer";

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
    const browser = await puppeteer.launch({
        headless: false,
    });

    try {
        const page = await browser.newPage();

        // Accesso al sito
        await page.goto("https://www.confeuropacademy.org/fad/");
        await sleep(2000);

        // Login
        await page.type("#slider-email", "gioorc@exemple.it");
        await page.type("#slider-password", "PYQG6634");
        await page.click("input[value='ENTRA']");
        await sleep(2000);

        // Conferma anagrafica
        await page.click("button[type='submit']");
        await sleep(2000);

        // Accesso al corso
        await page.click(".buttonenter");
        await sleep(2000);

        // Trova il primo step abilitato con relativo test disabilitato
        const step = await page.evaluateHandle(() => {
            const element = Array.from(
                document.querySelectorAll("#due tbody > tr > td > a.button2021"))
                    .find((e, i, a) => a[i + 1]?.className.includes("bdisable")
            );
            if (element.innerHTML.includes("TEST DI VERIFICA")) {
                return null;
            }

            return element;
        });
        if (!step) {
            console.log("No step found!");
            return;
        }

        // Entra nello step
        await step.click();
        await sleep(2000);

        // Continua a ciclare finchè tutti i sotto-step sono completati
        while (true) {
            // Fa caricare bene la pagina
            await sleep(3000);

            // Controlla se tutti i sotto-step sono stati completati
            // Se lo sono, torna alla home
            if (!await page.$("#menusx > a.bdisable")) {
                await page.click("input[value='HOME']");
                await sleep(2000);
                break;
            }

            // Trova il sotto-step in corso
            const subStep = (await page.$$("#menusx > a.button2021:not(.bdisable)")).at(-1);

            // Entra nel sotto-step e attende qualche secondo per far uscire il countdown
            await subStep.click();
            await sleep(2000);

            // Attende che il tasto per passare al successivo sotto-step diventi operativo
            await page.waitForSelector("input[value='PROSSIMA SLIDE>>']", { timeout: 43200000 });

            // Clicca il tasto per procedere
            await sleep(1000);
            await page.click("#menu_avanti");
        }
    } finally {
        await browser.close();
    }
})();