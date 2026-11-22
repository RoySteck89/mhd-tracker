/* ==========================================================================
   PULL-TO-REFRESH LOGIK (LÄDT NUR DIE DATEN NEU, STATT DIE GANZE SEITE ZU RESETTEN)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    let touchStartY = 0;
    let touchStartX = 0;
    let istAmAnfang = false;
    const ladeIndikatorHöhe = 60;

    // Lade-Indikator oben erstellen
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
        transition: transform 0.25s ease;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    `;
    ladeIndikator.innerHTML = '🔄 Aktualisiere Daten...';
    document.body.prepend(ladeIndikator);

    window.addEventListener('touchstart', (e) => {
        if (window.scrollY <= 0) {
            touchStartY = e.touches[0].clientY;
            touchStartX = e.touches[0].clientX;
            istAmAnfang = true;
        } else {
            istAmAnfang = false;
        }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
        if (!istAmAnfang) return;
        const currentY = e.touches[0].clientY;
        const currentX = e.touches[0].clientX;
        const diffY = currentY - touchStartY;
        const diffX = Math.abs(currentX - touchStartX);

        // Erst ab einer echten vertikalen Abwärtsbewegung anzeigen
        if (diffY > 50 && diffY > diffX * 1.5 && window.scrollY <= 0) {
            const offset = Math.min(diffY / 2.5, ladeIndikatorHöhe);
            ladeIndikator.style.transform = `translateY(${offset}px)`;
        }
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
        if (!istAmAnfang) return;
        const touchEndY = e.changedTouches[0].clientY;
        const diffY = touchEndY - touchStartY;

        // Hoher Schwellenwert (160px), damit es beim normalen Scrollen nicht auslöst
        if (diffY > 160 && window.scrollY <= 0) {
            ladeIndikator.style.transform = `translateY(${ladeIndikatorHöhe}px)`;
            
            // Finde heraus, welche Ansicht gerade aktiv ist, und lade nur deren Daten neu
            const aktiveAnsicht = document.querySelector('.app-ansicht:not(.ausblenden)');
            
            if (aktiveAnsicht) {
                if (aktiveAnsicht.id === 'ansicht-suche' && typeof window.artikelLaden === 'function') {
                    window.artikelLaden();
                } else if (aktiveAnsicht.id === 'ansicht-startseite' && typeof window.aktiveFilialArtikelLaden === 'function') {
                    window.aktiveFilialArtikelLaden();
                } else {
                    // Fallback
                    location.reload();
                }
            }

            // Indikator nach kurzer Zeit wieder nach oben verstecken
            setTimeout(() => {
                ladeIndikator.style.transform = 'translateY(0)';
            }, 800);
        } else {
            ladeIndikator.style.transform = 'translateY(0)';
        }
        istAmAnfang = false;
    });
});