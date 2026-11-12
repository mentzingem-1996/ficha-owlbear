export type Atributo = "for" | "des" | "con" | "int" | "sab" | "car";

export interface Magia {
  lv: number; // 0 = truque
  name: string;
  time: string;
  range: string;
  c: boolean; // concentração
  r: boolean; // ritual
  free?: boolean; // conjura sem gastar espaço (ex.: Máscara de Muitas Faces)
  src: string;
  note: string;
  save?: string; // ex.: "SAB"
  atk?: boolean; // faz jogada de ataque mágico
  dmg?: string; // ex.: "4d6"
  card?: string; // nome do arquivo da carta, sem extensão
}

export interface Ataque {
  name: string;
  bonus: number;
  dmg: string;
  notes: string;
  card?: string;
}

export interface Habilidade {
  name: string;
  group: string;
  text: string;
  card?: string;
}

export interface Ficha {
  v: 1;
  name: string;
  cls: string;
  subclass: string;
  level: number;
  species: string;
  background: string;
  ab: Record<Atributo, number>;
  saves: Record<Atributo, boolean>;
  skills: Record<string, number>; // 0 nada, 1 proficiente, 2 especialista
  ac: number;
  speed: string;
  hp: { cur: number; max: number; temp: number };
  hd: { die: number; max: number; spent: number };
  death: { s: number; f: number };
  insp: boolean;
  luck: { max: number; used: number };
  slots: { lv: number; max: number; used: number; label: string };
  cunning: { max: number; used: number };
  castAb: Atributo;
  concentration: string;
  conditions: string[];
  attacks: Ataque[];
  spells: Magia[];
  features: Habilidade[];
  notes: { appearance: string; backstory: string; personality: string; equipment: string; languages: string; proficiencies: string };
  coins: { pc: number; pp: number; po: number; pl: number };
}
