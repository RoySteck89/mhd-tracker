/* ==========================================================================
   MITARBEITER-PROFIL & MONATS-STATISTIKEN (Übersichtlich & Modern)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
    const profilBehaelter = document.getElementById('behälter-mitarbeiter-statistik');

    if (!profilBehaelter) return;

    async function profilRendern() {
        profilBehaelter.innerHTML = '<div class="lade-text">Lade Profildaten...</div>';

        // 1. Benutzerdaten aus localStorage abrufen
        const gespeicherteLizenz = localStorage.getItem('kik_app_lizenz');
        const benutzer = gespeicherteLizenz ? JSON.parse(gespeicherteLizenz) : (window.aktuellerBenutzer || {
            name: 'Roy Steck',
            rolle: 'Master-Admin',
            filiale_id: 'Zentrale',
            personalnummer: '---'
        });

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

        // 3. Strukturierte, moderne HTML-Ausgabe mit Design-Klassen statt harten Farben
        profilBehaelter.innerHTML = `
            <!-- Kopfkarte -->
            <div class="profil-kopfkarte">
                <div class="profil-avatar-kreis">👤</div>
                <div class="profil-name">${reinerName}</div>
                <div class="profil-rolle-badge">${benutzer.rolle}</div>
                <div style="font-size: 0.8rem; opacity: 0.85; margin-top: 2px;">Persönliche Erfolgsbilanz – ${statistiken.monatName}</div>
            </div>

            <!-- Statistik-Grid (2 Spalten) -->
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
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <span style="font-size: 0.9rem; font-weight: 700;" class="profil-text-titel">Ablauftag-Pflege</span>
                    <span style="font-size: 1rem; font-weight: 700;" class="profil-text-highlight">${statistiken.zielstatusErfasst} Artikel</span>
                </div>
                <p style="font-size: 0.78rem; line-height: 1.3;" class="profil-text-sub">
                    Verkauf / Nicht verkauft erfolgreich am Stichtag verbucht.
                </p>
            </div>

            <!-- Detaillierte Stammdaten als Karte -->
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

            <!-- Profil-Aktionen (Schichtwechsel) -->
            <div class="profil-aktionen">
                <button id="schaltflaeche-app-abmelden" class="btn-profil-gefahr">
                    🔒 Vom Gerät abmelden (Schichtwechsel)
                </button>
            </div>
        `;

        // Event-Listener für den Abmelden-Button
        const abmeldenBtn = document.getElementById('schaltflaeche-app-abmelden');
        if (abmeldenBtn) {
            abmeldenBtn.addEventListener('click', () => {
                if (confirm('Möchtest du dich von diesem Gerät abmelden? Der nächste Mitarbeiter kann sich direkt per Personalnummer & PIN anmelden.')) {
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