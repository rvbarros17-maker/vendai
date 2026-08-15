import { listenVendasDoDia, estornarVenda, marcarVendaPaga } from "../js/db.js";

const fmt = (n) => Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
const formaLabel = { dinheiro: "Dinheiro", pix: "Pix", cartao: "Cartão", fiado: "Fiado" };

export function renderCaixa(root) {
  root.innerHTML = `
    <div class="flex-1 pb-24">
      <div class="px-5 pt-2 pb-4">
        <h1 class="font-display font-extrabold text-2xl text-teal-dark">Caixa do dia</h1>
      </div>

      <div class="px-5 grid grid-cols-3 gap-2 mb-5">
        <div class="bg-teal text-paper rounded-2xl p-3">
          <div class="text-[11px] opacity-80 mb-1 leading-tight">Vendas realizadas</div>
          <div id="total-realizado" class="font-display font-extrabold text-base tabular">R$ 0,00</div>
        </div>
        <div class="bg-teal-light rounded-2xl p-3">
          <div class="text-[11px] text-ink-soft mb-1 leading-tight">Vendas pagas</div>
          <div id="total-pago" class="font-display font-extrabold text-base tabular text-teal-dark">R$ 0,00</div>
        </div>
        <div class="bg-coral-light rounded-2xl p-3">
          <div class="text-[11px] text-ink-soft mb-1 leading-tight">Venda fiado</div>
          <div id="total-pendente" class="font-display font-extrabold text-base tabular text-coral">R$ 0,00</div>
        </div>
      </div>

      <div class="px-5 mb-2 text-xs font-medium text-ink-soft">Vendas de hoje</div>
      <div id="lista" class="px-5 space-y-2"></div>
      <div id="vazio" class="hidden px-5 py-10 text-center text-ink-soft text-sm">
        Nenhuma venda registrada hoje ainda.
      </div>
    </div>
  `;

  let vendasAtuais = [];

  const lista = root.querySelector("#lista");
  const vazio = root.querySelector("#vazio");
  const elRealizado = root.querySelector("#total-realizado");
  const elPago = root.querySelector("#total-pago");
  const elPendente = root.querySelector("#total-pendente");

  function abrirEstorno(venda) {
    const overlay = document.createElement("div");
    overlay.className = "fixed inset-0 bg-ink/40 z-40 flex items-end";
    overlay.innerHTML = `
      <div class="w-full max-w-md mx-auto bg-paper-raised rounded-t-3xl p-5">
        <div class="w-10 h-1 bg-line rounded-full mx-auto mb-4"></div>
        <h2 class="font-display font-bold text-lg mb-2">Estornar venda?</h2>
        <p class="text-sm text-ink-soft mb-4">
          O estoque dos itens volta ao normal${
            venda.formaPagamento === "fiado" ? " e o valor sai da dívida do cliente" : ""
          }. A venda fica registrada como estornada, sem contar mais no caixa.
        </p>
        <div class="bg-paper rounded-xl border border-line p-3 mb-4 text-sm">
          <div class="flex justify-between mb-1"><span class="text-ink-soft">Itens</span><span>${venda.itens
            .map((i) => `${i.qtd}x ${i.nome}`)
            .join(", ")}</span></div>
          <div class="flex justify-between"><span class="text-ink-soft">Total</span><span class="tabular font-semibold">R$ ${fmt(venda.total)}</span></div>
        </div>
        <div class="flex gap-2">
          <button id="cancelar" class="tap flex-1 py-3 rounded-xl border border-line text-ink-soft font-medium">Voltar</button>
          <button id="confirmar-estorno" class="tap flex-[2] py-3 rounded-xl bg-coral text-paper font-display font-bold">Estornar venda</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.querySelector("#cancelar").addEventListener("click", () => overlay.remove());
    overlay.querySelector("#confirmar-estorno").addEventListener("click", async () => {
      const btn = overlay.querySelector("#confirmar-estorno");
      btn.textContent = "Estornando...";
      btn.disabled = true;
      try {
        await estornarVenda(venda);
        overlay.remove();
      } catch (err) {
        console.error(err);
        alert("Não foi possível estornar: " + (err.message || err));
        btn.textContent = "Estornar venda";
        btn.disabled = false;
      }
    });
  }

  listenVendasDoDia((vendas) => {
    vendasAtuais = vendas;

    if (vendas.length === 0) {
      lista.classList.add("hidden");
      vazio.classList.remove("hidden");
    } else {
      vazio.classList.add("hidden");
      lista.classList.remove("hidden");
    }

    const ativas = vendas.filter((v) => !v.estornada);
    const totalRealizado = ativas.reduce((s, v) => s + v.total, 0);
    const totalPendente = ativas
      .filter((v) => v.status === "pendente")
      .reduce((s, v) => s + v.total, 0);
    const totalPago = totalRealizado - totalPendente;
    elRealizado.textContent = "R$ " + fmt(totalRealizado);
    elPago.textContent = "R$ " + fmt(totalPago);
    elPendente.textContent = "R$ " + fmt(totalPendente);

    lista.innerHTML = vendas
      .map((v) => {
        const hora = v.data?.toDate
          ? v.data.toDate().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
          : "--:--";
        if (v.estornada) {
          return `
      <div class="bg-paper border border-line border-dashed rounded-2xl p-4 flex items-center justify-between opacity-60">
        <div>
          <div class="text-sm font-medium line-through">${v.itens.length} item(ns) · ${hora}</div>
          <div class="text-xs text-ink-soft mt-0.5">estornada</div>
        </div>
        <span class="tabular font-semibold text-sm text-ink-soft line-through">R$ ${fmt(v.total)}</span>
      </div>`;
        }
        return `
      <div class="bg-paper-raised border border-line rounded-2xl p-4 flex items-center justify-between">
        <div>
          <div class="text-sm font-medium">${v.itens.length} item(ns) · ${hora}</div>
          <div class="text-xs text-ink-soft mt-0.5">${formaLabel[v.formaPagamento] || v.formaPagamento}${
          v.status === "pendente" ? " · pendente" : ""
        }</div>
        </div>
        <div class="flex items-center gap-3">
          <span class="tabular font-semibold text-sm ${v.status === "pendente" ? "text-coral" : "text-teal"}">R$ ${fmt(v.total)}</span>
          <div class="flex flex-col items-end gap-1">
            ${
              v.status === "pendente"
                ? `<button data-id="${v.id}" class="pagar-btn text-xs text-teal underline">marcar paga</button>`
                : ""
            }
            <button data-id="${v.id}" class="estornar-btn text-xs text-ink-soft underline">estornar</button>
          </div>
        </div>
      </div>`;
      })
      .join("");

    lista.querySelectorAll(".estornar-btn").forEach((b) =>
      b.addEventListener("click", () => abrirEstorno(vendasAtuais.find((v) => v.id === b.dataset.id)))
    );
    lista.querySelectorAll(".pagar-btn").forEach((b) =>
      b.addEventListener("click", async () => {
        b.textContent = "salvando...";
        b.disabled = true;
        try {
          await marcarVendaPaga(vendasAtuais.find((v) => v.id === b.dataset.id));
        } catch (err) {
          console.error(err);
          alert("Não foi possível marcar como paga: " + (err.message || err));
          b.textContent = "marcar paga";
          b.disabled = false;
        }
      })
    );
  });
}
