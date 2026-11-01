let currentUser = null;
let currentSessionRole = localStorage.getItem('mhd_active_role') || null;
let simulatedRole = null;
let pendingKeyData = null;
let html5QrCode = null;

// Sicheres Laden und automatisches Bereinigen fehlerhafter LocalStorage-Daten
try {
    const rawUser = localStorage.getItem('mhd_user');
    if (rawUser) {
        currentUser = JSON.parse(rawUser);
        if (!currentUser || !currentUser.kassennummer || !currentUser.kassenpin) {
            localStorage.clear();
            currentUser = null;
        }
    }
} catch (e) {
    console.warn("Storage-Bereinigung ausgeführt:", e);
    localStorage.clear();
    currentUser = null;
}

// BENUTZERSPEZIFISCHE EINSTELLUNGEN BEIM START LADEN
document.addEventListener("DOMContentLoaded", () => {
    try {
        applyUserPreferences();
        checkInitialState();
    } catch (err) {
        console.error("Fehler beim Starten der App:", err);
        alert("Ein Startfehler ist aufgetreten: " + err.message);
    }
});

// Lädt Design und Schriftgröße exakt für den aktuell eingeloggten Nutzer
function applyUserPreferences() {
    const userId = currentUser ? currentUser.id : 'guest';
    const savedTheme = localStorage.getItem(`mhd_theme_${userId}`) || 'kik';
    const savedFontSize = localStorage.getItem(`mhd_fontsize_${userId}`) || '16';

    changeTheme(savedTheme, false);
    changeFontSize(savedFontSize, false);

    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) themeSelect.value = savedTheme;

    const fontRange = document.getElementById('fontSizeRange');
    const fontVal = document.getElementById('fontSizeVal');
    if (fontRange) fontRange.value = savedFontSize;
    if (fontVal) fontVal.innerText = `${savedFontSize}px`;
}

function changeTheme(themeName, save = true) {
    document.body.className = document.body.className.replace(/theme-\S+/g, '');
    document.body.classList.add(`theme-${themeName}`);
    
    if (save) {
        const userId = currentUser ? currentUser.id : 'guest';
        localStorage.setItem(`mhd_theme_${userId}`, themeName);
    }
}

function changeFontSize(sizePx, save = true) {
    document.documentElement.style.setProperty('--base-font-size', `${sizePx}px`);
    
    const fontVal = document.getElementById('fontSizeVal');
    if (fontVal) fontVal.innerText = `${sizePx}px`;

    if (save) {
        const userId = currentUser ? currentUser.id : 'guest';
        localStorage.setItem(`mhd_fontsize_${userId}`, sizePx);
    }
}

function checkInitialState() {
    hideAllViews();
    if (!currentUser) {
        const viewSetup = document.getElementById('viewSetupKey');
        if (viewSetup) viewSetup.classList.remove('hidden');
        const badge = document.getElementById('statusBadge');
        if (badge) badge.innerText = "Status: Nicht aktiviert";
    } else {
        const isLoggedIn = localStorage.getItem('mhd_logged_in') === 'true';
        if (isLoggedIn && currentSessionRole) {
            loadDashboard(currentSessionRole);
        } else {
            const viewLogin = document.getElementById('viewLogin');
            if (viewLogin) viewLogin.classList.remove('hidden');
            const badge = document.getElementById('statusBadge');
            if (badge) badge.innerText = `Gekoppelt als: ${currentUser.name} (${currentUser.rolle})`;
        }
    }
}

