/* ==========================================================================
   BENUTZER-VERWALTUNG & ROLLENSYSTEM (SICHER OHNE ADMIN-FALLBACK)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const Rollen = {
        MASTER_ADMIN: 'Master-Admin',
        BEZIRKSLEITUNG: 'Bezirksleitung',
        TEAMLEITUNG: 'Teamleitung',
        MITARBEITER: 'Mitarbeiter'
    };

    // Kein harter Master-Admin-Fallback mehr! Standard ist null (nicht angemeldet).
    const gespeicherteSession = sessionStorage.getItem('kik_app_lizenz');
    let aktuellerBenutzer = gespeicherteSession ? JSON.parse(gespeicherteSession) : null;

    const benutzerNameAnzeige = document.getElementById('benutzer-name');

    function benutzerOberflaecheAktualisieren() {
        if (benutzerNameAnzeige) {
            if (aktuellerBenutzer) {
                benutzerNameAnzeige.textContent = `${aktuellerBenutzer.name} (${aktuellerBenutzer.rolle})`;
            } else {
                benutzerNameAnzeige.textContent = 'Nicht angemeldet';
            }
        }
    }

    window.hatBerechtigung = function(erforderlicheRolle) {
        const aktiv = window.aktuellerBenutzer || aktuellerBenutzer;
        if (!aktiv) return false;
        if (aktiv.rolle === Rollen.MASTER_ADMIN) return true;
        return aktiv.rolle === erforderlicheRolle;
    };

    window.aktuellerBenutzer = aktuellerBenutzer;
    benutzerOberflaecheAktualisieren();
});