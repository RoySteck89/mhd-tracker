/* ==========================================================================
   SCANNER-, SPEICHER- & FILIAL-ARTIKEL-LOGIK (INKL. DUPLIKATS-PRÜFUNG)
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
                formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'itf', 'upc_a', 'upc_e', 'qr_code']
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

    // Professionelles, eigenes Modal statt des unschönen Browser-Prompts
    function zeigeEigenenPrompt(titel, nachricht, callback) {
        const altesOverlay = document.getElementById('custom-modal-overlay');
        if (altesOverlay) altesOverlay.remove();

        const overlay = document.createElement('div');
        overlay.id = 'custom-modal-overlay';
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.6); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box;';
        
        overlay.innerHTML = `
            <div style="background: #ffffff; width: 100%; max-width: 380px; padding: 24px; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.25); display: flex; flex-direction: column; gap: 14px;">
                <div style="font-weight: 700; font-size: 1.15rem; color: #003366;">${titel}</div>
                <div style="font-size: 0.95rem; color: #495057; line-height: 1.4;">${nachricht}</div>
                <input type="text" id="custom-modal-input" placeholder="Artikelbezeichnung eingeben..." style="width: 100%; padding: 12px; border: 1px solid #ced4da; border-radius: 8px; font-size: 1rem; box-sizing: border-box; outline: none; background: #f8f9fa;">
                <div style="display: flex; gap: 10px; margin-top: 6px;">
                    <button id="custom-modal-abbrechen" style="flex: 1; padding: 12px; background: #6c757d; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.95rem;">Abbrechen</button>
                    <button id="custom-modal-ok" style="flex: 1; padding: 12px; background: #28a745; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.95rem;">Speichern</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const input = document.getElementById('custom-modal-input');
        input.focus();

        document.getElementById('custom-modal-ok').onclick = () => {
            const wert = input.value.trim();
            overlay.remove();
            callback(wert);
        };

        document.getElementById('custom-modal-abbrechen').onclick = () => {
            overlay.remove();
            callback(null);
        };

        input.onkeydown = (e) => {
            if (e.key === 'Enter') {
                document.getElementById('custom-modal-ok').click();
            }
        };
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
                await eintragInSupabaseSpeichern(artikelId, barcode, mhdDatum);
            } else {
                zeigeEigenenPrompt(
                    "Neuer Artikel erkannt",
                    `Der Barcode <code style="font-family: monospace; background: #e9ecef; padding: 2px 4px; border-radius: 4px;">${barcode}</code> ist neu im System. Bitte gib eine Artikelbezeichnung ein:`,
                    async (artikelName) => {
                        if (!artikelName) return;

                        const { data: neuerArtikel, error: insertFehler } = await window.supabaseVerbindung.client
                            .from('artikel')
                            .insert([{ barcode: barcode, artikelname: artikelName }])
                            .select();

                        if (insertFehler) throw insertFehler;
                        artikelId = neuerArtikel[0].id;
                        await eintragInSupabaseSpeichern(artikelId, barcode, mhdDatum);
                    }
                );
            }
        } catch (err) {
            console.error('Fehler beim Prüfen des Artikels:', err.message);
            alert('Fehler beim Prüfen des Artikels: ' + err.message);
        }
    }

    async function eintragInSupabaseSpeichern(artikelId, barcode, mhdDatum) {
        try {
            const lizenz = JSON.parse(localStorage.getItem('kik_app_lizenz')) || {};
            const filialeId = lizenz.filiale_id || 'Zentrale';

            // Prüfung auf exaktes Duplikat (gleicher Barcode + gleiches MHD in derselben Filiale)
            const { data: doppelteEintraege, error: pruefFehler } = await window.supabaseVerbindung.client
                .from('mhd_eintraege')
                .select('*')
                .eq('barcode', barcode)
                .eq('mhd_datum', mhdDatum)
                .eq('filiale_id', filialeId)
                .eq('status', 'aktiv');

            if (!pruefFehler && doppelteEintraege && doppelteEintraege.length > 0) {
                let deutschesDatum = mhdDatum;
                if (mhdDatum && mhdDatum.includes('-')) {
                    const teile = mhdDatum.split('-');
                    if (teile.length === 3) {
                        deutschesDatum = `${teile[2]}.${teile[1]}.${teile[0]}`;
                    }
                }
                alert(`Artikel mit MHD ${deutschesDatum} ist bereits eingetragen.`);
                return; // Speichern abbrechen
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

            alert('MHD-Eintrag erfolgreich gespeichert!');
            if (barcodeInput) barcodeInput.value = '';
            aktiveFilialArtikelLaden();

        } catch (err) {
            console.error('Fehler beim Speichern:', err.message);
            alert('Fehler beim Speichern: ' + err.message);
        }
    }

    // Aktive Filial-Artikel laden (Genau 1 Monat Vorlauf & deutsches Datumsformat)
    async function aktiveFilialArtikelLaden() {
        if (!aktiveArtikelBehaelter || !window.supabaseVerbindung) return;

        aktiveArtikelBehaelter.innerHTML = '<div style="padding: 12px; text-align: center; color: #6C757D;">Lade anstehende Filial-Artikel...</div>';

        try {
            const { data: eintraege, error } = await window.supabaseVerbindung.client
                .from('mhd_eintraege')
                .select('*, artikel(artikelname)')
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
            relevanteEintraege.forEach(item => {
                const artikelName = item.artikel ? item.artikel.artikelname : `Barcode: ${item.barcode}`;
                
                let deutschesDatum = item.mhd_datum;
                if (item.mhd_datum && item.mhd_datum.includes('-')) {
                    const teile = item.mhd_datum.split('-');
                    if (teile.length === 3) {
                        deutschesDatum = `${teile[2]}.${teile[1]}.${teile[0]}`;
                    }
                }

                const element = document.createElement('div');
                element.className = 'liste-karte';
                element.style.flexDirection = 'column';
                element.style.alignItems = 'stretch';
                element.style.gap = '8px';

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

    aktiveFilialArtikelLaden();
    console.log('Scanner- & Mitarbeiter-Dashboard-Logik erfolgreich geladen.');
});