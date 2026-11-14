/* ==========================================================================
   APP-STEUERUNG (Navigation & Ansichten-Wechsel inkl. Session-Merker)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const navSchaltflaechen = document.querySelectorAll('.nav-schaltflaeche');
    const ansichten = document.querySelectorAll('.app-ansicht');

    // Funktion zum Umschalten der Ansichten
    function wechsleAnsicht(zielAnsichtId, speichereZustand = true) {
        navSchaltflaechen.forEach(btn => {
            if (btn.getAttribute('data-ziel') === zielAnsichtId) {
                btn.classList.add('aktiv');
            } else {
                btn.classList.remove('aktiv');
            }
        });

        ansichten.forEach(ansicht => {
            if (ansicht.id === zielAnsichtId) {
                ansicht.classList.remove('ausblenden');
                ansicht.classList.add('aktiv');
            } else {
                ansicht.classList.remove('aktiv');
                ansicht.classList.add('ausblenden');
            }
        });

        if (speichereZustand) {
            sessionStorage.setItem('kik_aktive_ansicht', zielAnsichtId);
        }
    }

    // Event-Listener für die untere Navigation
    navSchaltflaechen.forEach(schaltflaeche => {
        schaltflaeche.addEventListener('click', () => {
            const zielAnsichtId = schaltflaeche.getAttribute('data-ziel');
            wechsleAnsicht(zielAnsichtId, true);
        });
    });

    // Beim Laden prüfen, ob eine Ansicht im SessionStorage gemerkt wurde (auch bei Strg + F5 erhalten)
    const gemerkteAnsicht = sessionStorage.getItem('kik_aktive_ansicht');
    if (gemerkteAnsicht) {
        const zielBtn = document.querySelector(`[data-ziel="${gemerkteAnsicht}"]`);
        if (zielBtn && window.getComputedStyle(zielBtn).display !== 'none') {
            wechsleAnsicht(gemerkteAnsicht, false);
        }
    }

    console.log('MHD Scanner-App erfolgreich gestartet: Navigation aktiv.');
});