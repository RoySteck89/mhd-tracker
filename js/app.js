let currentUser = JSON.parse(localStorage.getItem('mhd_user')) || null;
let simulatedRole = null;
let pendingKeyData = null;

document.addEventListener("DOMContentLoaded", () => {
    checkInitialState();
});

function checkInitialState() {
    if (!currentUser) {
        document.getElementById('viewSetupKey').classList.remove('hidden');
        document.getElementById('statusBadge').innerText = "Status: Nicht aktiviert";
    } else {
        document.getElementById('viewLogin').classList.remove('hidden');
        document.getElementById('statusBadge').innerText = `Gekoppelt als: ${currentUser.name} (${currentUser.rolle})`;
    }
}

// SCHRITT 1: KEY IN DATENBANK PRÜFEN
async function verifyKeyStep1() {
    const keyCode = document.getElementById('setupKey').value.trim();
    if (!keyCode) {
        alert("Bitte gib einen Aktivierungsschlüssel ein!");
        return;
    }

    const { data: keyData, error } = await supabase
        .from('keys')
        .select('*')
        .eq('key_code', keyCode)
        .eq('is_active', true)
        .single();

    if (error || !keyData) {
        alert("Ungültiger oder bereits inaktiver Aktivierungsschlüssel!");
        return;
    }

    pendingKeyData = keyData;
    document.getElementById('viewSetupKey').classList.add('hidden');
    document.getElementById('viewSetupDetails').classList.remove('hidden');

    const infoText = document.getElementById('roleInfoText');
    const extraContainer = document.getElementById('extraFieldContainer');
    const extraInput = document.getElementById('setupExtraName');

    if (keyData.rolle === 'admin') {
        infoText.innerText = "✓ Erkannt: Super-Admin-Key";
        extraContainer.classList.add('hidden');
    } else if (keyData.rolle === 'bezirksleiter') {
        infoText.innerText = "✓ Erkannt: Bezirksleitung-Key";
        extraContainer.classList.remove('hidden');
        extraInput.placeholder = "Name des Bezirks (z.B. Allgäu)";
    } else if (keyData.rolle === 'teamleiter') {
        infoText.innerText = "✓ Erkannt: Teamleiter-Key";
        extraContainer.classList.remove('hidden');
        extraInput.placeholder = "Name der Filiale (z.B. Filiale Dietmannsried)";
    } else if (keyData.rolle === 'mitarbeiter') {
        infoText.innerText = "✓ Erkannt: Mitarbeiter-Key";
        extraContainer.classList.add('hidden');
    }
}

// SCHRITT 2: NUTZER ANLEGEN UND GERÄT KOPPELN
async function registerDeviceStep2() {
    const name = document.getElementById('setupName').value.trim();
    const kassennummer = document.getElementById('setupKasse').value.trim();
    const kassenpin = document.getElementById('setupPin').value.trim();
    const extraValue = document.getElementById('setupExtraName').value.trim();

    if (!name || !kassennummer || !kassenpin || 
        ((pendingKeyData.rolle === 'bezirksleiter' || pendingKeyData.rolle === 'teamleiter') && !extraValue)) {
        alert("Bitte fülle alle erforderlichen Felder aus!");
        return;
    }

    const { data: userData, error: userError } = await supabase
        .from('nutzer')
        .insert([{
            bezirk_id: pendingKeyData.bezirk_id,
            filiale_id: pendingKeyData.filiale_id,
            name: name,
            kassennummer: kassennummer,
            kassenpin: kassenpin,
            rolle: pendingKeyData.rolle
        }])
        .select()
        .single();

    if (userError) {
        alert("Fehler bei der Registrierung: " + userError.message);
        return;
    }

    currentUser = userData;
    localStorage.setItem('mhd_user', JSON.stringify(currentUser));

    alert("Gerät erfolgreich aktiviert und verknüpft!");
    location.reload();
}

// SCHNELL-LOGIN MIT PIN
function loginWithPin() {
    const kassennummer = document.getElementById('loginKasse').value.trim();
    const kassenpin = document.getElementById('loginPin').value.trim();

    if (kassennummer === currentUser.kassennummer && kassenpin === currentUser.kassenpin) {
        loadDashboard(currentUser.rolle);
    } else {
        alert("Falsche Kassennummer oder PIN!");
    }
}

// DASHBOARD LADEN JE NACH ROLLE
function loadDashboard(role) {
    document.getElementById('viewLogin').classList.add('hidden');
    document.getElementById('viewSetupKey').classList.add('hidden');
    document.getElementById('viewSetupDetails').classList.add('hidden');
    document.getElementById('viewDashboard').classList.remove('hidden');

    if (currentUser.rolle === 'admin' || simulatedRole) {
        document.getElementById('adminSimulatorBar').classList.remove('hidden');
    }

    const activeRole = simulatedRole || role;
    const titleEl = document.getElementById('dashTitle');
    const contentEl = document.getElementById('dashContent');

    if (activeRole === 'admin') {
        titleEl.innerText = "👑 Super-Admin Dashboard";
        contentEl.innerHTML = `<p>Gesamtübersicht über alle Bezirke und Haupt-Keys.</p>`;
    } else if (activeRole === 'bezirksleiter') {
        titleEl.innerText = "🏢 Bezirksleitungs-Dashboard";
        contentEl.innerHTML = `<p>Übersicht aller Filialen im Bezirk und Teamleiter-Keys.</p>`;
    } else if (activeRole === 'teamleiter') {
        titleEl.innerText = "🏪 Teamleiter-Dashboard (Filiale)";
        contentEl.innerHTML = `<p>Filial-Übersicht, Mitarbeiter-Keys verwalten und MHD-Kontrolle.</p>`;
    } else if (activeRole === 'mitarbeiter') {
        titleEl.innerText = "📱 Mitarbeiter Scan-Maske";
        contentEl.innerHTML = `<p>Artikel scannen und fällige MHD-Artikel prüfen.</p>
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
    if (confirm("Möchtest du dieses Gerät wirklich zurücksetzen?")) {
        localStorage.removeItem('mhd_user');
        location.reload();
    }
}