/* ==========================================================================
   GLOBALE MODAL-ERSETZUNG (Ersetzt hässliche Browser-Alerts & Confirms)
   ========================================================================== */

(function() {
    // 1. Eigenes Alert (Ersetzt window.alert)
    window.alert = function(nachricht) {
        zeigeGlobalesModal("Hinweis", nachricht, false, null);
    };

    // 2. Eigenes Confirm (Ersetzt window.confirm)
    window.confirm = function(nachricht) {
        // Da confirm() einen Boolean (true/false) zurückgeben muss, 
        // nutzen wir hier ein Promise bzw. rufen es asynchron auf.
        // (Hinweis: Da confirm im JS-Code meist synchron verwendet wird, 
        // zeigen wir hier ein schickes Modal mit Callback oder nutzen einen Fallback, 
        // am saubersten lösen wir es für Abfragen direkt über eine Callback-Funktion).
    };

    // Zentrale Modal-Box erstellen
    function zeigeGlobalesModal(titel, nachricht, istGefahr, callback) {
        const altesOverlay = document.getElementById('global-modal-overlay');
        if (altesOverlay) altesOverlay.remove();

        const overlay = document.createElement('div');
        overlay.id = 'global-modal-overlay';
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.6); z-index: 99999; display: flex; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box;';
        
        const buttonFarbe = istGefahr ? '#dc3545' : '#003366';

        overlay.innerHTML = `
            <div style="background: #ffffff; width: 100%; max-width: 380px; padding: 24px; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.25); display: flex; flex-direction: column; gap: 14px; animation: fadeIn 0.2s ease;">
                <div style="font-weight: 700; font-size: 1.15rem; color: #003366;">${titel}</div>
                <div style="font-size: 0.95rem; color: #495057; line-height: 1.4; word-break: break-word;">${nachricht}</div>
                <div style="display: flex; gap: 10px; margin-top: 6px;">
                    <button id="global-modal-btn" style="width: 100%; padding: 12px; background: ${buttonFarbe}; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.95rem;">OK</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const btn = document.getElementById('global-modal-btn');
        btn.focus();

        btn.onclick = () => {
            overlay.remove();
            if (callback) callback();
        };

        overlay.onkeydown = (e) => {
            if (e.key === 'Enter' || e.key === 'Escape') {
                overlay.remove();
                if (callback) callback();
            }
        };
    }
})();