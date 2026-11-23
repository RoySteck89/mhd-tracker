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
            // Kurz warten, bis das DOM komplett bereit ist, falls das Script früh lädt
            window.addEventListener('DOMContentLoaded', () => {
                const eingabeFeld = document.getElementById('eingabe-aktivierungsschluessel');
                const schrittCode = document.getElementById('auth-schritt-code');
                const schrittLogin = document.getElementById('auth-schritt-login');

                if (eingabeFeld) {
                    eingabeFeld.value = keyParam.trim();
                }

                // Direkt zur Code-Eingabe / Aktivierung springen, wenn der Parameter da ist
                if (schrittCode && schrittLogin) {
                    schrittLogin.style.display = 'none';
                    schrittLogin.classList.add('ausblenden');
                    schrittCode.style.display = 'flex';
                    schrittCode.classList.remove('ausblenden');
                }
            });
        }
    }

    // 3. Key in der Datenbank validieren
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

        // Einmal-Key-Prüfung
        if (lizenz.ist_einmalig && lizenz.benutzt) {
            return { gueltig: false, fehler: 'Dieser Aktivierungsschlüssel wurde bereits verwendet!' };
        }

        return { gueltig: true, lizenz: lizenz };
    }

    // 4. Einmal-Key einlösen und unwiderruflich aus der Datenbank löschen (Sicherheits-Standard)
    async loeseEinmalKeyEin(lizenzId) {
        if (!this.supabase) return false;

        try {
            // Nach erfolgreicher Nutzung wird der Einmal-Key komplett entfernt, 
            // um Duplicate-Key-Fehler oder Missbrauch zu 100% auszuschließen.
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

// Automatisch mit der Supabase-Verbindung verknüpfen, sobald sie bereit ist
document.addEventListener('DOMContentLoaded', () => {
    if (window.supabaseVerbindung && window.supabaseVerbindung.client) {
        window.keyManager.init(window.supabaseVerbindung.client);
    } else {
        // Fallback: Kurz warten, falls datenbank-verbindung.js einen Tick später lädt
        const checkInterval = setInterval(() => {
            if (window.supabaseVerbindung && window.supabaseVerbindung.client) {
                window.keyManager.init(window.supabaseVerbindung.client);
                clearInterval(checkInterval);
            }
        }, 100);
    }
});