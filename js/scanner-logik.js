/* ==========================================================================
   SCANNER-, SPEICHER- & FILIAL-ARTIKEL-LOGIK (SAUBER GETRENNT VON CSS)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const barcodeInput = document.getElementById('eingabe-barcode');
    const mhdInput = document.getElementById('eingabe-mhd');
    const speichernButton = document.getElementById('schaltflaeche-mhd-speichern');
    const scanButton = document.getElementById('schaltflaeche-scannen');
    const aktiveArtikelBehaelter = document.getElementById('behälter-aktive-artikel');

    // Heutiges Datum als Standard setzen
    if (mhdInput) {
        mhdInput.value = new Date().toISOString().split('T')[0];
    }

    // Echten Kamera-Scanner öffnen
    if (scanButton) {
        scanButton.addEventListener('click', () => {
            kameraScannerOeffnen();
        });
    }

    async function kameraScannerOeffnen() {
        if (!('BarcodeDetector' in window)) {
            const manuellerCode = prompt('Dein Browser unterstützt keinen direkten Kamera-Scan. Bitte Barcode manuell eingeben:');
            if (manuellerCode && barcodeInput) {
                barcodeInput.value = manuellerCode.trim();
            }
            return;
        }

        const overlay = document.createElement('div');
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.9); z-index: 9999; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px;';
        overlay.innerHTML = `
            <div style="width: 100%; max-width: 400px; display: flex; flex-direction: column; gap: 12px; align-items: center;">
                <div style="color: white; font-weight: 600; font-size: 1.1rem; margin-bottom: 8px;">Kamera auf Barcode richten</div>
                <video id="scanner-video" autoplay playsinline style="width: 100%; max-height: 350px; border-radius: 12px; object-fit: cover; background: #000;"></video>
                <button id="scanner-schliessen" class="schaltflaeche-primaer" style="background: #DC3545;">Abbrechen</button>
            </div>
        `;
        document.body.appendChild(overlay);

        const videoElement = document.getElementById('scanner-video');
        let mediaStream = null;
        let scanIntervall = null;

        try {
            mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            videoElement.srcObject = mediaStream;

            const barcodeDetector = new BarcodeDetector({
                formats: ['ean_13', 'ean_8', 'code_128', 'upc_a', 'qr_code']
            });

            scanIntervall = setInterval(async () => {
                try {
                    const barcodes = await barcodeDetector.detect(videoElement);
                    if (barcodes.length > 0) {
                        const erfassterCode = barcodes[0].rawValue;
                        if (barcodeInput) barcodeInput.value = erfassterCode;
                        scannerBeenden();
                    }
                } catch (err) {}
            }, 300);

        } catch (err) {
            console.error('Kamera konnte nicht gestartet werden:', err);
            alert('Kamerazugriff verweigert oder nicht verfügbar.');
            scannerBeenden();
        }

        document.getElementById('scanner-schliessen').addEventListener('click', scannerBeenden);

        function scannerBeenden() {
            if (scanIntervall) clearInterval(scanIntervall);
            if (mediaStream) {
                mediaStream.getTracks().forEach(track => track.stop());
            }
            if (overlay) overlay.remove();
        }
    }

    // MHD-Eintrag speichern
    if (speichernButton) {
        speichernButton.addEventListener('click', async () => {
            const barcode = barcodeInput ? barcodeInput.value.trim() : '';
            const mhdDatum = mhdInput ? mhdInput.value : '';

            if (!barcode) {
                alert('Bitte zuerst einen Barcode scannen oder eingeben.');
                return;
            }

            if (!mhdDatum) {
                alert('Bitte wähle ein gültiges MHD aus.');
                return;
            }

            await datenInSupabaseSpeichern(barcode, mhdDatum);
        });
    }

    async function datenInSupabaseSpeichern(barcode, mhdDatum) {
        if (!window.supabaseVerbindung || !window.supabaseVerbindung.client) {
            alert('Datenbankverbindung nicht bereit.');
            return;
        }

        try {
            let { data: vorhandeneArtikel } = await window.supabaseVerbindung.client
                .from('artikel')
                .select('*')
                .eq('barcode', barcode);

            let artikelId;

            if (vorhandeneArtikel && vorhandeneArtikel.length > 0) {
                artikelId = vorhandeneArtikel[0].id;
            } else {
                const artikelName = prompt(`Barcode "${barcode}" ist neu. Bitte Artikelbezeichnung eingeben:`, `Artikel ${barcode}`);
                if (!artikelName) return;

                const { data: neuerArtikel, error: insertFehler } = await window.supabaseVerbindung.client
                    .from('artikel')
                    .insert([{ barcode: barcode, artikelname: artikelName }])
                    .select();

                if (insertFehler) throw insertFehler;
                artikelId = neuerArtikel[0].id;
            }

            const lizenz = JSON.parse(localStorage.getItem('kik_app_lizenz')) || {};
            const filialeId = lizenz.filiale_id || 'Zentrale';

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

            alert('MHD-Eintrag erfolgreich gespeichert!');
            if (barcodeInput) barcodeInput.value = '';
            aktiveFilialArtikelLaden();

        } catch (err) {
            console.error('Fehler beim Speichern:', err.message);
            alert('Fehler beim Speichern: ' + err.message);
        }
    }

    // Aktive Filial-Artikel laden & direkt im Dashboard bearbeiten/reduzieren
    async function aktiveFilialArtikelLaden() {
        if (!aktiveArtikelBehaelter || !window.supabaseVerbindung) return;

        aktiveArtikelBehaelter.innerHTML = '<div style="padding: 12px; text-align: center; color: #6C757D;">Lade aktive Filial-Artikel...</div>';

        try {
            const { data: eintraege, error } = await window.supabaseVerbindung.client
                .from('mhd_eintraege')
                .select('*, artikel(artikelname)')
                .eq('status', 'aktiv');

            if (error) throw error;

            if (!eintraege || eintraege.length === 0) {
                aktiveArtikelBehaelter.innerHTML = '<div class="liste-karte" style="justify-content: center; color: #6C757D;">Keine aktiven MHD-Artikel in dieser Filiale.</div>';
                return;
            }

            aktiveArtikelBehaelter.innerHTML = '';
            eintraege.forEach(item => {
                const artikelName = item.artikel ? item.artikel.artikelname : `Barcode: ${item.barcode}`;
                
                const element = document.createElement('div');
                element.className = 'liste-karte';
                element.style.flexDirection = 'column';
                element.style.alignItems = 'stretch';
                element.style.gap = '8px';

                element.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div class="liste-karte-titel">${artikelName}</div>
                        <span class="badge-status badge-aktiv">MHD: ${item.mhd_datum}</span>
                    </div>
                    <div style="display: flex; gap: 6px; margin-top: 4px;">
                        <button class="btn-aktions-bearbeiten btn-status-setzen" data-id="${item.id}" data-status="reduziert" style="flex: 1; background: #FFF3CD; color: #856404;">🏷️ Reduzieren</button>
                        <button class="btn-aktions-bearbeiten btn-status-setzen" data-id="${item.id}" data-status="verkauft" style="flex: 1; background: #D4EDDA; color: #155724;">✅ Verkauft</button>
                        <button class="btn-aktions-loeschen btn-status-setzen" data-id="${item.id}" data-status="entsorgt" style="flex: 1;">🗑️ Entsorgt</button>
                    </div>
                `;
                aktiveArtikelBehaelter.appendChild(element);
            });

            // Status-Änderungs-Listener
            document.querySelectorAll('.btn-status-setzen').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.target.getAttribute('data-id');
                    const neuerStatus = e.target.getAttribute('data-status');

                    const { error: updateError } = await window.supabaseVerbindung.client
                        .from('mhd_eintraege')
                        .update({ status: neuerStatus })
                        .eq('id', id);

                    if (!updateError) {
                        aktiveFilialArtikelLaden();
                    } else {
                        alert('Fehler beim Aktualisieren: ' + updateError.message);
                    }
                });
            });

        } catch (err) {
            console.error('Fehler beim Laden der aktiven Artikel:', err);
            aktiveArtikelBehaelter.innerHTML = '<div style="color: #DC3545; text-align: center;">Fehler beim Laden der Artikel.</div>';
        }
    }

    // Beim Start laden
    aktiveFilialArtikelLaden();
    console.log('Scanner- & Mitarbeiter-Dashboard-Logik erfolgreich geladen.');
});