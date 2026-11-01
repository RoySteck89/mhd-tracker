let currentUser = null;
let currentSessionRole = localStorage.getItem('mhd_active_role') || null;
let simulatedRole = null;
let pendingKeyData = null;
let html5QrCode = null;

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
    localStorage.clear();
    currentUser = null;
}

function changeTheme(themeName, save = true) {
    document.body.className = document.body.className.replace(/theme-\S+/g, '').trim();
    document.body.classList.add(`theme-${themeName}`);
    
    const customBox = document.getElementById('customColorBox');
    if (customBox) {
        if (themeName === 'custom') customBox.classList.remove('hidden');
        else customBox.classList.add('hidden');
    }

    if (save) {
        const userId = currentUser ? currentUser.id : 'guest';
        localStorage.setItem(`mhd_theme_${userId}`, themeName);
        localStorage.setItem('mhd_theme', themeName);
    }
}

function onThemeSelectChange(value) { changeTheme(value, true); }

function applyCustomColor(hexColor) {
    document.documentElement.style.setProperty('--custom-primary', hexColor);
    const userId = currentUser ? currentUser.id : 'guest';
    localStorage.setItem(`mhd_custom_color_${userId}`, hexColor);
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

document.addEventListener("DOMContentLoaded", () => {
    try {
        const userId = currentUser ? currentUser.id : 'guest';
        const savedTheme = localStorage.getItem(`mhd_theme_${userId}`) || localStorage.getItem('mhd_theme') || 'glitter';
        const savedFontSize = localStorage.getItem(`mhd_fontsize_${userId}`) || '16';
        const savedCustomColor = localStorage.getItem(`mhd_custom_color_${userId}`) || '#00f5d4';

        document.documentElement.style.setProperty('--custom-primary', savedCustomColor);
        const colorPicker = document.getElementById('customColorPicker');
        if (colorPicker) colorPicker.value = savedCustomColor;

        changeTheme(savedTheme, false);
        changeFontSize(savedFontSize, false);

        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) themeSelect.value = savedTheme;

        const fontRange = document.getElementById('fontSizeRange');
        const fontVal = document.getElementById('fontSizeVal');
        if (fontRange) fontRange.value = savedFontSize;
        if (fontVal) fontVal.innerText = `${savedFontSize}px`;

        checkInitialState();
    } catch (err) {
        console.error("Fehler beim Starten:", err);
    }
});

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

function verifyActivationKey() {
    const keyInput = document.getElementById('activationKeyInput');
    if (!keyInput) return;
    const key = keyInput.value.trim().toUpperCase();

    const validKeys = {
        'ADMIN-MASTER-KEY': { rolle: 'admin', bezirk: 'Zentrale' },
        'KIK-ADMIN-001': { rolle: 'admin', bezirk: 'Zentrale' },
        'KIK-BL-4422': { rolle: 'bezirksleitung', bezirk: 'Bezirk Allgäu' },
        'KIK-TL-9911': { rolle: 'teamleiter', bezirk: 'Bezirk Allgäu', filiale: 'Filiale Test' },
        'KIK-MA-1234': { rolle: 'mitarbeiter', bezirk: 'Bezirk Allgäu', filiale: 'Filiale Test' }
    };

    if (validKeys[key]) {
        pendingKeyData = validKeys[key];
        hideAllViews();
        const viewDetails = document.getElementById('viewSetupDetails');
        if (viewDetails) viewDetails.classList.remove('hidden');
        
        const info = document.getElementById('keyRoleInfo');
        if (info) info.innerText = `Erkannte Rolle: ${pendingKeyData.rolle.toUpperCase()} (${pendingKeyData.bezirk})`;
    } else {
        alert("Ungültiger Aktivierungs-Key!");
    }
}

function completeRegistration() {
    const nameInput = document.getElementById('setupName');
    const pinInput = document.getElementById('setupPin');
    if (!nameInput || !pinInput) return;

    const name = nameInput.value.trim();
    const pin = pinInput.value.trim();

    if (!name || pin.length !== 4) {
        alert("Bitte gib einen Namen und eine gültige 4-stellige PIN ein.");
        return;
    }

    currentUser = {
        id: 'user_' + Date.now(),
        name: name,
        kassennummer: '147',
        kassenpin: pin,
        rolle: pendingKeyData.rolle,
        bezirk: pendingKeyData.bezirk,
        filiale: pendingKeyData.filiale || 'Dietmannsried'
    };

    localStorage.setItem('mhd_user', JSON.stringify(currentUser));
    localStorage.setItem('mhd_logged_in', 'true');
    currentSessionRole = currentUser.rolle;
    localStorage.setItem('mhd_active_role', currentSessionRole);

    location.reload();
}

