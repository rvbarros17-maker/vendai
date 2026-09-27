import "./css/main.css";
import { renderVenda } from "./pages/venda.js";
import { renderProdutos } from "./pages/produtos.js";
import { renderClientes } from "./pages/clientes.js";
import { renderCaixa } from "./pages/caixa.js";
import { renderLock } from "./pages/lock.js";
import { mountStatusBadge } from "./js/status.js";
import { ensureAnonAuth, isUnlockedLocally, lockDevice } from "./js/auth.js";
import { getConfigLoja, salvarConfigLoja } from "./js/config.js";

const routes = {
  "#venda": { render: renderVenda, label: "Venda", icon: iconCart },
  "#produtos": { render: renderProdutos, label: "Produtos", icon: iconBox },
  "#fiado": { render: renderClientes, label: "Fiado", icon: iconBook },
  "#caixa": { render: renderCaixa, label: "Caixa", icon: iconWallet },
};

function iconCart(active) {
  return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${active ? 2.4 : 1.8}" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.6 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>`;
}
function iconBox(active) {
  return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${active ? 2.4 : 1.8}" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="M3.3 7 12 12l8.7-5M12 22V12"/></svg>`;
}
function iconBook(active) {
  return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${active ? 2.4 : 1.8}" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/></svg>`;
}
function iconWallet(active) {
  return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${active ? 2.4 : 1.8}" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>`;
}
function iconLock() {
  return `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
}
function iconSettings() {
  return `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>`;
}

const app = document.getElementById("app");
let routerAtivo = null;

window.addEventListener("hashchange", () => {
  if (routerAtivo) routerAtivo();
});

function montarAppPrincipal() {
  app.innerHTML = `
    <header class="px-5 pt-4 pb-1 flex items-center justify-between">
      <span class="font-display font-extrabold text-teal-dark tracking-tight">Vendaí</span>
      <div class="flex items-center gap-3">
        <div id="status-badge"></div>
        <button id="btn-config" class="tap text-ink-soft" title="Configurações">${iconSettings()}</button>
        <button id="btn-bloquear" class="tap text-ink-soft" title="Bloquear">${iconLock()}</button>
      </div>
    </header>
    <main id="page" class="flex-1 flex flex-col"></main>
    <nav id="bottom-nav" class="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-paper-raised border-t border-line flex z-30"></nav>
  `;

  mountStatusBadge(document.getElementById("status-badge"));
  document.getElementById("btn-bloquear").addEventListener("click", () => {
    lockDevice();
    montarTela();
  });
  document.getElementById("btn-config").addEventListener("click", abrirConfiguracoes);

  const page = document.getElementById("page");
  const nav = document.getElementById("bottom-nav");

  function renderNav(current) {
    nav.innerHTML = Object.entries(routes)
      .map(([hash, r]) => {
        const active = hash === current;
        return `
        <a href="${hash}" class="tap flex-1 flex flex-col items-center gap-1 py-2.5 ${
          active ? "text-teal" : "text-ink-soft"
        }">
          ${r.icon(active)}
          <span class="text-[10px] font-medium">${r.label}</span>
        </a>`;
      })
      .join("");
  }

  function router() {
    const hash = location.hash || "#venda";
    const route = routes[hash] || routes["#venda"];
    page.innerHTML = "";
    route.render(page);
    renderNav(hash in routes ? hash : "#venda");
  }

  routerAtivo = router;
  router();
}

function abrirConfiguracoes() {
  const overlay = document.createElement("div");
  overlay.className = "fixed inset-0 bg-ink/40 z-50 flex items-end";
  overlay.innerHTML = `
    <div class="w-full max-w-md mx-auto bg-paper-raised rounded-t-3xl p-5">
      <div class="w-10 h-1 bg-line rounded-full mx-auto mb-4"></div>
      <h2 class="font-display font-bold text-lg mb-4">Configurações</h2>
      <label class="text-xs font-medium text-ink-soft">Nome da loja</label>
      <input id="f-nome-loja" class="w-full border border-line rounded-xl px-3 py-2 mb-3 mt-1 bg-paper text-sm" placeholder="Vendaí" />
      <label class="text-xs font-medium text-ink-soft">Chave Pix</label>
      <input id="f-chave-pix" class="w-full border border-line rounded-xl px-3 py-2 mb-1 mt-1 bg-paper text-sm" placeholder="CPF, e-mail, telefone ou chave aleatória" />
      <p class="text-xs text-ink-soft mb-4">Aparece no comprovante, pronta pra cliente copiar e colar no banco.</p>
      <div class="flex gap-2">
        <button id="cancelar" class="tap flex-1 py-3 rounded-xl border border-line text-ink-soft font-medium">Cancelar</button>
        <button id="salvar" class="tap flex-[2] py-3 rounded-xl bg-teal text-paper font-display font-bold">Salvar</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  getConfigLoja().then((config) => {
    overlay.querySelector("#f-nome-loja").value = config.nomeLoja || "";
    overlay.querySelector("#f-chave-pix").value = config.chavePix || "";
  });

  overlay.querySelector("#cancelar").addEventListener("click", () => overlay.remove());
  overlay.querySelector("#salvar").addEventListener("click", async () => {
    const nomeLoja = overlay.querySelector("#f-nome-loja").value.trim() || "Vendaí";
    const chavePix = overlay.querySelector("#f-chave-pix").value.trim();
    const btn = overlay.querySelector("#salvar");
    btn.textContent = "Salvando...";
    btn.disabled = true;
    try {
      await salvarConfigLoja({ nomeLoja, chavePix });
      overlay.remove();
    } catch (err) {
      console.error(err);
      alert("Não foi possível salvar: " + (err.message || err));
      btn.textContent = "Salvar";
      btn.disabled = false;
    }
  });
}

function montarTela() {
  if (isUnlockedLocally()) {
    montarAppPrincipal();
  } else {
    app.innerHTML = "";
    renderLock(app, { onUnlocked: montarAppPrincipal });
  }
}

ensureAnonAuth().then(() => {
  montarTela();
});
