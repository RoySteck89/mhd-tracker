/* ==========================================================================
   LIZENZ- & AKTIVIERUNGSLOGIK (SAUBER GETRENNT VON CSS)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const ansichtAktivierung = document.getElementById('ansicht-aktivierung');
    const schrittCode = document.getElementById('auth-schritt-code');
    const schrittTlReg = document.getElementById('auth-schritt-tl-registrierung');
    const schrittBlReg = document.getElementById('auth-schritt-bl-registrierung');
    
    const btnAktivieren = document.getElementById('schaltflaeche-aktivieren');
    const eingabeSchluessel = document.getElementById('eingabe-aktivierungsschluessel');
    
    const btnTlRegistrieren = document.getElementById('schaltflaeche-tl-registrieren');
    const btnBlRegistrieren = document.getElementById('schaltflaeche-bl-registrieren');
    
    const benutzerAnzeige = document.getElementById('benutzer-anzeige');
    const viewSwitcher = document.getElementById('admin-view-switcher');

    // Elemente für Mitarbeiter-Bearbeitung durch Teamleiter
    const bearbeitenKarte = document.getElementById('tl-mitarbeiter-bearbeiten-karte');
    const bearbeitenIdInput = document.getElementById('tl-bearbeiten-id');
    const bearbeitenNameInput = document.getElementById('tl-bearbeiten-name');
    const btnMaSpeichern = document.getElementById('schaltflaeche-ma-speichern');
    const btnMaAbbrechen = document.getElementById('schaltflaeche-ma-abbrechen');

    let temporaererLizenzSpeicher = null;

    function pruefeAktivierung() {
        const gespeicherteLizenz = localStorage.getItem('kik_app_lizenz');

        if (!gespeicherteLizenz) {
            if (ansichtAktivierung) ansichtAktivierung.style.display = 'flex';
            if (schrittCode) schrittCode.style.display = 'block';
            if (schrittTlReg) schrittTlReg.style.display = 'none';
            if (schrittBlReg) schrittBlReg.style.display = 'none';
            if (benutzerAnzeige) benutzerAnzeige.textContent = 'Nicht aktiviert';
        } else {
            const lizenzData = JSON.parse(gespeicherteLizenz);
            initialisiereAppSession(lizenzData);
        }
    }

    if (btnAktivieren) {
        btnAktivieren.addEventListener('click', async () => {
            const schluessel = eingabeSchluessel.value.trim();

            if (!schluessel) {
                alert('Bitte gib einen Aktivierungsschlüssel ein.');
                return;
            }

            try {
                const { data, error } = await window.supabaseVerbindung.client
                    .from('lizenz_schluessel')
                    .select('*')
                    .eq('schluessel_code', schluessel);

                if (error || !data || data.length === 0) {
                    alert('Ungültiger oder abgelaufener Aktivierungsschlüssel!');
                    return;
                }

                const lizenz = data[0];

                if (lizenz.ist_einmalig && lizenz.benutzt) {
                    alert('Dieser Aktivierungsschlüssel wurde bereits verwendet!');
                    return;
                }

                temporaererLizenzSpeicher = lizenz;

                if (lizenz.rolle === 'Teamleitung') {
                    if (schrittCode) schrittCode.style.display = 'none';
                    if (schrittTlReg) schrittTlReg.style.display = 'block';
                    return;
                }

                if (lizenz.rolle === 'Bezirksleitung') {
                    if (schrittCode) schrittCode.style.display = 'none';
                    if (schrittBlReg) schrittBlReg.style.display = 'block';
                    return;
                }

                if (lizenz.ist_einmalig) {
                    await window.supabaseVerbindung.client
                        .from('lizenz_schluessel')
                        .update({ benutzt: true })
                        .eq('id', lizenz.id);
                }

                const lizenzInfo = {
                    name: lizenz.bezeichnung || 'Mitarbeiter',
                    rolle: lizenz.rolle,
                    filiale_id: lizenz.filiale_id || '',
                    schluessel: lizenz.schluessel_code
                };

                localStorage.setItem('kik_app_lizenz', JSON.stringify(lizenzInfo));
                alert(`App erfolgreich aktiviert als: ${lizenzInfo.rolle}`);
                initialisiereAppSession(lizenzInfo);

            } catch (err) {
                console.error('Aktivierungsfehler:', err.message);
                alert('Fehler bei der Aktivierung: ' + err.message);
            }
        });
    }

    // Teamleiter Registrierung
    if (btnTlRegistrieren) {
        btnTlRegistrieren.addEventListener('click', async () => {
            const filialname = document.getElementById('tl-reg-filialname').value.trim();
            const name = document.getElementById('tl-reg-name').value.trim();
            const personalnummer = document.getElementById('tl-reg-persnr').value.trim();
            const pin = document.getElementById('tl-reg-pin').value.trim();

            if (!filialname || !name || !personalnummer || !pin) {
                alert('Bitte fülle alle Felder aus.');
                return;
            }

            const filialCode = 'FIL-' + Math.floor(1000 + Math.random() * 9000);

            try {
                const { error: filialError } = await window.supabaseVerbindung.client
                    .from('filialen')
                    .insert([{ name: filialname, filial_code: filialCode }]);

                if (filialError) throw filialError;

                const block = () => Math.floor(1000 + Math.random() * 9000);
                const mitarbeiterKeyCode = `KIK-${block()}-${block()}-${block()}`;

                const { error: keyError } = await window.supabaseVerbindung.client
                    .from('lizenz_schluessel')
                    .insert([{
                        schluessel_code: mitarbeiterKeyCode,
                        bezeichnung: `Mitarbeiter-Key für ${filialname}`,
                        rolle: 'Mitarbeiter',
                        filiale_id: filialCode,
                        ist_einmalig: false,
                        benutzt: false
                    }]);

                if (keyError) throw keyError;

                if (temporaererLizenzSpeicher && temporaererLizenzSpeicher.ist_einmalig) {
                    await window.supabaseVerbindung.client
                        .from('lizenz_schluessel')
                        .update({ benutzt: true, filiale_id: filialCode })
                        .eq('id', temporaererLizenzSpeicher.id);
                }

                const lizenzInfo = {
                    name: name,
                    rolle: 'Teamleitung',
                    filiale_id: filialCode,
                    filialname: filialname,
                    personalnummer: personalnummer,
                    pin: pin,
                    schluessel: temporaererLizenzSpeicher.schluessel_code
                };

                localStorage.setItem('kik_app_lizenz', JSON.stringify(lizenzInfo));
                alert(`Filiale "${filialname}" erfolgreich eingerichtet!`);
                initialisiereAppSession(lizenzInfo);

            } catch (err) {
                console.error('Fehler bei der Filial-Registrierung:', err.message);
                alert('Fehler: ' + err.message);
            }
        });
    }

    // Bezirksleitung Registrierung (mit eigenem PIN)
    if (btnBlRegistrieren) {
        btnBlRegistrieren.addEventListener('click', async () => {
            const name = document.getElementById('bl-reg-name').value.trim();
            const personalnummer = document.getElementById('bl-reg-persnr').value.trim();
            const pin = document.getElementById('bl-reg-pin').value.trim();

            if (!name || !personalnummer || !pin) {
                alert('Bitte fülle alle Felder aus.');
                return;
            }

            try {
                if (temporaererLizenzSpeicher && temporaererLizenzSpeicher.ist_einmalig) {
                    await window.supabaseVerbindung.client
                        .from('lizenz_schluessel')
                        .update({ benutzt: true, bezeichnung: name })
                        .eq('id', temporaererLizenzSpeicher.id);
                }

                const lizenzInfo = {
                    name: name,
                    rolle: 'Bezirksleitung',
                    personalnummer: personalnummer,
                    pin: pin,
                    schluessel: temporaererLizenzSpeicher.schluessel_code
                };

                localStorage.setItem('kik_app_lizenz', JSON.stringify(lizenzInfo));
                alert(`Bezirksleitung "${name}" erfolgreich eingerichtet!`);
                initialisiereAppSession(lizenzInfo);

            } catch (err) {
                console.error('Fehler bei der BL-Registrierung:', err.message);
                alert('Fehler: ' + err.message);
            }
        });
    }

    function initialisiereAppSession(lizenz) {
        window.aktuellerBenutzer = lizenz;
        window.aktiveSimulierteRolle = lizenz.rolle;

        if (benutzerAnzeige) {
            benutzerAnzeige.innerHTML = `👑 <strong>${lizenz.name}</strong> (${lizenz.rolle})`;
        }

        if (ansichtAktivierung) ansichtAktivierung.style.display = 'none';

        oberflaecheAnRolleAnpassen(lizenz.rolle);

        if (lizenz.rolle === 'Teamleitung') {
            teamleiterDashboardLaden(lizenz.filiale_id);
            teamleiterMitarbeiterLaden(lizenz.filiale_id);
        }

        if (lizenz.rolle === 'Master-Admin' && viewSwitcher) {
            viewSwitcher.style.display = 'inline-block';
            viewSwitcher.value = 'Master-Admin';

            viewSwitcher.addEventListener('change', (e) => {
                const gewaehlteRolle = e.target.value;
                window.aktiveSimulierteRolle = gewaehlteRolle;
                oberflaecheAnRolleAnpassen(gewaehlteRolle);
            });
        }
    }

    async function teamleiterDashboardLaden(filialId) {
        const keyAnzeige = document.getElementById('tl-mitarbeiter-key-anzeige');
        const kopierBtn = document.getElementById('schaltflaeche-tl-key-kopieren');
        if (!keyAnzeige) return;

        try {
            const schluessel = await window.supabaseVerbindung.datenAbrufen('lizenz_schluessel');
            const maKey = schluessel.find(k => k.filiale_id === filialId && k.rolle === 'Mitarbeiter' && !k.ist_einmalig);

            if (maKey) {
                keyAnzeige.textContent = maKey.schluessel_code;
                if (kopierBtn) {
                    kopierBtn.onclick = () => {
                        navigator.clipboard.writeText(maKey.schluessel_code);
                        alert(`Mitarbeiter-Key kopiert:\n${maKey.schluessel_code}`);
                    };
                }
            } else {
                keyAnzeige.textContent = 'Kein Key gefunden';
            }
        } catch (err) {
            console.error('Fehler beim Laden des Mitarbeiter-Keys:', err);
            keyAnzeige.textContent = 'Fehler beim Laden';
        }
    }

    async function teamleiterMitarbeiterLaden(filialId) {
        const listeBehaelter = document.getElementById('behaelter-tl-mitarbeiter-liste');
        if (!listeBehaelter) return;

        listeBehaelter.innerHTML = '<div style="padding: 12px; text-align: center; color: #6C757D;">Lade Mitarbeiter...</div>';

        try {
            const schluessel = await window.supabaseVerbindung.datenAbrufen('lizenz_schluessel');
            const eingelösteKeys = schluessel.filter(k => k.filiale_id === filialId && k.rolle === 'Mitarbeiter' && k.benutzt);

            if (eingelösteKeys.length === 0) {
                listeBehaelter.innerHTML = '<div class="liste-karte" style="justify-content: center; color: #6C757D;">Noch keine Mitarbeiter in dieser Filiale registriert.</div>';
                return;
            }

            listeBehaelter.innerHTML = '';
            eingelösteKeys.forEach(item => {
                const el = document.createElement('div');
                el.className = 'liste-karte';
                el.innerHTML = `
                    <div>
                        <div class="liste-karte-titel">${item.bezeichnung || 'Mitarbeiter'}</div>
                        <div class="liste-karte-untertitel" style="font-family: monospace;">Key: ${item.schluessel_code}</div>
                    </div>
                    <div style="display: flex; gap: 6px;">
                        <button class="btn-aktions-bearbeiten btn-ma-bearbeiten" data-id="${item.id}" data-name="${item.bezeichnung || ''}">✏️ Bearbeiten</button>
                        <button class="btn-aktions-loeschen btn-ma-loeschen" data-id="${item.id}">🗑️ Löschen</button>
                    </div>
                `;
                listeBehaelter.appendChild(el);
            });

            document.querySelectorAll('.btn-ma-bearbeiten').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.target.getAttribute('data-id');
                    const name = e.target.getAttribute('data-name');
                    
                    if (bearbeitenKarte && bearbeitenIdInput && bearbeitenNameInput) {
                        bearbeitenIdInput.value = id;
                        bearbeitenNameInput.value = name;
                        bearbeitenKarte.style.display = 'block';
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                });
            });

            document.querySelectorAll('.btn-ma-loeschen').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.target.getAttribute('data-id');
                    if (confirm('Mitarbeiter wirklich aus der Filiale entfernen?')) {
                        const { error } = await window.supabaseVerbindung.client
                            .from('lizenz_schluessel')
                            .delete()
                            .eq('id', id);

                        if (!error) {
                            alert('Mitarbeiter erfolgreich entfernt.');
                            const lizenz = JSON.parse(localStorage.getItem('kik_app_lizenz'));
                            teamleiterMitarbeiterLaden(lizenz.filiale_id);
                        } else {
                            alert('Fehler beim Löschen: ' + error.message);
                        }
                    }
                });
            });

        } catch (err) {
            console.error('Fehler beim Laden der Mitarbeiter:', err);
            listeBehaelter.innerHTML = '<div style="color: #DC3545; text-align: center;">Fehler beim Laden der Mitarbeiter.</div>';
        }
    }

    if (btnMaSpeichern) {
        btnMaSpeichern.addEventListener('click', async () => {
            const id = bearbeitenIdInput.value;
            const neuerName = bearbeitenNameInput.value.trim();

            if (!neuerName) {
                alert('Bitte gib einen Namen ein.');
                return;
            }

            try {
                const { error } = await window.supabaseVerbindung.client
                    .from('lizenz_schluessel')
                    .update({ bezeichnung: neuerName })
                    .eq('id', id);

                if (error) throw error;

                alert('Mitarbeiter erfolgreich aktualisiert!');
                if (bearbeitenKarte) bearbeitenKarte.style.display = 'none';

                const lizenz = JSON.parse(localStorage.getItem('kik_app_lizenz'));
                teamleiterMitarbeiterLaden(lizenz.filiale_id);

            } catch (err) {
                alert('Fehler beim Speichern: ' + err.message);
            }
        });
    }

    if (btnMaAbbrechen) {
        btnMaAbbrechen.addEventListener('click', () => {
            if (bearbeitenKarte) bearbeitenKarte.style.display = 'none';
        });
    }

    function oberflaecheAnRolleAnpassen(rolle) {
        const scannerBereich = document.getElementById('bereich-mitarbeiter-scanner');
        const adminZentrale = document.getElementById('bereich-admin-zentrale');
        const blZentrale = document.getElementById('bereich-bl-zentrale');
        const tlZentrale = document.getElementById('bereich-teamleiter-zentrale');
        
        const adminTabBtn = document.getElementById('nav-btn-admin');
        const tlTeamTabBtn = document.getElementById('nav-btn-tl-team');

        if (scannerBereich) scannerBereich.style.display = 'none';
        if (adminZentrale) adminZentrale.style.display = 'none';
        if (blZentrale) blZentrale.style.display = 'none';
        if (tlZentrale) tlZentrale.style.display = 'none';

        if (adminTabBtn) adminTabBtn.style.display = 'none';
        if (tlTeamTabBtn) tlTeamTabBtn.style.display = 'none';

        if (rolle === 'Master-Admin') {
            if (adminZentrale) adminZentrale.style.display = 'block';
            if (adminTabBtn) adminTabBtn.style.display = 'flex';
        } else if (rolle === 'Bezirksleitung') {
            if (blZentrale) blZentrale.style.display = 'block';
        } else if (rolle === 'Teamleitung') {
            if (tlZentrale) tlZentrale.style.display = 'block';
            if (tlTeamTabBtn) tlTeamTabBtn.style.display = 'flex';
        } else {
            if (scannerBereich) scannerBereich.style.display = 'block';
        }
    }

    pruefeAktivierung();
});