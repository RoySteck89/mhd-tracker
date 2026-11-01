const SUPABASE_URL = 'https://zbbmaxwbjqhuziuxoytn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiYm1heHdianFodXppdXhveXRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyODQxMzQsImV4cCI6MjEwODg2MDEzNH0.zoNrYe7tvyf-m7QjGciPYiT5ZdpJHdYEcAvCB-yNlig'; 

const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Dynamische Key-Prüfung über die echte 'keys'-Tabelle (und Fallback auf 'activations')
async function checkActivationKeyInDb(key) {
    const cleanKey = key ? key.trim() : '';

    // Master-Key Bypass für den Admin
    if (cleanKey.toUpperCase() === 'ADMIN-MASTER-KEY') {
        return { rolle: 'admin', bezirk: 'Zentrale', filiale: 'Zentrale' };
    }

    try {
        // 1. Zuerst in der 'keys'-Tabelle prüfen (gemäß deinem Schema)
        let { data, error } = await _supabase
            .from('keys')
            .select('*, filialen(name), bezirke(name)')
            .eq('key_code', cleanKey)
            .eq('is_active', true)
            .maybeSingle();

        if (data) {
            return {
                rolle: data.rolle || 'mitarbeiter',
                bezirk: data.bezirke?.name || 'Bezirk Allgäu',
                filiale: data.filialen?.name || 'Dietmannsried'
            };
        }

        // 2. Falls dort nicht gefunden, in der 'activations'-Tabelle prüfen
        let actResult = await _supabase
            .from('activations')
            .select('*')
            .eq('activation_key', cleanKey)
            .eq('is_active', true)
            .maybeSingle();

        if (actResult.data) {
            return {
                rolle: 'teamleiter', // Standardrolle für Activations-Keys
                bezirk: 'Bezirk Allgäu',
                filiale: actResult.data.store_name || 'Dietmannsried'
            };
        }

        return null;
    } catch (err) {
        console.error('Fehler bei der Datenbank-Prüfung:', err);
        return null;
    }
}

async function saveMhdItem(activationKey, barcode, articleName, mhdDate) {
    try {
        const { error } = await _supabase
            .from('mhd_items')
            .insert([
                { 
                    activation_key: activationKey, 
                    barcode: barcode, 
                    article_name: articleName, 
                    mhd_date: mhdDate 
                }
            ]);

        if (error) {
            console.error('Fehler beim Speichern:', error.message);
            return false;
        }
        return true;
    } catch (err) {
        console.error('Unerwarteter Fehler beim Speichern:', err);
        return false;
    }
}

async function fetchMhdItems(activationKey) {
    try {
        const { data, error } = await _supabase
            .from('mhd_items')
            .select('*')
            .order('mhd_date', { ascending: true });

        if (error) {
            console.error('Fehler beim Laden:', error.message);
            return [];
        }
        return data || [];
    } catch (err) {
        console.error('Unerwarteter Fehler beim Laden:', err);
        return [];
    }
}