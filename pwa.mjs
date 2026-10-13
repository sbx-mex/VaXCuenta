export function setupPWA({showModal, toast, refresh}) {
  const button = document.querySelector('#install');
  let installPrompt = null;
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; });
  window.addEventListener('appinstalled', () => { installPrompt = null; button.hidden = true; toast('VaXCuenta ya está instalada.'); });
  if (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone) button.hidden = true;
  button.addEventListener('click', async () => {
    if (installPrompt) { await installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; }
    else showModal('Instalar VaXCuenta', `<p>Guarda el tablero como una app para abrirlo desde tu pantalla de inicio.</p><ul><li><b>iPhone / iPad:</b> abre el enlace en Safari, toca Compartir y selecciona Agregar a pantalla de inicio.</li><li><b>Android:</b> abre el enlace en Chrome y elige Instalar app o Agregar a pantalla principal.</li><li><b>Computadora:</b> usa el icono de instalación de Chrome o Edge, o la opción Instalar en su menú.</li></ul><p>Después de la primera visita podrás consultar el último corte descargado sin conexión. El corte visible permite reconocer la antigüedad de esa información.</p>`);
  });
  const connection = document.querySelector('#connection');
  const updateConnection = () => { connection.classList.toggle('offline', !navigator.onLine); connection.innerHTML = `<span></span>${navigator.onLine ? 'En línea' : 'Sin conexión'}`; };
  window.addEventListener('online', () => { updateConnection(); refresh(true); });
  window.addEventListener('offline', () => { updateConnection(); toast('Sin conexión. Consulta el último corte descargado.'); });
  updateConnection();
  if ('serviceWorker' in navigator && window.isSecureContext) {
    navigator.serviceWorker.register(new URL('./sw.js', import.meta.url), {scope: './', updateViaCache: 'none'}).then(registration => {
      const updateButton = document.querySelector('#update-app');
      let applyingUpdate = false;
      const announce = () => {
        const pending = Boolean(registration.waiting && navigator.serviceWorker.controller);
        updateButton.hidden = !pending;
        if (pending) toast('Hay una nueva versión. Selecciona Usar versión nueva cuando termines tu consulta.');
      };
      updateButton.addEventListener('click', () => {
        if (!registration.waiting || applyingUpdate) return;
        applyingUpdate = true;
        updateButton.disabled = true;
        registration.waiting.postMessage({type: 'APPLY_UPDATE'});
      });
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (applyingUpdate) window.location.reload();
      });
      registration.addEventListener('updatefound', () => { registration.installing?.addEventListener('statechange', announce); });
      announce();
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && navigator.onLine) { registration.update().catch(() => {}); refresh(true); } });
    }).catch(() => { /* Browsing remains available if installation is unsupported. */ });
  }
}
