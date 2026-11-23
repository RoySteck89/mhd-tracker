/* ==========================================================================
   BEZIRKSLEITUNG (BL) STEUERUNGSZENTRALE (GEKOPPELT AN DEN KEY-MANAGER)
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
            const zugewiesenerKey = schluessel.find(k => (k.filiale_id === item.filial_code || k.filiale_id == item.id) && k.rolle === 'Teamleitung');
            const verantwortlicher = zugewiesenerKey ? zugewiesenerKey.bezeichnung : 'Noch nicht zugeordnet';

            const el = document.createElement('div');
            el.className = 'liste-karte';
            el.innerHTML = `
                <div>
                    <div class="liste-karte-titel">${item.name} <span style="font-size: 0.75rem; color: #6C757D;">(${item.filial_code || 'ID: ' + item.id})</span></div>
                    <div class="liste-karte-untertitel">TL: <strong>${verantwortlicher}</strong></div>
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
            try {
                if (!window.keyManager) throw new Error('KeyManager nicht bereit.');

                const session = JSON.parse(sessionStorage.getItem('kik_app_lizenz') || '{}');
                const bezirkName = session.name || 'Bezirk';

                // Einmal-Key für Teamleitung erstellen und automatisch dem Bezirk zuweisen
                const erstellterKey = await window.keyManager.erstelleKey({
                    rolle: 'Teamleitung',
                    bezeichnung: `Teamleitung (Bezirk: ${bezirkName})`,
                    filialeId: '', // Filiale wird von der TL bei Registrierung selbst benannt
                    istEinmalig: true
                });

                navigator.clipboard.writeText(erstellterKey.schluessel_code);

                alert(`Teamleiter-Einmal-Key für Bezirk "${bezirkName}" erstellt & kopiert!\n\nSchlüssel: ${erstellterKey.schluessel_code}\n\nDieser Code wurde in deine Zwischenablage kopiert.`);
                blFilialenLaden();
            } catch (err) {
                alert('Fehler beim Erstellen des Keys: ' + err.message);
            }
        });
    }

    const gespeicherteLizenz = sessionStorage.getItem('kik_app_lizenz');
    if (gespeicherteLizenz) {
        const lizenz = JSON.parse(gespeicherteLizenz);
        if (lizenz.rolle === 'Bezirksleitung') {
            blFilialenLaden();
        }
    }
});