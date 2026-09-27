import { listenProdutos, addProduto, updateProduto, deleteProduto, carregarCaixa, devolverSobra } from "../js/db.js";

const fmt = (n) => Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 });

export function renderProdutos(root) {
  let produtos = [];

  root.innerHTML = `
    <div class="flex-1 pb-24">
      <div class="px-5 pt-2 pb-3 flex items-center justify-between">
        <h1 class="font-display font-extrabold text-2xl text-teal-dark">Produtos</h1>
        <button id="novo-produto" class="tap w-10 h-10 rounded-full bg-teal text-paper text-2xl leading-none flex items-center justify-center shadow-sm">+</button>
      </div>
      <div class="px-5 flex gap-2 mb-4">
        <button id="btn-carregar" class="tap flex-1 py-2.5 rounded-xl bg-teal-light text-teal-dark text-xs font-medium">📦 Carregar caixa</button>
        <button id="btn-devolver" class="tap flex-1 py-2.5 rounded-xl border border-line text-ink-soft text-xs font-medium">↩️ Devolver sobra</button>
      </div>
      <div id="lista" class="px-5 space-y-2"></div>
      <div id="vazio" class="hidden px-5 py-10 text-center text-ink-soft text-sm">
        Nenhum produto cadastrado. Toque em <b>+</b> pra adicionar o primeiro.
      </div>
    </div>
  `;

  const lista = root.querySelector("#lista");
  const vazio = root.querySelector("#vazio");

  function render() {
    if (produtos.length === 0) {
      lista.classList.add("hidden");
      vazio.classList.remove("hidden");
      return;
    }
    vazio.classList.add("hidden");
    lista.classList.remove("hidden");
    lista.innerHTML = produtos
      .map(
        (p) => `
      <div class="bg-paper-raised border border-line rounded-2xl p-4 flex items-center justify-between">
        <div>
          <div class="font-medium text-sm">${p.nome}</div>
          <div class="text-xs text-ink-soft mt-0.5">geral: ${p.estoque ?? 0} · <span class="text-teal font-medium">na caixa: ${p.estoqueCaixa ?? 0}</span></div>
        </div>
        <div class="flex items-center gap-3">
          <span class="tabular text-teal font-semibold text-sm">R$ ${fmt(p.preco)}</span>
          <button data-id="${p.id}" class="editar text-ink-soft text-xs underline">editar</button>
        </div>
      </div>`
      )
      .join("");

    lista.querySelectorAll(".editar").forEach((b) =>
      b.addEventListener("click", () => abrirForm(produtos.find((p) => p.id === b.dataset.id)))
    );
  }

  function abrirForm(produto) {
    const overlay = document.createElement("div");
    overlay.className = "fixed inset-0 bg-ink/40 z-40 flex items-end";
    overlay.innerHTML = `
      <div class="w-full max-w-md mx-auto bg-paper-raised rounded-t-3xl p-5">
        <div class="w-10 h-1 bg-line rounded-full mx-auto mb-4"></div>
        <h2 class="font-display font-bold text-lg mb-4">${produto ? "Editar" : "Novo"} produto</h2>
        <label class="text-xs font-medium text-ink-soft">Nome</label>
        <input id="f-nome" value="${produto?.nome || ""}" class="w-full border border-line rounded-xl px-3 py-2 mb-3 mt-1 bg-paper text-sm" placeholder="Ex: Picolé de morango" />
        <label class="text-xs font-medium text-ink-soft">Preço (R$)</label>
        <input id="f-preco" type="number" step="0.01" value="${produto?.preco ?? ""}" class="w-full border border-line rounded-xl px-3 py-2 mb-3 mt-1 bg-paper text-sm tabular" placeholder="0,00" />
        <div class="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label class="text-xs font-medium text-ink-soft">Estoque geral</label>
            <input id="f-estoque" type="number" value="${produto?.estoque ?? 0}" class="w-full border border-line rounded-xl px-3 py-2 mt-1 bg-paper text-sm tabular" />
          </div>
          <div>
            <label class="text-xs font-medium text-ink-soft">Na caixa</label>
            <input id="f-estoque-caixa" type="number" value="${produto?.estoqueCaixa ?? 0}" class="w-full border border-line rounded-xl px-3 py-2 mt-1 bg-paper text-sm tabular" />
          </div>
        </div>
        <div class="flex gap-2">
          ${produto ? `<button id="excluir" class="tap px-4 py-3 rounded-xl border border-coral text-coral text-sm font-medium">Excluir</button>` : ""}
          <button id="cancelar" class="tap flex-1 py-3 rounded-xl border border-line text-ink-soft font-medium">Cancelar</button>
          <button id="salvar" class="tap flex-[2] py-3 rounded-xl bg-teal text-paper font-display font-bold">Salvar</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.querySelector("#cancelar").addEventListener("click", () => overlay.remove());
    overlay.querySelector("#excluir")?.addEventListener("click", async () => {
      if (confirm("Excluir este produto?")) {
        await deleteProduto(produto.id);
        overlay.remove();
      }
    });
    overlay.querySelector("#salvar").addEventListener("click", async () => {
      const nome = overlay.querySelector("#f-nome").value.trim();
      const preco = overlay.querySelector("#f-preco").value;
      const estoque = overlay.querySelector("#f-estoque").value;
      const estoqueCaixa = overlay.querySelector("#f-estoque-caixa").value;
      if (!nome || !preco) {
        alert("Preencha nome e preço.");
        return;
      }
      const btn = overlay.querySelector("#salvar");
      const textoOriginal = btn.textContent;
      btn.textContent = "Salvando...";
      btn.disabled = true;
      try {
        if (produto)
          await updateProduto(produto.id, {
            nome,
            preco: Number(preco),
            estoque: Number(estoque),
            estoqueCaixa: Number(estoqueCaixa),
          });
        else await addProduto({ nome, preco, estoque });
        overlay.remove();
      } catch (err) {
        console.error(err);
        alert("Não foi possível salvar: " + (err.message || err));
        btn.textContent = textoOriginal;
        btn.disabled = false;
      }
    });
  }

  function abrirCarregarCaixa() {
    const overlay = document.createElement("div");
    overlay.className = "fixed inset-0 bg-ink/40 z-40 flex items-end";
    overlay.innerHTML = `
      <div class="w-full max-w-md mx-auto bg-paper-raised rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto">
        <div class="w-10 h-1 bg-line rounded-full mx-auto mb-4"></div>
        <h2 class="font-display font-bold text-lg mb-1">Carregar caixa</h2>
        <p class="text-xs text-ink-soft mb-4">Quanto de cada produto você vai levar? Isso tira do estoque geral e põe na caixa.</p>
        <div id="lista-carregar" class="space-y-3 mb-4"></div>
        <div class="flex gap-2">
          <button id="cancelar" class="tap flex-1 py-3 rounded-xl border border-line text-ink-soft font-medium">Cancelar</button>
          <button id="confirmar" class="tap flex-[2] py-3 rounded-xl bg-teal text-paper font-display font-bold">Carregar</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const listaEl = overlay.querySelector("#lista-carregar");
    listaEl.innerHTML = produtos
      .map(
        (p) => `
      <div class="flex items-center justify-between gap-3">
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium truncate">${p.nome}</div>
          <div class="text-xs text-ink-soft">geral disponível: ${p.estoque ?? 0}</div>
        </div>
        <input data-id="${p.id}" type="number" min="0" max="${p.estoque ?? 0}" placeholder="0" class="qtd-carregar tabular w-20 text-right border border-line rounded-lg px-2 py-1.5 bg-paper text-sm" />
      </div>`
      )
      .join("");

    overlay.querySelector("#cancelar").addEventListener("click", () => overlay.remove());
    overlay.querySelector("#confirmar").addEventListener("click", async () => {
      const itens = [];
      overlay.querySelectorAll(".qtd-carregar").forEach((input) => {
        const quantidade = Number(input.value);
        if (quantidade > 0) itens.push({ produtoId: input.dataset.id, quantidade });
      });
      if (itens.length === 0) {
        alert("Digite a quantidade de pelo menos um produto.");
        return;
      }
      const btn = overlay.querySelector("#confirmar");
      btn.textContent = "Carregando...";
      btn.disabled = true;
      try {
        await carregarCaixa(itens);
        overlay.remove();
      } catch (err) {
        console.error(err);
        alert("Não foi possível carregar a caixa: " + (err.message || err));
        btn.textContent = "Carregar";
        btn.disabled = false;
      }
    });
  }

  function abrirDevolverSobra() {
    const comSobra = produtos.filter((p) => (p.estoqueCaixa ?? 0) > 0);
    if (comSobra.length === 0) {
      alert("Não tem nada na caixa pra devolver agora.");
      return;
    }
    const overlay = document.createElement("div");
    overlay.className = "fixed inset-0 bg-ink/40 z-40 flex items-end";
    overlay.innerHTML = `
      <div class="w-full max-w-md mx-auto bg-paper-raised rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto">
        <div class="w-10 h-1 bg-line rounded-full mx-auto mb-4"></div>
        <h2 class="font-display font-bold text-lg mb-1">Devolver sobra</h2>
        <p class="text-xs text-ink-soft mb-4">Isso volta tudo que está na caixa pro estoque geral, zerando a caixa.</p>
        <div class="space-y-2 mb-4">
          ${comSobra
            .map(
              (p) => `
            <div class="flex justify-between text-sm">
              <span>${p.nome}</span>
              <span class="tabular font-medium">${p.estoqueCaixa}</span>
            </div>`
            )
            .join("")}
        </div>
        <div class="flex gap-2">
          <button id="cancelar" class="tap flex-1 py-3 rounded-xl border border-line text-ink-soft font-medium">Cancelar</button>
          <button id="confirmar" class="tap flex-[2] py-3 rounded-xl bg-teal text-paper font-display font-bold">Devolver tudo</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.querySelector("#cancelar").addEventListener("click", () => overlay.remove());
    overlay.querySelector("#confirmar").addEventListener("click", async () => {
      const btn = overlay.querySelector("#confirmar");
      btn.textContent = "Devolvendo...";
      btn.disabled = true;
      try {
        await devolverSobra(comSobra);
        overlay.remove();
      } catch (err) {
        console.error(err);
        alert("Não foi possível devolver: " + (err.message || err));
        btn.textContent = "Devolver tudo";
        btn.disabled = false;
      }
    });
  }

  root.querySelector("#novo-produto").addEventListener("click", () => abrirForm(null));
  root.querySelector("#btn-carregar").addEventListener("click", abrirCarregarCaixa);
  root.querySelector("#btn-devolver").addEventListener("click", abrirDevolverSobra);

  listenProdutos((data) => {
    produtos = data;
    render();
  });
}
