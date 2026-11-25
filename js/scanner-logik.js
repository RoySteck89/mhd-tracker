/* ==========================================================================
   SCANNER-, SPEICHER- & LIVE-ARTIKEL-LOGIK (PERFEKTIONIERT)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const barcodeInput = document.getElementById('eingabe-barcode');
    const artikelNameInput = document.getElementById('eingabe-artikelname');
    const mhdInput = document.getElementById('eingabe-mhd');
    const kategorieSelect = document.getElementById('eingabe-kategorie');
    const speichernButton = document.getElementById('schaltflaeche-mhd-speichern');
    const scanButton = document.getElementById('schaltflaeche-scannen');
    const aktiveArtikelBehaelter = document.getElementById('behälter-aktive-artikel');

    function istAngemeldet() {
        const session = sessionStorage.getItem('kik_app_lizenz');
        if (!session) return false;
        try {
            const daten = JSON.parse(session);
            return Boolean(daten && daten.rolle);
        } catch (e) {
            return false;
        }
    }

    // Felder absolut strikt gegen Browser-Autofill / Passwortmanager absichern
    [barcodeInput, artikelNameInput, mhdInput].forEach(el => {
        if (el) {
            el.setAttribute('autocomplete', 'new-password');
            el.setAttribute('autocapitalize', 'off');
            el.setAttribute('spellcheck', 'false');
            el.setAttribute('data-lpignore', 'true');
            el.setAttribute('data-form-type', 'other');
        }
    });

    // ZENTRALE LIVE-SUCHE BEI BARCODE-EINGABE ODER SCAN
    async function sucheBarcodeInDatenbank(barcode) {
        const saubererBarcode = barcode.trim();
        if (saubererBarcode.length >= 8 && window.supabaseVerbindung && window.supabaseVerbindung.client) {
            try {
                const { data, error } = await window.supabaseVerbindung.client
                    .from('artikel')
                    .select('*')
                    .eq('barcode', saubererBarcode)
                    .limit(1);

                if (!error && data && data.length > 0) {
                    if (artikelNameInput) artikelNameInput.value = data[0].artikelname;
                    if (kategorieSelect && data[0].kategorie) kategorieSelect.value = data[0].kategorie;
                } else {
                    if (artikelNameInput) artikelNameInput.value = ''; // Neuer Artikel -> Name bleibt frei zum Eintippen
                }
            } catch (err) {
                console.error('Live-Suche Fehler:', err);
            }
        } else {
            if (artikelNameInput) artikelNameInput.value = '';
        }
    }

    if (barcodeInput) {
        barcodeInput.setAttribute('inputmode', 'numeric');
        
        // Lauscht auf jede Eingabe oder automatisches Einfügen
        barcodeInput.addEventListener('input', () => {
            sucheBarcodeInDatenbank(barcodeInput.value);
        });
        barcodeInput.addEventListener('change', () => {
            sucheBarcodeInDatenbank(barcodeInput.value);
        });
    }

    // MHD-Formatierung TT.MM.JJ während der Eingabe
    if (mhdInput) {
        mhdInput.setAttribute('inputmode', 'numeric');
        mhdInput.setAttribute('maxlength', '8');

        mhdInput.addEventListener('input', (e) => {
            let wert = e.target.value.replace(/\D/g, '');
            if (wert.length > 6) wert = wert.slice(0, 6);

            let formatiert = '';
            if (wert.length > 0) formatiert = wert.substring(0, 2);
            if (wert.length >= 3) formatiert += '.' + wert.substring(2, 4);
            if (wert.length >= 5) formatiert += '.' + wert.substring(4, 6);
            e.target.value = formatiert;
        });
    }

    if (scanButton) {
        scanButton.addEventListener('click', () => {
            if (!istAngemeldet()) {
                alert('Zugriff verweigert: Bitte zuerst anmelden.');
                return;
            }
            kameraScannerOeffnen();
        });
    }

    async function kameraScannerOeffnen() {
        if (!('BarcodeDetector' in window)) {
            const manuellerCode = prompt('Dein Browser unterstützt keinen direkten Kamera-Scan. Bitte Barcode manuell eingeben:');
            if (manuellerCode && barcodeInput) {
                barcodeInput.value = manuellerCode.trim();
                sucheBarcodeInDatenbank(barcodeInput.value);
            }
            return;
        }

        const overlay = document.createElement('div');
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.92); z-index: 9999; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box;';
        overlay.innerHTML = `
            <div style="width: 100%; max-width: 380px; display: flex; flex-direction: column; gap: 16px; align-items: center;">
                <div style="color: white; font-weight: 600; font-size: 1.05rem; text-align: center;">Barcode in den Zielschlitz halten</div>
                <div style="position: relative; width: 100%; height: 150px; border: 2px solid #0D9488; border-radius: 12px; overflow: hidden; background: #000; box-shadow: 0 0 20px rgba(13, 148, 136, 0.4);">
                    <video id="scanner-video" autoplay playsinline style="width: 100%; height: 100%; object-fit: cover;"></video>
                    <div style="position: absolute; top: 50%; left: 8%; right: 8%; height: 2px; background-color: #EF4444; box-shadow: 0 0 8px #EF4444; transform: translateY(-50%); pointer-events: none; z-index: 10;"></div>
                </div>
                <div style="color: #94A3B8; font-size: 0.82rem; text-align: center;">Nur Strichcode anvisieren</div>
                <button id="scanner-schliessen" class="schaltflaeche-primaer" style="background: #DC3545; width: 100%;">Abbrechen</button>
            </div>
        `;
        document.body.appendChild(overlay);

        const videoElement = document.getElementById('scanner-video');
        let mediaStream = null;
        let scanIntervall = null;

        try {
            mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', advanced: [{ focusMode: 'continuous' }] }
            });
            videoElement.srcObject = mediaStream;

            const barcodeDetector = new BarcodeDetector({
                formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'itf', 'upc_a', 'upc_e']
            });

            scanIntervall = setInterval(async () => {
                try {
                    const barcodes = await barcodeDetector.detect(videoElement);
                    if (barcodes.length > 0) {
                        const erfassterCode = barcodes[0].rawValue.trim();
                        if (erfassterCode.length >= 8 && erfassterCode.length <= 25 && /^\d+$/.test(erfassterCode)) {
                            if (barcodeInput) {
                                barcodeInput.value = erfassterCode;
                                sucheBarcodeInDatenbank(erfassterCode);
                            }
                            scannerBeenden();
                        }
                    }
                } catch (err) {}
            }, 250);

        } catch (err) {
            alert('Kamerazugriff verweigert oder nicht verfügbar.');
            scannerBeenden();
        }

        document.getElementById('scanner-schliessen').addEventListener('click', scannerBeenden);

        function scannerBeenden() {
            if (scanIntervall) clearInterval(scanIntervall);
            if (mediaStream) mediaStream.getTracks().forEach(track => track.stop());
            if (overlay) overlay.remove();
        }
    }

    function istGueltigesKalenderdatum(tagStr, monatStr, jahrStr) {
        const tag = parseInt(tagStr, 10);
        const monat = parseInt(monatStr, 10);
        const jahr = parseInt(jahrStr, 10);

        if (monat < 1 || monat > 12 || tag < 1 || tag > 31) return false;

        const testDatum = new Date(jahr, monat - 1, tag);
        return (
            testDatum.getFullYear() === jahr &&
            testDatum.getMonth() === monat - 1 &&
            testDatum.getDate() === tag
        );
    }

    if (speichernButton) {
        speichernButton.addEventListener('click', async () => {
            if (!istAngemeldet()) {
                alert('Zugriff verweigert: Bitte zuerst anmelden.');
                return;
            }

            const barcode = barcodeInput ? barcodeInput.value.trim() : '';
            const artikelName = artikelNameInput ? artikelNameInput.value.trim() : '';
            const mhdRoh = mhdInput ? mhdInput.value.trim() : '';

            if (!barcode) {
                alert('Bitte zuerst einen Barcode scannen oder eingeben.');
                if (barcodeInput) barcodeInput.focus();
                return;
            }

            if (!artikelName) {
                alert('Bitte gib einen Artikelnamen ein.');
                if (artikelNameInput) artikelNameInput.focus();
                return;
            }

            if (!mhdRoh || mhdRoh.length < 8) {
                alert('Bitte gib ein gültiges MHD im Format TT.MM.JJ ein.');
                if (mhdInput) mhdInput.focus();
                return;
            }

            let mhdDatum = mhdRoh;
            if (mhdRoh.includes('.')) {
                const teile = mhdRoh.split('.');
                if (teile.length === 3) {
                    const tag = teile[0].padStart(2, '0');
                    const monat = teile[1].padStart(2, '0');
                    let jahr = teile[2];
                    if (jahr.length === 2) jahr = '20' + jahr;

                    if (!istGueltigesKalenderdatum(tag, monat, jahr)) {
                        alert(`Das Datum "${mhdRoh}" existiert nicht im Kalender. Bitte prüfe Tag und Monat!`);
                        if (mhdInput) mhdInput.focus();
                        return;
                    }

                    mhdDatum = `${jahr}-${monat}-${tag}`;
                }
            }

            if (!/^\d{4}-\d{2}-\d{2}$/.test(mhdDatum)) {
                alert('Ungültiges Datumsformat! Bitte im Format TT.MM.JJ eingeben.');
                return;
            }

            await datenInSupabaseSpeichern(barcode, artikelName, mhdDatum);
        });
    }

    async function datenInSupabaseSpeichern(barcode, artikelName, mhdDatum) {
        if (!istAngemeldet()) return;
        if (!window.supabaseVerbindung || !window.supabaseVerbindung.client) {
            alert('Datenbankverbindung nicht bereit.');
            return;
        }

        const gewaehlteKategorie = kategorieSelect ? kategorieSelect.value : 'Süßigkeiten';

        try {
            let { data: vorhandeneArtikel } = await window.supabaseVerbindung.client
                .from('artikel')
                .select('*')
                .eq('barcode', barcode);

            let artikelId;

            if (vorhandeneArtikel && vorhandeneArtikel.length > 0) {
                artikelId = vorhandeneArtikel[0].id;
                
                await window.supabaseVerbindung.client
                    .from('artikel')
                    .update({ artikelname: artikelName, kategorie: gewaehlteKategorie })
                    .eq('id', artikelId);
            } else {
                const { data: neuerArtikel, error: insertFehler } = await window.supabaseVerbindung.client
                    .from('artikel')
                    .insert([{ 
                        barcode: barcode, 
                        artikelname: artikelName, 
                        kategorie: gewaehlteKategorie 
                    }])
                    .select();

                if (insertFehler) throw insertFehler;
                artikelId = neuerArtikel[0].id;
            }

            await eintragInSupabaseSpeichern(artikelId, barcode, mhdDatum);

        } catch (err) {
            alert('Fehler beim Speichern des Artikels: ' + err.message);
        }
    }

    async function eintragInSupabaseSpeichern(artikelId, barcode, mhdDatum) {
        if (!istAngemeldet()) return;
        try {
            const lizenz = JSON.parse(sessionStorage.getItem('kik_app_lizenz'));
            const filialeId = lizenz.filiale_id || 'Zentrale';

            const { data: doppelteEintraege, error: pruefFehler } = await window.supabaseVerbindung.client
                .from('mhd_eintraege')
                .select('*')
                .eq('barcode', barcode)
                .eq('mhd_datum', mhdDatum)
                .eq('filiale_id', filialeId)
                .eq('status', 'aktiv');

            if (pruefFehler) throw pruefFehler;

            if (doppelteEintraege && doppelteEintraege.length > 0) {
                let deutschesDatum = mhdDatum;
                if (mhdDatum && mhdDatum.includes('-')) {
                    const teile = mhdDatum.split('-');
                    if (teile.length === 3) deutschesDatum = `${teile[2]}.${teile[1]}.${teile[0]}`;
                }
                alert(`⚠️ DOPPELTER EINTRAG!\n\nDieser Artikel mit dem MHD ${deutschesDatum} wurde in dieser Filiale bereits erfasst und ist aktiv.`);
                return;
            }

            const { error: mhdFehler } = await window.supabaseVerbindung.client
                .from('mhd_eintraege')
                .insert([{
                    artikel_id: artikelId,
                    barcode: barcode,
                    mhd_datum: mhdDatum,
                    status: 'aktiv',
                    filiale_id: filialeId
                }]);

            if (mhdFehler) throw mhdFehler;

            alert('✅ MHD-Eintrag erfolgreich gespeichert!');
            
            if (barcodeInput) barcodeInput.value = '';
            if (artikelNameInput) artikelNameInput.value = '';
            if (mhdInput) mhdInput.value = '';
            
            aktiveFilialArtikelLaden();

            if (typeof window.artikelLaden === 'function') {
                window.artikelLaden();
            }

        } catch (err) {
            alert('Fehler beim Speichern des MHD-Eintrags: ' + err.message);
        }
    }

    async function aktiveFilialArtikelLaden() {
        if (!aktiveArtikelBehaelter || !istAngemeldet() || !window.supabaseVerbindung) return;

        aktiveArtikelBehaelter.innerHTML = '<div style="padding: 12px; text-align: center; color: #6C757D;">Lade anstehende Filial-Artikel...</div>';

        try {
            const { data: eintraege, error } = await window.supabaseVerbindung.client
                .from('mhd_eintraege')
                .select('*, artikel(artikelname, kategorie)')
                .eq('status', 'aktiv');

            if (error) throw error;

            if (!eintraege || eintraege.length === 0) {
                aktiveArtikelBehaelter.innerHTML = '<div class="liste-karte" style="justify-content: center; color: #6C757D;">Keine Artikel im Reduzierungs-Zeitraum.</div>';
                return;
            }

            const heute = new Date();
            heute.setHours(0, 0, 0, 0);

            const relevanteEintraege = eintraege.filter(item => {
                if (!item.mhd_datum) return false;
                const mhdDatum = new Date(item.mhd_datum);
                const vorlaufDatum = new Date(mhdDatum);
                vorlaufDatum.setMonth(vorlaufDatum.getMonth() - 1);
                vorlaufDatum.setHours(0, 0, 0, 0);
                return heute >= vorlaufDatum;
            });

            if (relevanteEintraege.length === 0) {
                aktiveArtikelBehaelter.innerHTML = '<div class="liste-karte" style="justify-content: center; color: #6C757D;">Keine Artikel im Reduzierungs-Zeitraum (1 Monat Vorlauf).</div>';
                return;
            }

            aktiveArtikelBehaelter.innerHTML = '';
            relevanteEintrage.forEach(item => {
                const artikelName = item.artikel ? item.artikel.artikelname : `Barcode: ${item.barcode}`;
                
                let deutschesDatum = item.mhd_datum;
                if (item.mhd_datum && item.mhd_datum.includes('-')) {
                    const teile = item.mhd_datum.split('-');
                    if (teile.length === 3) deutschesDatum = `${teile[2]}.${teile[1]}.${teile[0]}`;
                }

                const element = document.createElement('div');
                element.className = 'liste-karte';
                element.style.cssText = 'flex-direction: column; align-items: stretch; gap: 8px;';

                element.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div class="liste-karte-titel">${artikelName}</div>
                        <span class="badge-status badge-aktiv" style="background: #FFF3CD; color: #856404;">MHD: ${deutschesDatum}</span>
                    </div>
                    <div style="display: flex; gap: 6px; margin-top: 4px;">
                        <button class="btn-aktions-bearbeiten btn-status-setzen" data-id="${item.id}" data-status="reduziert" style="flex: 1; background: #FFF3CD; color: #856404;">🏷️ Reduzieren</button>
                        <button class="btn-aktions-bearbeiten btn-status-setzen" data-id="${item.id}" data-status="verkauft" style="flex: 1; background: #D4EDDA; color: #155724;">✅ Verkauft</button>
                        <button class="btn-aktions-loeschen btn-status-setzen" data-id="${item.id}" data-status="entsorgt" style="flex: 1;">🗑️ Entsorgt</button>
                    </div>
                `;
                aktiveArtikelBehaelter.appendChild(element);
            });

            document.querySelectorAll('.btn-status-setzen').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    if (!istAngemeldet()) return;
                    const id = e.target.getAttribute('data-id');
                    const neuerStatus = e.target.getAttribute('data-status');

                    const { error: updateError } = await window.supabaseVerbindung.client
                        .from('mhd_eintraege')
                        .update({ status: neuerStatus })
                        .eq('id', id);

                    if (!updateError) {
                        aktiveFilialArtikelLaden();
                        if (typeof window.artikelLaden === 'function') {
                            window.artikelLaden();
                        }
                    }
                });
            });

        } catch (err) {
            aktiveArtikelBehaelter.innerHTML = '<div style="color: #DC3545; text-align: center;">Fehler beim Laden der Artikel.</div>';
        }
    }

    window.aktiveFilialArtikelLaden = aktiveFilialArtikelLaden;

    // AUTOMATISCHES NEULADEN BEI TAB-WECHSEL (Behebt das Problem, dass sich Ansichten nicht aktualisieren)
    document.querySelectorAll('.nav-schaltflaeche').forEach(btn => {
        btn.addEventListener('click', () => {
            setTimeout(() => {
                if (typeof aktiveFilialArtikelLaden === 'function') aktiveFilialArtikelLaden();
                if (typeof window.artikelLaden === 'function') window.artikelLaden();
            }, 100);
        });
    });

    if (istAngemeldet()) {
        aktiveFilialArtikelLaden();
    }
});