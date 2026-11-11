/* ==========================================================================
   MINIMALISTISCHE ARTIKELLISTE & LIVE-SUCHE (Alphabetisch, mit Zähler & Aktionen)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const suchEingabe = document.getElementById('eingabe-artikel-suche');
    const ergebnisBehaelter = document.getElementById('behälter-such-ergebnisse');

    if (!suchEingabe || !ergebnisBehaelter) return;

    let alleArtikel = [];

    // Artikel aus der Supabase-Datenbank laden
    async function artikelLaden() {
        if (!window.supabaseVerbindung) {
            console.error('Datenbank-Verbindung nicht verfügbar.');
            return;
        }

        ergebnisBehaelter.innerHTML = '<div style="padding: 16px; text-align: center; color: #6C757D;">Lade Artikel aus Datenbank...</div>';
        
        const daten = await window.supabaseVerbindung.datenAbrufen('artikel');
        
        // AUTOMATISCH ALPHABETISCH SORTIEREN (A bis Z)
        alleArtikel = daten ? daten.sort((a, b) => 
            a.artikelname.localeCompare(b.artikelname, 'de', { sensitivity: 'base' })
        ) : [];
        
        listeAnzeigen(alleArtikel);
    }

    // Funktion zur Darstellung der Artikelliste
    function listeAnzeigen(artikelListe, suchBegriff = '') {
        ergebnisBehaelter.innerHTML = '';

        // Treffer-Zähler oben anzeigen
        const zählerDiv = document.createElement('div');
        zählerDiv.style.cssText = 'font-size: 0.8rem; color: #6C757D; margin-bottom: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;';
        zählerDiv.textContent = `${artikelListe.length} Artikel gefunden`;
        ergebnisBehaelter.appendChild(zählerDiv);

        // Prüfen, ob Artikel gefunden wurden
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

        // Artikel als sortierte Liste anzeigen (ohne Barcode-Anzeige)
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

        // Event-Listener für Bearbeiten
        document.querySelectorAll('.btn-artikel-bearbeiten').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                const alterName = e.target.getAttribute('data-name');
                
                const neuerName = prompt('Artikelbezeichnung bearbeiten:', alterName);
                if (neuerName && neuerName.trim() !== '' && neuerName !== alterName) {
                    try {
                        const { error } = await window.supabaseVerbindung.client
                            .from('artikel')
                            .update({ artikelname: neuerName.trim() })
                            .eq('id', id);

                        if (error) throw error;
                        alert('Artikel erfolgreich aktualisiert!');
                        artikelLaden();
                    } catch (err) {
                        alert('Fehler beim Aktualisieren: ' + err.message);
                    }
                }
            });
        });

        // Event-Listener für Löschen
        document.querySelectorAll('.btn-artikel-loeschen').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                const artikelName = e.target.getAttribute('data-name');
                
                if (confirm(`Soll der Artikel "${artikelName}" wirklich unwiderruflich aus der Datenbank gelöscht werden?`)) {
                    try {
                        const { error } = await window.supabaseVerbindung.client
                            .from('artikel')
                            .delete()
                            .eq('id', id);

                        if (error) throw error;
                        alert(`Artikel "${artikelName}" wurde gelöscht.`);
                        artikelLaden();
                    } catch (err) {
                        alert('Fehler beim Löschen: ' + err.message);
                    }
                }
            });
        });
    }

    // Live-Suche (filtert und behält die alphabetische Ordnung bei)
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
    console.log('Artikel-Suche (Alphabetisch, ohne Barcode) erfolgreich initialisiert.');
});