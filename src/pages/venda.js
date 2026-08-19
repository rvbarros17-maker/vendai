import { listenProdutos, listenClientes, registrarVenda, addCliente } from "../js/db.js";
import { gerarTextoComprovante, compartilharWhatsApp, imprimirComprovante, gerarTextoCardapio } from "../js/comprovante.js";
import { listenConfigLoja } from "../js/config.js";

const fmt = (n) => Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 });

export function renderVenda(root) {
  let produtos = [];
  let clientes = [];
  let carrinho = []; // { produtoId, nome, preco, qtd }
  let formaPagamento = "dinheiro";
  let clienteId = null;
  let desconto = 0;
  let configLoja = { nomeLoja: "Vendaí", chavePix: "" };

  root.innerHTML = `
    <div class="flex-1 flex flex-col pb-24">
      <div class="px-5 pt-2 pb-3 flex items-center justify-between">
        <h1 class="font-display font-extrabold text-2xl text-teal-dark">Nova venda</h1>
        <button id="btn-cardapio" class="tap text-xs text-teal font-medium border border-teal-light bg-teal-light rounded-full px-3 py-1.5">📋 Cardápio</button>
      </div>

      <div id="grid-produtos" class="grid grid-cols-2 gap-3 px-5"></div>

      <div id="vazio" class="hidden px-5 py-10 text-center text-ink-soft text-sm">
        Nenhum produto ainda. Cadastre na aba <b>Produtos</b> pra começar a vender.
      </div>
    </div>

    <!-- Carrinho fixo no rodapé -->
    <div id="carrinho-bar" class="fixed bottom-16 left-0 right-0 max-w-md mx-auto"></div>
  `;

  const grid = root.querySelector("#grid-produtos");
  const vazio = root.querySelector("#vazio");
  const bar = root.querySelector("#carrinho-bar");

  function renderGrid() {
    if (produtos.length === 0) {
      grid.classList.add("hidden");
      vazio.classList.remove("hidden");
      return;
    }
    vazio.classList.add("hidden");
    grid.classList.remove("hidden");
    grid.innerHTML = produtos
      .map(
        (p) => `
      <button data-id="${p.id}" class="tap produto-btn text-left bg-paper-raised border border-line rounded-2xl p-4 shadow-sm active:shadow-none">
        <div class="font-display font-bold text-sm leading-snug mb-2">${p.nome}</div>
        <div class="tabular text-teal font-semibold">R$ ${fmt(p.preco)}</div>
        <div class="text-xs text-ink-soft mt-1">na caixa: ${p.estoqueCaixa ?? 0}</div>
      </button>`
      )
      .join("");

    grid.querySelectorAll(".produto-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const p = produtos.find((x) => x.id === btn.dataset.id);
        const item = carrinho.find((i) => i.produtoId === p.id);
        if (item) item.qtd += 1;
        else carrinho.push({ produtoId: p.id, nome: p.nome, preco: p.preco, qtd: 1 });
        renderBar();
      });
    });
  }

  function subtotal() {
    return carrinho.reduce((s, i) => s + i.preco * i.qtd, 0);
  }

  function total() {
    return Math.max(0, subtotal() - Number(desconto || 0));
  }

  function renderBar() {
    if (carrinho.length === 0) {
      bar.innerHTML = "";
      return;
    }
    bar.innerHTML = `
      <div class="mx-4 mb-2 bg-teal-dark text-paper rounded-2xl shadow-lg overflow-hidden">
        <button id="abrir-carrinho" class="tap w-full flex items-center justify-between px-5 py-4">
          <span class="text-sm">${carrinho.reduce((s, i) => s + i.qtd, 0)} item(ns)</span>
          <span class="font-display font-bold tabular text-lg">R$ ${fmt(total())}</span>
        </button>
      </div>`;
    bar.querySelector("#abrir-carrinho").addEventListener("click", abrirCheckout);
  }

  function abrirCheckout() {
    const overlay = document.createElement("div");
    overlay.className = "fixed inset-0 bg-ink/40 z-40 flex items-end";
    overlay.innerHTML = `
      <div class="w-full max-w-md mx-auto bg-paper-raised rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto">
        <div class="w-10 h-1 bg-line rounded-full mx-auto mb-4"></div>
        <h2 class="font-display font-bold text-lg mb-3">Fechar venda</h2>
        <div id="lista-itens" class="space-y-2 mb-3"></div>

        <div class="flex items-center justify-between text-sm mb-1">
          <span class="text-ink-soft">Subtotal</span>
          <span class="tabular">R$ ${fmt(subtotal())}</span>
        </div>
        <div class="flex items-center justify-between text-sm mb-3">
          <span class="text-ink-soft">Desconto (R$)</span>
          <input id="f-desconto" type="number" step="0.01" min="0" value="${desconto || ""}" placeholder="0,00" class="tabular w-24 text-right border border-line rounded-lg px-2 py-1 bg-paper text-sm" />
        </div>

        <div class="flex justify-between items-center border-t border-line pt-3 mb-4">
          <span class="text-ink-soft text-sm">Total</span>
          <span id="total-final" class="font-display font-extrabold text-xl tabular text-teal-dark">R$ ${fmt(total())}</span>
        </div>

        <div class="mb-4">
          <div class="text-xs font-medium text-ink-soft mb-2">Forma de pagamento</div>
          <div id="pagamentos" class="grid grid-cols-4 gap-2"></div>
        </div>

        <div id="area-cliente" class="hidden mb-4"></div>

        <div class="flex gap-2">
          <button id="cancelar" class="tap flex-1 py-3 rounded-xl border border-line text-ink-soft font-medium">Cancelar</button>
          <button id="confirmar" class="tap flex-[2] py-3 rounded-xl bg-teal text-paper font-display font-bold">Confirmar venda</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const listaEl = overlay.querySelector("#lista-itens");
    listaEl.innerHTML = carrinho
      .map(
        (i) => `
      <div class="flex items-center justify-between text-sm">
        <span>${i.nome}</span>
        <span class="flex items-center gap-2">
          <button data-id="${i.produtoId}" class="menos w-6 h-6 rounded-full bg-teal-light text-teal-dark">−</button>
          <span class="tabular w-4 text-center">${i.qtd}</span>
          <button data-id="${i.produtoId}" class="mais w-6 h-6 rounded-full bg-teal-light text-teal-dark">+</button>
        </span>
      </div>`
      )
      .join("");

    overlay.querySelector("#f-desconto").addEventListener("input", (e) => {
      const v = Number(e.target.value);
      desconto = isNaN(v) || v < 0 ? 0 : v;
      overlay.querySelector("#total-final").textContent = "R$ " + fmt(total());
    });

    const formas = [
      { id: "dinheiro", label: "Dinheiro" },
      { id: "pix", label: "Pix" },
      { id: "cartao", label: "Cartão" },
      { id: "fiado", label: "Fiado" },
    ];
    const pagEl = overlay.querySelector("#pagamentos");
    function renderFormas() {
      pagEl.innerHTML = formas
        .map(
          (f) => `
        <button data-id="${f.id}" class="tap forma-btn py-2 rounded-xl text-xs font-medium border ${
            formaPagamento === f.id
              ? "bg-coral text-paper border-coral"
              : "bg-paper border-line text-ink-soft"
          }">${f.label}</button>`
        )
        .join("");
      pagEl.querySelectorAll(".forma-btn").forEach((b) =>
        b.addEventListener("click", () => {
          formaPagamento = b.dataset.id;
          renderFormas();
          renderClienteArea();
        })
      );
    }
    renderFormas();

    const areaCliente = overlay.querySelector("#area-cliente");
    function renderClienteArea() {
      if (formaPagamento !== "fiado") {
        areaCliente.classList.add("hidden");
        return;
      }
      areaCliente.classList.remove("hidden");
      areaCliente.innerHTML = `
        <div class="text-xs font-medium text-ink-soft mb-2">Cliente (fiado)</div>
        <select id="select-cliente" class="w-full border border-line rounded-xl px-3 py-2 bg-paper text-sm mb-2">
          <option value="">Selecionar cliente...</option>
          ${clientes.map((c) => `<option value="${c.id}" ${clienteId === c.id ? "selected" : ""}>${c.nome}</option>`).join("")}
        </select>
        <button id="novo-cliente-inline" class="text-xs text-teal font-medium">+ cadastrar novo cliente</button>
      `;
      areaCliente.querySelector("#select-cliente").addEventListener("change", (e) => {
        clienteId = e.target.value || null;
      });
      areaCliente.querySelector("#novo-cliente-inline").addEventListener("click", async () => {
        const nome = prompt("Nome do cliente:");
        if (!nome) return;
        const telefone = prompt("Telefone (opcional):") || "";
        await addCliente({ nome, telefone });
      });
    }
    renderClienteArea();

    listaEl.querySelectorAll(".mais").forEach((b) =>
      b.addEventListener("click", () => {
        const item = carrinho.find((i) => i.produtoId === b.dataset.id);
        item.qtd += 1;
        overlay.remove();
        renderBar();
        abrirCheckout();
      })
    );
    listaEl.querySelectorAll(".menos").forEach((b) =>
      b.addEventListener("click", () => {
        const item = carrinho.find((i) => i.produtoId === b.dataset.id);
        item.qtd -= 1;
        if (item.qtd <= 0) carrinho = carrinho.filter((i) => i.produtoId !== b.dataset.id);
        overlay.remove();
        renderBar();
        if (carrinho.length) abrirCheckout();
      })
    );

    overlay.querySelector("#cancelar").addEventListener("click", () => {
      desconto = 0;
      overlay.remove();
    });
    overlay.querySelector("#confirmar").addEventListener("click", async () => {
      if (formaPagamento === "fiado" && !clienteId) {
        alert("Selecione o cliente pra registrar a venda fiado.");
        return;
      }
      const btn = overlay.querySelector("#confirmar");
      const textoOriginal = btn.textContent;
      btn.textContent = "Salvando...";
      btn.disabled = true;
      try {
        const vendaFinalizada = {
          itens: carrinho,
          subtotal: subtotal(),
          desconto: Number(desconto || 0),
          total: total(),
          formaPagamento,
          clienteId,
          clienteNome: clienteId ? clientes.find((c) => c.id === clienteId)?.nome : null,
          clienteTelefone: clienteId ? clientes.find((c) => c.id === clienteId)?.telefone : null,
        };
        await registrarVenda(vendaFinalizada);
        carrinho = [];
        formaPagamento = "dinheiro";
        clienteId = null;
        desconto = 0;
        overlay.remove();
        renderBar();
        abrirComprovante(vendaFinalizada);
      } catch (err) {
        console.error(err);
        alert("Não foi possível salvar a venda: " + (err.message || err));
        btn.textContent = textoOriginal;
        btn.disabled = false;
      }
    });
  }

  function abrirComprovante(venda) {
    const texto = gerarTextoComprovante(venda, configLoja.nomeLoja, configLoja.chavePix);
    const overlay = document.createElement("div");
    overlay.className = "fixed inset-0 bg-ink/40 z-40 flex items-end";
    overlay.innerHTML = `
      <div class="w-full max-w-md mx-auto bg-paper-raised rounded-t-3xl p-5">
        <div class="w-10 h-1 bg-line rounded-full mx-auto mb-4"></div>
        <div class="text-center mb-4">
          <div class="w-12 h-12 rounded-full bg-teal-light text-teal flex items-center justify-center mx-auto mb-2 text-2xl">✓</div>
          <h2 class="font-display font-bold text-lg">Venda registrada!</h2>
        </div>
        <pre class="tabular bg-paper border border-line rounded-xl p-3 text-xs whitespace-pre-wrap mb-4 max-h-64 overflow-y-auto">${texto}</pre>
        ${
          configLoja.chavePix
            ? `<button id="btn-copiar-pix" class="tap w-full mb-2 py-2.5 rounded-xl bg-teal-light text-teal-dark text-sm font-medium">📋 Copiar chave Pix</button>`
            : ""
        }
        <div class="grid grid-cols-2 gap-2 mb-2">
          <button id="btn-whatsapp" class="tap py-3 rounded-xl border border-line text-sm font-medium flex items-center justify-center gap-1.5">
            📱 WhatsApp
          </button>
          <button id="btn-imprimir" class="tap py-3 rounded-xl border border-line text-sm font-medium flex items-center justify-center gap-1.5">
            🖨️ Imprimir
          </button>
        </div>
        <button id="fechar-comprovante" class="tap w-full py-3 rounded-xl bg-teal text-paper font-display font-bold">Nova venda</button>
      </div>`;
    document.body.appendChild(overlay);

    overlay.querySelector("#btn-copiar-pix")?.addEventListener("click", async (e) => {
      try {
        await navigator.clipboard.writeText(configLoja.chavePix);
        const btn = e.currentTarget;
        const original = btn.textContent;
        btn.textContent = "✓ Copiado!";
        setTimeout(() => (btn.textContent = original), 1500);
      } catch {
        alert("Chave Pix: " + configLoja.chavePix);
      }
    });
    overlay.querySelector("#btn-whatsapp").addEventListener("click", () => {
      compartilharWhatsApp(texto, venda.clienteTelefone);
    });
    overlay.querySelector("#btn-imprimir").addEventListener("click", () => {
      imprimirComprovante(venda, configLoja.nomeLoja, configLoja.chavePix);
    });
    overlay.querySelector("#fechar-comprovante").addEventListener("click", () => overlay.remove());
  }

  root.querySelector("#btn-cardapio").addEventListener("click", () => {
    const disponiveis = produtos.filter((p) => (p.estoqueCaixa ?? 0) > 0);
    if (disponiveis.length === 0) {
      alert("Nenhum produto com estoque na caixa agora. Carregue a caixa na aba Produtos primeiro.");
      return;
    }
    const texto = gerarTextoCardapio(disponiveis, configLoja.nomeLoja);
    compartilharWhatsApp(texto);
  });

  listenProdutos((data) => {
    produtos = data;
    renderGrid();
  });
  listenClientes((data) => {
    clientes = data;
  });
  listenConfigLoja((data) => {
    configLoja = data;
  });
}
