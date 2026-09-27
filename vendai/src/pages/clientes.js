import { listenClientes, addCliente, updateCliente, registrarPagamento, ajustarSaldoCliente } from "../js/db.js";
import { gerarTextoCobranca, compartilharWhatsApp } from "../js/comprovante.js";
import { listenConfigLoja } from "../js/config.js";

const fmt = (n) => Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 });

export function renderClientes(root) {
  let clientes = [];
  let configLoja = { nomeLoja: "Vendaí", chavePix: "" };

  root.innerHTML = `
    <div class="flex-1 pb-24">
      <div class="px-5 pt-2 pb-1 flex items-center justify-between">
        <h1 class="font-display font-extrabold text-2xl text-teal-dark">Fiado</h1>
        <button id="novo-cliente" class="tap w-10 h-10 rounded-full bg-teal text-paper text-2xl leading-none flex items-center justify-center shadow-sm">+</button>
      </div>
      <p class="px-5 text-xs text-ink-soft mb-3">O caderninho digital dos seus fiadores.</p>

      <div class="px-5 mb-4">
        <div class="bg-coral text-paper rounded-2xl p-4 flex items-center justify-between">
          <span class="text-sm opacity-90">Total a receber</span>
          <span id="total-fiado" class="font-display font-extrabold text-2xl tabular">R$ 0,00</span>
        </div>
      </div>

      <div id="caderninho" class="mx-4 bg-paper-raised border border-line rounded-2xl shadow-sm overflow-hidden">
        <div id="lista" class="caderninho"></div>
      </div>

      <div id="vazio" class="hidden px-5 py-10 text-center text-ink-soft text-sm">
        Ninguém fiado por aqui ainda.
      </div>
    </div>
  `;

  const lista = root.querySelector("#lista");
  const caderninho = root.querySelector("#caderninho");
  const vazio = root.querySelector("#vazio");
  const elTotal = root.querySelector("#total-fiado");

  function render() {
    const totalFiado = clientes.reduce((s, c) => s + Math.max(0, c.saldoDevedor || 0), 0);
    elTotal.textContent = "R$ " + fmt(totalFiado);

    if (clientes.length === 0) {
      caderninho.classList.add("hidden");
      vazio.classList.remove("hidden");
      return;
    }
    vazio.classList.add("hidden");
    caderninho.classList.remove("hidden");
    lista.innerHTML = clientes
      .map((c) => {
        const saldo = c.saldoDevedor || 0;
        const deve = saldo > 0;
        const temCredito = saldo < 0;
        return `
      <div class="flex items-center justify-between pl-9 pr-4" style="height:28px;">
        <span class="text-sm truncate ${deve ? "font-medium" : "text-ink-soft"}">${c.nome}</span>
        <div class="flex items-center gap-2">
          ${
            deve
              ? `<button data-id="${c.id}" class="cobrar-btn text-sm" title="Cobrar no WhatsApp">📲</button>`
              : ""
          }
          <button data-id="${c.id}" class="ver-cliente tabular text-sm font-semibold ${
          deve ? "text-coral" : temCredito ? "text-teal" : "text-ink-soft"
        }">
            ${deve ? "R$ " + fmt(saldo) : temCredito ? "crédito R$ " + fmt(-saldo) : "quite"}
          </button>
        </div>
      </div>`;
      })
      .join("");

    lista.querySelectorAll(".ver-cliente").forEach((b) =>
      b.addEventListener("click", () => abrirCliente(clientes.find((c) => c.id === b.dataset.id)))
    );
    lista.querySelectorAll(".cobrar-btn").forEach((b) =>
      b.addEventListener("click", () => cobrar(clientes.find((c) => c.id === b.dataset.id)))
    );
  }

  function cobrar(cliente) {
    if (!cliente.telefone) {
      alert("Esse cliente não tem telefone cadastrado. Toca em editar pra adicionar antes de cobrar.");
      return;
    }
    const texto = gerarTextoCobranca(cliente, configLoja.chavePix, configLoja.nomeLoja);
    compartilharWhatsApp(texto, cliente.telefone);
  }

  function abrirCliente(cliente) {
    const saldo = cliente.saldoDevedor || 0;
    const deve = saldo > 0;
    const temCredito = saldo < 0;
    const overlay = document.createElement("div");
    overlay.className = "fixed inset-0 bg-ink/40 z-40 flex items-end";
    overlay.innerHTML = `
      <div class="w-full max-w-md mx-auto bg-paper-raised rounded-t-3xl p-5">
        <div class="w-10 h-1 bg-line rounded-full mx-auto mb-4"></div>
        <div class="flex items-start justify-between mb-1">
          <div>
            <h2 class="font-display font-bold text-lg">${cliente.nome}</h2>
            <p class="text-xs text-ink-soft">${cliente.telefone || "sem telefone"}</p>
          </div>
          <button id="editar-cliente" class="text-xs text-teal font-medium underline shrink-0 mt-1">editar</button>
        </div>
        <div class="${deve ? "bg-coral-light" : temCredito ? "bg-teal-light" : "bg-paper"} rounded-2xl p-4 mb-4 mt-3 text-center">
          <div class="text-xs text-ink-soft mb-1">${deve ? "deve atualmente" : temCredito ? "tem de crédito" : "sem pendências"}</div>
          ${
            deve || temCredito
              ? `<div class="font-display font-extrabold text-2xl tabular ${deve ? "text-coral" : "text-teal-dark"}">R$ ${fmt(Math.abs(saldo))}</div>`
              : `<div class="text-2xl">🎉</div>`
          }
        </div>

        <label class="text-xs font-medium text-ink-soft">Registrar pagamento (R$)</label>
        <input id="f-pagamento" type="number" step="0.01" class="w-full border border-line rounded-xl px-3 py-2 mb-1 mt-1 bg-paper text-sm tabular" placeholder="0,00" />
        <p class="text-xs text-ink-soft mb-3">Pagou mais que devia? Pode digitar o valor maior — a diferença fica guardada como crédito pra próxima compra.</p>
        <div class="flex items-center justify-between mb-4">
          ${
            deve
              ? `<button id="pagar-total" class="text-xs text-teal font-medium underline">pagar tudo (R$ ${fmt(saldo)})</button>`
              : `<span></span>`
          }
          ${
            deve
              ? `<button id="cobrar-whatsapp" class="text-xs text-teal font-medium underline">📲 cobrar no WhatsApp</button>`
              : ""
          }
        </div>

        <div class="flex gap-2 mb-3">
          <button id="fechar" class="tap flex-1 py-3 rounded-xl border border-line text-ink-soft font-medium">Fechar</button>
          <button id="confirmar-pagamento" class="tap flex-[2] py-3 rounded-xl bg-teal text-paper font-display font-bold">Confirmar</button>
        </div>
        <button id="ajustar-saldo" class="text-xs text-ink-soft underline w-full text-center">ajustar saldo manualmente</button>
      </div>`;
    document.body.appendChild(overlay);

    overlay.querySelector("#fechar").addEventListener("click", () => overlay.remove());
    overlay.querySelector("#editar-cliente").addEventListener("click", () => {
      overlay.remove();
      abrirEdicaoCliente(cliente);
    });
    overlay.querySelector("#pagar-total")?.addEventListener("click", () => {
      overlay.querySelector("#f-pagamento").value = saldo;
    });
    overlay.querySelector("#cobrar-whatsapp")?.addEventListener("click", () => cobrar(cliente));
    overlay.querySelector("#confirmar-pagamento").addEventListener("click", async () => {
      const valor = Number(overlay.querySelector("#f-pagamento").value);
      if (!valor || valor <= 0) {
        alert("Informe um valor válido.");
        return;
      }
      const btn = overlay.querySelector("#confirmar-pagamento");
      btn.textContent = "Salvando...";
      btn.disabled = true;
      try {
        await registrarPagamento(cliente.id, valor);
        overlay.remove();
      } catch (err) {
        console.error(err);
        alert("Não foi possível registrar o pagamento: " + (err.message || err));
        btn.textContent = "Confirmar";
        btn.disabled = false;
      }
    });
    overlay.querySelector("#ajustar-saldo").addEventListener("click", () => {
      overlay.remove();
      abrirAjusteSaldo(cliente);
    });
  }

  function abrirAjusteSaldo(cliente) {
    const overlay = document.createElement("div");
    overlay.className = "fixed inset-0 bg-ink/40 z-40 flex items-end";
    overlay.innerHTML = `
      <div class="w-full max-w-md mx-auto bg-paper-raised rounded-t-3xl p-5">
        <div class="w-10 h-1 bg-line rounded-full mx-auto mb-4"></div>
        <h2 class="font-display font-bold text-lg mb-1">Ajustar saldo de ${cliente.nome}</h2>
        <p class="text-xs text-ink-soft mb-4">Corrige o saldo direto, se ele tiver ficado errado. Número positivo = dívida. Número negativo = crédito. Zero = quite.</p>
        <label class="text-xs font-medium text-ink-soft">Novo saldo (R$)</label>
        <input id="f-saldo" type="number" step="0.01" value="${cliente.saldoDevedor || 0}" class="w-full border border-line rounded-xl px-3 py-2 mb-4 mt-1 bg-paper text-sm tabular" />
        <div class="flex gap-2">
          <button id="cancelar" class="tap flex-1 py-3 rounded-xl border border-line text-ink-soft font-medium">Cancelar</button>
          <button id="salvar" class="tap flex-[2] py-3 rounded-xl bg-teal text-paper font-display font-bold">Salvar</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector("#cancelar").addEventListener("click", () => overlay.remove());
    overlay.querySelector("#salvar").addEventListener("click", async () => {
      const novoSaldo = overlay.querySelector("#f-saldo").value;
      const btn = overlay.querySelector("#salvar");
      btn.textContent = "Salvando...";
      btn.disabled = true;
      try {
        await ajustarSaldoCliente(cliente.id, novoSaldo);
        overlay.remove();
      } catch (err) {
        console.error(err);
        alert("Não foi possível ajustar: " + (err.message || err));
        btn.textContent = "Salvar";
        btn.disabled = false;
      }
    });
  }

  function abrirEdicaoCliente(cliente) {
    const overlay = document.createElement("div");
    overlay.className = "fixed inset-0 bg-ink/40 z-40 flex items-end";
    overlay.innerHTML = `
      <div class="w-full max-w-md mx-auto bg-paper-raised rounded-t-3xl p-5">
        <div class="w-10 h-1 bg-line rounded-full mx-auto mb-4"></div>
        <h2 class="font-display font-bold text-lg mb-4">Editar cliente</h2>
        <label class="text-xs font-medium text-ink-soft">Nome</label>
        <input id="f-nome" value="${cliente.nome || ""}" class="w-full border border-line rounded-xl px-3 py-2 mb-3 mt-1 bg-paper text-sm" placeholder="Nome do cliente" />
        <label class="text-xs font-medium text-ink-soft">Telefone (opcional)</label>
        <input id="f-telefone" value="${cliente.telefone || ""}" class="w-full border border-line rounded-xl px-3 py-2 mb-4 mt-1 bg-paper text-sm" placeholder="(00) 00000-0000" />
        <div class="flex gap-2">
          <button id="cancelar" class="tap flex-1 py-3 rounded-xl border border-line text-ink-soft font-medium">Cancelar</button>
          <button id="salvar" class="tap flex-[2] py-3 rounded-xl bg-teal text-paper font-display font-bold">Salvar</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector("#cancelar").addEventListener("click", () => overlay.remove());
    overlay.querySelector("#salvar").addEventListener("click", async () => {
      const nome = overlay.querySelector("#f-nome").value.trim();
      const telefone = overlay.querySelector("#f-telefone").value.trim();
      if (!nome) {
        alert("Informe o nome.");
        return;
      }
      const btn = overlay.querySelector("#salvar");
      btn.textContent = "Salvando...";
      btn.disabled = true;
      try {
        await updateCliente(cliente.id, { nome, telefone });
        overlay.remove();
      } catch (err) {
        console.error(err);
        alert("Não foi possível salvar: " + (err.message || err));
        btn.textContent = "Salvar";
        btn.disabled = false;
      }
    });
  }

  root.querySelector("#novo-cliente").addEventListener("click", () => {
    const overlay = document.createElement("div");
    overlay.className = "fixed inset-0 bg-ink/40 z-40 flex items-end";
    overlay.innerHTML = `
      <div class="w-full max-w-md mx-auto bg-paper-raised rounded-t-3xl p-5">
        <div class="w-10 h-1 bg-line rounded-full mx-auto mb-4"></div>
        <h2 class="font-display font-bold text-lg mb-4">Novo cliente</h2>
        <label class="text-xs font-medium text-ink-soft">Nome</label>
        <input id="f-nome" class="w-full border border-line rounded-xl px-3 py-2 mb-3 mt-1 bg-paper text-sm" placeholder="Nome do cliente" />
        <label class="text-xs font-medium text-ink-soft">Telefone (opcional)</label>
        <input id="f-telefone" class="w-full border border-line rounded-xl px-3 py-2 mb-4 mt-1 bg-paper text-sm" placeholder="(00) 00000-0000" />
        <div class="flex gap-2">
          <button id="cancelar" class="tap flex-1 py-3 rounded-xl border border-line text-ink-soft font-medium">Cancelar</button>
          <button id="salvar" class="tap flex-[2] py-3 rounded-xl bg-teal text-paper font-display font-bold">Salvar</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector("#cancelar").addEventListener("click", () => overlay.remove());
    overlay.querySelector("#salvar").addEventListener("click", async () => {
      const nome = overlay.querySelector("#f-nome").value.trim();
      const telefone = overlay.querySelector("#f-telefone").value.trim();
      if (!nome) {
        alert("Informe o nome.");
        return;
      }
      await addCliente({ nome, telefone });
      overlay.remove();
    });
  });

  listenClientes((data) => {
    clientes = data;
    render();
  });
  listenConfigLoja((data) => {
    configLoja = data;
  });
}
