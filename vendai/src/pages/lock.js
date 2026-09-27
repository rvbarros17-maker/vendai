import { verificarPin, definirPin } from "../js/auth.js";

export function renderLock(root, { onUnlocked }) {
  let digitado = "";
  let modo = "entrar"; // "entrar" | "criar" | "confirmar"
  let primeiroPin = "";
  let erro = "";
  let carregando = false;

  function render() {
    const titulo =
      modo === "entrar" ? "Digite o PIN" : modo === "criar" ? "Crie um PIN de acesso" : "Confirme o PIN";
    const subtitulo =
      modo === "entrar"
        ? "Acesso ao Vendaí"
        : modo === "criar"
        ? "4 dígitos, só pra você e sua equipe"
        : "Digite de novo pra confirmar";

    root.innerHTML = `
      <div class="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div class="w-14 h-14 rounded-2xl bg-teal flex items-center justify-center mb-4">
          <span class="text-paper font-display font-extrabold text-2xl">V</span>
        </div>
        <h1 class="font-display font-bold text-lg text-ink mb-1">${titulo}</h1>
        <p class="text-xs text-ink-soft mb-6">${subtitulo}</p>

        <div class="flex gap-3 mb-2">
          ${[0, 1, 2, 3]
            .map(
              (i) => `
            <span class="w-3.5 h-3.5 rounded-full border-2 border-teal ${
              i < digitado.length ? "bg-teal" : "bg-transparent"
            }"></span>`
            )
            .join("")}
        </div>
        <div class="h-5 mb-4">
          ${erro ? `<p class="text-xs text-coral">${erro}</p>` : ""}
          ${carregando ? `<p class="text-xs text-ink-soft">verificando...</p>` : ""}
        </div>

        <div class="grid grid-cols-3 gap-3 w-full max-w-[260px]">
          ${["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"]
            .map((n) =>
              n === ""
                ? `<span></span>`
                : `<button data-key="${n}" class="tap tecla h-16 rounded-2xl bg-paper-raised border border-line font-display font-bold text-xl text-ink">${n}</button>`
            )
            .join("")}
        </div>
      </div>
    `;

    root.querySelectorAll(".tecla").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.key;
        if (carregando) return;
        if (key === "⌫") {
          digitado = digitado.slice(0, -1);
          erro = "";
          render();
          return;
        }
        if (digitado.length >= 4) return;
        digitado += key;
        erro = "";
        render();
        if (digitado.length === 4) processar();
      });
    });
  }

  async function processar() {
    carregando = true;
    render();

    if (modo === "criar") {
      primeiroPin = digitado;
      digitado = "";
      modo = "confirmar";
      carregando = false;
      render();
      return;
    }

    if (modo === "confirmar") {
      if (digitado !== primeiroPin) {
        erro = "Os PINs não coincidem. Vamos de novo.";
        digitado = "";
        primeiroPin = "";
        modo = "criar";
        carregando = false;
        render();
        return;
      }
      try {
        await definirPin(digitado);
        onUnlocked();
      } catch (err) {
        erro = "Não deu pra salvar o PIN: " + (err.message || err);
        digitado = "";
        modo = "criar";
        carregando = false;
        render();
      }
      return;
    }

    // modo "entrar"
    const resultado = await verificarPin(digitado);
    carregando = false;
    if (resultado === "ok") {
      onUnlocked();
      return;
    }
    if (resultado === "sem-config") {
      modo = "criar";
      digitado = "";
      erro = "";
      render();
      return;
    }
    if (resultado === "offline-sem-cache") {
      erro = "Sem internet e sem PIN salvo neste aparelho. Conecte uma vez pra liberar.";
    } else {
      erro = "PIN incorreto.";
    }
    digitado = "";
    render();
  }

  render();
}
