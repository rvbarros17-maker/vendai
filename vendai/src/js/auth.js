import { auth, db } from "./firebase.js";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

const LS_UNLOCKED = "vendai_unlocked";
const LS_PIN_CACHE = "vendai_pin_cache";

// Garante que existe uma sessão (anônima) no Firebase, necessária pra
// regras de segurança do Firestore que exigem "request.auth != null".
export function ensureAnonAuth() {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      unsub();
      if (user) {
        resolve(user);
        return;
      }
      try {
        const cred = await signInAnonymously(auth);
        resolve(cred.user);
      } catch (err) {
        console.error("Falha no login anônimo (provavelmente offline):", err);
        resolve(null);
      }
    });
  });
}

export function isUnlockedLocally() {
  return localStorage.getItem(LS_UNLOCKED) === "1";
}

export function lockDevice() {
  localStorage.removeItem(LS_UNLOCKED);
}

function unlockAndCache(pin) {
  localStorage.setItem(LS_UNLOCKED, "1");
  localStorage.setItem(LS_PIN_CACHE, btoa(pin));
}

function getCachedPin() {
  const cached = localStorage.getItem(LS_PIN_CACHE);
  return cached ? atob(cached) : null;
}

// Retorna: "ok" | "errado" | "sem-config" | "offline-sem-cache"
export async function verificarPin(pinDigitado) {
  const cache = getCachedPin();
  if (cache && cache === pinDigitado) {
    unlockAndCache(pinDigitado);
    return "ok";
  }

  try {
    const snap = await getDoc(doc(db, "config", "acesso"));
    if (!snap.exists()) return "sem-config";
    const pinReal = snap.data().pin;
    if (pinReal === pinDigitado) {
      unlockAndCache(pinDigitado);
      return "ok";
    }
    return "errado";
  } catch (err) {
    console.error(err);
    return cache ? "errado" : "offline-sem-cache";
  }
}

export async function definirPin(pin) {
  await setDoc(doc(db, "config", "acesso"), { pin });
  unlockAndCache(pin);
}

export async function trocarPin(pinAtual, pinNovo) {
  const resultado = await verificarPin(pinAtual);
  if (resultado !== "ok") throw new Error("PIN atual incorreto.");
  await setDoc(doc(db, "config", "acesso"), { pin: pinNovo });
  unlockAndCache(pinNovo);
}
