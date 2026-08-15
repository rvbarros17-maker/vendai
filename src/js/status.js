export function mountStatusBadge(el) {
  function render() {
    const online = navigator.onLine;
    el.innerHTML = `
      <span class="inline-flex items-center gap-1.5 text-xs font-medium ${
        online ? "text-teal" : "text-coral"
      }">
        <span class="w-1.5 h-1.5 rounded-full ${
          online ? "bg-teal" : "bg-coral animate-pulse"
        }"></span>
        ${online ? "online" : "offline — sincroniza depois"}
      </span>`;
  }
  render();
  window.addEventListener("online", render);
  window.addEventListener("offline", render);
}
