/* ==========================================================================
   BEZIRKSLEITUNG (BL) STEUERUNGSZENTRALE (SAUBER GETRENNT VON CSS)
   ========================================================================== */

async function blFilialenLaden() {
    const listeBehaelter = document.getElementById('behaelter-bl-filialen-liste');
    if (!window.supabaseVerbindung || !listeBehaelter) return;

    listeBehaelter.innerHTML = '<div style="padding: 12px; text-align: center; color: #6C757D;">Lade Bezirks-Filialen...</div>';

    try {
        const filialen = await window.supabaseVerbindung.datenAbrufen('filialen');
        const schluessel = await window.supabaseVerbindung.datenAbrufen('lizenz_schluessel');

        if (!filialen || filialen.length === 0) {
            listeBehaelter.innerHTML = '<div class="liste-karte" style="justify-content: center; color: #6C757D;">Keine Filialen im System registriert.</div>';
            return;
        }

        listeBehaelter.innerHTML = '';
        filialen.forEach(item => {
            const zugewiesenerKey = schluessel.find(k => k.filiale_id === item.filial_code || k.filiale_id == item.id);
            const verantwortlicher = zugewiesenerKey ? zugewiesenerKey.bezeichnung : 'Noch nicht zugeordnet';

            const el = document.createElement('div');
            el.className = 'liste-karte';
            el.innerHTML = `
                <div>
                    <div class="liste-karte-titel">${item.name} <span style="font-size: 0.75rem; color: #6C757D;">(${item.filial_code || 'ID: ' + item.id})</span></div>
                    <div class="liste-karte-untertitel">Verknüpft mit: <strong>${verantwortlicher}</strong></div>
                </div>
                <button class="btn-aktions-loeschen btn-bl-filiale-loeschen" data-id="${item.id}">🗑️ Löschen</button>
            `;
            listeBehaelter.appendChild(el);
        });

        document.querySelectorAll('.btn-bl-filiale-loeschen').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                if (confirm('Filiale wirklich aus dem Bezirk löschen?')) {
                    const { error } = await window.supabaseVerbindung.client.from('filialen').delete().eq('id', id);
                    if (!error) blFilialenLaden();
                    else alert('Fehler beim Löschen: ' + error.message);
                }
            });
        });

    } catch (err) {
        console.error('Fehler beim Laden der BL-Filialen:', err);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const blKeyErstellenBtn = document.getElementById('schaltflaeche-bl-key-erstellen');
    if (blKeyErstellenBtn) {
        blKeyErstellenBtn.addEventListener('click', async () => {
            const block = () => Math.floor(1000 + Math.random() * 9000);
            const neuerKey = `KIK-${block()}-${block()}-${block()}`;

            try {
                const { error } = await window.supabaseVerbindung.client
                    .from('lizenz_schluessel')
                    .insert([{
                        schluessel_code: neuerKey,
                        bezeichnung: 'Offen (Teamleitung)',
                        rolle: 'Teamleitung',
                        filiale_id: '',
                        ist_einmalig: true,
                        benutzt: false
                    }]);

                if (error) throw error;

                navigator.clipboard.writeText(neuerKey);

                alert(`Teamleiter-Key erfolgreich erstellt & kopiert!\n\nSchlüssel: ${neuerKey}\n\nDieser Code wurde in deine Zwischenablage kopiert.`);
                blFilialenLaden();
            } catch (err) {
                alert('Fehler beim Erstellen des Keys: ' + err.message);
            }
        });
    }

    // Direkt laden, wenn Ansicht aktiv ist
    const gespeicherteLizenz = localStorage.getItem('kik_app_lizenz');
    if (gespeicherteLizenz) {
        const lizenz = JSON.parse(gespeicherteLizenz);
        if (lizenz.rolle === 'Bezirksleitung') {
            blFilialenLaden();
        }
    }
});