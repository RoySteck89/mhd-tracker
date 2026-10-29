let currentUser = JSON.parse(localStorage.getItem('mhd_user')) || null;
let simulatedRole = null;

document.addEventListener("DOMContentLoaded", () => {
    checkInitialState();
});

function checkInitialState() {
    if (!currentUser) {
        document.getElementById('viewSetup').classList.remove('hidden');
        document.getElementById('statusBadge').innerText = "Status: Nicht aktiviert";
    } else {
        document.getElementById('viewLogin').classList.remove('hidden');
        document.getElementById('statusBadge').innerText = `Gekoppelt als: ${currentUser.name} (${currentUser.rolle})`;
    }
}

// 1. ERSTANMELDUNG MIT KEY
async function registerDevice() {
    const keyCode = document.getElementById('setupKey').value.trim();
    const name = document.getElementById('setupName').value.trim();
    const kassennummer = document.getElementById('setupKasse').value.trim();
    const kassenpin = document.getElementById('setupPin').value.trim();

    if (!keyCode || !name || !kassennummer || !kassenpin) {
        alert("Bitte alle Felder ausfüllen!");
        return;
    }

    const { data: keyData, error: keyError } = await supabase
        .from('keys')
        .select('*')
        .eq('key_code', keyCode)
        .eq('is_active', true)
        .single();

    if (keyError || !keyData) {
        alert("Ungültiger oder bereits inaktiver Aktivierungsschlüssel!");
        return;
    }

    const { data: userData, error: userError } = await supabase
        .from('nutzer')
        .insert([{
            bezirk_id: keyData.bezirk_id,
            filiale_id: keyData.filiale_id,
            name: name,
            kassennummer: kassennummer,
            kassenpin: kassenpin,
            rolle: keyData.rolle
        }])
        .select()
        .single();

    if (userError) {
        alert("Fehler bei der Registrierung: " + userError.message);
        return;
    }

    currentUser = userData;
    localStorage.setItem('mhd_user', JSON.stringify(currentUser));

    alert("Erfolgreich aktiviert!");
    location.reload();
}

// 2. SCHNELL-LOGIN MIT PIN
function loginWithPin() {
    const kassennummer = document.getElementById('loginKasse').value.trim();
    const kassenpin = document.getElementById('loginPin').value.trim();

    if (kassennummer === currentUser.kassennummer && kassenpin === currentUser.kassenpin) {
        loadDashboard(currentUser.rolle);
    } else {
        alert("Falsche Kassennummer oder PIN!");
    }
}

// 3. DASHBOARD LADEN JE NACH ROLLE
function loadDashboard(role) {
    document.getElementById('viewLogin').classList.add('hidden');
    document.getElementById('viewSetup').classList.add('hidden');
    document.getElementById('viewDashboard').classList.remove('hidden');

    if (currentUser.rolle === 'admin' || simulatedRole) {
        document.getElementById('adminSimulatorBar').classList.remove('hidden');
    }

    const activeRole = simulatedRole || role;
    const titleEl = document.getElementById('dashTitle');
    const contentEl = document.getElementById('dashContent');

    if (activeRole === 'admin') {
        titleEl.innerText = "👑 Super-Admin Dashboard";
        contentEl.innerHTML = `<p>Hier hast du die Gesamtübersicht über alle Bezirke, Filialen und kannst neue Haupt-Keys generieren.</p>`;
    } else if (activeRole === 'bezirksleiter') {
        titleEl.innerText = "🏢 Bezirksleitungs-Dashboard";
        contentEl.innerHTML = `<p>Übersicht aller Filialen im Bezirk. Teamleiter-Keys verwalten.</p>`;
    } else if (activeRole === 'teamleiter') {
        titleEl.innerText = "🏪 Teamleiter-Dashboard (Filiale)";
        contentEl.innerHTML = `<p>Deine Filial-Übersicht. Hier siehst du den Mitarbeiter-Key und die gescannten Artikel deines Teams.</p>`;
    } else if (activeRole === 'mitarbeiter') {
        titleEl.innerText = "📱 Mitarbeiter Scan-Maske";
        contentEl.innerHTML = `<p>Hier scannst du Artikel und siehst deine tägliche MHD-Liste.</p>
                               <input type="text" placeholder="Barcode scannen / eingeben">
                               <button>Artikel speichern</button>`;
    }
}

function switchView(role) {
    simulatedRole = role;
    loadDashboard(role);
}

function logoutDevice() {
    document.getElementById('viewDashboard').classList.add('hidden');
    document.getElementById('viewLogin').classList.remove('hidden');
    simulatedRole = null;
    document.getElementById('adminSimulatorBar').classList.add('hidden');
}

function resetDevice() {
    if (confirm("Möchtest du dieses Gerät wirklich komplett zurücksetzen?")) {
        localStorage.removeItem('mhd_user');
        location.reload();
    }
}