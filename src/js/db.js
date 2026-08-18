import { db } from "./firebase.js";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  query,
  orderBy,
  where,
  increment,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

/* ---------- PRODUTOS ---------- */

export function listenProdutos(cb) {
  const q = query(collection(db, "produtos"), orderBy("nome"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export function addProduto({ nome, preco, estoque }) {
  return addDoc(collection(db, "produtos"), {
    nome,
    preco: Number(preco),
    estoque: Number(estoque) || 0,
    criadoEm: serverTimestamp(),
  });
}

export function updateProduto(id, data) {
  return updateDoc(doc(db, "produtos", id), data);
}

export function deleteProduto(id) {
  return deleteDoc(doc(db, "produtos", id));
}

/* ---------- CLIENTES / FIADO ---------- */

export function listenClientes(cb) {
  const q = query(collection(db, "clientes"), orderBy("nome"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export function addCliente({ nome, telefone }) {
  return addDoc(collection(db, "clientes"), {
    nome,
    telefone: telefone || "",
    saldoDevedor: 0,
    criadoEm: serverTimestamp(),
  });
}

export function updateCliente(id, data) {
  return updateDoc(doc(db, "clientes", id), data);
}

// Registra um pagamento (abatimento) de fiado. Funciona offline: o
// increment fica na fila local e é aplicado de verdade quando reconectar.
// Além de abater o saldo do cliente, marca como "pago" as vendas fiado
// mais antigas dele que o valor do pagamento conseguir cobrir — assim o
// Caixa do dia para de contar elas como pendentes.
export async function registrarPagamento(clienteId, valor) {
  const valorAbsoluto = Math.abs(Number(valor));

  await updateDoc(doc(db, "clientes", clienteId), {
    saldoDevedor: increment(-valorAbsoluto),
  });

  const q = query(
    collection(db, "vendas"),
    where("clienteId", "==", clienteId),
    where("status", "==", "pendente")
  );
  const snap = await getDocs(q);
  const vendasPendentes = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((v) => !v.estornada)
    .sort((a, b) => (a.data?.toMillis?.() || 0) - (b.data?.toMillis?.() || 0));

  let restante = valorAbsoluto;
  for (const v of vendasPendentes) {
    if (restante <= 0) break;
    // tolerância de 1 centavo pra evitar sobra de arredondamento
    if (v.total <= restante + 0.01) {
      await updateDoc(doc(db, "vendas", v.id), {
        status: "pago",
        pagoEm: serverTimestamp(),
      });
      restante -= v.total;
    }
  }
}

/* ---------- VENDAS ---------- */

export function listenVendasDoDia(cb) {
  const inicio = new Date();
  inicio.setHours(0, 0, 0, 0);
  const q = query(
    collection(db, "vendas"),
    where("data", ">=", Timestamp.fromDate(inicio)),
    orderBy("data", "desc")
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

// venda = { itens: [{produtoId, nome, preco, qtd}], subtotal, desconto, total, formaPagamento, clienteId? }
export async function registrarVenda(venda) {
  const ref = await addDoc(collection(db, "vendas"), {
    itens: venda.itens,
    subtotal: venda.subtotal ?? venda.total,
    desconto: venda.desconto || 0,
    total: venda.total,
    formaPagamento: venda.formaPagamento,
    clienteId: venda.clienteId || null,
    status: venda.formaPagamento === "fiado" ? "pendente" : "pago",
    estornada: false,
    data: serverTimestamp(),
  });

  // Baixa de estoque (offline-safe, na fila até sincronizar)
  for (const item of venda.itens) {
    if (item.produtoId) {
      updateDoc(doc(db, "produtos", item.produtoId), {
        estoque: increment(-item.qtd),
      }).catch(() => {});
    }
  }

  // Se for fiado, soma no saldo devedor do cliente
  if (venda.formaPagamento === "fiado" && venda.clienteId) {
    updateDoc(doc(db, "clientes", venda.clienteId), {
      saldoDevedor: increment(venda.total),
    }).catch(() => {});
  }

  return ref;
}

// Marca uma venda pontual como paga (usado no Caixa do dia pra corrigir
// vendas antigas que ficaram como pendente mesmo já quitadas). Se a venda
// era fiado, também abate o valor do saldo devedor do cliente.
export async function marcarVendaPaga(venda) {
  await updateDoc(doc(db, "vendas", venda.id), {
    status: "pago",
    pagoEm: serverTimestamp(),
  });

  if (venda.formaPagamento === "fiado" && venda.clienteId) {
    await updateDoc(doc(db, "clientes", venda.clienteId), {
      saldoDevedor: increment(-venda.total),
    });
  }
}

// Estorna uma venda: devolve o estoque, tira o valor da dívida do cliente
// (se era fiado) e marca a venda como estornada — sem apagar o registro,
// pra manter o histórico do dia certinho.
export async function estornarVenda(venda) {
  await updateDoc(doc(db, "vendas", venda.id), {
    estornada: true,
    estornadaEm: serverTimestamp(),
  });

  for (const item of venda.itens) {
    if (item.produtoId) {
      updateDoc(doc(db, "produtos", item.produtoId), {
        estoque: increment(item.qtd),
      }).catch(() => {});
    }
  }

  if (venda.formaPagamento === "fiado" && venda.clienteId) {
    updateDoc(doc(db, "clientes", venda.clienteId), {
      saldoDevedor: increment(-venda.total),
    }).catch(() => {});
  }
}
