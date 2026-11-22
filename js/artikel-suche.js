/* ==========================================================================
   MINIMALISTISCHE ARTIKELLISTE, KATEGORIE-FILTER, LIVE-SUCHE, TL-KATEGORIE & MHD-LÖSCHUNG
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const suchEingabe = document.getElementById('eingabe-artikel-suche');
    const ergebnisBehaelter = document.getElementById('behälter-such-ergebnisse');
    const filterButtons = document.querySelectorAll('.artikel-filter-btn');

    if (!suchEingabe || !ergebnisBehaelter) return;

    let alleArtikel = [];
    let aktuellerFilter = 'alle';

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

    function istTeamleitungOderAdmin() {
        const session = sessionStorage.getItem('kik_app_lizenz');
        if (!session) return false;
        try {
            const daten = JSON.parse(session);
            const rolle = window.aktiveSimulierteRolle || daten.rolle;
            return rolle === 'Teamleitung' || rolle === 'Master-Admin';
        } catch (e) {
            return false;
        }
    }

    function zeigeEigenesBestätigungsModal(titel, nachricht, istGefahr, callback) {
        const altesOverlay = document.getElementById('custom-modal-overlay');
        if (altesOverlay) altesOverlay.remove();

        const overlay = document.createElement('div');
        overlay.id = 'custom-modal-overlay';
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.6); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box;';
        
        const buttonFarbe = istGefahr ? '#dc3545' : '#28a745';
        const buttonText = istGefahr ? 'Ja, löschen' : 'Bestätigen';

        overlay.innerHTML = `
            <div style="background: #ffffff; width: 100%; max-width: 380px; padding: 24px; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.25); display: flex; flex-direction: column; gap: 14px;">
                <div style="font-weight: 700; font-size: 1.15rem; color: #003366;">${titel}</div>
                <div style="font-size: 0.95rem; color: #495057; line-height: 1.4;">${nachricht}</div>
                <div style="display: flex; gap: 10px; margin-top: 6px;">
                    <button id="custom-modal-abbrechen" style="flex: 1; padding: 12px; background: #6c757d; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">Abbrechen</button>
                    <button id="custom-modal-ok" style="flex: 1; padding: 12px; background: ${buttonFarbe}; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">${buttonText}</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        document.getElementById('custom-modal-ok').onclick = () => {
            overlay.remove();
            callback(true);
        };

        document.getElementById('custom-modal-abbrechen').onclick = () => {
            overlay.remove();
            callback(false);
        };
    }

    function zeigeEigenesEingabeModal(titel, vorabText, callback) {
        const altesOverlay = document.getElementById('custom-modal-overlay');
        if (altesOverlay) altesOverlay.remove();

        const overlay = document.createElement('div');
        overlay.id = 'custom-modal-overlay';
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.6); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box;';
        
        overlay.innerHTML = `
            <div style="background: #ffffff; width: 100%; max-width: 380px; padding: 24px; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.25); display: flex; flex-direction: column; gap: 14px;">
                <div style="font-weight: 700; font-size: 1.15rem; color: #003366;">${titel}</div>
                <input type="text" id="custom-modal-input" value="${vorabText}" style="width: 100%; padding: 12px; border: 1px solid #ced4da; border-radius: 8px; font-size: 1rem; outline: none; background: #f8f9fa;">
                <div style="display: flex; gap: 10px; margin-top: 6px;">
                    <button id="custom-modal-abbrechen" style="flex: 1; padding: 12px; background: #6c757d; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">Abbrechen</button>
                    <button id="custom-modal-ok" style="flex: 1; padding: 12px; background: #28a745; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">Speichern</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const input = document.getElementById('custom-modal-input');
        input.focus();
        input.select();

        document.getElementById('custom-modal-ok').onclick = () => {
            const wert = input.value.trim();
            overlay.remove();
            callback(wert);
        };

        document.getElementById('custom-modal-abbrechen').onclick = () => {
            overlay.remove();
            callback(null);
        };

        input.onkeydown = (e) => {
            if (e.key === 'Enter') document.getElementById('custom-modal-ok').click();
        };
    }

    async function artikelLaden() {
        if (!istAngemeldet() || !window.supabaseVerbindung) {
            alleArtikel = [];
            ergebnisBehaelter.innerHTML = '';
            return;
        }

        ergebnisBehaelter.innerHTML = '<div style="padding: 16px; text-align: center; color: #6C757D;">Lade Artikel aus Datenbank...</div>';
        
        const daten = await window.supabaseVerbindung.datenAbrufen('artikel');
        
        alleArtikel = daten ? daten.sort((a, b) => 
            a.artikelname.localeCompare(b.artikelname, 'de', { sensitivity: 'base' })
        ) : [];
        
        filterUndSucheAnwenden();
    }

    window.artikelLaden = artikelLaden;

    function filterUndSucheAnwenden() {
        if (!istAngemeldet()) return;

        const suchBegriff = suchEingabe.value.trim().toLowerCase();

        let gefiltert = alleArtikel.filter(artikel => {
            const entsprichtKategorie = (aktuellerFilter === 'alle' || artikel.kategorie === aktuellerFilter);
            const entsprichtSuche = (suchBegriff === '' || artikel.artikelname.toLowerCase().includes(suchBegriff));
            return entsprichtKategorie && entsprichtSuche;
        });

        listeAnzeigen(gefiltert);
    }

    function listeAnzeigen(artikelListe) {
        ergebnisBehaelter.innerHTML = '';

        const zählerDiv = document.createElement('div');
        zählerDiv.style.cssText = 'font-size: 0.8rem; color: #6C757D; margin-bottom: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;';
        zählerDiv.textContent = `${artikelListe.length} Artikel gefunden (${aktuellerFilter === 'alle' ? 'Alle Kategorien' : aktuellerFilter})`;
        ergebnisBehaelter.appendChild(zählerDiv);

        if (artikelListe.length === 0) {
            ergebnisBehaelter.innerHTML += `
                <div class="fallback-meldung" style="padding: 20px; text-align: center; background: #FFF3CD; border: 1px solid #FFEEBA; border-radius: 8px; color: #856404; margin-top: 8px;">
                    <p style="font-weight: 600; margin-bottom: 10px;">Keine Artikel in dieser Auswahl gefunden.</p>
                </div>
            `;
            return;
        }

        const istTL = istTeamleitungOderAdmin();

        artikelListe.forEach(artikel => {
            const element = document.createElement('div');
            element.className = 'artikel-karte-wrapper';
            element.style.cssText = 'background: #FFFFFF; border: 1px solid #E9ECEF; border-radius: 8px; margin-bottom: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); overflow: hidden;';
            
            let kategorieBadgeFarbe = '#E2E8F0';
            let kategorieTextFarbe = '#334155';
            if (artikel.kategorie === 'Süßigkeiten') { kategorieBadgeFarbe = '#FCE7F3'; kategorieTextFarbe = '#9D174D'; }
            else if (artikel.kategorie === 'Getränke') { kategorieBadgeFarbe = '#E0F2FE'; kategorieTextFarbe = '#0369A1'; }
            else if (artikel.kategorie === 'Tierfutter') { kategorieBadgeFarbe = '#FEF3C7'; kategorieTextFarbe = '#92400E'; }

            let kategorieAnzeigeHtml = `<span style="font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; background: ${kategorieBadgeFarbe}; color: ${kategorieTextFarbe}; font-weight: 600;">${artikel.kategorie || 'Süßigkeiten'}</span>`;
            
            if (istTL) {
                kategorieAnzeigeHtml = `
                    <select class="tl-kategorie-dropdown" data-id="${artikel.id}" style="font-size: 0.75rem; padding: 2px 4px; border-radius: 4px; background: ${kategorieBadgeFarbe}; color: ${kategorieTextFarbe}; font-weight: 600; border: 1px solid #CBD5E1; cursor: pointer;" onclick="event.stopPropagation()">
                        <option value="Süßigkeiten" ${artikel.kategorie === 'Süßigkeiten' ? 'selected' : ''}>🍫 Süßigkeiten</option>
                        <option value="Getränke" ${artikel.kategorie === 'Getränke' ? 'selected' : ''}>🥤 Getränke</option>
                        <option value="Tierfutter" ${artikel.kategorie === 'Tierfutter' ? 'selected' : ''}>🐾 Tierfutter</option>
                    </select>
                `;
            }

            element.innerHTML = `
                <div class="artikel-kopf" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; cursor: pointer; user-select: none;">
                    <div style="display: flex; align-items: center; gap: 8px; flex: 1; padding-right: 10px;">
                        <span class="aufklapp-pfeil" style="font-size: 0.8rem; color: #6C757D; transition: transform 0.2s;">▶</span>
                        <div>
                            <span style="word-break: break-word; font-size: 1rem; font-weight: 500; color: #212529;">${artikel.artikelname}</span>
                            <div style="margin-top: 4px;">${kategorieAnzeigeHtml}</div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 6px; flex-shrink: 0;" onclick="event.stopPropagation()">
                        <button class="btn-artikel-bearbeiten" data-id="${artikel.id}" data-name="${artikel.artikelname}" style="background: #E9ECEF; border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 0.9rem;" title="Artikel bearbeiten">✏️</button>
                        <button class="btn-artikel-loeschen" data-id="${artikel.id}" data-name="${artikel.artikelname}" style="background: #F8D7DA; border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 0.9rem;" title="Artikel löschen">🗑️</button>
                    </div>
                </div>
                <div class="artikel-mhd-details ausblenden" style="padding: 12px 16px; border-top: 1px solid #F1F3F5; background: #F8F9FA;">
                    <div class="mhd-liste-inhalt" style="font-size: 0.88rem; color: #495057;">Lade erfasste MHDs...</div>
                </div>
            `;

            ergebnisBehaelter.appendChild(element);

            const kopfBereich = element.querySelector('.artikel-kopf');
            const detailsBereich = element.querySelector('.artikel-mhd-details');
            const pfeilSpan = element.querySelector('.aufklapp-pfeil');
            const mhdInhaltContainer = element.querySelector('.mhd-liste-inhalt');

            if (istTL) {
                const selectDropdown = element.querySelector('.tl-kategorie-dropdown');
                if (selectDropdown) {
                    selectDropdown.addEventListener('change', async (e) => {
                        const neueKategorie = e.target.value;
                        const artikelId = e.target.getAttribute('data-id');

                        try {
                            const { error } = await window.supabaseVerbindung.client
                                .from('artikel')
                                .update({ kategorie: neueKategorie })
                                .eq('id', artikelId);

                            if (error) throw error;

                            const gefundenerArtikel = alleArtikel.find(a => a.id === artikelId);
                            if (gefundenerArtikel) gefundenerArtikel.kategorie = neueKategorie;

                            filterUndSucheAnwenden();
                        } catch (err) {
                            alert('Fehler beim Ändern der Kategorie: ' + err.message);
                        }
                    });
                }
            }

            let mhdBereitsGeladen = false;

            kopfBereich.addEventListener('click', async () => {
                if (!istAngemeldet()) return;
                const istAusgeblendet = detailsBereich.classList.contains('ausblenden');

                if (istAusgeblendet) {
                    detailsBereich.classList.remove('ausblenden');
                    pfeilSpan.style.transform = 'rotate(90deg)';

                    if (!mhdBereitsGeladen) {
                        mhdInhaltContainer.innerHTML = '<div style="color: #6C757D; font-style: italic;">Lade MHD-Einträge...</div>';
                        
                        try {
                            const { data: mhdEintraege, error } = await window.supabaseVerbindung.client
                                .from('mhd_eintraege')
                                .select('*')
                                .eq('artikel_id', artikel.id)
                                .order('mhd_datum', { ascending: true });

                            if (error) throw error;

                            if (!mhdEintraege || mhdEintraege.length === 0) {
                                mhdInhaltContainer.innerHTML = '<div style="color: #6C757D;">Keine MHD-Einträge für diesen Artikel erfasst.</div>';
                            } else {
                                mhdInhaltContainer.innerHTML = '';
                                const ul = document.createElement('div');
                                ul.style.cssText = 'display: flex; flex-direction: column; gap: 6px;';

                                mhdEintraege.forEach(eintrag => {
                                    let deutschesDatum = eintrag.mhd_datum;
                                    if (eintrag.mhd_datum && eintrag.mhd_datum.includes('-')) {
                                        const teile = eintrag.mhd_datum.split('-');
                                        if (teile.length === 3) deutschesDatum = `${teile[2]}.${teile[1]}.${teile[0]}`;
                                    }

                                    let badgeHintergrund = '#E2E8F0';
                                    let badgeTextFarbe = '#334155';
                                    if (eintrag.status === 'aktiv') { badgeHintergrund = '#FEF3C7'; badgeTextFarbe = '#92400E'; }
                                    else if (eintrag.status === 'reduziert') { badgeHintergrund = '#FFEDD5'; badgeTextFarbe = '#C2410C'; }
                                    else if (eintrag.status === 'verkauft') { badgeHintergrund = '#DCFCE7'; badgeTextFarbe = '#166534'; }
                                    else if (eintrag.status === 'entsorgt') { badgeHintergrund = '#FEE2E2'; badgeTextFarbe = '#991B1B'; }

                                    const eintragDiv = document.createElement('div');
                                    eintragDiv.style.cssText = 'display: flex; justify-content: space-between; align-items: center; background: #FFFFFF; padding: 8px 12px; border-radius: 6px; border: 1px solid #E2E8F0; font-size: 0.85rem;';
                                    
                                    eintragDiv.innerHTML = `
                                        <div><span>MHD: <strong>${deutschesDatum}</strong></span></div>
                                        <div style="display: flex; align-items: center; gap: 8px;">
                                            <span style="padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; background: ${badgeHintergrund}; color: ${badgeTextFarbe}; text-transform: uppercase;">${eintrag.status}</span>
                                            <button class="btn-mhd-loeschen" data-id="${eintrag.id}" style="background: #F8D7DA; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;" title="Dieses MHD löschen">🗑️</button>
                                        </div>
                                    `;
                                    ul.appendChild(eintragDiv);
                                });
                                mhdInhaltContainer.appendChild(ul);

                                // Event-Listener für das Löschen einzelner MHDs
                                mhdInhaltContainer.querySelectorAll('.btn-mhd-loeschen').forEach(loeschBtn => {
                                    loeschBtn.addEventListener('click', async (evt) => {
                                        evt.stopPropagation();
                                        const mhdId = loeschBtn.getAttribute('data-id');

                                        zeigeEigenesBestätigungsModal(
                                            "MHD-Eintrag löschen",
                                            "Soll dieser spezifische MHD-Eintrag wirklich gelöscht werden?",
                                            true,
                                            async (bestätigt) => {
                                                if (!bestätigt) return;
                                                try {
                                                    const { error: loeschFehler } = await window.supabaseVerbindung.client
                                                        .from('mhd_eintraege')
                                                        .delete()
                                                        .eq('id', mhdId);

                                                    if (loeschFehler) throw loeschFehler;

                                                    // Zeile direkt aus dem DOM entfernen oder Ansicht zuklappen
                                                    loeschBtn.closest('div').parentElement.remove();
                                                    
                                                    // Falls vorhanden, auch die aktive Liste im Scanner aktualisieren
                                                    if (typeof window.aktiveFilialArtikelLaden === 'function') {
                                                        window.aktiveFilialArtikelLaden();
                                                    }
                                                } catch (err) {
                                                    alert('Fehler beim Löschen des MHDs: ' + err.message);
                                                }
                                            }
                                        );
                                    });
                                });
                            }
                            mhdBereitsGeladen = true;
                        } catch (err) {
                            mhdInhaltContainer.innerHTML = '<div style="color: #DC3545;">Fehler beim Laden der MHD-Einträge.</div>';
                        }
                    }
                } else {
                    detailsBereich.classList.add('ausblenden');
                    pfeilSpan.style.transform = 'rotate(0deg)';
                }
            });
        });

        document.querySelectorAll('.btn-artikel-bearbeiten').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (!istAngemeldet()) return;
                const id = e.target.getAttribute('data-id');
                const alterName = e.target.getAttribute('data-name');
                
                zeigeEigenesEingabeModal("Artikel bearbeiten", alterName, async (neuerName) => {
                    if (!neuerName || neuerName === alterName || !istAngemeldet()) return;
                    try {
                        const { error } = await window.supabaseVerbindung.client
                            .from('artikel')
                            .update({ artikelname: neuerName })
                            .eq('id', id);

                        if (error) throw error;
                        artikelLaden();
                    } catch (err) {
                        alert('Fehler beim Aktualisieren: ' + err.message);
                    }
                });
            });
        });

        document.querySelectorAll('.btn-artikel-loeschen').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (!istAngemeldet()) return;
                const id = e.target.getAttribute('data-id');
                const artikelName = e.target.getAttribute('data-name');
                
                zeigeEigenesBestätigungsModal(
                    "Artikel löschen",
                    `Soll der Artikel <strong>"${artikelName}"</strong> wirklich unwiderruflich aus der Datenbank gelöscht werden?`,
                    true,
                    async (bestätigt) => {
                        if (!bestätigt || !istAngemeldet()) return;
                        try {
                            const { error } = await window.supabaseVerbindung.client
                                .from('artikel')
                                .delete()
                                .eq('id', id);

                            if (error) throw error;
                            artikelLaden();
                        } catch (err) {
                            alert('Fehler beim Löschen: ' + err.message);
                        }
                    }
                );
            });
        });
    }

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => {
                b.style.background = '#FFF';
                b.style.color = '#0F172A';
                b.style.borderColor = '#CBD5E1';
                b.classList.remove('aktiv');
            });

            btn.style.background = '#0D9488';
            btn.style.color = '#FFF';
            btn.style.borderColor = '#0D9488';
            btn.classList.add('aktiv');

            aktuellerFilter = btn.getAttribute('data-kategorie');
            filterUndSucheAnwenden();
        });
    });

    suchEingabe.addEventListener('input', () => {
        if (!istAngemeldet()) return;
        filterUndSucheAnwenden();
    });

    if (istAngemeldet()) {
        artikelLaden();
    }
});