/* ==========================================================================
   MINIMALISTISCHE ARTIKELLISTE & LIVE-SUCHE (Inkl. MHD-Aufklappfunktion)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const suchEingabe = document.getElementById('eingabe-artikel-suche');
    const ergebnisBehaelter = document.getElementById('behälter-such-ergebnisse');

    if (!suchEingabe || !ergebnisBehaelter) return;

    let alleArtikel = [];

    // Eigenes, professionelles Bestätigungs-Modal (ersetzt confirm())
    function zeigeEigenesBestätigungsModal(titel, nachricht, istGefahr, callback) {
        const altesOverlay = document.getElementById('custom-modal-overlay');
        if (altesOverlay) altesOverlay.remove();

        const overlay = document.createElement('div');
        overlay.id = 'custom-modal-overlay';
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.6); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box;';
        
        const buttonFarbe = istGefahr ? '#dc3545' : '#28a745';
        const buttonText = istGefahr ? 'Ja, löschen' : 'Bestätigen';

        overlay.innerHTML = `
            <div style="background: #ffffff; width: 100%; max-width: 380px; padding: 24px; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.25); display: flex; flex-direction: column; gap: 14px;">
                <div style="font-weight: 700; font-size: 1.15rem; color: #003366;">${titel}</div>
                <div style="font-size: 0.95rem; color: #495057; line-height: 1.4;">${nachricht}</div>
                <div style="display: flex; gap: 10px; margin-top: 6px;">
                    <button id="custom-modal-abbrechen" style="flex: 1; padding: 12px; background: #6c757d; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.95rem;">Abbrechen</button>
                    <button id="custom-modal-ok" style="flex: 1; padding: 12px; background: ${buttonFarbe}; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.95rem;">${buttonText}</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        document.getElementById('custom-modal-ok').onclick = () => {
            overlay.remove();
            callback(true);
        };

        document.getElementById('custom-modal-abbrechen').onclick = () => {
            overlay.remove();
            callback(false);
        };
    }

    // Eigenes Eingabe-Modal (für Bearbeiten)
    function zeigeEigenesEingabeModal(titel, vorabText, callback) {
        const altesOverlay = document.getElementById('custom-modal-overlay');
        if (altesOverlay) altesOverlay.remove();

        const overlay = document.createElement('div');
        overlay.id = 'custom-modal-overlay';
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.6); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box;';
        
        overlay.innerHTML = `
            <div style="background: #ffffff; width: 100%; max-width: 380px; padding: 24px; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.25); display: flex; flex-direction: column; gap: 14px;">
                <div style="font-weight: 700; font-size: 1.15rem; color: #003366;">${titel}</div>
                <input type="text" id="custom-modal-input" value="${vorabText}" style="width: 100%; padding: 12px; border: 1px solid #ced4da; border-radius: 8px; font-size: 1rem; box-sizing: border-box; outline: none; background: #f8f9fa;">
                <div style="display: flex; gap: 10px; margin-top: 6px;">
                    <button id="custom-modal-abbrechen" style="flex: 1; padding: 12px; background: #6c757d; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.95rem;">Abbrechen</button>
                    <button id="custom-modal-ok" style="flex: 1; padding: 12px; background: #28a745; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.95rem;">Speichern</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const input = document.getElementById('custom-modal-input');
        input.focus();
        input.select();

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

    // Artikel aus der Supabase-Datenbank laden
    async function artikelLaden() {
        if (!window.supabaseVerbindung) {
            console.error('Datenbank-Verbindung nicht verfügbar.');
            return;
        }

        ergebnisBehaelter.innerHTML = '<div style="padding: 16px; text-align: center; color: #6C757D;">Lade Artikel aus Datenbank...</div>';
        
        const daten = await window.supabaseVerbindung.datenAbrufen('artikel');
        
        alleArtikel = daten ? daten.sort((a, b) => 
            a.artikelname.localeCompare(b.artikelname, 'de', { sensitivity: 'base' })
        ) : [];
        
        listeAnzeigen(alleArtikel);
    }

    // Funktion zur Darstellung der Artikelliste mit Aufklapp-Logik
    function listeAnzeigen(artikelListe, suchBegriff = '') {
        ergebnisBehaelter.innerHTML = '';

        const zählerDiv = document.createElement('div');
        zählerDiv.style.cssText = 'font-size: 0.8rem; color: #6C757D; margin-bottom: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;';
        zählerDiv.textContent = `${artikelListe.length} Artikel gefunden`;
        ergebnisBehaelter.appendChild(zählerDiv);

        if (artikelListe.length === 0) {
            ergebnisBehaelter.innerHTML += `
                <div class="fallback-meldung" style="padding: 20px; text-align: center; background: #FFF3CD; border: 1px solid #FFEEBA; border-radius: 8px; color: #856404; margin-top: 8px;">
                    <p style="font-weight: 600; margin-bottom: 10px;">Artikel nicht gefunden („${suchBegriff}“).</p>
                    <p style="font-size: 0.9rem; margin-bottom: 15px;">Möchtest du ihn jetzt scannen und neu anlegen?</p>
                    <button id="schaltflaeche-jetzt-scannen" class="schaltflaeche-primaer" style="background-color: #28A745; min-height: 48px; font-size: 0.95rem;">
                        📷 Jetzt scannen
                    </button>
                </div>
            `;

            const scanBtn = document.getElementById('schaltflaeche-jetzt-scannen');
            if (scanBtn) {
                scanBtn.addEventListener('click', () => {
                    direktZumScannerWechseln(suchBegriff);
                });
            }
            return;
        }

        artikelListe.forEach(artikel => {
            const element = document.createElement('div');
            element.className = 'artikel-karte-wrapper';
            element.style.cssText = 'background: #FFFFFF; border: 1px solid #E9ECEF; border-radius: 8px; margin-bottom: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); overflow: hidden;';
            
            element.innerHTML = `
                <div class="artikel-kopf" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; cursor: pointer; user-select: none;">
                    <div style="display: flex; align-items: center; gap: 8px; flex: 1; padding-right: 10px;">
                        <span class="aufklapp-pfeil" style="font-size: 0.8rem; color: #6C757D; transition: transform 0.2s;">▶</span>
                        <span style="word-break: break-word; font-size: 1rem; font-weight: 500; color: #212529;">${artikel.artikelname}</span>
                    </div>
                    <div style="display: flex; gap: 6px; flex-shrink: 0;" onclick="event.stopPropagation()">
                        <button class="btn-artikel-bearbeiten" data-id="${artikel.id}" data-name="${artikel.artikelname}" style="background: #E9ECEF; border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 0.9rem;" title="Artikel bearbeiten">✏️</button>
                        <button class="btn-artikel-loeschen" data-id="${artikel.id}" data-name="${artikel.artikelname}" style="background: #F8D7DA; border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 0.9rem;" title="Artikel löschen">🗑️</button>
                    </div>
                </div>
                <div class="artikel-mhd-details ausblenden" style="padding: 12px 16px; border-top: 1px solid #F1F3F5; background: #F8F9FA;">
                    <div class="mhd-liste-inhalt" style="font-size: 0.88rem; color: #495057;">Lade erfasste MHDs...</div>
                </div>
            `;

            ergebnisBehaelter.appendChild(element);

            // Klick-Event zum Aufklappen der Karte
            const kopfBereich = element.querySelector('.artikel-kopf');
            const detailsBereich = element.querySelector('.artikel-mhd-details');
            const pfeilSpan = element.querySelector('.aufklapp-pfeil');
            const mhdInhaltContainer = element.querySelector('.mhd-liste-inhalt');

            let mhdBereitsGeladen = false;

            kopfBereich.addEventListener('click', async () => {
                const istAusgeblendet = detailsBereich.classList.contains('ausblenden');

                if (istAusgeblendet) {
                    detailsBereich.classList.remove('ausblenden');
                    pfeilSpan.style.transform = 'rotate(90deg)';

                    if (!mhdBereitsGeladen) {
                        mhdInhaltContainer.innerHTML = '<div style="color: #6C757D; font-style: italic;">Lade MHD-Einträge...</div>';
                        
                        try {
                            const { data: mhdEintraege, error } = await window.supabaseVerbindung.client
                                .from('mhd_eintraege')
                                .select('*')
                                .eq('artikel_id', artikel.id)
                                .order('mhd_datum', { ascending: true });

                            if (error) throw error;

                            if (!mhdEintraege || mhdEintraege.length === 0) {
                                mhdInhaltContainer.innerHTML = '<div style="color: #6C757D;">Keine MHD-Einträge für diesen Artikel erfasst.</div>';
                            } else {
                                mhdInhaltContainer.innerHTML = '';
                                const ul = document.createElement('div');
                                ul.style.cssText = 'display: flex; flex-direction: column; gap: 6px;';

                                mhdEintraege.forEach(eintrag => {
                                    // Deutsches Datumsformat (DD.MM.YYYY)
                                    let deutschesDatum = eintrag.mhd_datum;
                                    if (eintrag.mhd_datum && eintrag.mhd_datum.includes('-')) {
                                        const teile = eintrag.mhd_datum.split('-');
                                        if (teile.length === 3) {
                                            deutschesDatum = `${teile[2]}.${teile[1]}.${teile[0]}`;
                                        }
                                    }

                                    // Status-Badge Farben
                                    let badgeHintergrund = '#E2E8F0';
                                    let badgeTextFarbe = '#334155';
                                    if (eintrag.status === 'aktiv') { badgeHintergrund = '#FEF3C7'; badgeTextFarbe = '#92400E'; }
                                    else if (eintrag.status === 'reduziert') { badgeHintergrund = '#FFEDD5'; badgeTextFarbe = '#C2410C'; }
                                    else if (eintrag.status === 'verkauft') { badgeHintergrund = '#DCFCE7'; badgeTextFarbe = '#166534'; }
                                    else if (eintrag.status === 'entsorgt') { badgeHintergrund = '#FEE2E2'; badgeTextFarbe = '#991B1B'; }

                                    const eintragDiv = document.createElement('div');
                                    eintragDiv.style.cssText = 'display: flex; justify-content: space-between; align-items: center; background: #FFFFFF; padding: 8px 12px; border-radius: 6px; border: 1px solid #E2E8F0; font-size: 0.85rem;';
                                    
                                    // Hier wurde der Filial-Bezug (Filiale: ...) komplett entfernt:
                                    eintragDiv.innerHTML = `
                                        <div>
                                            <span>MHD: <strong>${deutschesDatum}</strong></span>
                                        </div>
                                        <span style="padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; background: ${badgeHintergrund}; color: ${badgeTextFarbe}; text-transform: uppercase;">${eintrag.status}</span>
                                    `;
                                    ul.appendChild(eintragDiv);
                                });
                                mhdInhaltContainer.appendChild(ul);
                            }
                            mhdBereitsGeladen = true;
                        } catch (err) {
                            console.error('Fehler beim Laden der MHDs:', err);
                            mhdInhaltContainer.innerHTML = '<div style="color: #DC3545;">Fehler beim Laden der MHD-Einträge.</div>';
                        }
                    }
                } else {
                    detailsBereich.classList.add('ausblenden');
                    pfeilSpan.style.transform = 'rotate(0deg)';
                }
            });
        });

        // Event-Listener für Bearbeiten
        document.querySelectorAll('.btn-artikel-bearbeiten').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                const alterName = e.target.getAttribute('data-name');
                
                zeigeEigenesEingabeModal("Artikel bearbeiten", alterName, async (neuerName) => {
                    if (!neuerName || neuerName === alterName) return;
                    try {
                        const { error } = await window.supabaseVerbindung.client
                            .from('artikel')
                            .update({ artikelname: neuerName })
                            .eq('id', id);

                        if (error) throw error;
                        artikelLaden();
                    } catch (err) {
                        alert('Fehler beim Aktualisieren: ' + err.message);
                    }
                });
            });
        });

        // Event-Listener für Löschen
        document.querySelectorAll('.btn-artikel-loeschen').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                const artikelName = e.target.getAttribute('data-name');
                
                zeigeEigenesBestätigungsModal(
                    "Artikel löschen",
                    `Soll der Artikel <strong>"${artikelName}"</strong> wirklich unwiderruflich aus der Datenbank gelöscht werden?`,
                    true,
                    async (bestätigt) => {
                        if (!bestätigt) return;
                        try {
                            const { error } = await window.supabaseVerbindung.client
                                .from('artikel')
                                .delete()
                                .eq('id', id);

                            if (error) throw error;
                            artikelLaden();
                        } catch (err) {
                            alert('Fehler beim Löschen (möglicherweise noch verknüpfte MHD-Einträge vorhanden): ' + err.message);
                        }
                    }
                );
            });
        });
    }

    suchEingabe.addEventListener('input', (e) => {
        const eingabeWert = e.target.value.trim().toLowerCase();

        if (eingabeWert === '') {
            listeAnzeigen(alleArtikel);
            return;
        }

        const gefiltert = alleArtikel.filter(artikel => 
            artikel.artikelname.toLowerCase().includes(eingabeWert)
        );

        listeAnzeigen(gefiltert, e.target.value.trim());
    });

    function direktZumScannerWechseln(unbekannterName) {
        const startTab = document.querySelector('[data-ziel="ansicht-startseite"]');
        if (startTab) startTab.click();
    }

    artikelLaden();
    console.log('Artikel-Suche erfolgreich initialisiert.');
});