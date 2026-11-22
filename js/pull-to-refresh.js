/* ==========================================================================
   PULL-TO-REFRESH LOGIK FÜR MOBILE GERÄTE
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    let touchStartY = 0;
    let istAmAnfang = false;
    const ladeIndikatorHöhe = 60;

    // Erstelle einen kleinen visuellen Lade-Indikator oben im Body
    const ladeIndikator = document.createElement('div');
    ladeIndikator.id = 'pull-to-refresh-indicator';
    ladeIndikator.style.cssText = `
        position: fixed;
        top: -60px;
        left: 0;
        width: 100%;
        height: 60px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #0D9488;
        color: white;
        font-weight: 600;
        font-size: 0.9rem;
        z-index: 99999;
        transition: transform 0.2s ease;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    `;
    ladeIndikator.innerHTML = '🔄 Aktualisiere Ansicht...';
    document.body.prepend(ladeIndikator);

    window.addEventListener('touchstart', (e) => {
        // Prüfen, ob der Nutzer ganz oben auf der Seite ist
        if (window.scrollY === 0) {
            touchStartY = e.touches[0].clientY;
            istAmAnfang = true;
        } else {
            istAmAnfang = false;
        }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
        if (!istAmAnfang) return;
        const currentY = e.touches[0].clientY;
        const diff = currentY - touchStartY;

        // Wenn der Nutzer nach unten zieht und ganz oben steht
        if (diff > 80 && window.scrollY === 0) {
            ladeIndikator.style.transform = `translateY(${ladeIndikatorHöhe}px)`;
        }
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
        if (!istAmAnfang) return;
        const touchEndY = e.changedTouches[0].clientY;
        const diff = touchEndY - touchStartY;

        // Wenn weit genug nach unten gezogen wurde, Ladevorgang starten
        if (diff > 100 && window.scrollY === 0) {
            ladeIndikator.style.transform = `translateY(${ladeIndikatorHöhe}px)`;
            
            // Ermitteln, welche Ansicht aktuell aktiv ist
            const aktiveAnsicht = document.querySelector('.app-ansicht:not(.ausblenden)');
            const aktiveAnsichtId = aktiveAnsicht ? aktiveAnsicht.id : 'ansicht-startseite';
            
            // Ansicht in sessionStorage speichern, damit sie nach dem Reload exakt erhalten bleibt
            sessionStorage.setItem('kik_aktive_ansicht', aktiveAnsichtId);

            // Kurze Pause für die Animation, dann Seite neu laden
            setTimeout(() => {
                location.reload();
            }, 400);
        } else {
            // Indikator wieder verstecken, wenn nicht weit genug gezogen wurde
            ladeIndikator.style.transform = 'translateY(0)';
        }
        istAmAnfang = false;
    });
});