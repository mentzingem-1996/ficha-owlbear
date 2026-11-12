import type { Atributo, Ficha } from "./tipos";

export const ATRIBUTOS: Atributo[] = ["for", "des", "con", "int", "sab", "car"];
export const NOME_ATRIBUTO: Record<Atributo, string> = {
  for: "Força", des: "Destreza", con: "Constituição", int: "Inteligência", sab: "Sabedoria", car: "Carisma",
};
export const PERICIAS: Record<string, Atributo> = {
  "Atletismo": "for",
  "Acrobacia": "des", "Furtividade": "des", "Prestidigitação": "des",
  "Arcanismo": "int", "História": "int", "Investigação": "int", "Natureza": "int", "Religião": "int",
  "Adestrar Animais": "sab", "Intuição": "sab", "Medicina": "sab", "Percepção": "sab", "Sobrevivência": "sab",
  "Atuação": "car", "Enganação": "car", "Intimidação": "car", "Persuasão": "car",
};
export const CONDICOES = [
  "Agarrado", "Amedrontado", "Atordoado", "Caído", "Cego", "Contido", "Enfeitiçado", "Envenenado",
  "Exausto", "Incapacitado", "Inconsciente", "Invisível", "Paralisado", "Petrificado", "Surdo",
];

export const mod = (f: Ficha, a: Atributo) => Math.floor((f.ab[a] - 10) / 2);
export const prof = (f: Ficha) => 2 + Math.floor((Math.max(1, f.level) - 1) / 4);
export const salvaguarda = (f: Ficha, a: Atributo) => mod(f, a) + (f.saves[a] ? prof(f) : 0);
export const pericia = (f: Ficha, p: string) => mod(f, PERICIAS[p]) + prof(f) * (f.skills[p] ?? 0);
export const cd = (f: Ficha) => 8 + prof(f) + mod(f, f.castAb);
export const ataqueMagico = (f: Ficha) => prof(f) + mod(f, f.castAb);
export const percepcaoPassiva = (f: Ficha) => 10 + pericia(f, "Percepção");
export const sinal = (v: number) => (v < 0 ? "−" : "+") + Math.abs(v);

export type Modo = "normal" | "vantagem" | "desvantagem";

export interface Rolagem {
  what: string;
  expr: string;
  dice: number[];
  kept: number[];
  bonus: number;
  total: number;
  modo: Modo;
  nat?: 1 | 20;
}

const d = (lados: number) => 1 + Math.floor(Math.random() * lados);

// Aceita "1d20+5", "4d6", "1d4-1". Para d20 único aplica vantagem/desvantagem.
export function rolar(expr: string, what: string, modo: Modo = "normal"): Rolagem | null {
  const m = expr.replace(/\s/g, "").replace("−", "-").match(/^(\d*)d(\d+)([+-]\d+)?$/i);
  if (!m) return null;
  const qtd = Math.min(40, Number(m[1] || 1));
  const lados = Number(m[2]);
  const bonus = Number(m[3] || 0);
  if (lados === 20 && qtd === 1 && modo !== "normal") {
    const a = d(20), b = d(20);
    const k = modo === "vantagem" ? Math.max(a, b) : Math.min(a, b);
    return { what, expr, dice: [a, b], kept: [k], bonus, total: k + bonus, modo, nat: k === 20 ? 20 : k === 1 ? 1 : undefined };
  }
  const dice = Array.from({ length: qtd }, () => d(lados));
  const soma = dice.reduce((x, y) => x + y, 0);
  const nat = lados === 20 && qtd === 1 ? (dice[0] === 20 ? 20 : dice[0] === 1 ? 1 : undefined) : undefined;
  return { what, expr, dice, kept: dice, bonus, total: soma + bonus, modo: "normal", nat };
}

// Inspiração Heroica: rerrola um dado já rolado e fica com o novo valor.
export function rerrolar(r: Rolagem, indice: number): Rolagem {
  const lados = Number(r.expr.replace(/\s/g, "").match(/d(\d+)/i)?.[1] ?? 20);
  const novo = d(lados);
  if (r.modo !== "normal") {
    const dice = [...r.dice];
    dice[indice] = novo;
    const k = r.modo === "vantagem" ? Math.max(...dice) : Math.min(...dice);
    return { ...r, dice, kept: [k], total: k + r.bonus, nat: k === 20 ? 20 : k === 1 ? 1 : undefined, what: r.what + " (rerrolado)" };
  }
  const dice = [...r.dice];
  dice[indice] = novo;
  const soma = dice.reduce((x, y) => x + y, 0);
  const nat = dice.length === 1 && lados === 20 ? (novo === 20 ? 20 : novo === 1 ? 1 : undefined) : undefined;
  return { ...r, dice, kept: dice, total: soma + r.bonus, nat, what: r.what + " (rerrolado)" };
}

export function textoRolagem(r: Rolagem): string {
  const dados = r.modo === "normal" ? r.dice.join(", ") : `${r.dice.join(" e ")} → ${r.kept[0]}`;
  const b = r.bonus ? ` ${r.bonus > 0 ? "+" : "−"} ${Math.abs(r.bonus)}` : "";
  const modo = r.modo === "vantagem" ? " com Vantagem" : r.modo === "desvantagem" ? " com Desvantagem" : "";
  const nat = r.nat === 20 ? " · 20 natural!" : r.nat === 1 ? " · 1 natural" : "";
  return `${r.what}${modo}: [${dados}]${b} = ${r.total}${nat}`;
}
