let currentSessionRole = localStorage.getItem('mhd_active_role') || 'mitarbeiter';
let currentKey = localStorage.getItem('mhd_activation_key') || null;
let isScanning = false;

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
                
                <!-- Schmaler, eleganter Scanner-Streifen -->
                <div id="interactive" class="viewport" style="width: 100%; height: 160px; overflow: hidden; position: relative; border-radius: 8px; border: 2px solid #00f5d4; margin-bottom: 12px; background: #000;"></div>
                
                <button type="button" onclick="startFastScanner()" style="background-color: #0ea5e9; margin-bottom: 15px;">📷 Scanner starten</button>
                
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
    
    // Automatisch starten für schnelle Erfassung
    if (role === 'mitarbeiter' || role === 'teamleiter') {
        setTimeout(() => startFastScanner(), 300);
    }
}

function startFastScanner() {
    if (typeof Quagga === 'undefined') {
        alert("Scanner-Bibliothek lädt noch...");
        return;
    }

    const targetEl = document.querySelector("#interactive");
    if (!targetEl) return;

    if (isScanning) return;

    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: targetEl,
            constraints: {
                facingMode: "environment",
                width: { min: 640 },
                height: { min: 480 }
            }
        },
        decoder: {
            readers: ["code_128_reader", "ean_reader", "ean_8_reader", "code_39_reader"]
        }
    }, function(err) {
        if (err) {
            console.error(err);
            return;
        }
        Quagga.start();
        isScanning = true;
    });

    Quagga.offDetected();
    Quagga.onDetected(function(result) {
        if (result && result.codeResult && result.codeResult.code) {
            const code = result.codeResult.code;
            document.getElementById('barcodeInput').value = code;
            
            // Kurzes Signal-Feedback & Stop
            stopScanner();
            if (navigator.vibrate) navigator.vibrate(100);
        }
    });
}

function stopScanner() {
    if (typeof Quagga !== 'undefined' && isScanning) {
        Quagga.stop();
        isScanning = false;
    }
}

async function saveMhdItemHandler() {
    const code = document.getElementById('barcodeInput').value.trim();
    const name = document.getElementById('artName').value.trim();
    const date = document.getElementById('mhdDate').value;

    if (!code || name === '' || !date) {
        alert("Bitte alle Felder ausfüllen!");
        return;
    }

    const success = await saveMhdItem(currentKey, code, name, date);
    if (success) {
        alert("Erfolgreich in Supabase gespeichert!");
        document.getElementById('barcodeInput').value = '';
        document.getElementById('artName').value = '';
        document.getElementById('mhdDate').value = '';
        // Nach dem Speichern Scanner sofort wieder aktivieren
        startFastScanner();
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