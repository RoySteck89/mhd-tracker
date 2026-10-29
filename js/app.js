document.addEventListener('DOMContentLoaded', async () => {
    const savedKey = localStorage.getItem('mhd_activation_key');
    
    if (savedKey) {
        const isValid = await verifyActivationKey(savedKey);
        if (isValid) {
            showTrackerView();
        } else {
            localStorage.removeItem('mhd_activation_key');
            showAuthView();
        }
    } else {
        showAuthView();
    }
});

function showAuthView() {
    document.getElementById('auth-section').classList.remove('hidden');
    document.getElementById('tracker-section').classList.add('hidden');
    document.getElementById('status-bar').textContent = 'Nicht aktiviert';
}

function showTrackerView() {
    document.getElementById('auth-section').classList.add('hidden');
    document.getElementById('tracker-section').classList.remove('hidden');
    document.getElementById('status-bar').textContent = 'Aktiviert & Verbunden';
    loadMhdList();
}

const authForm = document.getElementById('auth-form');
if (authForm) {
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const keyInput = document.getElementById('activation-key-input').value.trim();
        
        if (!keyInput) return;

        const isValid = await verifyActivationKey(keyInput);
        if (isValid) {
            localStorage.setItem('mhd_activation_key', keyInput);
            showTrackerView();
        } else {
            alert('Ungültiger oder inaktiver Aktivierungsschlüssel!');
        }
    });
}

const mhdForm = document.getElementById('mhd-form');
if (mhdForm) {
    mhdForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const barcode = document.getElementById('article-barcode').value.trim();
        const name = document.getElementById('article-name').value.trim();
        const mhdDate = document.getElementById('article-mhd').value;
        const activationKey = localStorage.getItem('mhd_activation_key');

        if (!barcode || !name || !mhdDate) {
            alert('Bitte alle Felder ausfüllen.');
            return;
        }

        const success = await saveMhdItem(activationKey, barcode, name, mhdDate);
        
        if (success) {
            alert('Artikel erfolgreich gespeichert!');
            mhdForm.reset();
            loadMhdList();
        } else {
            alert('Fehler beim Speichern des Artikels.');
        }
    });
}

async function loadMhdList() {
    const mhdList = document.getElementById('mhd-list');
    mhdList.innerHTML = '<p>Lade Artikel...</p>';

    const activationKey = localStorage.getItem('mhd_activation_key');
    const items = await fetchMhdItems(activationKey);

    if (!items || items.length === 0) {
        mhdList.innerHTML = '<p>Keine aktiven MHD-Einträge vorhanden.</p>';
        return;
    }

    mhdList.innerHTML = '';
    
    items.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = `mhd-item ${getUrgencyClass(item.mhd_date)}`;
        itemEl.innerHTML = `
            <strong>${item.article_name}</strong><br>
            Barcode: ${item.barcode}<br>
            MHD: <strong>${item.mhd_date}</strong>
        `;
        mhdList.appendChild(itemEl);
    });
}

function getUrgencyClass(mhdDateStr) {
    const today = new Date();
    const mhdDate = new Date(mhdDateStr);
    const diffTime = mhdDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 1) return 'mhd-critical';
    if (diffDays <= 4) return 'mhd-warning';
    return 'mhd-ok';
}

let html5QrCode = null;
const scanBtn = document.getElementById('scan-btn');
const readerDiv = document.getElementById('reader');

if (scanBtn) {
    scanBtn.addEventListener('click', async () => {
        if (readerDiv.classList.contains('hidden')) {
            readerDiv.classList.remove('hidden');
            scanBtn.textContent = 'Kamera schließen';
            
            if (!html5QrCode) {
                html5QrCode = new Html5Qrcode("reader");
            }
            
            try {
                await html5QrCode.start(
                    { facingMode: "environment" },
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 100 }
                    },
                    (decodedText) => {
                        document.getElementById('article-barcode').value = decodedText;
                        stopScanner();
                    },
                    (errorMessage) => {}
                );
            } catch (err) {
                console.error("Kamera konnte nicht gestartet werden:", err);
                alert("Kamera-Zugriff verwehrt oder nicht unterstützt.");
                stopScanner();
            }
        } else {
            stopScanner();
        }
    });
}

function stopScanner() {
    if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().then(() => {
            readerDiv.classList.add('hidden');
            scanBtn.textContent = '📷 Scannen';
        }).catch(err => console.error("Fehler beim Stoppen des Scanners:", err));
    } else {
        readerDiv.classList.add('hidden');
        scanBtn.textContent = '📷 Scannen';
    }
}