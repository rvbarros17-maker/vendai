const fmt = (n) => Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
const formaLabel = { dinheiro: "Dinheiro", pix: "Pix", cartao: "Cartão", fiado: "Fiado" };

// venda = { itens, subtotal, desconto, total, formaPagamento, clienteNome? }
export function gerarTextoComprovante(venda, nomeLoja = "Vendaí") {
  const agora = new Date();
  const data = agora.toLocaleDateString("pt-BR");
  const hora = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const linhas = [];
  linhas.push(nomeLoja);
  linhas.push(`${data} ${hora}`);
  linhas.push("--------------------------------");
  venda.itens.forEach((i) => {
    const linhaItem = `${i.qtd}x ${i.nome}`;
    const valorItem = "R$ " + fmt(i.preco * i.qtd);
    linhas.push(linhaItem);
    linhas.push(valorItem.padStart(32, " "));
  });
  linhas.push("--------------------------------");
  if (venda.desconto > 0) {
    linhas.push(`Subtotal: R$ ${fmt(venda.subtotal)}`);
    linhas.push(`Desconto: -R$ ${fmt(venda.desconto)}`);
  }
  linhas.push(`TOTAL: R$ ${fmt(venda.total)}`);
  linhas.push(`Pagamento: ${formaLabel[venda.formaPagamento] || venda.formaPagamento}`);
  if (venda.clienteNome) linhas.push(`Cliente: ${venda.clienteNome}`);
  linhas.push("--------------------------------");
  linhas.push("Este não é um documento fiscal.");
  linhas.push("Obrigado pela preferência!");

  return linhas.join("\n");
}

export function compartilharWhatsApp(texto, telefone) {
  const numeroLimpo = (telefone || "").replace(/\D/g, "");
  const base = numeroLimpo ? `https://wa.me/55${numeroLimpo}` : `https://wa.me/`;
  const url = `${base}?text=${encodeURIComponent(texto)}`;
  window.open(url, "_blank");
}

export function imprimirComprovante(venda, nomeLoja = "Vendaí") {
  const agora = new Date();
  const data = agora.toLocaleDateString("pt-BR");
  const hora = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const linhasItens = venda.itens
    .map(
      (i) => `
    <div class="linha">
      <span>${i.qtd}x ${i.nome}</span>
      <span>R$ ${fmt(i.preco * i.qtd)}</span>
    </div>`
    )
    .join("");

  const html = `
  <html>
  <head>
    <title>Comprovante</title>
    <style>
      @page { margin: 0; size: 58mm auto; }
      body { font-family: 'Courier New', monospace; width: 58mm; margin: 0; padding: 8px; font-size: 12px; }
      h1 { font-size: 14px; text-align: center; margin: 0 0 4px; }
      .sub { text-align: center; font-size: 11px; margin-bottom: 8px; }
      .linha { display: flex; justify-content: space-between; margin: 2px 0; }
      hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
      .total { font-weight: bold; font-size: 13px; }
      .rodape { text-align: center; font-size: 10px; margin-top: 8px; }
    </style>
  </head>
  <body>
    <h1>${nomeLoja}</h1>
    <div class="sub">${data} ${hora}</div>
    <hr />
    ${linhasItens}
    <hr />
    ${venda.desconto > 0 ? `<div class="linha"><span>Subtotal</span><span>R$ ${fmt(venda.subtotal)}</span></div><div class="linha"><span>Desconto</span><span>-R$ ${fmt(venda.desconto)}</span></div>` : ""}
    <div class="linha total"><span>TOTAL</span><span>R$ ${fmt(venda.total)}</span></div>
    <div class="linha"><span>Pagamento</span><span>${formaLabel[venda.formaPagamento] || venda.formaPagamento}</span></div>
    ${venda.clienteNome ? `<div class="linha"><span>Cliente</span><span>${venda.clienteNome}</span></div>` : ""}
    <hr />
    <div class="rodape">Este não é um documento fiscal.<br/>Obrigado pela preferência!</div>
    <script>window.onload = () => { window.print(); }<\/script>
  </body>
  </html>`;

  const janela = window.open("", "_blank", "width=380,height=600");
  if (!janela) {
    alert("Permita pop-ups no navegador pra imprimir o comprovante.");
    return;
  }
  janela.document.write(html);
  janela.document.close();
}
