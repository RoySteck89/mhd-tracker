/* ==========================================================================
   APP-STEUERUNG (Navigation & Ansichten-Wechsel)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // Alle Navigations-Buttons und Ansichten abrufen
    const navSchaltflaechen = document.querySelectorAll('.nav-schaltflaeche');
    const ansichten = document.querySelectorAll('.app-ansicht');

    // Event-Listener für die untere Navigation hinterlegen
    navSchaltflaechen.forEach(schaltflaeche => {
        schaltflaeche.addEventListener('click', () => {
            const zielAnsichtId = schaltflaeche.getAttribute('data-ziel');

            // 1. Aktive Klassen von den Buttons umschalten
            navSchaltflaechen.forEach(btn => btn.classList.remove('aktiv'));
            schaltflaeche.classList.add('aktiv');

            // 2. Ansichten ein- oder ausblenden
            ansichten.forEach(ansicht => {
                if (ansicht.id === zielAnsichtId) {
                    ansicht.classList.remove('ausblenden');
                    ansicht.classList.add('aktiv');
                } else {
                    ansicht.classList.remove('aktiv');
                    ansicht.classList.add('ausblenden');
                }
            });
        });
    });

    console.log('MHD Scanner-App erfolgreich gestartet: Navigation aktiv.');
});