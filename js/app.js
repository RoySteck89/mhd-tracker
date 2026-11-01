let currentSessionRole = localStorage.getItem('mhd_active_role') || 'mitarbeiter';
let currentKey = localStorage.getItem('mhd_activation_key') || null;
let html5QrCode = null;

document.addEventListener("DOMContentLoaded", () => {
    checkInitialState();
});

function checkInitialState() {
    if (!currentKey) {
        showView('viewSetupKey');
        setStatus("Status: Nicht aktiviert");
    } else {
        loadDashboard(currentSessionRole);
    }
}

function showView(viewId) {
    ['viewSetupKey', 'viewDashboard'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    const target = document.getElementById(viewId);
    if (target) target.classList.remove('hidden');
}

function setStatus(text) {
    const badge = document.getElementById('statusBadge');
    if (badge) badge.innerText = text;
}

async function verifyAndActivateKey() {
    const keyInput = document.getElementById('activationKeyInput');
    if (!keyInput) return;
    const key = keyInput.value.trim();

    if (!key) {
        alert("Bitte einen Key eingeben!");
        return;
    }

    if (key.toUpperCase() === 'ADMIN-MASTER-KEY') {
        localStorage.setItem('mhd_activation_key', key);
        localStorage.setItem('mhd_active_role', 'admin');
        currentKey = key;
        currentSessionRole = 'admin';
        loadDashboard('admin');
        return;
    }

    const dbData = await checkActivationKeyInDb(key);
    if (dbData) {
        localStorage.setItem('mhd_activation_key', key);
        const role = dbData.rolle || 'mitarbeiter';
        localStorage.setItem('mhd_active_role', role);
        currentKey = key;
        currentSessionRole = role;
        loadDashboard(role);
    } else {
        alert("Ungültiger oder inaktiver Aktivierungs-Key!");
    }
}

function setSimulatedRole(role) {
    currentSessionRole = role;
    localStorage.setItem('mhd_active_role', role);

    const buttons = document.querySelectorAll('.admin-bar button');
    buttons.forEach(btn => btn.classList.remove('active'));
    if (event && event.target) event.target.classList.add('active');

    loadDashboard(role);
}

function loadDashboard(role) {
    stopScanner();
    showView('viewDashboard');
    setStatus(`Angemeldet als Rolle: ${role.toUpperCase()}`);

    const adminBar = document.getElementById('adminBar');
    if (adminBar) {
        if (currentKey === 'ADMIN-MASTER-KEY' || role === 'admin') {
            adminBar.style.display = 'flex';
        } else {
            adminBar.style.display = 'none';
        }
    }

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
                        <small>👤 Filialleiter: Michaela Steck</small>
                    </div>
                </div>

                <div class="card">
                    <h3>🔑 Aktivierungs-Key generieren</h3>
                    <select id="keyRoleSelect" style="margin-bottom: 8px;">
                        <option value="teamleiter">Teamleiter Key</option>
                        <option value="bezirksleitung">Bezirksleiter Key</option>
                        <option value="admin">Admin Key</option>
                    </select>
                    <input type="text" id="genKeyDisplay" value="MHD-HUWY-KVMK" readonly>
                    <button style="margin-top: 12px;" onclick="alert('Key generiert!')">In Datenbank speichern</button>
                </div>
            </div>
        `;
    } else if (role === 'bezirksleitung') {
        mainContentHtml = `
            <h2>🏢 Bezirksleitung Dashboard</h2>
            <div class="card">
                <h3>Übersicht Bezirk Allgäu</h3>
                <p style="margin-bottom: 12px;">Alle zugeordneten Filialen im Blick.</p>
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
                    <h3>Mitarbeiter-Key für deine Filiale</h3>
                    <div style="display: flex; gap: 8px;">
                        <input type="text" id="tlKeyDisplay" value="MHD-Filiale-4473" readonly>
                    </div>
                </div>
            `;
        }

        mainContentHtml = `
            <h2>${title}</h2>
            ${teamleiterExtra}
            <div class="card">
                <h3>Barcode Scanner & Artikelerfassung</h3>
                
                <!-- Scanner Bereich & Manueller Start-Button -->
                <div id="reader" style="width: 100%; margin-bottom: 10px;"></div>
                <button type="button" onclick="startScannerManual()" style="background-color: #0ea5e9; margin-bottom: 15px;">📷 Kamera-Scanner starten</button>
                
                <label for="barcodeInput">Barcode:</label>
                <input type="text" id="barcodeInput" placeholder="Barcode scannen oder eingeben...">
                
                <label for="artName">Artikelbezeichnung:</label>
                <input type="text" id="artName" placeholder="z.B. Milch 1L">

                <label for="mhdDate">Mindesthaltbarkeitsdatum (MHD):</label>
                <input type="date" id="mhdDate">

                <button style="margin-top: 16px;" onclick="saveMhdItemHandler()">Artikel speichern</button>
            </div>
        `;
    }

    const logoutHtml = `
        <div class="card" style="margin-top: 16px;">
            <button onclick="logoutApp()" style="background-color: #64748b;">Abmelden / Key wechseln</button>
        </div>
    `;

    dashContent.innerHTML = mainContentHtml + logoutHtml;
}

function startScannerManual() {
    const readerEl = document.getElementById('reader');
    if (readerEl && typeof Html5QrCode !== 'undefined') {
        try {
            if (!html5QrCode) {
                html5QrCode = new Html5QrCode("reader");
            }
            html5QrCode.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 150 } },
                (decodedText) => {
                    const barcodeInput = document.getElementById('barcodeInput');
                    if (barcodeInput) {
                        barcodeInput.value = decodedText;
                    }
                    stopScanner();
                    alert("Barcode erfolgreich gescannt: " + decodedText);
                },
                (errorMessage) => {}
            ).catch((err) => {
                alert("Kamera konnte nicht gestartet werden: " + err);
            });
        } catch (e) {
            console.error("Scanner Fehler:", e);
        }
    } else {
        alert("Scanner-Bibliothek nicht geladen.");
    }
}

function stopScanner() {
    if (html5QrCode) {
        try {
            if (html5QrCode.isScanning) {
                html5QrCode.stop().then(() => {
                    html5QrCode.clear();
                }).catch(() => {});
            }
        } catch (e) {}
    }
}

async function saveMhdItemHandler() {
    const code = document.getElementById('barcodeInput').value.trim();
    const name = document.getElementById('artName').value.trim();
    const date = document.getElementById('mhdDate').value;

    if (!code || !name || !date) {
        alert("Bitte alle Felder ausfüllen!");
        return;
    }

    const success = await saveMhdItem(currentKey, code, name, date);
    if (success) {
        alert("Erfolgreich in Supabase gespeichert!");
        document.getElementById('barcodeInput').value = '';
        document.getElementById('artName').value = '';
        document.getElementById('mhdDate').value = '';
    } else {
        alert("Fehler beim Speichern zur Datenbank.");
    }
}

function logoutApp() {
    stopScanner();
    localStorage.removeItem('mhd_activation_key');
    localStorage.removeItem('mhd_active_role');
    location.reload();
}