function loginWithPin() {
    const pinInput = document.getElementById('loginPin');
    if (!pinInput) return;
    const pin = pinInput.value.trim();

    if (currentUser && pin === currentUser.kassenpin) {
        localStorage.setItem('mhd_logged_in', 'true');
        currentSessionRole = currentUser.rolle;
        localStorage.setItem('mhd_active_role', currentSessionRole);
        loadDashboard(currentSessionRole);
    } else {
        alert("Falsche Kassen-PIN!");
    }
}

function setSimulatedRole(role) {
    simulatedRole = role;
    currentSessionRole = role;
    localStorage.setItem('mhd_active_role', role);

    const buttons = document.querySelectorAll('.admin-bar button');
    buttons.forEach(btn => btn.classList.remove('active'));
    if (event && event.target) event.target.classList.add('active');

    loadDashboard(role);
}

function loadDashboard(role) {
    hideAllViews();
    const viewDash = document.getElementById('viewDashboard');
    if (viewDash) viewDash.classList.remove('hidden');

    const badge = document.getElementById('statusBadge');
    if (badge) badge.innerText = `Angemeldet als: ${currentUser ? currentUser.name : 'Rey'} (${role})`;

    const dashContent = document.getElementById('dashContent');
    if (!dashContent) return;

    let mainContentHtml = '';

    if (role === 'admin') {
        mainContentHtml = `
            <h2>👑 Super-Admin Steuerung</h2>
            <div class="admin-grid-layout">
                <div class="card">
                    <h3>🏙️ Neuer Bezirk anlegen</h3>
                    <div style="display: flex; gap: 8px;">
                        <input type="text" id="newBezirkInput" placeholder="Bezirk Name (z.B. Allgäu)">
                        <button style="width: auto; margin-top: 0;" onclick="alert('Bezirk angelegt!')">Erstellen</button>
                    </div>
                </div>

                <div class="card">
                    <h3>🏪 Filialübersicht & Leiter-Verwaltung</h3>
                    <div style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: 6px; border: 1px solid var(--border-color);">
                        <strong>🏪 Filiale: Dietmannsried</strong><br>
                        <small>👤 Filialleiter: Michaela Steck (Kasse: 147)</small><br>
                        <label style="margin-top: 8px;">Bezirk zuweisen:</label>
                        <select>
                            <option>-- Kein Bezirk zugewiesen --</option>
                            <option>Bezirk Allgäu</option>
                        </select>
                    </div>
                </div>

                <div class="card">
                    <h3>🔑 Aktivierungs-Key generieren</h3>
                    <select id="keyRoleSelect" style="margin-bottom: 8px;">
                        <option value="teamleiter">Teamleiter Key (für Filiale)</option>
                        <option value="bezirksleitung">Bezirksleiter Key</option>
                        <option value="admin">Admin Key</option>
                    </select>
                    <div style="display: flex; gap: 8px;">
                        <input type="text" id="genKeyDisplay" value="MHD-HUWY-KVMK" readonly>
                        <button style="width: auto; margin-top: 0;" onclick="generateRandomKey()">🎲 Zufall</button>
                    </div>
                    <button style="margin-top: 12px;" onclick="alert('Key gespeichert!')">Key in Datenbank speichern</button>
                </div>

                <div class="card">
                    <h3>📋 Aktive Keys & Verwaltung</h3>
                    <ul style="list-style: disc; padding-left: 20px;">
                        <li><strong>MHD-2KBX-TXM3</strong> <small>(teamleiter)</small> – Status: ✅ Aktiv</li>
                        <li><strong>ADMIN-MASTER-KEY</strong> <small>(admin)</small> – Status: ✅ Aktiv</li>
                    </ul>
                </div>
            </div>
        `;
    } else if (role === 'bezirksleitung') {
        mainContentHtml = `
            <h2>🏢 Bezirksleitung Dashboard</h2>
            <div class="card">
                <h3>Übersicht Bezirk Allgäu</h3>
                <p style="margin-bottom: 12px;">Hier siehst du alle zugeordneten Filialen und deren Status.</p>
                <div style="background: rgba(255,255,255,0.05); padding: 14px; border-radius: 6px; border: 1px solid var(--border-color);">
                    <strong>📍 Filiale: Dietmannsried</strong><br>
                    <small>Filialleitung: Michaela Steck | Status: Alles im grünen Bereich</small>
                </div>
            </div>
        `;
    } else {
        let title = "📱 Mitarbeiter Scan-Ansicht";
        let teamleiterExtra = '';

        if (role === 'teamleiter') {
            title = "🏪 Teamleiter-Ansicht (Filiale & Scanner)";
            teamleiterExtra = `
                <div class="card">
                    <h3>Mitarbeiter-Key für deine Filiale erstellen</h3>
                    <p style="font-size: 0.9em; opacity: 0.8;">Dieser Key dient allen Mitarbeitern deiner Filiale zur Geräteaktivierung.</p>
                    <div style="display: flex; gap: 8px;">
                        <input type="text" id="tlKeyDisplay" value="MHD-Filiale-4473" readonly>
                        <button style="width: auto; margin-top: 0;" onclick="generateRandomTlKey()">🎲 Neu laden</button>
                    </div>
                    <button style="margin-top: 12px;" onclick="alert('Filial-Key freigegeben!')">Diesen Filial-Key freigegeben</button>
                </div>

                <div class="card">
                    <h3>📋 Filial-Steuerung</h3>
                    <p style="font-size: 0.9em; margin-bottom: 10px;">Überprüfe hier die aktuell erfassten MHD-Artikel deiner Mitarbeiter.</p>
                    <button onclick="toggleMhdList()" style="background-color: #0ea5e9;">📂 Gescannte MHD-Liste öffnen / schließen</button>
                    <div id="teamleiterMhdList" class="hidden" style="margin-top: 12px; border-top: 1px solid var(--border-color); padding-top: 10px;">
                        <!-- Dynamische Liste für Teamleiter -->
                    </div>
                </div>
            `;
        }

        mainContentHtml = `
            <h2>${title}</h2>
            ${teamleiterExtra}
            <div class="card">
                <h3>Barcode Scanner & Artikelerfassung</h3>
                <div id="reader"></div>
                
                <label for="barcodeInput">Gescannter / Manueller Barcode:</label>
                <input type="text" id="barcodeInput" placeholder="Barcode hier eintragen oder scannen...">
                
                <label for="artName">Artikelbezeichnung:</label>
                <input type="text" id="artName" placeholder="z.B. Milch 1L">

                <label for="mhdDate">MHD (Mindesthaltbarkeitsdatum):</label>
                <input type="date" id="mhdDate">

                <button style="margin-top: 16px;" onclick="saveMhdItem()">Artikel speichern</button>
            </div>
        `;
    }

    const settingsCardHtml = `
        <div class="card" style="margin-top: 8px;">
            <h3>⚙️ Persönliche Einstellungen</h3>
            
            <label for="themeSelect">🎨 Design-Auswahl:</label>
            <select id="themeSelect" onchange="onThemeSelectChange(this.value)">
                <option value="glitter">✨ Neontürkis Glitzer (Wunsch-Design)</option>
                <option value="kik">🔴 KiK Classic (Standard)</option>
                <option value="dark">🌙 Modern Dark</option>
                <option value="clean">☀️ Clean Light</option>
                <option value="contrast">👁️ High Contrast</option>
                <option value="pastel-mint">🌿 Pastell Mint</option>
                <option value="pastel-lavender">🪻 Pastell Lavendel</option>
                <option value="pastel-rose">🌹 Pastell Rosé</option>
                <option value="pastel-peach">🍑 Pastell Peach</option>
                <option value="pastel-sky">☁️ Pastell Sky</option>
                <option value="rosegold">✨ Rosé-Gold Glamour</option>
                <option value="blackgold">👑 Schwarz & Gold</option>
                <option value="cyberpunk">🌆 Cyberpunk Neon</option>
                <option value="sunset">🌅 Sunset Glow</option>
                <option value="custom">🎨 Eigene Wunschfarbe</option>
            </select>

            <div id="customColorBox" class="hidden" style="margin-top: 12px;">
                <label for="customColorPicker">Wähle deine eigene Hauptfarbe:</label>
                <input type="color" id="customColorPicker" value="#00f5d4" onchange="applyCustomColor(this.value)">
            </div>

            <label for="fontSizeRange" style="margin-top: 16px;">🔍 Schriftgröße: <span id="fontSizeVal">16px</span></label>
            <input type="range" id="fontSizeRange" min="14" max="22" value="16" oninput="changeFontSize(this.value)">

            <button onclick="logout()" style="background-color: #64748b; margin-top: 20px;">Abmelden</button>
        </div>
    `;

    dashContent.innerHTML = mainContentHtml + settingsCardHtml;

    const savedTheme = localStorage.getItem('mhd_theme') || 'glitter';
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) themeSelect.value = savedTheme;

    if (role !== 'admin' && role !== 'bezirksleitung') {
        initScanner();
    }
}

