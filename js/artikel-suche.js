/* ==========================================================================
   MINIMALISTISCHE ARTIKELLISTE & LIVE-SUCHE (Echte Supabase Anbindung)
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
        
        // Echte Abfrage über unser Verbindungs-Modul
        alleArtikel = await window.supabaseVerbindung.datenAbrufen('artikel');
        
        // Namensliste extrahieren (nur der reine Artikelname laut Konzept)
        const artikelNamen = alleArtikel.map(item => item.artikelname);
        
        listeAnzeigen(artikelNamen);
    }

    // Funktion zur Darstellung der Artikelliste
    function listeAnzeigen(artikelListe, suchBegriff = '') {
        ergebnisBehaelter.innerHTML = '';

        // Prüfen, ob Artikel gefunden wurden
        if (artikelListe.length === 0) {
            ergebnisBehaelter.innerHTML = `
                <div class="fallback-meldung" style="padding: 20px; text-align: center; background: #FFF3CD; border: 1px solid #FFEEBA; border-radius: 8px; color: #856404;">
                    <p style="font-weight: 600; margin-bottom: 10px;">Artikel nicht gefunden („${suchBegriff}“).</p>
                    <p style="font-size: 0.9rem; margin-bottom: 15px;">Möchtest du ihn jetzt scannen und neu anlegen?</p>
                    <button id="schaltflaeche-jetzt-scannen" class="schaltflaeche-primaer" style="background-color: #28A745; min-height: 48px; font-size: 0.95rem;">
                        📷 Jetzt scannen
                    </button>
                </div>
            `;

            // Event-Listener für den "Jetzt scannen"-Fallback-Button
            document.getElementById('schaltflaeche-jetzt-scannen').addEventListener('click', () => {
                direktZumScannerWechseln(suchBegriff);
            });
            return;
        }

        // Treffer als minimalistische Namensliste anzeigen
        artikelListe.forEach(artikelName => {
            const element = document.createElement('div');
            element.className = 'artikel-name-eintrag';
            element.style.cssText = 'padding: 12px 16px; background: #FFFFFF; border-bottom: 1px solid #E9ECEF; font-size: 1rem; font-weight: 500; border-radius: 6px; margin-bottom: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);';
            element.textContent = artikelName;
            ergebnisBehaelter.appendChild(element);
        });
    }

    // Live-Suche ab dem ersten eingegebenen Buchstaben
    suchEingabe.addEventListener('input', (e) => {
        const eingabeWert = e.target.value.trim().toLowerCase();
        const artikelNamen = alleArtikel.map(item => item.artikelname);

        if (eingabeWert === '') {
            listeAnzeigen(artikelNamen);
            return;
        }

        // Filterung nach Text
        const gefiltert = artikelNamen.filter(artikel => 
            artikel.toLowerCase().includes(eingabeWert)
        );

        listeAnzeigen(gefiltert, e.target.value.trim());
    });

    // Hilfsfunktion: Sprung zum Barcode-Scanner bei unbekanntem Artikel
    function direktZumScannerWechseln(unbekannterName) {
        console.log(`Wechsle zum Scanner für neuen Artikel: "${unbekannterName}"`);
        
        // Simuliert den Klick auf den Startseiten-Tab und öffnet den Scanner
        const startTab = document.querySelector('[data-ziel="ansicht-startseite"]');
        if (startTab) startTab.click();
        
        alert(`Scanner wird geöffnet für Neuanlage: "${unbekannterName}"`);
    }

    // Initial beim Laden der Ansicht die Artikel aus Supabase holen
    artikelLaden();

    console.log('Artikel-Suche mit Supabase-Anbindung erfolgreich initialisiert.');
});