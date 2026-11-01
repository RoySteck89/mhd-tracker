let currentUser = JSON.parse(localStorage.getItem('mhd_user')) || null;
let currentSessionRole = localStorage.getItem('mhd_active_role') || null;
let pendingKeyData = null;
let html5QrCode = null;

document.addEventListener("DOMContentLoaded", () => {
    checkInitialState();
});

function checkInitialState() {
    if (!currentUser) {
        document.getElementById('viewSetupKey').classList.remove('hidden');
        document.getElementById('statusBadge').innerText = "Status: Nicht aktiviert";
    } else {
        // Prüfen, ob das Gerät bereits eingeloggt war oder ob der Login-Screen gezeigt werden soll
        const isLoggedIn = localStorage.getItem('mhd_logged_in') === 'true';
        if (isLoggedIn && currentSessionRole) {
            // Direkt im Dashboard bleiben beim Neuladen!
            loadDashboard(currentSessionRole);
        } else {
            document.getElementById('viewLogin').classList.remove('hidden');
            document.getElementById('statusBadge').innerText = `Gekoppelt als: ${currentUser.name} (${currentUser.rolle})`;
        }
    }
}

// SCHRITT 1: KEY IN DATENBANK PRÜFEN
async function verifyKeyStep1() {
    const keyCode = document.getElementById('setupKey').value.trim();
    if (!keyCode) {
        alert("Bitte gib einen Aktivierungsschlüssel ein!");
        return;
    }

    const { data: keyData, error } = await _supabase
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
        infoText.innerText = "👑 Erkannt: Super-Admin Schlüssel";
        extraContainer.classList.add('hidden');
    } else if (keyData.rolle === 'bezirksleiter') {
        infoText.innerText = "🏢 Erkannt: Bezirksleitung Key";
        extraContainer.classList.remove('hidden');
        extraInput.placeholder = "Name des neuen Bezirks";
    } else if (keyData.rolle === 'teamleiter') {
        infoText.innerText = "🏪 Erkannt: Teamleiter Key";
        extraContainer.classList.remove('hidden');
        extraInput.placeholder = "Name der neuen Filiale";
    } else if (keyData.rolle === 'mitarbeiter') {
        infoText.innerText = "📱 Erkannt: Mitarbeiter Key";
        extraContainer.classList.add('hidden');
    }
}

