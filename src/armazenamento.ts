import OBR, { type Item } from "@owlbear-rodeo/sdk";
import type { Ficha } from "./tipos";

// Tudo que a extensão grava no Owlbear usa este prefixo, para não colidir com outras extensões.
const ID = "br.ficha55";
export const CHAVE_FICHA = `${ID}/ficha`;
export const CHAVE_MEU_TOKEN = `${ID}/meu-token`;
export const CANAL_ROLAGEM = `${ID}/rolagem`;
const CHAVE_LOCAL = "ficha55-local";

export type Estado =
  | { tipo: "carregando" }
  | { tipo: "sem-cena" }
  | { tipo: "escolher"; tokenSelecionado?: { id: string; nome: string } }
  | { tipo: "ficha"; ficha: Ficha; itemId?: string; nomeToken?: string; imagem?: string; meu: boolean };

export interface Sessao {
  noOwlbear: boolean;
  papel: "GM" | "PLAYER";
  jogador: string;
}

type Ouvinte = (e: Estado) => void;

let ouvinte: Ouvinte = () => {};
let alvo: string | undefined; // id do token cuja ficha está aberta
let timerSalvar: number | undefined;
let ultimoSalvo = "";

const lerFicha = (item?: Item) => (item?.metadata?.[CHAVE_FICHA] as Ficha | undefined) ?? undefined;
const imagemDe = (item: Item) => ("image" in item ? (item as { image: { url: string } }).image.url : undefined);

export function sessaoLocal(): Sessao {
  return { noOwlbear: false, papel: "PLAYER", jogador: "Você" };
}

// Fora do Owlbear (teste no navegador) a ficha fica salva só neste navegador.
export function iniciarLocal(padrao: () => Ficha, cb: Ouvinte) {
  ouvinte = cb;
  let ficha: Ficha;
  try {
    ficha = JSON.parse(localStorage.getItem(CHAVE_LOCAL) || "null") ?? padrao();
  } catch {
    ficha = padrao();
  }
  ouvinte({ tipo: "ficha", ficha, meu: true });
}

export async function iniciarOwlbear(cb: Ouvinte): Promise<Sessao> {
  ouvinte = cb;
  const [papel, jogador] = await Promise.all([OBR.player.getRole(), OBR.player.getName()]);

  const atualizar = async () => {
    if (!(await OBR.scene.isReady())) {
      ouvinte({ tipo: "sem-cena" });
      return;
    }
    const selecao = (await OBR.player.getSelection()) ?? [];
    const meuToken = (await OBR.player.getMetadata())[CHAVE_MEU_TOKEN] as string | undefined;
    const ids = [...new Set([...selecao, ...(meuToken ? [meuToken] : [])])];
    const itens = ids.length ? await OBR.scene.items.getItems(ids) : [];
    const porId = new Map(itens.map((i) => [i.id, i]));

    // 1) um token selecionado que já tem ficha  2) o token vinculado como "meu"  3) tela de escolha
    const selecionado = selecao.length === 1 ? porId.get(selecao[0]) : undefined;
    const escolhido = selecionado && lerFicha(selecionado) ? selecionado : meuToken ? porId.get(meuToken) : undefined;
    const ficha = lerFicha(escolhido);
    if (escolhido && ficha) {
      alvo = escolhido.id;
      ultimoSalvo = JSON.stringify(ficha);
      ouvinte({ tipo: "ficha", ficha, itemId: escolhido.id, nomeToken: escolhido.name, imagem: imagemDe(escolhido), meu: escolhido.id === meuToken });
      return;
    }
    alvo = undefined;
    ouvinte({ tipo: "escolher", tokenSelecionado: selecionado ? { id: selecionado.id, nome: selecionado.name } : undefined });
  };

  OBR.player.onChange(() => void atualizar());
  OBR.scene.onReadyChange(() => void atualizar());
  // Outra pessoa (o Mestre, por exemplo) mexeu na mesma ficha: atualiza a tela.
  OBR.scene.items.onChange((itens) => {
    if (!alvo) return;
    const item = itens.find((i) => i.id === alvo);
    const ficha = lerFicha(item);
    if (item && ficha && JSON.stringify(ficha) !== ultimoSalvo) void atualizar();
  });
  await atualizar();
  return { noOwlbear: true, papel, jogador };
}

export function salvar(ficha: Ficha, noOwlbear: boolean) {
  const json = JSON.stringify(ficha);
  if (!noOwlbear) {
    try { localStorage.setItem(CHAVE_LOCAL, json); } catch { /* sem armazenamento: segue só na memória */ }
    return;
  }
  if (!alvo) return;
  const id = alvo;
  ultimoSalvo = json;
  window.clearTimeout(timerSalvar);
  timerSalvar = window.setTimeout(() => {
    void OBR.scene.items.updateItems([id], (itens) => {
      for (const i of itens) i.metadata[CHAVE_FICHA] = JSON.parse(json);
    });
  }, 350);
}

export async function criarNoToken(itemId: string, ficha: Ficha) {
  await OBR.scene.items.updateItems([itemId], (itens) => {
    for (const i of itens) i.metadata[CHAVE_FICHA] = ficha;
  });
  await OBR.player.setMetadata({ [CHAVE_MEU_TOKEN]: itemId });
}

export async function marcarComoMeu(itemId: string) {
  await OBR.player.setMetadata({ [CHAVE_MEU_TOKEN]: itemId });
}

// Mostra a rolagem para quem rolou e manda para o resto da sala.
export async function anunciar(texto: string, noOwlbear: boolean) {
  if (!noOwlbear) return;
  await OBR.notification.show(texto, "INFO");
  await OBR.broadcast.sendMessage(CANAL_ROLAGEM, { texto }, { destination: "REMOTE" });
}