function toggleMhdList() {
    const listContainer = document.getElementById('teamleiterMhdList');
    if (!listContainer) return;

    if (listContainer.classList.contains('hidden')) {
        listContainer.classList.remove('hidden');
        renderTeamleiterMhdList();
    } else {
        listContainer.classList.add('hidden');
    }
}

function renderTeamleiterMhdList() {
    const container = document.getElementById('teamleiterMhdList');
    if (!container) return;

    let items = JSON.parse(localStorage.getItem('mhd_items') || '[]');

    if (items.length === 0) {
        container.innerHTML = '<p style="opacity: 0.7; font-size: 0.9em; padding: 6px 0;">Keine Artikel in dieser Filiale erfasst.</p>';
        return;
    }

    let html = '';
    items.forEach((item, index) => {
        html += `
            <div style="background: rgba(255,255,255,0.05); padding: 10px; margin-bottom: 8px; border-radius: 6px; border-left: 4px solid var(--primary-color); display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong>${item.name}</strong><br>
                    <small>Barcode: ${item.code} | MHD: ${item.date}</small>
                </div>
                <button onclick="deleteMhdItem(${index})" style="width: auto; margin-top: 0; padding: 6px 10px; background-color: #ef4444; font-size: 0.8em;">Löschen</button>
            </div>
        `;
    });
    container.innerHTML = html;
}

