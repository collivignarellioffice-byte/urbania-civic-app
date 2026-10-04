# Urbania, presentazione del progetto

Presentazione web statica del progetto Urbania. Il file `index.html` contiene struttura, stile, demo della mappa e dashboard simulata.

[Apri la presentazione online](https://collivignarellioffice-byte.github.io/urbania-civic-app/presentation/)

## Modello economico proposto

I prezzi sono ipotesi commerciali IVA esclusa, da validare con Comuni e procedure di acquisto reali:

- pilota per Comuni sotto i 5.000 abitanti: gratuito per 12 mesi, con limiti;
- Starter: 12.000 euro l'anno e 3.000 euro di avvio;
- Go: 24.000 euro l'anno e 6.000 euro di avvio;
- Plus: 48.000 euro l'anno e 12.000 euro di avvio;
- Enterprise: da 96.000 euro l'anno, più integrazione;
- integrazioni: 10.000-30.000 euro di avvio e 6.000 euro l'anno;
- modulo predittivo: da 18.000 euro l'anno, solo dopo validazione.

La fascia è stata stimata confrontando contratti pubblici relativi a piattaforme verticali e suite comunali più estese:

- [FixMyStreet Pro, London Borough of Bromley](https://www.bromley.gov.uk/downloads/file/1834/all-active-lbb-contracts-26-august-2021): 35.000 sterline l'anno nel registro consultato;
- [Granicus Customer Platform, Haringey Council](https://www.minutes.haringey.gov.uk/mgAi.aspx?ID=77127): prodotto base tra 133.999 e 171.499 sterline l'anno nel contratto pubblicato;
- [Citizen Engagement Platform, Perth & Kinross Council](https://www.publiccontractsscotland.gov.uk/search/show/search_view.aspx?ID=FEB549636): valore di aggiudicazione di 54.300,60 sterline, durata e perimetro da verificare prima di un confronto diretto.

## Pubblicità locale

Il modello `Urbania Local` vende pacchetti mensili a prezzo fisso a imprese verificate. Gli annunci possono apparire nella home, sulla mappa pubblica e nella bacheca dei servizi, ma restano esclusi dal modulo di segnalazione, dalla graduatoria delle priorità e dalla dashboard comunale.

Urbania usa solo il Comune o il quartiere selezionato e il contesto generale della pagina. Non usa la posizione precisa, la cronologia delle segnalazioni o profili comportamentali. Gli annunci sono sempre indicati come sponsorizzati. Il principio segue le [linee guida del Garante Privacy](https://www.garanteprivacy.it/web/guest/home/docweb/-/docweb-display/docweb/9677876) sull'uso di strumenti di tracciamento e pubblicità personalizzata.

## Verifica locale

```bash
python3 -m http.server 4173
```

Aprire `http://localhost:4173` dalla cartella del progetto.
