/* ==========================================================================
   THEME-SWITCHER (Farbauswahl-Logik für das Profil)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const themaSelect = document.getElementById('thema-auswahl');
    
    // Gespeichertes Thema beim Start der App laden
    const gespeichertesTheme = localStorage.getItem('kik_app_theme') || 'tuerkis';
    if (gespeichertesTheme && gespeichertesTheme !== 'tuerkis') {
        document.body.setAttribute('data-theme', gespeichertesTheme);
        if (themaSelect) themaSelect.value = gespeichertesTheme;
    } else {
        document.body.removeAttribute('data-theme');
        if (themaSelect) themaSelect.value = 'tuerkis';
    }

    // Event-Listener für das Dropdown im Profil
    if (themaSelect) {
        themaSelect.addEventListener('change', (e) => {
            const gewaehltesTheme = e.target.value;
            if (gewaehltesTheme === 'tuerkis') {
                document.body.removeAttribute('data-theme');
                localStorage.setItem('kik_app_theme', 'tuerkis');
            } else {
                document.body.setAttribute('data-theme', gewaehltesTheme);
                localStorage.setItem('kik_app_theme', gewaehltesTheme);
            }
        });
    }
});