function deleteMhdItem(index) {
    let items = JSON.parse(localStorage.getItem('mhd_items') || '[]');
    items.splice(index, 1);
    localStorage.setItem('mhd_items', JSON.stringify(items));
    renderTeamleiterMhdList();
}

function generateRandomKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let res = 'MHD-';
    for(let i=0; i<4; i++) res += chars.charAt(Math.floor(Math.random() * chars.length));
    res += '-';
    for(let i=0; i<4; i++) res += chars.charAt(Math.floor(Math.random() * chars.length));
    const el = document.getElementById('genKeyDisplay');
    if (el) el.value = res;
}

function generateRandomTlKey() {
    const num = Math.floor(1000 + Math.random() * 9000);
    const el = document.getElementById('tlKeyDisplay');
    if (el) el.value = `MHD-Filiale-${num}`;
}

function initScanner() {
    setTimeout(() => {
        const readerEl = document.getElementById('reader');
        if (readerEl) {
            if (typeof Html5QrCode === 'undefined') {
                readerEl.innerHTML = '<p style="padding: 20px; text-align: center;">Kamera-Scanner offline (Manuelle Eingabe aktiv)</p>';
                return;
            }
            try {
                if (!html5QrCode) html5QrCode = new Html5QrCode("reader");
                html5QrCode.start(
                    { facingMode: "environment" },
                    { fps: 10, qrbox: { width: 250, height: 150 } },
                    (decodedText) => {
                        const barcodeInput = document.getElementById('barcodeInput');
                        if (barcodeInput) barcodeInput.value = decodedText;
                    },
                    () => {}
                ).catch(() => {
                    readerEl.innerHTML = '<p style="padding: 20px; text-align: center;">Kamera nicht verfügbar oder blockiert.</p>';
                });
            } catch (e) {}
        }
    }, 300);
}

function saveMhdItem() {
    const code = document.getElementById('barcodeInput').value;
    const name = document.getElementById('artName').value;
    const date = document.getElementById('mhdDate').value;

    if (!code || !name || !date) {
        alert("Bitte alle Felder ausfüllen!");
        return;
    }

    let items = JSON.parse(localStorage.getItem('mhd_items') || '[]');
    items.push({ code, name, date, time: new Date().toISOString() });
    localStorage.setItem('mhd_items', JSON.stringify(items));

    alert("Erfolgreich gespeichert!");
    document.getElementById('barcodeInput').value = '';
    document.getElementById('artName').value = '';
    document.getElementById('mhdDate').value = '';

    // Falls die Teamleiter-Liste gerade offen ist, direkt aktualisieren
    const listContainer = document.getElementById('teamleiterMhdList');
    if (listContainer && !listContainer.classList.contains('hidden')) {
        renderTeamleiterMhdList();
    }
}

function logout() {
    if (html5QrCode) { try { html5QrCode.stop(); } catch(e){} }
    localStorage.removeItem('mhd_logged_in');
    localStorage.removeItem('mhd_active_role');
    location.reload();
}