function hideAllViews() {
    ['viewSetupKey', 'viewSetupDetails', 'viewLogin', 'viewDashboard'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
}

// SCHRITT 1: KEY IN DATENBANK PRÜFEN
async function verifyKeyStep1() {
    const keyInput = document.getElementById('setupKey');
    if (!keyInput) return;
    const keyCode = keyInput.value.trim();
    
    if (!keyCode) {
        alert("Bitte gib einen Aktivierungsschlüssel ein!");
        return;
    }

    if (typeof _supabase === 'undefined') {
        alert("Supabase ist nicht verbunden! Bitte prüfe die Verbindung.");
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
    hideAllViews();
    const detailsView = document.getElementById('viewSetupDetails');
    if (detailsView) detailsView.classList.remove('hidden');

    const infoText = document.getElementById('roleInfoText');
    const extraContainer = document.getElementById('extraFieldContainer');
    const extraInput = document.getElementById('setupExtraName');

    if (keyData.rolle === 'admin') {
        if (infoText) infoText.innerText = "👑 Erkannt: Super-Admin Schlüssel";
        if (extraContainer) extraContainer.classList.add('hidden');
    } else if (keyData.rolle === 'bezirksleiter') {
        if (infoText) infoText.innerText = "🏢 Erkannt: Bezirksleitung Key";
        if (extraContainer) extraContainer.classList.remove('hidden');
        if (extraInput) extraInput.placeholder = "Name des neuen Bezirks";
    } else if (keyData.rolle === 'teamleiter') {
        if (infoText) infoText.innerText = "🏪 Erkannt: Teamleiter Key";
        if (extraContainer) extraContainer.classList.remove('hidden');
        if (extraInput) extraInput.placeholder = "Name der neuen Filiale";
    } else if (keyData.rolle === 'mitarbeiter') {
        if (infoText) infoText.innerText = "📱 Erkannt: Mitarbeiter Key";
        if (extraContainer) extraContainer.classList.add('hidden');
    }
}

// SCHRITT 2: NUTZER ANLEGEN UND GERÄT KOPPELN
async function registerDeviceStep2() {
    const name = document.getElementById('setupName')?.value.trim();
    const kassennummer = document.getElementById('setupKasse')?.value.trim();
    const kassenpin = document.getElementById('setupPin')?.value.trim();
    const extraValue = document.getElementById('setupExtraName')?.value.trim();

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
    localStorage.setItem('mhd_logged_in', 'true');
    localStorage.setItem('mhd_active_role', currentUser.rolle);

    alert("Gerät erfolgreich aktiviert!");
    location.reload();
}

// SCHNELL-LOGIN MIT PIN
function loginWithPin() {
    const kassennummer = document.getElementById('loginKasse')?.value.trim();
    const kassenpin = document.getElementById('loginPin')?.value.trim();

    if (currentUser && kassennummer === currentUser.kassennummer && kassenpin === currentUser.kassenpin) {
        localStorage.setItem('mhd_logged_in', 'true');
        applyUserPreferences(); // Lädt die spezifischen Präferenzen des Nutzers
        loadDashboard(currentUser.rolle);
    } else {
        alert("Falsche Kassennummer oder PIN!");
    }
}

// DASHBOARD LADEN & ROLLE ANZEIGEN
async function loadDashboard(role) {
    await stopScanner();

    currentSessionRole = simulatedRole || role;
    localStorage.setItem('mhd_active_role', currentSessionRole);
    localStorage.setItem('mhd_logged_in', 'true');

    hideAllViews();
    const dashView = document.getElementById('viewDashboard');
    if (dashView) dashView.classList.remove('hidden');

    const badge = document.getElementById('statusBadge');
    if (badge) badge.innerText = `Angemeldet als: ${currentUser ? currentUser.name : 'Nutzer'} (${currentSessionRole})`;

    const adminBar = document.getElementById('adminSimulatorBar');
    if (adminBar) {
        if ((currentUser && currentUser.rolle === 'admin') || simulatedRole) {
            adminBar.classList.remove('hidden');
        } else {
            adminBar.classList.add('hidden');
        }
    }

    const titleEl = document.getElementById('dashTitle');
    const contentEl = document.getElementById('dashContent');
    if (!titleEl || !contentEl) return;

    if (currentSessionRole === 'admin') {
        titleEl.innerText = "👑 Super-Admin Steuerung";
        contentEl.innerHTML = `
            <div class="card">
                <h3>🏢 Neuer Bezirk anlegen</h3>
                <div style="display: flex; gap: 8px;">
                    <input type="text" id="newBezirkName" placeholder="Bezirk Name (z.B. Allgäu)" style="margin: 0; flex: 1;">
                    <button onclick="createBezirk()" style="width: auto; margin: 0;">Erstellen</button>
                </div>
            </div>

            <div class="card">
                <h3>🏪 Filialübersicht & Leiter-Verwaltung</h3>
                <div id="filialAssignmentList">Lade Filialen und Leiter...</div>
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
            <div class="card" style="margin-bottom: 15px;">
                <h3>Mitarbeiter-Key für deine Filiale erstellen</h3>
                <p style="font-size: calc(var(--base-font-size) * 0.9); opacity: 0.8;">Dieser Key dient allen Mitarbeitern deiner Filiale zur Geräteaktivierung.</p>
                <div style="display: flex; gap: 8px; margin: 8px 0;">
                    <input type="text" id="employeeKeyCode" placeholder="Generiere Key..." style="margin: 0; flex: 1;">
                    <button type="button" onclick="createEmployeeKeyInput()" style="width: auto; margin: 0; background: #6c757d;">🎲 Neu laden</button>
                </div>
                <button onclick="generateEmployeeKey()" style="margin-top: 5px;">Diesen Filial-Key freigeben</button>
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

                <button onclick="saveMhdItem()" style="margin-top: 15px;">Artikel speichern</button>
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

                <button onclick="saveMhdItem()" style="margin-top: 15px;">Artikel speichern</button>
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
    if (readerEl && !html5QrCode && typeof Html5Qrcode !== 'undefined') {
        html5QrCode = new Html5Qrcode("reader");
        const config = { fps: 10, qrbox: { width: 250, height: 150 } };
        
        try {
            await html5QrCode.start(
                { facingMode: "environment" },
                config,
                (decodedText) => {
                    const barcodeField = document.getElementById('scannedBarcode');
                    if (barcodeField) barcodeField.value = decodedText;
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
    const nameInput = document.getElementById('newBezirkName');
    if (!nameInput) return;
    const name = nameInput.value.trim();
    if (!name) {
        alert("Bitte einen Bezirksnamen eingeben!");
        return;
    }

    const { error } = await _supabase.from('bezirke').insert([{ name: name }]);
    if (error) {
        alert("Fehler beim Erstellen: " + error.message);
    } else {
        alert(`Bezirk "${name}" erfolgreich erstellt!`);
        nameInput.value = '';
        renderFilialAssignments();
    }
}

// ADMIN: FILIALEN, FILIALLEITER UND BEZIRKS-ZUORDNUNGEN ANZEIGEN & ÄNDERN
async function renderFilialAssignments() {
    const listEl = document.getElementById('filialAssignmentList');
    if (!listEl) return;

    const { data: filialen } = await _supabase.from('filialen').select('*');
    const { data: bezirke } = await _supabase.from('bezirke').select('*');
    const { data: teamleiterList } = await _supabase.from('nutzer').select('*').eq('rolle', 'teamleiter');

    if (!filialen || filialen.length === 0) {
        listEl.innerHTML = "<p style='font-size: 13px; opacity: 0.7;'>Noch keine Filialen in der Datenbank vorhanden.</p>";
        return;
    }

    let html = "<div style='display: flex; flex-direction: column; gap: 12px;'>";
    filialen.forEach(f => {
        const teamleiter = teamleiterList ? teamleiterList.find(t => t.filiale_id === f.id) : null;
        const leiterName = teamleiter ? `${teamleiter.name} (Kasse: ${teamleiter.kassennummer})` : "<i>Noch kein Leiter registriert</i>";

        let options = `<option value="">-- Kein Bezirk zugewiesen --</option>`;
        if (bezirke) {
            bezirke.forEach(b => {
                const selected = f.bezirk_id === b.id ? 'selected' : '';
                options += `<option value="${b.id}" ${selected}>${b.name}</option>`;
            });
        }

        html += `
            <div style="background: var(--container-bg); padding: 12px; border-radius: 6px; border: 1px solid var(--border-color);">
                <div style="font-size: calc(var(--base-font-size) * 1.05); font-weight: bold; margin-bottom: 4px;">🏪 Filiale: ${f.name}</div>
                <div style="font-size: calc(var(--base-font-size) * 0.9); margin-bottom: 8px;">👤 <strong>Filialleiter:</strong> ${leiterName}</div>
                <div style="margin-top: 5px;">
                    <label style="font-size: calc(var(--base-font-size) * 0.85); font-weight: bold;">Bezirk zuweisen:</label>
                    <select onchange="updateFilialeBezirk(${f.id}, this.value)" style="margin-top: 4px; padding: 6px;">
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
        renderFilialAssignments();
    }
}

// ARTIKEL SPEICHERN
async function saveMhdItem() {
    const barcode = document.getElementById('scannedBarcode')?.value.trim();
    const name = document.getElementById('articleName')?.value.trim();
    const mhd = document.getElementById('articleMhd')?.value;

    if (!barcode || !name || !mhd) {
        alert("Bitte Barcode, Artikelbezeichnung und MHD ausfüllen!");
        return;
    }

    const { error } = await _supabase.from('artikel').insert([{
        filiale_id: currentUser ? currentUser.filiale_id : null,
        erfasst_von: currentUser ? currentUser.id : null,
        barcode: barcode,
        bezeichnung: name,
        mhd: mhd,
        status: 'offen'
    }]);

    if (error) {
        alert("Fehler beim Speichern: " + error.message);
    } else {
        alert("Artikel erfolgreich gespeichert!");
        if (document.getElementById('scannedBarcode')) document.getElementById('scannedBarcode').value = '';
        if (document.getElementById('articleName')) document.getElementById('articleName').value = '';
        if (document.getElementById('articleMhd')) document.getElementById('articleMhd').value = '';
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
    const role = document.getElementById('newKeyRole')?.value;
    const code = document.getElementById('newKeyCode')?.value.trim();

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
    const code = document.getElementById('employeeKeyCode')?.value.trim();
    if (!code) {
        alert("Bitte Key eingeben!");
        return;
    }

    const { error } = await _supabase.from('keys').insert([{
        key_code: code,
        rolle: 'mitarbeiter',
        bezirk_id: currentUser ? currentUser.bezirk_id : null,
        filiale_id: currentUser ? currentUser.filiale_id : null,
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
        html += `<li style="margin-bottom: 6px;"><strong>${k.key_code}</strong> <span style="opacity: 0.7; font-size: 13px;">(${k.rolle})</span> – Status: ${k.is_active ? '✅ Aktiv' : '❌ Inaktiv'}</li>`;
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
    localStorage.removeItem('mhd_logged_in');
    localStorage.removeItem('mhd_active_role');
    hideAllViews();
    const loginView = document.getElementById('viewLogin');
    if (loginView) loginView.classList.remove('hidden');
    simulatedRole = null;
    currentSessionRole = null;
    const adminBar = document.getElementById('adminSimulatorBar');
    if (adminBar) adminBar.classList.add('hidden');
    location.reload();
}

function resetDevice() {
    if (confirm("Möchtest du dieses Gerät wirklich komplett zurücksetzen und entkoppeln?")) {
        localStorage.clear();
        location.reload();
    }
}