// SCHRITT 2: NUTZER ANLEGEN UND GERÄT KOPPELN
async function registerDeviceStep2() {
    const name = document.getElementById('setupName').value.trim();
    const kassennummer = document.getElementById('setupKasse').value.trim();
    const kassenpin = document.getElementById('setupPin').value.trim();
    const extraValue = document.getElementById('setupExtraName').value.trim();

    if (!name || !kassennummer || !kassenpin) {
        alert("Bitte fülle alle Grundfelder aus!");
        return;
    }

    let bezirkId = pendingKeyData.bezirk_id || null;
    let filialeId = pendingKeyData.filiale_id || null;

    if (pendingKeyData.rolle === 'bezirksleiter' && extraValue) {
        const { data: bData } = await _supabase.from('bezirke').insert([{ name: extraValue }]).select().single();
        if (bData) bezirkId = bData.id;
    } else if (pendingKeyData.rolle === 'teamleiter' && extraValue) {
        const { data: fData } = await _supabase.from('filialen').insert([{ bezirk_id: bezirkId, name: extraValue }]).select().single();
        if (fData) filialeId = fData.id;
    }

    const { data: userData, error: userError } = await _supabase
        .from('nutzer')
        .insert([{
            bezirk_id: bezirkId,
            filiale_id: filialeId,
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

    alert("Gerät erfolgreich aktiviert!");
    location.reload();
}

// SCHNELL-LOGIN MIT PIN
function loginWithPin() {
    const kassennummer = document.getElementById('loginKasse').value.trim();
    const kassenpin = document.getElementById('loginPin').value.trim();

    if (currentUser && kassennummer === currentUser.kassennummer && kassenpin === currentUser.kassenpin) {
        // Dauerhaft eingeloggt speichern
        localStorage.setItem('mhd_logged_in', 'true');
        loadDashboard(currentUser.rolle);
    } else {
        alert("Falsche Kassennummer oder PIN!");
    }
}

// DASHBOARD LADEN & ROLLE ANZEIGEN
async function loadDashboard(role) {
    await stopScanner();

    // Aktivierte Rolle in Session speichern gegen Logout bei Neuladen
    currentSessionRole = simulatedRole || role;
    localStorage.setItem('mhd_active_role', currentSessionRole);
    localStorage.setItem('mhd_logged_in', 'true');

    document.getElementById('viewLogin').classList.add('hidden');
    document.getElementById('viewSetupKey').classList.add('hidden');
    document.getElementById('viewSetupDetails').classList.add('hidden');
    document.getElementById('viewDashboard').classList.remove('hidden');
    document.getElementById('statusBadge').innerText = `Angemeldet als: ${currentUser.name} (${currentSessionRole})`;

    if (currentUser.rolle === 'admin' || simulatedRole) {
        document.getElementById('adminSimulatorBar').classList.remove('hidden');
    }

    const titleEl = document.getElementById('dashTitle');
    const contentEl = document.getElementById('dashContent');

    if (currentSessionRole === 'admin') {
        titleEl.innerText = "👑 Super-Admin Steuerung";
        contentEl.innerHTML = `
            <div class="card">
                <h3>🏢 Neuer Bezirk anlegen</h3>
                <div style="display: flex; gap: 8px;">
                    <input type="text" id="newBezirkName" placeholder="Bezirk Name (z.B. Allgäu)" style="margin: 0; flex: 1;">
                    <button onclick="createBezirk()" style="width: auto; margin: 0; background: #28a745;">Erstellen</button>
                </div>
            </div>

            <div class="card">
                <h3>🏪 Filialen & Bezirks-Zuordnung</h3>
                <div id="filialAssignmentList">Lade Filialen...</div>
            </div>

            <div class="card">
                <h3>🔑 Aktivierungs-Key generieren</h3>
                <select id="newKeyRole">
                    <option value="teamleiter">Teamleiter Key (für Filiale)</option>
                    <option value="bezirksleiter">Bezirksleiter Key</option>
                    <option value="mitarbeiter">Mitarbeiter Key</option>
                </select>
                <div style="display: flex; gap: 8px; margin: 8px 0;">
                    <input type="text" id="newKeyCode" placeholder="Zufalls-Key erzeugen..." style="margin: 0; flex: 1;">
                    <button type="button" onclick="createRandomKeyInput()" style="width: auto; margin: 0; background: #6c757d;">🎲 Zufall</button>
                </div>
                <button onclick="generateKey()" style="margin-top: 10px;">Key in Datenbank speichern</button>
            </div>

            <div class="card">
                <h3>📋 Aktive Keys & Verwaltung</h3>
                <div id="keyList">Lade Keys...</div>
            </div>
        `;
        renderKeyList();
        renderFilialAssignments();
        createRandomKeyInput();

    } else if (currentSessionRole === 'bezirksleiter') {
        titleEl.innerText = "🏢 Bezirksleitungs-Ansicht";
        contentEl.innerHTML = `<div class="card"><p>Übersicht über alle Filialen im Bezirk & Teamleiter-Verwaltung.</p></div>`;
    } else if (currentSessionRole === 'teamleiter') {
        titleEl.innerText = "🏪 Teamleiter-Ansicht (Filiale & Scanner)";
        contentEl.innerHTML = `
            <div class="card" style="background: #e2e8f0; margin-bottom: 15px;">
                <h3>Mitarbeiter-Key für deine Filiale erstellen</h3>
                <p style="font-size: 13px; color: #555;">Dieser Key dient allen Mitarbeitern deiner Filiale zur Geräteaktivierung.</p>
                <div style="display: flex; gap: 8px; margin: 8px 0;">
                    <input type="text" id="employeeKeyCode" placeholder="Generiere Key..." style="margin: 0; flex: 1;">
                    <button type="button" onclick="createEmployeeKeyInput()" style="width: auto; margin: 0; background: #6c757d;">🎲 Neu laden</button>
                </div>
                <button onclick="generateEmployeeKey()" style="margin-top: 5px; background: #28a745;">Diesen Filial-Key freigeben</button>
            </div>

            <div class="card">
                <h3>Barcode Scanner & Artikelerfassung</h3>
                <div id="reader" style="width: 100%; min-height: 200px; background: #000; border-radius: 6px; overflow: hidden;"></div>
                
                <div style="margin-top: 15px;">
                    <label><strong>Gescannter / Manueller Barcode:</strong></label>
                    <input type="text" id="scannedBarcode" placeholder="Barcode hier eintragen oder scannen...">
                </div>
                
                <div style="margin-top: 10px;">
                    <label><strong>Artikelbezeichnung:</strong></label>
                    <input type="text" id="articleName" placeholder="z.B. Milch 1L">
                </div>

                <div style="margin-top: 10px;">
                    <label><strong>MHD (Mindesthaltbarkeitsdatum):</strong></label>
                    <input type="date" id="articleMhd">
                </div>

                <button onclick="saveMhdItem()" style="margin-top: 15px; background: #28a745;">Artikel speichern</button>
            </div>
        `;
        setTimeout(() => {
            initScanner();
            createEmployeeKeyInput();
        }, 300);

    } else if (currentSessionRole === 'mitarbeiter') {
        titleEl.innerText = "📱 Mitarbeiter Scan-Ansicht";
        contentEl.innerHTML = `
            <div class="card">
                <h3>Barcode Scanner</h3>
                <div id="reader" style="width: 100%; min-height: 200px; background: #000; border-radius: 6px; overflow: hidden;"></div>
                
                <div style="margin-top: 15px;">
                    <label><strong>Gescannter / Manueller Barcode:</strong></label>
                    <input type="text" id="scannedBarcode" placeholder="Barcode hier eintragen oder scannen...">
                </div>
                
                <div style="margin-top: 10px;">
                    <label><strong>Artikelbezeichnung:</strong></label>
                    <input type="text" id="articleName" placeholder="z.B. Milch 1L">
                </div>

                <div style="margin-top: 10px;">
                    <label><strong>MHD (Mindesthaltbarkeitsdatum):</strong></label>
                    <input type="date" id="articleMhd">
                </div>

                <button onclick="saveMhdItem()" style="margin-top: 15px; background: #28a745;">Artikel speichern</button>
            </div>
        `;
        setTimeout(() => {
            initScanner();
        }, 300);
    }
}

// AUTOMATISCHER SCANNER
async function initScanner() {
    const readerEl = document.getElementById('reader');
    if (readerEl && !html5QrCode) {
        html5QrCode = new Html5Qrcode("reader");
        const config = { fps: 10, qrbox: { width: 250, height: 150 } };
        
        try {
            await html5QrCode.start(
                { facingMode: "environment" },
                config,
                (decodedText) => {
                    document.getElementById('scannedBarcode').value = decodedText;
                },
                (errorMessage) => {}
            );
        } catch (err) {
            console.warn("Kamera-Start fehlgeschlagen:", err);
        }
    }
}

async function stopScanner() {
    if (html5QrCode) {
        try {
            await html5QrCode.stop();
            html5QrCode.clear();
        } catch (e) {}
        html5QrCode = null;
    }
}

// ADMIN: NEUEN BEZIRK ERSTELLEN
async function createBezirk() {
    const name = document.getElementById('newBezirkName').value.trim();
    if (!name) {
        alert("Bitte einen Bezirksnamen eingeben!");
        return;
    }

    const { error } = await _supabase.from('bezirke').insert([{ name: name }]);
    if (error) {
        alert("Fehler beim Erstellen: " + error.message);
    } else {
        alert(`Bezirk "${name}" erfolgreich erstellt!`);
        document.getElementById('newBezirkName').value = '';
        renderFilialAssignments();
    }
}

// ADMIN: FILIALEN UND BEREICHS-ZUORDNUNGEN ANZEIGEN & ÄNDERN
async function renderFilialAssignments() {
    const listEl = document.getElementById('filialAssignmentList');
    if (!listEl) return;

    const { data: filialen } = await _supabase.from('filialen').select('*');
    const { data: bezirke } = await _supabase.from('bezirke').select('*');

    if (!filialen || filialen.length === 0) {
        listEl.innerHTML = "<p style='font-size: 13px; color: #666;'>Noch keine Filialen registriert.</p>";
        return;
    }

    let html = "<div style='display: flex; flex-direction: column; gap: 10px;'>";
    filialen.forEach(f => {
        let options = `<option value="">-- Kein Bezirk zugewiesen --</option>`;
        if (bezirke) {
            bezirke.forEach(b => {
                const selected = f.bezirk_id === b.id ? 'selected' : '';
                options += `<option value="${b.id}" ${selected}>${b.name}</option>`;
            });
        }

        html += `
            <div style="background: #fff; padding: 10px; border-radius: 4px; border: 1px solid #ccc;">
                <strong>🏪 ${f.name}</strong>
                <div style="margin-top: 5px;">
                    <label style="font-size: 12px; color: #555;">Bezirk zuweisen:</label>
                    <select onchange="updateFilialeBezirk(${f.id}, this.value)" style="margin: 3px 0; padding: 6px;">
                        ${options}
                    </select>
                </div>
            </div>
        `;
    });
    html += "</div>";
    listEl.innerHTML = html;
}

async function updateFilialeBezirk(filialeId, bezirkId) {
    const newBezirkId = bezirkId ? parseInt(bezirkId) : null;
    const { error } = await _supabase
        .from('filialen')
        .update({ bezirk_id: newBezirkId })
        .eq('id', filialeId);

    if (error) {
        alert("Fehler beim Aktualisieren: " + error.message);
    } else {
        alert("Zuordnung erfolgreich aktualisiert!");
    }
}

// ARTIKEL SPEICHERN
async function saveMhdItem() {
    const barcode = document.getElementById('scannedBarcode').value.trim();
    const name = document.getElementById('articleName').value.trim();
    const mhd = document.getElementById('articleMhd').value;

    if (!barcode || !name || !mhd) {
        alert("Bitte Barcode, Artikelbezeichnung und MHD ausfüllen!");
        return;
    }

    const { error } = await _supabase.from('artikel').insert([{
        filiale_id: currentUser.filiale_id,
        erfasst_von: currentUser.id,
        barcode: barcode,
        bezeichnung: name,
        mhd: mhd,
        status: 'offen'
    }]);

    if (error) {
        alert("Fehler beim Speichern: " + error.message);
    } else {
        alert("Artikel erfolgreich gespeichert!");
        document.getElementById('scannedBarcode').value = '';
        document.getElementById('articleName').value = '';
        document.getElementById('articleMhd').value = '';
    }
}

// ZUFALLS-KEY FÜR ADMIN
function generateRandomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'MHD-';
    for (let i = 0; i < 8; i++) {
        if (i === 4) code += '-';
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function createRandomKeyInput() {
    const input = document.getElementById('newKeyCode');
    if (input) {
        input.value = generateRandomCode();
    }
}

async function generateKey() {
    const role = document.getElementById('newKeyRole').value;
    const code = document.getElementById('newKeyCode').value.trim();

    if (!code) {
        alert("Bitte einen Key-Code eingeben oder generieren!");
        return;
    }

    const { error } = await _supabase.from('keys').insert([{ key_code: code, rolle: role }]);

    if (error) {
        alert("Fehler beim Erstellen: " + error.message);
    } else {
        alert(`Key "${code}" (${role}) erfolgreich erstellt!`);
        renderKeyList();
        createRandomKeyInput();
    }
}

// MITARBEITER-KEY STRUKTUR
async function createEmployeeKeyInput() {
    let filialName = "Filiale";
    
    if (currentUser && currentUser.filiale_id) {
        const { data: fData } = await _supabase
            .from('filialen')
            .select('name')
            .eq('id', currentUser.filiale_id)
            .single();
            
        if (fData && fData.name) {
            filialName = fData.name.replace(/\s+/g, '-');
        }
    }

    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const input = document.getElementById('employeeKeyCode');
    if (input) {
        input.value = `MHD-${filialName}-${randomNum}`;
    }
}

async function generateEmployeeKey() {
    const code = document.getElementById('employeeKeyCode').value.trim();
    if (!code) {
        alert("Bitte Key eingeben!");
        return;
    }

    const { error } = await _supabase.from('keys').insert([{
        key_code: code,
        rolle: 'mitarbeiter',
        bezirk_id: currentUser.bezirk_id,
        filiale_id: currentUser.filiale_id,
        is_active: true
    }]);

    if (error) {
        alert("Fehler beim Erstellen (evtl. existiert dieser Key bereits): " + error.message);
    } else {
        alert(`Der Filial-Mitarbeiter-Key "${code}" ist jetzt aktiv und kann weitergegeben werden!`);
        createEmployeeKeyInput();
    }
}

async function renderKeyList() {
    const listEl = document.getElementById('keyList');
    if (!listEl) return;

    const { data: keys, error } = await _supabase.from('keys').select('*').order('created_at', { ascending: false });
    if (error || !keys) {
        listEl.innerHTML = "<p>Keine Keys gefunden.</p>";
        return;
    }

    let html = "<ul style='padding-left: 20px; margin: 0;'>";
    keys.forEach(k => {
        html += `<li style="margin-bottom: 6px;"><strong>${k.key_code}</strong> <span style="color: #666; font-size: 13px;">(${k.rolle})</span> – Status: ${k.is_active ? '✅ Aktiv' : '❌ Inaktiv'}</li>`;
    });
    html += "</ul>";
    listEl.innerHTML = html;
}

// ADMIN SIMULATOR UMSCHALTER
async function switchView(role) {
    simulatedRole = role;
    
    ['admin', 'bezirksleiter', 'teamleiter', 'mitarbeiter'].forEach(r => {
        const btn = document.getElementById(`btn-${r}`);
        if (btn) {
            if (r === role) btn.classList.add('active');
            else btn.classList.remove('active');
        }
    });

    await loadDashboard(role);
}

function logoutDevice() {
    stopScanner();
    // Kompletter Logout, löscht auch den Session-Status
    localStorage.removeItem('mhd_logged_in');
    localStorage.removeItem('mhd_active_role');
    document.getElementById('viewDashboard').classList.add('hidden');
    document.getElementById('viewLogin').classList.remove('hidden');
    simulatedRole = null;
    currentSessionRole = null;
    document.getElementById('adminSimulatorBar').classList.add('hidden');
    location.reload();
}

function resetDevice() {
    if (confirm("Möchtest du dieses Gerät wirklich komplett zurücksetzen und entkoppeln?")) {
        localStorage.clear();
        location.reload();
    }
}