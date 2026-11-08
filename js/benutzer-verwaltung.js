/* ==========================================================================
   BENUTZER-VERWALTUNG & ROLLENSYSTEM
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // Definierte Benutzerrollen im System
    const Rollen = {
        MASTER_ADMIN: 'Master-Admin',
        BEZIRKSLEITUNG: 'Bezirksleitung',
        TEAMLEITUNG: 'Teamleitung',
        MITARBEITER: 'Mitarbeiter'
    };

    // Standardmäßig angemeldeter Benutzer (Beispiel-Zustand vor Supabase-Login)
    let aktuellerBenutzer = {
        name: 'Roy Steck',
        rolle: Rollen.MASTER_ADMIN,
        filialeId: 'FIL-1042'
    };

    // DOM-Elemente für Benutzer-Anzeige
    const benutzerNameAnzeige = document.getElementById('benutzer-name');

    // Benutzer-Informationen in der Kopfzeile aktualisieren
    function benutzerOberflaecheAktualisieren() {
        if (benutzerNameAnzeige) {
            benutzerNameAnzeige.textContent = `${aktuellerBenutzer.name} (${aktuellerBenutzer.rolle})`;
        }
    }

    // Master-Admin View-Switcher (Ermöglicht das Testen anderer Rollen-Ansichten)
    function rolleWechseln(neueRolle) {
        if (aktuellerBenutzer.rolle !== Rollen.MASTER_ADMIN && neueRolle !== aktuellerBenutzer.rolle) {
            console.warn('Rollenwechsel nur für Master-Admin gestattet.');
            return;
        }

        console.log(`Rolle temporär gewechselt auf: ${neueRolle}`);
        aktuellerBenutzer.aktiveSimulierteRolle = neueRolle;
        benutzerOberflaecheAktualisieren();
    }

    // Globale Berechtigungsprüfung
    window.hatBerechtigung = function(erforderlicheRolle) {
        // Master-Admin darf grundsätzlich alles
        if (aktuellerBenutzer.rolle === Rollen.MASTER_ADMIN) return true;
        return aktuellerBenutzer.rolle === erforderlicheRolle;
    };

    // Aktuellen Benutzer für andere Skripte global bereitstellen
    window.aktuellerBenutzer = aktuellerBenutzer;

    // Initialisierung
    benutzerOberflaecheAktualisieren();
    console.log('Benutzer-Verwaltung erfolgreich geladen.');
});