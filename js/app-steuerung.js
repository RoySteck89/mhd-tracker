/* ==========================================================================
   APP-STEUERUNG (Navigation & Ansichten-Wechsel inkl. Session-Schutz)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const navSchaltflaechen = document.querySelectorAll('.nav-schaltflaeche');
    const ansichten = document.querySelectorAll('.app-ansicht');

    function istAngemeldet() {
        const session = sessionStorage.getItem('kik_app_lizenz');
        if (!session) return false;
        try {
            const daten = JSON.parse(session);
            return Boolean(daten && daten.rolle);
        } catch (e) {
            return false;
        }
    }

    function wechsleAnsicht(zielAnsichtId, speichereZustand = true) {
        // SICHERHEITSSPERRE: Ohne aktive Session darf keine Ansicht geöffnet werden!
        if (!istAngemeldet()) {
            return;
        }

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
                ansicht.style.display = 'flex';
            } else {
                ansicht.classList.remove('aktiv');
                ansicht.classList.add('ausblenden');
                ansicht.style.display = 'none';
            }
        });

        if (speichereZustand) {
            sessionStorage.setItem('kik_aktive_ansicht', zielAnsichtId);
        }
    }

    navSchaltflaechen.forEach(schaltflaeche => {
        schaltflaeche.addEventListener('click', () => {
            if (!istAngemeldet()) return;
            const zielAnsichtId = schaltflaeche.getAttribute('data-ziel');
            wechsleAnsicht(zielAnsichtId, true);
        });
    });

    if (istAngemeldet()) {
        const gemerkteAnsicht = sessionStorage.getItem('kik_aktive_ansicht');
        if (gemerkteAnsicht) {
            const zielBtn = document.querySelector(`[data-ziel="${gemerkteAnsicht}"]`);
            if (zielBtn && window.getComputedStyle(zielBtn).display !== 'none') {
                wechsleAnsicht(gemerkteAnsicht, false);
            }
        }
    }
});