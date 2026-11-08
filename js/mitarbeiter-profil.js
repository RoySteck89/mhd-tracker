/* ==========================================================================
   MITARBEITER-PROFIL & MONATS-STATISTIKEN (REINER NAME OHNE KLAMMERN)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
    const profilBehaelter = document.getElementById('behälter-mitarbeiter-statistik');

    if (!profilBehaelter) return;

    async function profilRendern() {
        profilBehaelter.innerHTML = '<div style="text-align: center; padding: 20px; color: #6C757D;">Lade Profildaten...</div>';

        // 1. Benutzerdaten aus localStorage abrufen
        const gespeicherteLizenz = localStorage.getItem('kik_app_lizenz');
        const benutzer = gespeicherteLizenz ? JSON.parse(gespeicherteLizenz) : (window.aktuellerBenutzer || {
            name: 'Roy Steck',
            rolle: 'Master-Admin',
            filiale_id: 'Zentrale',
            personalnummer: '---'
        });

        // Bereinige den Namen, falls noch Rollen-Zusätze in Klammern enthalten sind
        const reinerName = (benutzer.name || 'Benutzer').replace(/\s*\([^)]*\)/g, '').trim();

        let statistiken = {
            scansMonat: 0,
            reduzierungen: 0,
            zielstatusErfasst: 0,
            monatName: new Date().toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
        };

        // 2. Echtdaten aus Supabase abrufen, falls vorhanden
        if (window.supabaseVerbindung && window.supabaseVerbindung.client) {
            try {
                const { data: eintraege, error } = await window.supabaseVerbindung.client
                    .from('mhd_eintraege')
                    .select('*');

                if (!error && eintraege) {
                    statistiken.scansMonat = eintraege.length;
                    statistiken.reduzierungen = eintraege.filter(e => e.status === 'reduziert').length;
                    statistiken.zielstatusErfasst = eintraege.filter(e => e.status === 'verkauft' || e.status === 'entsorgt').length;
                }
            } catch (err) {
                console.error('Fehler beim Laden der Profil-Statistiken:', err);
            }
        }

        // 3. HTML-Struktur rendern (Name ohne Klammerzusatz)
        profilBehaelter.innerHTML = `
            <!-- Kopfkarte -->
            <div class="profil-kopfkarte">
                <div class="profil-avatar-kreis">👤</div>
                <div class="profil-name">${reinerName}</div>
                <div class="profil-rolle-badge">${benutzer.rolle}</div>
                <div style="font-size: 0.8rem; opacity: 0.85; margin-top: 2px;">Persönliche Erfolgsbilanz – ${statistiken.monatName}</div>
            </div>

            <!-- Statistik-Grid (2x2) -->
            <div class="profil-stats-grid">
                <div class="profil-stat-box">
                    <div class="profil-stat-wert">${statistiken.scansMonat}</div>
                    <div class="profil-stat-label">Scans Gesamt</div>
                </div>
                <div class="profil-stat-box">
                    <div class="profil-stat-wert gruen">${statistiken.reduzierungen}</div>
                    <div class="profil-stat-label">Reduziert ✓</div>
                </div>
            </div>

            <!-- Ablauftag-Pflege Box -->
            <div class="profil-stat-box" style="text-align: left;">
                <div class="profil-info-zeile" style="border: none; padding: 0;">
                    <span class="profil-info-label" style="font-size: 0.9rem; font-weight: 700; color: #212529;">Ablauftag-Pflege</span>
                    <span class="profil-stat-wert" style="font-size: 1.1rem; color: #0D6EFD;">${statistiken.zielstatusErfasst} Artikel</span>
                </div>
                <p style="font-size: 0.8rem; color: #6C757D; margin-top: 6px;">
                    Verkauf / Nicht verkauft erfolgreich am Stichtag verbucht.
                </p>
            </div>

            <!-- Detaillierte Stammdaten -->
            <div class="profil-info-liste">
                <div class="profil-info-zeile">
                    <span class="profil-info-label">Standort / Filiale</span>
                    <span class="profil-info-wert">${benutzer.filialname || benutzer.filiale_id || 'Zentrale'}</span>
                </div>
                <div class="profil-info-zeile">
                    <span class="profil-info-label">Personalnummer</span>
                    <span class="profil-info-wert">${benutzer.personalnummer || '---'}</span>
                </div>
                <div class="profil-info-zeile">
                    <span class="profil-info-label">Berechtigungsstufe</span>
                    <span class="profil-info-wert">${benutzer.rolle}</span>
                </div>
                <div class="profil-info-zeile">
                    <span class="profil-info-label">Aktivierungs-Key</span>
                    <span class="profil-info-wert" style="font-family: monospace; font-size: 0.8rem;">
                        ${benutzer.schluessel ? benutzer.schluessel.substring(0, 14) + '...' : 'Aktiv'}
                    </span>
                </div>
            </div>

            <!-- Profil-Aktionen -->
            <div class="profil-aktionen">
                <button id="schaltflaeche-app-abmelden" class="btn-profil-gefahr">
                    🚪 App auf diesem Gerät abmelden & zurücksetzen
                </button>
            </div>
        `;

        // Event-Listener für den Abmelden-Button
        const abmeldenBtn = document.getElementById('schaltflaeche-app-abmelden');
        if (abmeldenBtn) {
            abmeldenBtn.addEventListener('click', () => {
                if (confirm('Möchtest du dich wirklich abmelden? Die App wird dadurch in den Werkszustand (Aktivierungsmaske) zurückgesetzt.')) {
                    localStorage.removeItem('kik_app_lizenz');
                    location.reload();
                }
            });
        }
    }

    const profilTabBtn = document.querySelector('[data-ziel="ansicht-profil"]');
    if (profilTabBtn) {
        profilTabBtn.addEventListener('click', profilRendern);
    }

    profilRendern();
});