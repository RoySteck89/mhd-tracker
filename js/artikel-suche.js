/* ==========================================================================
   MINIMALISTISCHE ARTIKELLISTE & LIVE-SUCHE (Alphabetisch, mit eigenen Modals)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const suchEingabe = document.getElementById('eingabe-artikel-suche');
    const ergebnisBehaelter = document.getElementById('behälter-such-ergebnisse');

    if (!suchEingabe || !ergebnisBehaelter) return;

    let alleArtikel = [];

    // Eigenes, professionelles Bestätigungs-Modal (ersetzt hässliches confirm())
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

    // Funktion zur Darstellung der Artikelliste
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
            element.className = 'artikel-name-eintrag';
            element.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #FFFFFF; border: 1px solid #E9ECEF; font-size: 1rem; font-weight: 500; border-radius: 8px; margin-bottom: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);';
            
            element.innerHTML = `
                <span style="word-break: break-word; flex: 1; padding-right: 10px;">${artikel.artikelname}</span>
                <div style="display: flex; gap: 6px; flex-shrink: 0;">
                    <button class="btn-artikel-bearbeiten" data-id="${artikel.id}" data-name="${artikel.artikelname}" style="background: #E9ECEF; border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 0.9rem;" title="Artikel bearbeiten">✏️</button>
                    <button class="btn-artikel-loeschen" data-id="${artikel.id}" data-name="${artikel.artikelname}" style="background: #F8D7DA; border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 0.9rem;" title="Artikel löschen">🗑️</button>
                </div>
            `;
            ergebnisBehaelter.appendChild(element);
        });

        // Event-Listener für Bearbeiten (mit eigenem Eingabe-Modal)
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

        // Event-Listener für Löschen (mit eigenem Sicherheits-Modal)
        document.querySelectorAll('.btn-artikel-loeschen').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                const artikelName = e.target.getAttribute('data-name');
                
                zeigeEigenesBestätigungsModal(
                    "Artikel löschen",
                    `Soll der Artikel <strong>"${artikelName}"</strong> wirklich unwiderruflich aus der Datenbank gelöscht werden?`,
                    true, // true = Roter Gefahren-Button
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
                            alert('Fehler beim Löschen (möglicherweise noch verknüpfte Einträge vorhanden): ' + err.message);
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
    console.log('Artikel-Suche (Alphabetisch, mit eigenen Modals) erfolgreich initialisiert.');
});