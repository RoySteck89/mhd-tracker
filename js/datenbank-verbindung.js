/* ==========================================================================
   DATENBANK-VERBINDUNG (Echte Supabase-Anbindung)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // Supabase Konfigurationsdaten
    const SUPABASE_URL = 'https://zbbmaxwbjqhuziuxoytn.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiYm1heHdianFodXppdXhveXRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyODQxMzQsImV4cCI6MjEwODg2MDEzNH0.zoNrYe7tvyf-m7QjGciPYiT5ZdpJHdYEcAvCB-yNlig';

    // Prüfen, ob die Supabase-Bibliothek geladen wurde
    if (typeof window.supabase === 'undefined') {
        console.error('Supabase Client Bibliothek konnte nicht geladen werden!');
        return;
    }

    // Echten Supabase-Client initialisieren
    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Globales Datenbank-Objekt für die anderen Skripte bereitstellen
    window.supabaseVerbindung = {
        client: supabaseClient,

        // Hilfsfunktion zum Abrufen von Tabellendaten
        datenAbrufen: async function(tabelle) {
            try {
                const { data, error } = await supabaseClient.from(tabelle).select('*');
                if (error) throw error;
                return data;
            } catch (err) {
                console.error(`Fehler beim Abrufen von "${tabelle}":`, err.message);
                return [];
            }
        },

        // Hilfsfunktion zum Speichern eines neuen Artikels
        artikelHinzufuegen: async function(artikelName, barcode) {
            try {
                const { data, error } = await supabaseClient
                    .from('artikel')
                    .insert([{ artikelname: artikelName, barcode: barcode }])
                    .select();
                if (error) throw error;
                console.log('Artikel erfolgreich gespeichert:', data);
                return data;
            } catch (err) {
                console.error('Fehler beim Speichern des Artikels:', err.message);
                return null;
            }
        }
    };

    console.log('Datenbank-Verbindung (Supabase) erfolgreich aktiv und verbunden.');
});