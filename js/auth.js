/* ==========================================================================
   LIZENZ- & AKTIVIERUNGSLOGIK (INKL. PIN-SCHNELLLOGIN FÜR ALLE GERÄTE)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const ansichtAktivierung = document.getElementById('ansicht-aktivierung');
    const schrittLogin = document.getElementById('auth-schritt-login');
    const schrittCode = document.getElementById('auth-schritt-code');
    const schrittTlReg = document.getElementById('auth-schritt-tl-registrierung');
    const schrittBlReg = document.getElementById('auth-schritt-bl-registrierung');
    const schrittMaReg = document.getElementById('auth-schritt-ma-registrierung');
    
    const btnLoginAbsenden = document.getElementById('schaltflaeche-login-absenden');
    const btnZuAktivierung = document.getElementById('schaltflaeche-zu-aktivierung');
    const btnZuLogin = document.getElementById('schaltflaeche-zu-login');

    const btnAktivieren = document.getElementById('schaltflaeche-aktivieren');
    const eingabeSchluessel = document.getElementById('eingabe-aktivierungsschluessel');
    
    const btnTlRegistrieren = document.getElementById('schaltflaeche-tl-registrieren');
    const btnBlRegistrieren = document.getElementById('schaltflaeche-bl-registrieren');
    const btnMaRegistrieren = document.getElementById('schaltflaeche-ma-registrieren');
    
    const benutzerAnzeige = document.getElementById('benutzer-anzeige');
    const viewSwitcher = document.getElementById('admin-view-switcher');

    const bearbeitenKarte = document.getElementById('tl-mitarbeiter-bearbeiten-karte');
    const bearbeitenIdInput = document.getElementById('tl-bearbeiten-id');
    const bearbeitenNameInput = document.getElementById('tl-bearbeiten-name');
    const btnMaSpeichern = document.getElementById('schaltflaeche-ma-speichern');
    const btnMaAbbrechen = document.getElementById('schaltflaeche-ma-abbrechen');

    const auswahlFarbThema = document.getElementById('auswahl-farb-thema');

    let temporaererLizenzSpeicher = null;

    function wendeThemaAn(themaName) {
        const themeStylesheet = document.getElementById('theme-stylesheet');
        if (!themeStylesheet) return;

        if (themaName === 'standard') {
            themeStylesheet.href = 'css/standard-design.css';
        } else if (themaName === 'dark') {
            themeStylesheet.href = 'css/dark-design.css';
        } else {
            themeStylesheet.href = 'css/standard-design.css';
        }
        document.body.setAttribute('data-theme', themaName);
    }

    // HILFSFUNKTION: Zeigt nur die gewünschte Auth-Karte und versteckt den Rest
    function zeigeAuthSchritt(schrittElement) {
        if (ansichtAktivierung) {
            ansichtAktivierung.classList.remove('ausblenden');
            ansichtAktivierung.style.display = 'flex';
        }
        
        // Alle Schritte verstecken
        [schrittLogin, schrittCode, schrittTlReg, schrittBlReg, schrittMaReg].forEach(el => {
            if (el) {
                el.style.display = 'none';
                el.classList.add('ausblenden');
            }
        });

        // Gewünschten Schritt einblenden
        if (schrittElement) {
            schrittElement.style.display = 'flex';
            schrittElement.classList.remove('ausblenden');
        }
    }

    function zeigeAktivierung() {
        // Standardmäßig beim Ausloggen oder neuen Gerät immer den Schnell-Login anzeigen!
        zeigeAuthSchritt(schrittLogin);
        if (benutzerAnzeige) benutzerAnzeige.textContent = 'Nicht angemeldet';
    }

    // Umschalt-Buttons für den Login-Bereich
    if (btnZuAktivierung) {
        btnZuAktivierung.addEventListener('click', () => zeigeAuthSchritt(schrittCode));
    }
    if (btnZuLogin) {
        btnZuLogin.addEventListener('click', () => zeigeAuthSchritt(schrittLogin));
    }

    // SCHNELL-LOGIN PER PERSONALNUMMER & PIN
    if (btnLoginAbsenden) {
        btnLoginAbsenden.addEventListener('click', async () => {
            const persnrInput = document.getElementById('login-persnr');
            const pinInput = document.getElementById('login-pin');

            const personalnummer = persnrInput ? persnrInput.value.trim() : '';
            const pin = pinInput ? pinInput.value.trim() : '';

            if (!personalnummer || !pin) {
                alert('Bitte Personalnummer und PIN eingeben.');
                return;
            }

            try {
                if (!window.supabaseVerbindung || !window.supabaseVerbindung.client) {
                    alert('Datenbankverbindung nicht bereit.');
                    return;
                }

                // In der Datenbank nach Personalnummer und PIN suchen
                const { data, error } = await window.supabaseVerbindung.client
                    .from('lizenz_schluessel')
                    .select('*')
                    .eq('personalnummer', personalnummer)
                    .eq('pin', pin);

                if (error || !data || data.length === 0) {
                    alert('Ungültige Personalnummer oder falscher PIN!');
                    return;
                }

                const lizenz = data[0];

                const lizenzInfo = {
                    id: lizenz.id,
                    name: lizenz.bezeichnung || 'Benutzer',
                    rolle: lizenz.rolle,
                    filiale_id: lizenz.filiale_id || '',
                    personalnummer: lizenz.personalnummer,
                    pin: lizenz.pin,
                    schluessel: lizenz.schluessel_code,
                    thema: lizenz.thema || 'kik'
                };

                localStorage.setItem('kik_app_lizenz', JSON.stringify(lizenzInfo));
                alert(`Erfolgreich angemeldet als: ${lizenzInfo.name} (${lizenzInfo.rolle})`);
                initialisiereAppSession(lizenzInfo);

            } catch (err) {
                console.error('Login-Fehler:', err);
                alert('Fehler bei der Anmeldung: ' + err.message);
            }
        });
    }

    function pruefeAktivierung() {
        const gespeicherteLizenz = localStorage.getItem('kik_app_lizenz');

        if (!gespeicherteLizenz) {
            zeigeAktivierung();
        } else {
            try {
                const lizenzData = JSON.parse(gespeicherteLizenz);
                if (!lizenzData || !lizenzData.rolle) {
                    throw new Error("Ungültige Lizenz-Struktur im Speicher.");
                }
                initialisiereAppSession(lizenzData);
            } catch (err) {
                console.error('Fehler beim Laden der Session, setze zurück:', err);
                localStorage.removeItem('kik_app_lizenz');
                zeigeAktivierung();
            }
        }
    }

    if (btnAktivieren) {
        btnAktivieren.addEventListener('click', async () => {
            const schluessel = eingabeSchluessel ? eingabeSchluessel.value.trim() : '';

            if (!schluessel) {
                alert('Bitte gib einen Aktivierungsschlüssel ein.');
                return;
            }

            try {
                if (!window.supabaseVerbindung || !window.supabaseVerbindung.client) {
                    alert('Datenbankverbindung nicht bereit.');
                    return;
                }

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
                    zeigeAuthSchritt(schrittTlReg);
                    return;
                }

                if (lizenz.rolle === 'Bezirksleitung') {
                    zeigeAuthSchritt(schrittBlReg);
                    return;
                }

                if (lizenz.rolle === 'Mitarbeiter') {
                    zeigeAuthSchritt(schrittMaReg);
                    return;
                }

                if (lizenz.ist_einmalig) {
                    await window.supabaseVerbindung.client
                        .from('lizenz_schluessel')
                        .update({ benutzt: true })
                        .eq('id', lizenz.id);
                }

                const lizenzInfo = {
                    id: lizenz.id,
                    name: lizenz.bezeichnung || 'Mitarbeiter',
                    rolle: lizenz.rolle,
                    filiale_id: lizenz.filiale_id || '',
                    schluessel: lizenz.schluessel_code,
                    thema: lizenz.thema || 'kik'
                };

                localStorage.setItem('kik_app_lizenz', JSON.stringify(lizenzInfo));
                alert(`App erfolgreich aktiviert als: ${lizenzInfo.rolle}`);
                initialisiereAppSession(lizenzInfo);

            } catch (err) {
                console.error('Aktivierungsfehler:', err);
                alert('Fehler bei der Aktivierung: ' + err.message);
            }
        });
    }

    if (btnTlRegistrieren) {
        btnTlRegistrieren.addEventListener('click', async () => {
            const filialEingabeEl = document.getElementById('tl-reg-filialname');
            const nameEl = document.getElementById('tl-reg-name');
            const personalnummerEl = document.getElementById('tl-reg-persnr');
            const pinEl = document.getElementById('tl-reg-pin');

            const filialEingabe = filialEingabeEl ? filialEingabeEl.value.trim() : '';
            const name = nameEl ? nameEl.value.trim() : '';
            const personalnummer = personalnummerEl ? personalnummerEl.value.trim() : '';
            const pin = pinEl ? pinEl.value.trim() : '';

            if (!filialEingabe || !name || !personalnummer || !pin) {
                alert('Bitte fülle alle Felder aus.');
                return;
            }

            try {
                await window.supabaseVerbindung.client
                    .from('filialen')
                    .insert([{ name: filialEingabe, filial_code: filialEingabe }]);

                const block = () => Math.floor(1000 + Math.random() * 9000);
                const mitarbeiterKeyCode = `KIK-${block()}-${block()}-${block()}`;

                await window.supabaseVerbindung.client
                    .from('lizenz_schluessel')
                    .insert([{
                        schluessel_code: mitarbeiterKeyCode,
                        bezeichnung: `Mitarbeiter-Key für ${filialEingabe}`,
                        rolle: 'Mitarbeiter',
                        filiale_id: filialEingabe,
                        ist_einmalig: false,
                        benutzt: false,
                        thema: 'kik'
                    }]);

                if (temporaererLizenzSpeicher && temporaererLizenzSpeicher.id) {
                    await window.supabaseVerbindung.client
                        .from('lizenz_schluessel')
                        .update({ 
                            benutzt: true, 
                            filiale_id: filialEingabe,
                            bezeichnung: name,
                            personalnummer: personalnummer,
                            pin: pin
                        })
                        .eq('id', temporaererLizenzSpeicher.id);
                }

                const lizenzInfo = {
                    id: temporaererLizenzSpeicher ? temporaererLizenzSpeicher.id : '',
                    name: name,
                    rolle: 'Teamleitung',
                    filiale_id: filialEingabe,
                    filialname: filialEingabe,
                    personalnummer: personalnummer,
                    pin: pin,
                    schluessel: temporaererLizenzSpeicher ? temporaererLizenzSpeicher.schluessel_code : '',
                    thema: 'kik'
                };

                localStorage.setItem('kik_app_lizenz', JSON.stringify(lizenzInfo));
                alert(`Filiale "${filialEingabe}" erfolgreich eingerichtet!`);
                initialisiereAppSession(lizenzInfo);

            } catch (err) {
                console.error('Fehler bei der Filial-Registrierung:', err);
                alert('Fehler bei der Einrichtung: ' + err.message);
            }
        });
    }

    if (btnBlRegistrieren) {
        btnBlRegistrieren.addEventListener('click', async () => {
            const nameEl = document.getElementById('bl-reg-name');
            const personalnummerEl = document.getElementById('bl-reg-persnr');
            const pinEl = document.getElementById('bl-reg-pin');

            const name = nameEl ? nameEl.value.trim() : '';
            const personalnummer = personalnummerEl ? personalnummerEl.value.trim() : '';
            const pin = pinEl ? pinEl.value.trim() : '';

            if (!name || !personalnummer || !pin) {
                alert('Bitte fülle alle Felder aus.');
                return;
            }

            try {
                if (temporaererLizenzSpeicher && temporaererLizenzSpeicher.id) {
                    await window.supabaseVerbindung.client
                        .from('lizenz_schluessel')
                        .update({ 
                            benutzt: true, 
                            bezeichnung: name,
                            personalnummer: personalnummer,
                            pin: pin
                        })
                        .eq('id', temporaererLizenzSpeicher.id);
                }

                const lizenzInfo = {
                    id: temporaererLizenzSpeicher ? temporaererLizenzSpeicher.id : '',
                    name: name,
                    rolle: 'Bezirksleitung',
                    personalnummer: personalnummer,
                    pin: pin,
                    schluessel: temporaererLizenzSpeicher ? temporaererLizenzSpeicher.schluessel_code : '',
                    thema: 'kik'
                };

                localStorage.setItem('kik_app_lizenz', JSON.stringify(lizenzInfo));
                alert(`Bezirksleitung "${name}" erfolgreich eingerichtet!`);
                initialisiereAppSession(lizenzInfo);

            } catch (err) {
                console.error('Fehler bei der BL-Registrierung:', err);
                alert('Fehler: ' + err.message);
            }
        });
    }

    if (btnMaRegistrieren) {
        btnMaRegistrieren.addEventListener('click', async () => {
            const nameEl = document.getElementById('ma-reg-name');
            const personalnummerEl = document.getElementById('ma-reg-persnr');
            const pinEl = document.getElementById('ma-reg-pin');

            const name = nameEl ? nameEl.value.trim() : '';
            const personalnummer = personalnummerEl ? personalnummerEl.value.trim() : '';
            const pin = pinEl ? pinEl.value.trim() : '';

            if (!name || !personalnummer || !pin) {
                alert('Bitte fülle alle Felder aus.');
                return;
            }

            if (personalnummer.length !== 6) {
                alert('Die Personalnummer muss genau 6-stellig sein.');
                return;
            }

            if (pin.length !== 4) {
                alert('Der Kassen-PIN muss genau 4-stellig sein.');
                return;
            }

            try {
                if (!window.supabaseVerbindung || !window.supabaseVerbindung.client) {
                    alert('Datenbankverbindung nicht bereit.');
                    return;
                }

                if (temporaererLizenzSpeicher) {
                    const { error } = await window.supabaseVerbindung.client
                        .from('lizenz_schluessel')
                        .insert([{
                            schluessel_code: temporaererLizenzSpeicher.schluessel_code,
                            bezeichnung: name,
                            rolle: 'Mitarbeiter',
                            filiale_id: temporaererLizenzSpeicher.filiale_id,
                            ist_einmalig: true,
                            benutzt: true,
                            personalnummer: personalnummer,
                            pin: pin,
                            thema: 'kik'
                        }]);

                    if (error) throw error;
                }

                const lizenzInfo = {
                    id: temporaererLizenzSpeicher ? temporaererLizenzSpeicher.id : '',
                    name: name,
                    rolle: 'Mitarbeiter',
                    filiale_id: temporaererLizenzSpeicher ? temporaererLizenzSpeicher.filiale_id : '',
                    personalnummer: personalnummer,
                    pin: pin,
                    schluessel: temporaererLizenzSpeicher ? temporaererLizenzSpeicher.schluessel_code : '',
                    thema: 'kik'
                };

                localStorage.setItem('kik_app_lizenz', JSON.stringify(lizenzInfo));
                alert(`Mitarbeiter-Profil "${name}" erfolgreich eingerichtet!`);
                initialisiereAppSession(lizenzInfo);

            } catch (err) {
                console.error('Fehler bei der Mitarbeiter-Registrierung:', err);
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

        if (ansichtAktivierung) {
            ansichtAktivierung.style.display = 'none';
            ansichtAktivierung.classList.add('ausblenden');
        }

        const startAnsicht = document.getElementById('ansicht-startseite');
        if (startAnsicht) {
            startAnsicht.classList.remove('ausblenden');
            startAnsicht.classList.add('aktiv');
            startAnsicht.style.display = 'flex';
        }

        const aktuellesThema = lizenz.thema || 'kik';
        wendeThemaAn(aktuellesThema);
        if (auswahlFarbThema) auswahlFarbThema.value = aktuellesThema;

        oberflaecheAnRolleAnpassen(lizenz.rolle);

        if (lizenz.rolle === 'Teamleitung') {
            teamleiterDashboardLaden(lizenz.filiale_id);
            teamleiterMitarbeiterLaden(lizenz.filiale_id);
        }

        if (lizenz.rolle === 'Master-Admin' && viewSwitcher) {
            viewSwitcher.classList.remove('ausblenden');
            viewSwitcher.style.display = 'inline-block';
            viewSwitcher.value = 'Master-Admin';

            if (!viewSwitcher.dataset.bound) {
                viewSwitcher.dataset.bound = 'true';
                viewSwitcher.addEventListener('change', (e) => {
                    const gewaehlteRolle = e.target.value;
                    window.aktiveSimulierteRolle = gewaehlteRolle;
                    oberflaecheAnRolleAnpassen(gewaehlteRolle);
                });
            }
        }
    }

    if (auswahlFarbThema) {
        auswahlFarbThema.addEventListener('change', async (e) => {
            const neuesThema = e.target.value;
            wendeThemaAn(neuesThema);

            const gespeicherteLizenz = localStorage.getItem('kik_app_lizenz');
            if (gespeicherteLizenz) {
                const lizenz = JSON.parse(gespeicherteLizenz);
                lizenz.thema = neuesThema;
                localStorage.setItem('kik_app_lizenz', JSON.stringify(lizenz));

                if (lizenz.id) {
                    try {
                        await window.supabaseVerbindung.client
                            .from('lizenz_schluessel')
                            .update({ thema: neuesThema })
                            .eq('id', lizenz.id);
                    } catch (err) {
                        console.error('Fehler beim Speichern des Themes:', err);
                    }
                }
            }
        });
    }

    async function teamleiterDashboardLaden(filialId) {
        const keyAnzeige = document.getElementById('tl-mitarbeiter-key-anzeige');
        const kopierBtn = document.getElementById('schaltflaeche-tl-key-kopieren');
        
        if (!keyAnzeige) return;
        keyAnzeige.textContent = 'Lade Code...';

        if (!filialId) {
            keyAnzeige.textContent = 'Keine Filiale zugewiesen';
            return;
        }

        if (!window.supabaseVerbindung || !window.supabaseVerbindung.client) {
            keyAnzeige.textContent = 'Datenbank nicht verbunden';
            return;
        }

        try {
            const sauberFilialId = filialId.toString().trim();
            const schluessel = await window.supabaseVerbindung.datenAbrufen('lizenz_schluessel');
            
            let maKey = schluessel.find(k => 
                k.filiale_id && 
                k.filiale_id.toString().trim().toLowerCase() === sauberFilialId.toLowerCase() && 
                k.rolle === 'Mitarbeiter' && 
                !k.ist_einmalig
            );

            if (!maKey) {
                const block = () => Math.floor(1000 + Math.random() * 9000);
                const neuerKeyCode = `KIK-${block()}-${block()}-${block()}`;

                const { data: neuerKeyData, error: insertError } = await window.supabaseVerbindung.client
                    .from('lizenz_schluessel')
                    .insert([{
                        schluessel_code: neuerKeyCode,
                        bezeichnung: `Mitarbeiter-Key für ${sauberFilialId}`,
                        rolle: 'Mitarbeiter',
                        filiale_id: sauberFilialId,
                        ist_einmalig: false,
                        benutzt: false,
                        thema: 'kik'
                    }])
                    .select();

                if (!insertError && neuerKeyData && neuerKeyData.length > 0) {
                    maKey = neuerKeyData[0];
                } else {
                    maKey = { schluessel_code: neuerKeyCode };
                }
            }

            keyAnzeige.textContent = maKey.schluessel_code;
            if (kopierBtn) {
                kopierBtn.onclick = () => {
                    navigator.clipboard.writeText(maKey.schluessel_code);
                    alert(`Mitarbeiter-Key kopiert:\n${maKey.schluessel_code}`);
                };
            }

        } catch (err) {
            console.error('Fehler beim Laden/Erstellen des Mitarbeiter-Keys:', err);
            keyAnzeige.textContent = 'Fehler beim Laden';
        }
    }

    async function teamleiterMitarbeiterLaden(filialId) {
        const listeBehaelter = document.getElementById('behaelter-tl-mitarbeiter-liste');
        if (!listeBehaelter) return;

        listeBehaelter.innerHTML = '<div class="lade-text">Lade Mitarbeiter...</div>';

        if (!filialId) {
            listeBehaelter.innerHTML = '<div class="liste-karte" style="justify-content: center; color: #6C757D;">Keine Filial-ID für diesen Teamleiter hinterlegt.</div>';
            return;
        }

        try {
            const schluessel = await window.supabaseVerbindung.datenAbrufen('lizenz_schluessel');
            const saubereFilialId = filialId.toString().trim().toLowerCase();

            const eingelösteKeys = schluessel.filter(k => {
                const kFiliale = k.filiale_id ? k.filiale_id.toString().trim().toLowerCase() : '';
                return kFiliale === saubereFilialId && k.rolle === 'Mitarbeiter' && k.ist_einmalig === true;
            });

            if (eingelösteKeys.length === 0) {
                listeBehaelter.innerHTML = '<div class="liste-karte" style="justify-content: center; color: #6C757D;">Noch keine Mitarbeiter in dieser Filiale registriert.</div>';
                return;
            }

            listeBehaelter.innerHTML = '';
            eingelösteKeys.forEach(item => {
                const saubererName = (item.bezeichnung || 'Mitarbeiter').replace(/\s*\([^)]*\)/g, '').trim();

                const el = document.createElement('div');
                el.className = 'liste-karte';
                el.innerHTML = `
                    <div>
                        <div class="liste-karte-titel">${saubererName}</div>
                        <div class="liste-karte-untertitel" style="font-size: 0.8rem; color: #6C757D;">Personalnummer: ${item.personalnummer || '---'}</div>
                    </div>
                    <div style="display: flex; gap: 6px;">
                        <button class="btn-aktions-bearbeiten btn-ma-bearbeiten" data-id="${item.id}" data-name="${saubererName}">✏️ Bearbeiten</button>
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
                        bearbeitenKarte.classList.remove('ausblenden');
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

    const tlTeamTabBtn = document.getElementById('nav-btn-tl-team');
    if (tlTeamTabBtn) {
        tlTeamTabBtn.addEventListener('click', () => {
            const gespeicherteLizenz = localStorage.getItem('kik_app_lizenz');
            if (gespeicherteLizenz) {
                try {
                    const lizenz = JSON.parse(gespeicherteLizenz);
                    if (lizenz.rolle === 'Teamleitung' && lizenz.filiale_id) {
                        teamleiterMitarbeiterLaden(lizenz.filiale_id);
                    }
                } catch (e) {
                    console.error('Fehler beim Laden der Team-Ansicht:', e);
                }
            }
        });
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
                if (bearbeitenKarte) bearbeitenKarte.classList.add('ausblenden');

                const lizenz = JSON.parse(localStorage.getItem('kik_app_lizenz'));
                teamleiterMitarbeiterLaden(lizenz.filiale_id);

            } catch (err) {
                alert('Fehler beim Speichern: ' + err.message);
            }
        });
    }

    if (btnMaAbbrechen) {
        btnMaAbbrechen.addEventListener('click', () => {
            if (bearbeitenKarte) bearbeitenKarte.classList.add('ausblenden');
        });
    }

    const btnQrDrucken = document.getElementById('schaltflaeche-tl-qr-drucken');
    if (btnQrDrucken) {
        btnQrDrucken.addEventListener('click', () => {
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                <head>
                    <title>MHD Scanner-App - QR-Code Aushang</title>
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; color: #003366; }
                        h1 { font-size: 28px; margin-bottom: 10px; }
                        p { font-size: 18px; color: #555; margin-bottom: 30px; }
                        .qr-box { border: 3px dashed #003366; display: inline-block; padding: 25px; border-radius: 12px; background: #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
                        img { width: 260px; height: 260px; }
                        .footer { margin-top: 40px; font-size: 15px; font-weight: bold; color: #333; }
                    </style>
                </head>
                <body>
                    <h1>MHD Scanner-App</h1>
                    <p>Scanne diesen QR-Code mit deinem Smartphone, um die App im Browser zu öffnen.</p>
                    <div class="qr-box">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=https://mhd-tracker-zeta.vercel.app/" alt="App QR-Code">
                    </div>
                    <div class="footer">KiK Filial-Management &bull; Einfach mit Personalnummer & PIN einloggen</div>
                    <script>
                        window.onload = function() { window.print(); };
                    </script>
                </body>
                </html>
            `);
            printWindow.document.close();
        });
    }

    function oberflaecheAnRolleAnpassen(rolle) {
        const scannerBereich = document.getElementById('bereich-mitarbeiter-scanner');
        const adminZentrale = document.getElementById('bereich-admin-zentrale');
        const blZentrale = document.getElementById('bereich-bl-zentrale');
        const tlZentrale = document.getElementById('bereich-teamleiter-zentrale');
        
        const adminTabBtn = document.getElementById('nav-btn-admin');
        const tlTeamTabBtn = document.getElementById('nav-btn-tl-team');

        if (scannerBereich) { scannerBereich.style.display = 'none'; scannerBereich.classList.add('ausblenden'); }
        if (adminZentrale) { adminZentrale.style.display = 'none'; adminZentrale.classList.add('ausblenden'); }
        if (blZentrale) { blZentrale.style.display = 'none'; blZentrale.classList.add('ausblenden'); }
        if (tlZentrale) { tlZentrale.style.display = 'none'; tlZentrale.classList.add('ausblenden'); }

        if (adminTabBtn) { adminTabBtn.style.display = 'none'; adminTabBtn.classList.add('ausblenden'); }
        if (tlTeamTabBtn) { tlTeamTabBtn.style.display = 'none'; tlTeamTabBtn.classList._add?.('ausblenden') || tlTeamTabBtn.classList.add('ausblenden'); }

        const zielRolle = window.aktiveSimulierteRolle ||rolle;

        if (zielRolle === 'Master-Admin') {
            if (adminZentrale) { adminZentrale.style.display = 'block'; adminZentrale.classList.remove('ausblenden'); }
            if (adminTabBtn) { adminTabBtn.style.display = 'flex'; adminTabBtn.classList.remove('ausblenden'); }
        } else if (zielRolle === 'Bezirksleitung') {
            if (blZentrale) { blZentrale.style.display = 'block'; blZentrale.classList.remove('ausblenden'); }
        } else if (zielRolle === 'Teamleitung') {
            if (tlZentrale) { tlZentrale.style.display = 'block'; tlZentrale.classList.remove('ausblenden'); }
            if (scannerBereich) { scannerBereich.style.display = 'block'; scannerBereich.classList.remove('ausblenden'); }
            if (tlTeamTabBtn) { tlTeamTabBtn.style.display = 'flex'; tlTeamTabBtn.classList.remove('ausblenden'); }
        } else {
            if (scannerBereich) { scannerBereich.style.display = 'block'; scannerBereich.classList.remove('ausblenden'); }
        }
    }

    pruefeAktivierung();
});