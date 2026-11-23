/* ==========================================================================
   KEY-MANAGER (Zentrales, gekapseltes Modul für die gesamte Key- & Hierarchie-Logik)
   ========================================================================== */

class KeyManager {
    constructor() {
        this.supabase = null;
    }

    // Initialisierung mit der bestehenden Supabase-Verbindung
    init(supabaseClient) {
        this.supabase = supabaseClient;
        this.pruefeUrlParameterKey();
    }

    // 1. Sicheren Key generieren (Format: KIK-XXXX-XXXX-XXXX)
    generiereSicherenKey() {
        const block = () => Math.floor(1000 + Math.random() * 9000);
        return `KIK-${block()}-${block()}-${block()}`;
    }

    // 2. URL-Parameter prüfen (Magischer QR-Code Auto-Fill)
    pruefeUrlParameterKey() {
        const urlParams = new URLSearchParams(window.location.search);
        const keyParam = urlParams.get('key');
        
        if (keyParam) {
            window.addEventListener('DOMContentLoaded', () => {
                const eingabeFeld = document.getElementById('eingabe-aktivierungsschluessel');
                const schrittCode = document.getElementById('auth-schritt-code');
                const schrittLogin = document.getElementById('auth-schritt-login');

                if (eingabeFeld) {
                    eingabeFeld.value = keyParam.trim();
                }

                if (schrittCode && schrittLogin) {
                    schrittLogin.style.display = 'none';
                    schrittLogin.classList.add('ausblenden');
                    schrittCode.style.display = 'flex';
                    schrittCode.classList.remove('ausblenden');
                }
            });
        }
    }

    // 3. Key in der Datenbank validieren (WICHTIG: Multikeys für Mitarbeiter nicht als "benutzt" sperren!)
    async pruefeKey(schluesselCode) {
        if (!this.supabase) throw new Error('Datenbank nicht verbunden.');

        const { data, error } = await this.supabase
            .from('lizenz_schluessel')
            .select('*')
            .eq('schluessel_code', schluesselCode.trim());

        if (error || !data || data.length === 0) {
            return { gueltig: false, fehler: 'Ungültiger oder nicht existierender Aktivierungsschlüssel.' };
        }

        const lizenz = data[0];

        // Wenn es ein echter Einmal-Key ist und bereits benutzt wurde -> Fehler
        if (lizenz.ist_einmalig && lizenz.benutzt) {
            return { gueltig: false, fehler: 'Dieser Aktivierungsschlüssel wurde bereits verwendet!' };
        }

        // Mitarbeiter-Multikeys (Filial-Aushang-Keys) dürfen mehrfach verwendet werden!
        return { gueltig: true, lizenz: lizenz };
    }

    // 4. Einmal-Key einlösen
    async loeseEinmalKeyEin(lizenzId) {
        if (!this.supabase) return false;

        try {
            const { error } = await this.supabase
                .from('lizenz_schluessel')
                .delete()
                .eq('id', lizenzId);

            if (error) throw error;
            return true;
        } catch (err) {
            console.error('Fehler beim Löschen des Einmal-Keys:', err);
            return false;
        }
    }

    // 5. Neuen Key erstellen (Top-Down Hierarchie)
    async erstelleKey({ rolle, bezeichnung, filialeId = '', istEinmalig = true }) {
        if (!this.supabase) throw new Error('Datenbank nicht verbunden.');

        const neuerCode = this.generiereSicherenKey();

        const { data, error } = await this.supabase
            .from('lizenz_schluessel')
            .insert([{
                schluessel_code: neuerCode,
                bezeichnung: bezeichnung,
                rolle: rolle,
                filiale_id: filialeId,
                ist_einmalig: istEinmalig,
                benutzt: false,
                thema: 'kik'
            }])
            .select();

        if (error) throw error;
        return data[0];
    }
}

// Globales KeyManager-Objekt bereitstellen
window.keyManager = new KeyManager();

document.addEventListener('DOMContentLoaded', () => {
    if (window.supabaseVerbindung && window.supabaseVerbindung.client) {
        window.keyManager.init(window.supabaseVerbindung.client);
    } else {
        const checkInterval = setInterval(() => {
            if (window.supabaseVerbindung && window.supabaseVerbindung.client) {
                window.keyManager.init(window.supabaseVerbindung.client);
                clearInterval(checkInterval);
            }
        }, 100);
    }
});