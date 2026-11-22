/* ==========================================================================
   MODERNES & COOLERES MITARBEITER-PROFIL & MONATS-STATISTIKEN
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
    const profilBehaelter = document.getElementById('behälter-mitarbeiter-statistik');

    if (!profilBehaelter) return;

    async function profilRendern() {
        profilBehaelter.innerHTML = '<div class="lade-text" style="text-align: center; padding: 40px; color: #6C757D;">Lade Profildaten...</div>';

        const gespeicherteLizenz = sessionStorage.getItem('kik_app_lizenz');
        if (!gespeicherteLizenz) {
            profilBehaelter.innerHTML = '<div class="lade-text">Bitte zuerst anmelden.</div>';
            return;
        }

        const benutzer = JSON.parse(gespeicherteLizenz);
        const reinerName = (benutzer.name || 'Benutzer').replace(/\s*\([^)]*\)/g, '').trim();

        let statistiken = {
            scansMonat: 0,
            reduzierungen: 0,
            zielstatusErfasst: 0,
            monatName: new Date().toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
        };

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

        // Berechne ein kleines "Level" basierend auf den Scans
        let levelTitel = 'Scanner-Einsteiger 🥉';
        let fortschrittProzent = Math.min((statistiken.scansMonat / 50) * 100, 100);
        if (statistiken.scansMonat >= 20) {
            levelTitel = 'MHD-Profi 🥈';
            fortschrittProzent = Math.min(((statistiken.scansMonat - 20) / 50) * 100, 100);
        }
        if (statistiken.scansMonat >= 50) {
            levelTitel = 'Master-Checker 🥇';
            fortschrittProzent = 100;
        }

        profilBehaelter.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 16px; padding: 4px 0 24px 0;">
                
                <!-- KOPFKARTE MIT MODERNEM GRADIENT & GLOW -->
                <div style="background: linear-gradient(135deg, #0F766E 0%, #115E59 100%); border-radius: 16px; padding: 24px 20px; color: white; text-align: center; box-shadow: 0 10px 25px rgba(15, 118, 110, 0.25); position: relative; overflow: hidden;">
                    <div style="position: absolute; top: -30px; right: -30px; width: 100px; height: 100px; background: rgba(255,255,255,0.08); border-radius: 50%; pointer-events: none;"></div>
                    
                    <div style="width: 72px; height: 72px; background: rgba(255,255,255,0.15); backdrop-filter: blur(8px); border: 2px solid rgba(255,255,255,0.3); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto 12px auto; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                        👑
                    </div>
                    
                    <div style="font-size: 1.35rem; font-weight: 700; letter-spacing: -0.3px; margin-bottom: 4px;">${reinerName}</div>
                    <div style="display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">${benutzer.rolle}</div>
                    
                    <div style="font-size: 0.8rem; opacity: 0.85; font-weight: 500;">Erfolgsbilanz – ${statistiken.monatName}</div>

                    <!-- Level-Anzeige & Fortschritt -->
                    <div style="margin-top: 16px; background: rgba(0,0,0,0.15); padding: 10px 14px; border-radius: 10px; text-align: left;">
                        <div style="display: flex; justify-content: space-between; font-size: 0.78rem; font-weight: 600; margin-bottom: 6px;">
                            <span>Rang: ${levelTitel}</span>
                            <span>${statistiken.scansMonat} Scans</span>
                        </div>
                        <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.2); border-radius: 3px; overflow: hidden;">
                            <div style="width: ${fortschrittProzent}%; height: 100%; background: #34D399; border-radius: 3px; transition: width 0.5s ease;"></div>
                        </div>
                    </div>
                </div>

                <!-- STATISTIK-GRID (MODERNE KACHELN) -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 18px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.02); transition: transform 0.2s;">
                        <div style="font-size: 1.8rem; font-weight: 800; color: #0F766E; margin-bottom: 2px;">${statistiken.scansMonat}</div>
                        <div style="font-size: 0.78rem; font-weight: 600; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px;">Scans Gesamt</div>
                    </div>
                    <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 18px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
                        <div style="font-size: 1.8rem; font-weight: 800; color: #059669; margin-bottom: 2px;">${statistiken.reduzierungen}</div>
                        <div style="font-size: 0.78rem; font-weight: 600; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px;">Reduziert ✓</div>
                    </div>
                </div>

                <!-- ABLAUFTAG-PFLEGE KARTE -->
                <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 18px; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <span style="font-size: 0.95rem; font-weight: 700; color: #1E293B;">📦 Ablauftag-Pflege</span>
                        <span style="font-size: 0.85rem; font-weight: 700; background: #F1F5F9; color: #0F766E; padding: 3px 8px; border-radius: 6px;">${statistiken.zielstatusErfasst} Artikel</span>
                    </div>
                    <p style="font-size: 0.82rem; color: #64748B; line-height: 1.4; margin: 0;">
                        Verkauf / Nicht verkauft erfolgreich am Stichtag verbucht.
                    </p>
                </div>

                <!-- SYSTEM- & GERÄTE-INFO -->
                <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
                    <div style="padding: 14px 18px; background: #F8FAFC; border-bottom: 1px solid #E2E8F0; font-size: 0.82rem; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">
                        Geräte- & Berechtigungsinfo
                    </div>
                    <div style="display: flex; flex-direction: column;">
                        <div style="display: flex; justify-content: space-between; padding: 12px 18px; border-bottom: 1px solid #F1F5F9; font-size: 0.88rem;">
                            <span style="color: #64748B;">Standort / Filiale</span>
                            <span style="font-weight: 600; color: #1E293B;">${benutzer.filialname || benutzer.filiale_id || 'Zentrale'}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 12px 18px; border-bottom: 1px solid #F1F5F9; font-size: 0.88rem;">
                            <span style="color: #64748B;">Personalnummer</span>
                            <span style="font-weight: 600; color: #1E293B;">${benutzer.personalnummer || '---'}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 12px 18px; border-bottom: 1px solid #F1F5F9; font-size: 0.88rem;">
                            <span style="color: #64748B;">Berechtigungsstufe</span>
                            <span style="font-weight: 600; color: #0F766E;">${benutzer.rolle}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 12px 18px; font-size: 0.88rem;">
                            <span style="color: #64748B;">Aktivierungs-Key</span>
                            <span style="font-family: monospace; font-weight: 600; color: #475569; font-size: 0.8rem;">
                                ${benutzer.schluessel ? benutzer.schluessel.substring(0, 14) + '...' : 'Aktiv'}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- ABMELDEN BUTTON -->
                <div style="margin-top: 4px;">
                    <button id="schaltflaeche-app-abmelden" style="width: 100%; padding: 14px; background: #FEF2F2; color: #DC2626; border: 1px solid #FEE2E2; border-radius: 12px; font-weight: 600; font-size: 0.92rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 2px 4px rgba(220, 38, 38, 0.05); transition: background 0.2s;">
                        🔒 Vom Gerät abmelden (Schichtwechsel)
                    </button>
                </div>

            </div>
        `;

        const abmeldenBtn = document.getElementById('schaltflaeche-app-abmelden');
        if (abmeldenBtn) {
            abmeldenBtn.addEventListener('click', () => {
                sessionStorage.removeItem('kik_app_lizenz');
                sessionStorage.removeItem('kik_aktive_ansicht');
                localStorage.removeItem('kik_app_lizenz');
                location.reload();
            });
        }
    }

    const profilTabBtn = document.querySelector('[data-ziel="ansicht-profil"]');
    if (profilTabBtn) {
        profilTabBtn.addEventListener('click', profilRendern);
    }

    profilRendern();
});/* ==========================================================================
   MODERNES & COOLERES MITARBEITER-PROFIL & MONATS-STATISTIKEN
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
    const profilBehaelter = document.getElementById('behälter-mitarbeiter-statistik');

    if (!profilBehaelter) return;

    async function profilRendern() {
        profilBehaelter.innerHTML = '<div class="lade-text" style="text-align: center; padding: 40px; color: #6C757D;">Lade Profildaten...</div>';

        const gespeicherteLizenz = sessionStorage.getItem('kik_app_lizenz');
        if (!gespeicherteLizenz) {
            profilBehaelter.innerHTML = '<div class="lade-text">Bitte zuerst anmelden.</div>';
            return;
        }

        const benutzer = JSON.parse(gespeicherteLizenz);
        const reinerName = (benutzer.name || 'Benutzer').replace(/\s*\([^)]*\)/g, '').trim();

        let statistiken = {
            scansMonat: 0,
            reduzierungen: 0,
            zielstatusErfasst: 0,
            monatName: new Date().toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
        };

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

        // Berechne ein kleines "Level" basierend auf den Scans
        let levelTitel = 'Scanner-Einsteiger 🥉';
        let fortschrittProzent = Math.min((statistiken.scansMonat / 50) * 100, 100);
        if (statistiken.scansMonat >= 20) {
            levelTitel = 'MHD-Profi 🥈';
            fortschrittProzent = Math.min(((statistiken.scansMonat - 20) / 50) * 100, 100);
        }
        if (statistiken.scansMonat >= 50) {
            levelTitel = 'Master-Checker 🥇';
            fortschrittProzent = 100;
        }

        profilBehaelter.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 16px; padding: 4px 0 24px 0;">
                
                <!-- KOPFKARTE MIT MODERNEM GRADIENT & GLOW -->
                <div style="background: linear-gradient(135deg, #0F766E 0%, #115E59 100%); border-radius: 16px; padding: 24px 20px; color: white; text-align: center; box-shadow: 0 10px 25px rgba(15, 118, 110, 0.25); position: relative; overflow: hidden;">
                    <div style="position: absolute; top: -30px; right: -30px; width: 100px; height: 100px; background: rgba(255,255,255,0.08); border-radius: 50%; pointer-events: none;"></div>
                    
                    <div style="width: 72px; height: 72px; background: rgba(255,255,255,0.15); backdrop-filter: blur(8px); border: 2px solid rgba(255,255,255,0.3); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto 12px auto; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                        👑
                    </div>
                    
                    <div style="font-size: 1.35rem; font-weight: 700; letter-spacing: -0.3px; margin-bottom: 4px;">${reinerName}</div>
                    <div style="display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">${benutzer.rolle}</div>
                    
                    <div style="font-size: 0.8rem; opacity: 0.85; font-weight: 500;">Erfolgsbilanz – ${statistiken.monatName}</div>

                    <!-- Level-Anzeige & Fortschritt -->
                    <div style="margin-top: 16px; background: rgba(0,0,0,0.15); padding: 10px 14px; border-radius: 10px; text-align: left;">
                        <div style="display: flex; justify-content: space-between; font-size: 0.78rem; font-weight: 600; margin-bottom: 6px;">
                            <span>Rang: ${levelTitel}</span>
                            <span>${statistiken.scansMonat} Scans</span>
                        </div>
                        <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.2); border-radius: 3px; overflow: hidden;">
                            <div style="width: ${fortschrittProzent}%; height: 100%; background: #34D399; border-radius: 3px; transition: width 0.5s ease;"></div>
                        </div>
                    </div>
                </div>

                <!-- STATISTIK-GRID (MODERNE KACHELN) -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 18px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.02); transition: transform 0.2s;">
                        <div style="font-size: 1.8rem; font-weight: 800; color: #0F766E; margin-bottom: 2px;">${statistiken.scansMonat}</div>
                        <div style="font-size: 0.78rem; font-weight: 600; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px;">Scans Gesamt</div>
                    </div>
                    <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 18px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
                        <div style="font-size: 1.8rem; font-weight: 800; color: #059669; margin-bottom: 2px;">${statistiken.reduzierungen}</div>
                        <div style="font-size: 0.78rem; font-weight: 600; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px;">Reduziert ✓</div>
                    </div>
                </div>

                <!-- ABLAUFTAG-PFLEGE KARTE -->
                <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 18px; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <span style="font-size: 0.95rem; font-weight: 700; color: #1E293B;">📦 Ablauftag-Pflege</span>
                        <span style="font-size: 0.85rem; font-weight: 700; background: #F1F5F9; color: #0F766E; padding: 3px 8px; border-radius: 6px;">${statistiken.zielstatusErfasst} Artikel</span>
                    </div>
                    <p style="font-size: 0.82rem; color: #64748B; line-height: 1.4; margin: 0;">
                        Verkauf / Nicht verkauft erfolgreich am Stichtag verbucht.
                    </p>
                </div>

                <!-- SYSTEM- & GERÄTE-INFO -->
                <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
                    <div style="padding: 14px 18px; background: #F8FAFC; border-bottom: 1px solid #E2E8F0; font-size: 0.82rem; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">
                        Geräte- & Berechtigungsinfo
                    </div>
                    <div style="display: flex; flex-direction: column;">
                        <div style="display: flex; justify-content: space-between; padding: 12px 18px; border-bottom: 1px solid #F1F5F9; font-size: 0.88rem;">
                            <span style="color: #64748B;">Standort / Filiale</span>
                            <span style="font-weight: 600; color: #1E293B;">${benutzer.filialname || benutzer.filiale_id || 'Zentrale'}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 12px 18px; border-bottom: 1px solid #F1F5F9; font-size: 0.88rem;">
                            <span style="color: #64748B;">Personalnummer</span>
                            <span style="font-weight: 600; color: #1E293B;">${benutzer.personalnummer || '---'}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 12px 18px; border-bottom: 1px solid #F1F5F9; font-size: 0.88rem;">
                            <span style="color: #64748B;">Berechtigungsstufe</span>
                            <span style="font-weight: 600; color: #0F766E;">${benutzer.rolle}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 12px 18px; font-size: 0.88rem;">
                            <span style="color: #64748B;">Aktivierungs-Key</span>
                            <span style="font-family: monospace; font-weight: 600; color: #475569; font-size: 0.8rem;">
                                ${benutzer.schluessel ? benutzer.schluessel.substring(0, 14) + '...' : 'Aktiv'}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- ABMELDEN BUTTON -->
                <div style="margin-top: 4px;">
                    <button id="schaltflaeche-app-abmelden" style="width: 100%; padding: 14px; background: #FEF2F2; color: #DC2626; border: 1px solid #FEE2E2; border-radius: 12px; font-weight: 600; font-size: 0.92rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 2px 4px rgba(220, 38, 38, 0.05); transition: background 0.2s;">
                        🔒 Vom Gerät abmelden (Schichtwechsel)
                    </button>
                </div>

            </div>
        `;

        const abmeldenBtn = document.getElementById('schaltflaeche-app-abmelden');
        if (abmeldenBtn) {
            abmeldenBtn.addEventListener('click', () => {
                sessionStorage.removeItem('kik_app_lizenz');
                sessionStorage.removeItem('kik_aktive_ansicht');
                localStorage.removeItem('kik_app_lizenz');
                location.reload();
            });
        }
    }

    const profilTabBtn = document.querySelector('[data-ziel="ansicht-profil"]');
    if (profilTabBtn) {
        profilTabBtn.addEventListener('click', profilRendern);
    }

    profilRendern();
});