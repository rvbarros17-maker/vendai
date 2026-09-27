import { db } from "./firebase.js";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";

const REF = () => doc(db, "config", "loja");

export function listenConfigLoja(cb) {
  return onSnapshot(REF(), (snap) => {
    cb(snap.exists() ? snap.data() : { nomeLoja: "Vendaí", chavePix: "" });
  });
}

export async function getConfigLoja() {
  const snap = await getDoc(REF());
  return snap.exists() ? snap.data() : { nomeLoja: "Vendaí", chavePix: "" };
}

export function salvarConfigLoja({ nomeLoja, chavePix }) {
  return setDoc(REF(), { nomeLoja, chavePix }, { merge: true });
}
