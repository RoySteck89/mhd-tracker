/* ==========================================================================
   MASTER-ADMIN DASHBOARD (SAUBER GETRENNT VON CSS)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const adminTabBtn = document.getElementById('nav-btn-admin');
    const viewSwitcher = document.getElementById('admin-view-switcher');
    const erstellenBtn = document.getElementById('schaltflaeche-key-erstellen');
    const schluesselListeBehaelter = document.getElementById('behaelter-schluessel-liste');
    
    const filialeErstellenBtn = document.getElementById('schaltflaeche-filiale-erstellen');
    const filialenListeBehaelter = document.getElementById('behaelter-filialen-liste');
    const logbuchListeBehaelter = document.getElementById('behaelter-logbuch-liste');

    const subtabButtons = document.querySelectorAll('.admin-subtab-btn');
    const subtabInhalte = document.querySelectorAll('.admin-subtab-inhalt');

    subtabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            subtabButtons.forEach(b => {
                b.classList.remove('aktiv');
                b.style.background = 'transparent';
                b.style.color = '#000';
            });
            subtabInhalte.forEach(inhalt => inhalt.style.display = 'none');

            btn.classList.add('aktiv');
            btn.style.background = '#003366';
            btn.style.color = '#FFF';

            const zielId = btn.getAttribute('data-subtab');
            const zielElement = document.getElementById(zielId);
            if (zielElement) zielElement.style.display = 'block';

            if (zielId === 'subtab-keys') schluesselLaden();
            if (zielId === 'subtab-filialen') filialenLaden();
            if (zielId === 'subtab-logbuch') logbuchLaden();
        });
    });

    function generiereSicherenKey() {
        const block = () => Math.floor(1000 + Math.random() * 9000);
        return `KIK-${block()}-${block()}-${block()}`;
    }

    async function schluesselLaden() {
        if (!window.supabaseVerbindung || !schluesselListeBehaelter) return;
        schluesselListeBehaelter.innerHTML = '<div style="padding: 12px; text-align: center; color: #6C757D;">Lade Schlüssel...</div>';

        const roheDaten = await window.supabaseVerbindung.datenAbrufen('lizenz_schluessel');
        const daten = roheDaten ? roheDaten.filter(item => item.rolle !== 'Master-Admin') : [];

        if (!daten || daten.length === 0) {
            schluesselListeBehaelter.innerHTML = '<div class="liste-karte" style="justify-content: center; color: #6C757D;">Keine weiteren Schlüssel im System.</div>';
            return;
        }

        schluesselListeBehaelter.innerHTML = '';
        daten.forEach(item => {
            const badgeClass = item.ist_einmalig && item.benutzt ? 'badge-status badge-inaktiv' : 'badge-status badge-aktiv';
            const badgeText = item.ist_einmalig && item.benutzt ? 'Benutzt' : 'Frei';

            const element = document.createElement('div');
            element.className = 'liste-karte';
            element.style.flexDirection = 'column';
            element.style.alignItems = 'stretch';
            element.style.gap = '8px';
            
            element.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div class="liste-karte-titel" style="font-family: monospace; font-size: 1rem;">${item.schluessel_code}</div>
                    <div><span class="${badgeClass}">${badgeText}</span></div>
                </div>
                <div class="liste-karte-untertitel">${item.bezeichnung} (${item.rolle})</div>
                <div style="font-size: 0.75rem; color: #6C757D;">Filiale: ${item.filiale_id || 'Flexibel / Ohne Bindung'}</div>
                <div style="display: flex; gap: 8px; margin-top: 4px; border-top: 1px solid #f1f3f5; padding-top: 8px;">
                    <button class="btn-aktions-bearbeiten btn-kopieren" data-code="${item.schluessel_code}" style="flex: 1;">📋 Kopieren</button>
                    <button class="btn-aktions-loeschen btn-loeschen" data-id="${item.id}">🗑️ Löschen</button>
                </div>
            `;
            schluesselListeBehaelter.appendChild(element);
        });

        document.querySelectorAll('.btn-kopieren').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const code = e.target.getAttribute('data-code');
                navigator.clipboard.writeText(code).then(() => {
                    alert(`Schlüssel kopiert:\n${code}`);
                });
            });
        });

        document.querySelectorAll('.btn-loeschen').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                if (confirm('Schlüssel wirklich unwiderruflich löschen?')) {
                    const { error } = await window.supabaseVerbindung.client.from('lizenz_schluessel').delete().eq('id', id);
                    if (!error) schluesselLaden();
                }
            });
        });
    }

    if (erstellenBtn) {
        erstellenBtn.addEventListener('click', async () => {
            const rolle = document.getElementById('admin-schluessel-typ').value;
            const bezeichnung = document.getElementById('admin-schluessel-bezeichnung').value.trim();
            const filialeId = document.getElementById('admin-schluessel-filiale').value.trim();

            if (!bezeichnung) {
                alert('Bitte gib eine Bezeichnung oder den Inhaber für den Schlüssel ein.');
                return;
            }

            const neuerSchluesselCode = generiereSicherenKey();

            try {
                const { error } = await window.supabaseVerbindung.client
                    .from('lizenz_schluessel')
                    .insert([{
                        schluessel_code: neuerSchluesselCode,
                        bezeichnung: bezeichnung,
                        rolle: rolle,
                        filiale_id: filialeId || '',
                        ist_einmalig: true,
                        benutzt: false
                    }]);

                if (error) throw error;

                alert(`Erfolgreich generiert!\nSchlüssel: ${neuerSchluesselCode}`);
                document.getElementById('admin-schluessel-bezeichnung').value = '';
                document.getElementById('admin-schluessel-filiale').value = '';
                schluesselLaden();

            } catch (err) {
                alert('Fehler: ' + err.message);
            }
        });
    }

    async function filialenLaden() {
        if (!window.supabaseVerbindung || !filialenListeBehaelter) return;
        filialenListeBehaelter.innerHTML = '<div style="padding: 12px; text-align: center; color: #6C757D;">Lade Filialen...</div>';

        const filialen = await window.supabaseVerbindung.datenAbrufen('filialen');
        const schluessel = await window.supabaseVerbindung.datenAbrufen('lizenz_schluessel');

        if (!filialen || filialen.length === 0) {
            filialenListeBehaelter.innerHTML = '<div class="liste-karte" style="justify-content: center; color: #6C757D;">Noch keine Filialen registriert.</div>';
            return;
        }

        filialenListeBehaelter.innerHTML = '';
        filialen.forEach(item => {
            const zugewiesenerKey = schluessel.find(k => k.filiale_id === item.filial_code || k.filiale_id == item.id);
            const verantwortlicher = zugewiesenerKey ? zugewiesenerKey.bezeichnung : 'Noch kein Teamleiter zugewiesen';

            const element = document.createElement('div');
            element.className = 'liste-karte';
            
            element.innerHTML = `
                <div>
                    <div class="liste-karte-titel">${item.name} <span style="font-size: 0.75rem; font-weight: normal; color: #6c757d;">(${item.filial_code})</span></div>
                    <div class="liste-karte-untertitel">👤 TL / Verantwortlich: <strong>${verantwortlicher}</strong></div>
                </div>
                <button class="btn-aktions-loeschen btn-filiale-loeschen" data-id="${item.id}">🗑️ Löschen</button>
            `;
            filialenListeBehaelter.appendChild(element);
        });

        document.querySelectorAll('.btn-filiale-loeschen').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                if (confirm('Filiale wirklich aus dem System löschen?')) {
                    const { error } = await window.supabaseVerbindung.client.from('filialen').delete().eq('id', id);
                    if (!error) filialenLaden();
                    else alert('Fehler beim Löschen: ' + error.message);
                }
            });
        });
    }

    if (filialeErstellenBtn) {
        filialeErstellenBtn.addEventListener('click', async () => {
            const name = document.getElementById('admin-neue-filiale-name').value.trim();
            const code = document.getElementById('admin-neue-filiale-code').value.trim();

            if (!name || !code) {
                alert('Bitte Name und Filial-ID eingeben.');
                return;
            }

            try {
                const { error } = await window.supabaseVerbindung.client
                    .from('filialen')
                    .insert([{ name: name, filial_code: code }]);

                if (error) throw error;

                alert(`Filiale "${name}" erfolgreich angelegt!`);
                document.getElementById('admin-neue-filiale-name').value = '';
                document.getElementById('admin-neue-filiale-code').value = '';
                filialenLaden();
            } catch (err) {
                alert('Fehler beim Anlegen: ' + err.message);
            }
        });
    }

    async function logbuchLaden() {
        if (!window.supabaseVerbindung || !logbuchListeBehaelter) return;
        logbuchListeBehaelter.innerHTML = '<div style="padding: 12px; text-align: center; color: #6C757D;">Lade Logbuch...</div>';

        const daten = await window.supabaseVerbindung.datenAbrufen('lizenz_schluessel');
        const benutzteKeys = daten.filter(k => k.benutzt);

        if (benutzteKeys.length === 0) {
            logbuchListeBehaelter.innerHTML = '<div class="liste-karte" style="justify-content: center; color: #6C757D;">Bisher wurden keine Einmalkeys eingelöst.</div>';
            return;
        }

        logbuchListeBehaelter.innerHTML = '';
        benutzteKeys.forEach(item => {
            const element = document.createElement('div');
            element.className = 'liste-karte';
            element.innerHTML = `
                <div>
                    <div class="liste-karte-titel" style="font-family: monospace;">${item.schluessel_code}</div>
                    <div class="liste-karte-untertitel">Eingelöst von: ${item.bezeichnung} (${item.rolle})</div>
                </div>
                <span class="badge-status badge-aktiv">Eingelöst ✓</span>
            `;
            logbuchListeBehaelter.appendChild(element);
        });
    }

    async function adminStartseiteLaden() {
        if (!window.supabaseVerbindung) return;

        const statFilialen = document.getElementById('admin-stat-filialen');
        const statKeys = document.getElementById('admin-stat-keys');
        const bezirkeContainer = document.getElementById('admin-schnell-bezirke');
        const filialenContainer = document.getElementById('admin-schnell-filialen');

        try {
            const filialen = await window.supabaseVerbindung.datenAbrufen('filialen');
            const schluessel = await window.supabaseVerbindung.datenAbrufen('lizenz_schluessel');

            if (statFilialen) statFilialen.textContent = filialen.length;
            
            const freieKeys = schluessel.filter(k => !k.benutzt && k.rolle !== 'Master-Admin');
            if (statKeys) statKeys.textContent = freieKeys.length;

            if (bezirkeContainer) {
                bezirkeContainer.innerHTML = '';
                const leitungKeys = schluessel.filter(k => k.rolle === 'Bezirksleitung' || k.rolle === 'Teamleitung');
                
                if (leitungKeys.length === 0) {
                    bezirkeContainer.innerHTML = '<div class="liste-karte" style="justify-content: center; color: #6C757D;">Keine Bezirks-/Teamleiter-Keys aktiv.</div>';
                } else {
                    leitungKeys.forEach(item => {
                        const el = document.createElement('div');
                        el.className = 'liste-karte';
                        const badgeClass = item.benutzt ? 'badge-status badge-aktiv' : 'badge-status badge-inaktiv';
                        el.innerHTML = `
                            <div>
                                <span class="liste-karte-titel">${item.bezeichnung}</span>
                                <span class="liste-karte-untertitel">Rolle: ${item.rolle}</span>
                            </div>
                            <span class="${badgeClass}">${item.benutzt ? 'Aktiv' : 'Ungelöst'}</span>
                        `;
                        bezirkeContainer.appendChild(el);
                    });
                }
            }

            if (filialenContainer) {
                filialenContainer.innerHTML = '';
                if (filialen.length === 0) {
                    filialenContainer.innerHTML = '<div class="liste-karte" style="justify-content: center; color: #6C757D;">Keine Filialen im System.</div>';
                } else {
                    filialen.forEach(item => {
                        const zugewiesenerKey = schluessel.find(k => k.filiale_id === item.filial_code || k.filiale_id == item.id);
                        const verantwortlicher = zugewiesenerKey ? zugewiesenerKey.bezeichnung : 'Offen';

                        const el = document.createElement('div');
                        el.className = 'liste-karte';
                        el.innerHTML = `
                            <div>
                                <span class="liste-karte-titel">${item.name}</span>
                                <span class="liste-karte-untertitel">TL: ${verantwortlicher}</span>
                            </div>
                            <span style="font-family: monospace; font-size: 0.75rem; background: #E9ECEF; padding: 2px 6px; border-radius: 4px;">${item.filial_code}</span>
                        `;
                        filialenContainer.appendChild(el);
                    });
                }
            }
        } catch (err) {
            console.error('Fehler beim Laden der Admin-Startseite:', err);
        }
    }

    // Sofort beim Laden des Scripts einmalig ausführen
    adminStartseiteLaden();

    const adminAnsichtTab = document.querySelector('[data-ziel="ansicht-admin-dashboard"]');
    if (adminAnsichtTab) {
        adminAnsichtTab.addEventListener('click', () => {
            schluesselLaden();
            adminStartseiteLaden();
        });
    }

    console.log('Admin-Dashboard geladen.');
});