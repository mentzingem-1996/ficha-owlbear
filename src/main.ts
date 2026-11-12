import OBR from "@owlbear-rodeo/sdk";
import "./estilo.css";
import { fichaBruxo } from "./bruxo";
import {
  anunciar, criarNoToken, iniciarLocal, iniciarOwlbear, marcarComoMeu, salvar, sessaoLocal,
  type Estado, type Sessao,
} from "./armazenamento";
import {
  ATRIBUTOS, CONDICOES, NOME_ATRIBUTO, PERICIAS, ataqueMagico, cd, mod, percepcaoPassiva, pericia,
  prof, rerrolar, rolar, salvaguarda, sinal, textoRolagem, type Modo, type Rolagem,
} from "./regras";
import type { Atributo, Ficha, Magia } from "./tipos";

const app = document.getElementById("app")!;
let sessao: Sessao = sessaoLocal();
let estado: Estado = { tipo: "carregando" };
let aba: "magias" | "ataques" | "pericias" | "habilidades" | "notas" = "magias";
let editando = false;
let modo: Modo = "normal";
let sorteNaProxima = false;
let ultima: Rolagem | null = null;
let aviso = "";

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const ficha = () => (estado.tipo === "ficha" ? estado.ficha : null);
const nomePersonagem = (f: Ficha) => f.name || (estado.tipo === "ficha" && estado.nomeToken) || f.cls;
const urlCarta = (c?: string) => (c ? `./cartas/${c}.webp` : "");

function pips(qtd: number, usados: number, grupo: string, classe = "") {
  let h = "";
  for (let i = 0; i < qtd; i++)
    h += `<button class="pip ${classe}${i < usados ? " gasto" : ""}" data-pip="${grupo}" data-i="${i}" aria-pressed="${i < usados}" aria-label="${grupo} ${i + 1}"></button>`;
  return `<span class="pips">${h}</span>`;
}

// ---------- Telas ----------

function telaCarregando() {
  return `<div class="vazio"><p>Carregando a ficha…</p></div>`;
}

function telaSemCena() {
  return `<div class="vazio"><h2>Abra uma cena</h2><p>A ficha fica guardada no token do personagem. Abra uma cena no Owlbear para usar.</p></div>`;
}

function telaEscolher(sel?: { id: string; nome: string }) {
  const acao = sel
    ? `<p>Token selecionado: <b>${esc(sel.nome || "sem nome")}</b></p>
       <button class="btn forte" data-acao="criar" data-id="${sel.id}">Criar a ficha do Bruxo neste token</button>`
    : `<p>Selecione o token do seu personagem no mapa.</p>`;
  return `<div class="vazio"><h2>Nenhuma ficha aberta</h2>
    <p>Selecione um token que já tenha ficha para abrir, ou crie a ficha num token.</p>${acao}</div>`;
}

function topo(f: Ficha) {
  const e = estado as Extract<Estado, { tipo: "ficha" }>;
  const retrato = e.imagem
    ? `<img src="${esc(e.imagem)}" alt="">`
    : `<span>${esc(nomePersonagem(f).slice(0, 1))}</span>`;
  const meu = sessao.noOwlbear && e.itemId && !e.meu
    ? `<button class="btn" data-acao="meu">Marcar como meu personagem</button>` : "";
  return `<header class="topo">
    <div class="retrato">${retrato}</div>
    <div class="ident">
      ${editando ? `<input class="nome" data-k="name" value="${esc(f.name)}" placeholder="${esc(nomePersonagem(f))}" aria-label="Nome do personagem">`
                 : `<h1>${esc(nomePersonagem(f))}</h1>`}
      <p>${esc(f.cls)} ${editando ? `<input class="mini-num" type="number" data-k="level" data-t="n" value="${f.level}" aria-label="Nível">` : f.level}
        · ${esc(f.subclass)} · ${esc(f.species)} · ${esc(f.background)}</p>
    </div>
    <div class="topo-acoes">${meu}
      <button class="btn${editando ? " forte" : ""}" data-acao="editar">${editando ? "Concluir edição" : "Editar ficha"}</button>
    </div>
  </header>`;
}

function colunaAtributos(f: Ficha) {
  return `<section class="col atributos">${ATRIBUTOS.map((a) => atributo(f, a)).join("")}</section>`;
}

function atributo(f: Ficha, a: Atributo) {
  const valor = editando
    ? `<input type="number" data-k="ab.${a}" data-t="n" value="${f.ab[a]}" aria-label="Valor de ${NOME_ATRIBUTO[a]}">`
    : `<span>${f.ab[a]}</span>`;
  const profSalv = `<button class="dot${f.saves[a] ? " on" : ""}" data-save="${a}" ${editando ? "" : "disabled"} aria-label="Proficiência em salvaguarda de ${NOME_ATRIBUTO[a]}"></button>`;
  return `<div class="caixa atributo">
    <div class="atr-nome">${NOME_ATRIBUTO[a]}</div>
    <div class="atr-meio">
      <button class="atr-mod rolavel" data-rolar="1d20${sinal(mod(f, a)).replace("−", "-")}" data-what="Teste de ${NOME_ATRIBUTO[a]}">${sinal(mod(f, a))}</button>
      <div class="atr-valor">${valor}</div>
    </div>
    <div class="atr-salv">${profSalv}
      <button class="rolavel" data-rolar="1d20${sinal(salvaguarda(f, a)).replace("−", "-")}" data-what="Salvaguarda de ${NOME_ATRIBUTO[a]}">Salvaguarda ${sinal(salvaguarda(f, a))}</button>
    </div>
  </div>`;
}

function colunaCombate(f: Ficha) {
  const num = (k: string, v: number, rot: string) =>
    editando ? `<input type="number" data-k="${k}" data-t="n" value="${v}" aria-label="${rot}">` : `<b>${v}</b>`;
  const stats = `<div class="stats">
    <div class="caixa stat escudo"><span class="rot">CA</span>${num("ac", f.ac, "Classe de Armadura")}</div>
    <div class="caixa stat"><span class="rot">Iniciativa</span><button class="rolavel" data-rolar="1d20${sinal(mod(f, "des")).replace("−", "-")}" data-what="Iniciativa">${sinal(mod(f, "des"))}</button></div>
    <div class="caixa stat"><span class="rot">Desloc.</span><b>${esc(f.speed)}</b></div>
    <div class="caixa stat"><span class="rot">Proficiência</span><b>${sinal(prof(f))}</b></div>
    <div class="caixa stat"><span class="rot">CD magia</span><b>${cd(f)}</b></div>
    <div class="caixa stat"><span class="rot">Ataque mágico</span><button class="rolavel" data-rolar="1d20${sinal(ataqueMagico(f)).replace("−", "-")}" data-what="Ataque mágico">${sinal(ataqueMagico(f))}</button></div>
  </div>`;

  const pv = `<div class="caixa pv">
    <div class="pv-topo"><span class="rot">Pontos de Vida</span><span class="rot">Perc. passiva ${percepcaoPassiva(f)}</span></div>
    <div class="pv-linha">
      <div class="pv-atual"><input type="number" data-k="hp.cur" data-t="n" value="${f.hp.cur}" aria-label="PV atuais"><span>/ ${editando ? `<input type="number" class="mini-num" data-k="hp.max" data-t="n" value="${f.hp.max}" aria-label="PV máximo">` : f.hp.max}</span></div>
      <label class="pv-temp"><span class="rot">Temp.</span><input type="number" data-k="hp.temp" data-t="n" value="${f.hp.temp}" aria-label="PV temporários"></label>
    </div>
    <div class="pv-ajuste">
      <input type="number" id="pv-qtd" min="0" placeholder="0" aria-label="Quantidade de dano ou cura">
      <button class="btn ruim" data-acao="dano">Dano</button>
      <button class="btn bom" data-acao="cura">Cura</button>
    </div>
  </div>`;

  const linha = (rot: string, conteudo: string, carta?: string) =>
    `<div class="recurso"${carta ? ` data-card="${carta}"` : ""}><span>${rot}</span>${conteudo}</div>`;
  const recursos = `<div class="caixa recursos">
    <div class="caixa-titulo">Recursos</div>
    ${linha(`Espaços de ${f.slots.lv}º círculo`, pips(f.slots.max, f.slots.used, "slots"))}
    <p class="dica">${esc(f.slots.label)}</p>
    ${linha("Sorte", pips(f.luck.max, f.luck.used, "luck"), "20_SORTUDO")}
    ${linha("Inspiração Heroica", `<button class="pip${f.insp ? "" : " gasto"} insp" data-acao="insp" aria-pressed="${!f.insp}" aria-label="Inspiração Heroica"></button>`, "21_INSPIRACAO_HEROICA")}
    ${linha("Astúcia Mágica", pips(f.cunning.max, f.cunning.used, "cunning"), "19_ASTUCIA_MAGICA")}
    ${linha(`Dados de Vida (d${f.hd.die})`, pips(f.hd.max, f.hd.spent, "hd"))}
    ${linha("Morte: sucessos", pips(3, f.death.s, "ds", "bom"))}
    ${linha("Morte: falhas", pips(3, f.death.f, "df", "ruim"))}
    <p class="dica">Bolinha cheia = disponível. Clique para gastar ou devolver.</p>
    <div class="descansos">
      <button class="btn" data-acao="curto">Descanso curto</button>
      <button class="btn" data-acao="longo">Descanso longo</button>
    </div>
  </div>`;

  const conc = f.concentration
    ? `<div class="conc on"><span>Concentrado em <b>${esc(f.concentration)}</b></span>
        <span class="conc-acoes"><button class="btn" data-rolar="1d20${sinal(salvaguarda(f, "con")).replace("−", "-")}" data-what="Salvaguarda de concentração (CON)">CON ${sinal(salvaguarda(f, "con"))}</button>
        <button class="btn" data-acao="fim-conc">Encerrar</button></span></div>`
    : `<div class="conc"><span>Sem concentração</span></div>`;
  const cond = `<div class="condicoes">${CONDICOES.map((c) =>
    `<button class="chip${f.conditions.includes(c) ? " on" : ""}" data-cond="${c}">${c}</button>`).join("")}</div>`;

  return `<section class="col combate">${stats}${pv}${recursos}
    <div class="caixa"><div class="caixa-titulo">Concentração e condições</div>${conc}${cond}</div></section>`;
}

function botaoConjurar(f: Ficha, m: Magia, i: number) {
  const b: string[] = [];
  if (m.lv === 0 || m.free) b.push(`<button class="btn" data-conjurar="${i}" data-gasto="nada">${m.lv === 0 ? "Usar" : "À vontade"}</button>`);
  else b.push(`<button class="btn forte" data-conjurar="${i}" data-gasto="espaco"${f.slots.used >= f.slots.max ? " disabled title=\"Sem espaços\"" : ""}>Conjurar</button>`);
  if (m.r) b.push(`<button class="btn" data-conjurar="${i}" data-gasto="ritual" title="+10 minutos, sem gastar espaço">Ritual</button>`);
  return b.join("");
}

function abaMagias(f: Ficha) {
  const grupos = [0, 1, 2, 3, 4, 5].filter((lv) => f.spells.some((m) => m.lv === lv));
  return grupos.map((lv) => `<div class="grupo-titulo">${lv === 0 ? "Truques" : `${lv}º círculo`}${lv > 0 ? ` <small>· conjuradas com espaço de ${f.slots.lv}º</small>` : ""}</div>
    ${f.spells.map((m, i) => ({ m, i })).filter(({ m }) => m.lv === lv).map(({ m, i }) => `
      <div class="linha-magia" data-card="${m.card ?? ""}">
        <div class="lm-info">
          <div class="lm-nome">${esc(m.name)}${m.c ? ` <span class="tag" title="Concentração">C</span>` : ""}${m.r ? ` <span class="tag" title="Ritual">R</span>` : ""}${m.save ? ` <span class="tag tag-cd">${m.save} ${cd(f)}</span>` : ""}</div>
          <div class="lm-det">${esc(m.time)} · ${esc(m.range)} · ${esc(m.note)}</div>
        </div>
        <div class="lm-acoes">${botaoConjurar(f, m, i)}</div>
      </div>`).join("")}`).join("");
}

function abaAtaques(f: Ficha) {
  return f.attacks.map((t, i) => `<div class="linha-magia" data-card="${t.card ?? ""}">
      <div class="lm-info"><div class="lm-nome">${esc(t.name)} <span class="tag">${sinal(t.bonus)}</span> <span class="tag">${esc(t.dmg)}</span></div>
      <div class="lm-det">${esc(t.notes)}</div></div>
      <div class="lm-acoes"><button class="btn forte" data-atacar="${i}">Atacar</button><button class="btn" data-dano="${i}">Dano</button></div>
    </div>`).join("");
}

function abaPericias(f: Ficha) {
  const nomes = Object.keys(PERICIAS).sort((a, b) => a.localeCompare(b, "pt"));
  return `<ul class="pericias">${nomes.map((p) => {
    const n = f.skills[p] ?? 0;
    return `<li><button class="dot${n === 1 ? " on" : n === 2 ? " esp" : ""}" data-prof="${p}" ${editando ? "" : "disabled"} aria-label="Proficiência em ${p}"></button>
      <button class="rolavel bonus" data-rolar="1d20${sinal(pericia(f, p)).replace("−", "-")}" data-what="${p}">${sinal(pericia(f, p))}</button>
      <span>${p} <small>(${NOME_ATRIBUTO[PERICIAS[p]].slice(0, 3)})</small></span></li>`;
  }).join("")}</ul>
  <p class="dica">● proficiente · ◉ especialista${editando ? " · clique na bolinha para mudar" : " · use Editar ficha para mudar"}</p>`;
}

function abaHabilidades(f: Ficha) {
  const grupos = [...new Set(f.features.map((h) => h.group))];
  return grupos.map((g) => `<div class="grupo-titulo">${esc(g)}</div>${f.features.filter((h) => h.group === g).map((h) =>
    `<div class="habilidade" data-card="${h.card ?? ""}"><b>${esc(h.name)}</b><p>${esc(h.text)}</p></div>`).join("")}`).join("");
}

function abaNotas(f: Ficha) {
  const ta = (k: keyof Ficha["notes"], rot: string) =>
    `<label class="nota"><span class="rot">${rot}</span><textarea data-k="notes.${k}" rows="3">${esc(f.notes[k])}</textarea></label>`;
  const moeda = (k: keyof Ficha["coins"], rot: string) =>
    `<label><span class="rot">${rot}</span><input type="number" data-k="coins.${k}" data-t="n" value="${f.coins[k]}"></label>`;
  return `${ta("equipment", "Equipamento")}
    <div class="moedas">${moeda("pc", "PC")}${moeda("pp", "PP")}${moeda("po", "PO")}${moeda("pl", "PL")}</div>
    ${ta("proficiencies", "Proficiências")}${ta("languages", "Idiomas")}${ta("backstory", "História")}
    ${ta("appearance", "Aparência")}${ta("personality", "Personalidade")}`;
}

function painelRolagem(f: Ficha) {
  const ult = ultima
    ? `<div class="ultima"><div>${esc(textoRolagem(ultima))}</div>
        ${f.insp ? `<div class="rerrolar"><span>Rerrolar com Inspiração:</span>${ultima.dice.map((v, i) => `<button class="dado" data-rerrolar="${i}" title="Rerrolar este dado">${v}</button>`).join("")}</div>` : ""}
      </div>`
    : `<div class="ultima vazia">Clique num bônus para rolar.</div>`;
  const m = (v: Modo, rot: string) => `<button class="seg${modo === v ? " on" : ""}" data-modo="${v}">${rot}</button>`;
  const temSorte = f.luck.used < f.luck.max;
  return `<div class="rolagem">
    <div class="modos">${m("normal", "Normal")}${m("vantagem", "Vantagem")}${m("desvantagem", "Desvantagem")}
      <button class="seg sorte${sorteNaProxima ? " on" : ""}" data-acao="sorte" ${temSorte || sorteNaProxima ? "" : "disabled"} data-card="20_SORTUDO">Sorte no próximo d20</button>
      <button class="seg" data-acao="sorte-contra" ${temSorte ? "" : "disabled"} title="Desvantagem num ataque contra você">Sorte contra ataque</button>
    </div>${ult}</div>`;
}

function colunaAbas(f: Ficha) {
  const t = (id: typeof aba, rot: string) => `<button class="aba${aba === id ? " on" : ""}" data-aba="${id}">${rot}</button>`;
  const conteudo = { magias: abaMagias, ataques: abaAtaques, pericias: abaPericias, habilidades: abaHabilidades, notas: abaNotas }[aba](f);
  return `<section class="col abas">
    <nav class="abas-nav">${t("magias", "Magias")}${t("ataques", "Ataques")}${t("pericias", "Perícias")}${t("habilidades", "Habilidades")}${t("notas", "Notas")}</nav>
    <div class="abas-conteudo">${conteudo}</div>
    ${painelRolagem(f)}
  </section>`;
}

function render() {
  const rolagem = document.querySelector(".abas-conteudo")?.scrollTop ?? 0;
  if (estado.tipo === "carregando") app.innerHTML = telaCarregando();
  else if (estado.tipo === "sem-cena") app.innerHTML = telaSemCena();
  else if (estado.tipo === "escolher") app.innerHTML = telaEscolher(estado.tokenSelecionado);
  else {
    const f = estado.ficha;
    app.innerHTML = `<div class="ficha">${topo(f)}<div class="grade">${colunaAtributos(f)}${colunaCombate(f)}${colunaAbas(f)}</div></div>
      ${aviso ? `<div class="aviso" role="status">${esc(aviso)}</div>` : ""}
      <img class="carta-flutuante" id="carta" alt="" hidden>`;
    const c = document.querySelector(".abas-conteudo");
    if (c) c.scrollTop = rolagem;
  }
}

// ---------- Ações ----------

function mudou(rerender = true) {
  const f = ficha();
  if (!f) return;
  salvar(f, sessao.noOwlbear);
  if (rerender) render();
}

let timerAviso: number | undefined;
function avisar(texto: string) {
  aviso = texto;
  window.clearTimeout(timerAviso);
  timerAviso = window.setTimeout(() => { aviso = ""; render(); }, 5000);
}

function fazerRolagem(expr: string, what: string) {
  const f = ficha()!;
  const ehD20 = /^1?d20/i.test(expr);
  let m: Modo = ehD20 ? modo : "normal";
  if (ehD20 && sorteNaProxima) {
    // Sorte + Desvantagem se cancelam; Sorte sozinha dá Vantagem.
    m = modo === "desvantagem" ? "normal" : "vantagem";
    f.luck.used = Math.min(f.luck.max, f.luck.used + 1);
    sorteNaProxima = false;
    what += " (Sorte)";
  }
  const r = rolar(expr, `${nomePersonagem(f)} · ${what}`, m);
  if (!r) { avisar(`Não entendi o dado "${expr}".`); render(); return; }
  if (ehD20) modo = "normal";
  ultima = r;
  void anunciar(textoRolagem(r), sessao.noOwlbear);
  mudou();
}

function conjurar(i: number, gasto: string) {
  const f = ficha()!;
  const m = f.spells[i];
  if (gasto === "espaco") {
    if (f.slots.used >= f.slots.max) { avisar("Sem espaços de magia. Use um descanso curto ou a Astúcia Mágica."); render(); return; }
    f.slots.used++;
  }
  let msg = `${nomePersonagem(f)} conjura ${m.name}`;
  if (gasto === "ritual") msg += " como ritual";
  if (m.save) msg += ` · salvaguarda de ${m.save} CD ${cd(f)}`;
  if (m.c) {
    if (f.concentration && f.concentration !== m.name) msg += ` · encerra ${f.concentration}`;
    f.concentration = m.name;
  }
  void anunciar(msg, sessao.noOwlbear);
  avisar(msg);
  if (m.atk) fazerRolagem(`1d20+${ataqueMagico(f)}`, `${m.name} (ataque)`);
  if (m.dmg) {
    const r = rolar(m.dmg, `${nomePersonagem(f)} · ${m.name} (dano)`);
    if (r) { void anunciar(textoRolagem(r), sessao.noOwlbear); if (!m.atk) ultima = r; }
  }
  mudou();
}

function alternarPip(grupo: string, i: number) {
  const f = ficha()!;
  const mapa: Record<string, [() => number, (v: number) => void]> = {
    slots: [() => f.slots.used, (v) => (f.slots.used = v)],
    luck: [() => f.luck.used, (v) => (f.luck.used = v)],
    cunning: [() => f.cunning.used, (v) => (f.cunning.used = v)],
    hd: [() => f.hd.spent, (v) => (f.hd.spent = v)],
    ds: [() => f.death.s, (v) => (f.death.s = v)],
    df: [() => f.death.f, (v) => (f.death.f = v)],
  };
  const [ler, gravar] = mapa[grupo];
  const atual = ler();
  gravar(i < atual ? i : i + 1);
  // Astúcia Mágica marcada = recupera 1 espaço gasto.
  if (grupo === "cunning" && ler() > atual && f.slots.used > 0) {
    f.slots.used--;
    avisar("Astúcia Mágica: 1 espaço recuperado.");
  }
  mudou();
}

function descanso(longo: boolean) {
  const f = ficha()!;
  f.slots.used = 0;
  if (longo) {
    f.hp.cur = f.hp.max;
    f.hp.temp = 0;
    f.luck.used = 0;
    f.cunning.used = 0;
    f.insp = true;
    f.hd.spent = Math.max(0, f.hd.spent - Math.max(1, Math.floor(f.hd.max / 2)));
    f.death = { s: 0, f: 0 };
    f.concentration = "";
    avisar("Descanso longo: PV, espaços, Sorte, Astúcia e Inspiração Heroica recuperados.");
  } else {
    avisar("Descanso curto: espaços de Magia de Pacto recuperados. Gaste Dados de Vida para curar.");
  }
  void anunciar(`${nomePersonagem(f)} fez um descanso ${longo ? "longo" : "curto"}.`, sessao.noOwlbear);
  mudou();
}

function definir(caminho: string, valor: unknown) {
  const f = ficha() as unknown as Record<string, unknown>;
  const partes = caminho.split(".");
  let o = f;
  for (const p of partes.slice(0, -1)) o = o[p] as Record<string, unknown>;
  o[partes[partes.length - 1]] = valor;
}

app.addEventListener("click", async (ev) => {
  const b = (ev.target as HTMLElement).closest("button");
  if (!b || b.disabled) return;
  const f = ficha();
  const d = b.dataset;

  if (d.acao === "criar" && d.id) { await criarNoToken(d.id, fichaBruxo()); return; }
  if (!f) return;
  if (d.acao === "meu" && estado.tipo === "ficha" && estado.itemId) { await marcarComoMeu(estado.itemId); return; }
  if (d.acao === "editar") { editando = !editando; render(); return; }
  if (d.aba) { aba = d.aba as typeof aba; render(); return; }
  if (d.rolar) { fazerRolagem(d.rolar, d.what ?? "Rolagem"); return; }
  if (d.modo) { modo = d.modo as Modo; render(); return; }
  if (d.pip) { alternarPip(d.pip, Number(d.i)); return; }
  if (d.conjurar) { conjurar(Number(d.conjurar), d.gasto ?? "espaco"); return; }
  if (d.atacar) { const t = f.attacks[Number(d.atacar)]; fazerRolagem(`1d20${sinal(t.bonus).replace("−", "-")}`, `${t.name} (ataque)`); return; }
  if (d.dano) {
    const t = f.attacks[Number(d.dano)];
    const r = rolar(t.dmg, `${nomePersonagem(f)} · ${t.name} (dano)`);
    if (r) { ultima = r; void anunciar(textoRolagem(r), sessao.noOwlbear); }
    render(); return;
  }
  if (d.rerrolar && ultima && f.insp) {
    ultima = rerrolar(ultima, Number(d.rerrolar));
    f.insp = false;
    void anunciar(`${textoRolagem(ultima)} · usou Inspiração Heroica`, sessao.noOwlbear);
    mudou(); return;
  }
  if (d.save) { const a = d.save as Atributo; f.saves[a] = !f.saves[a]; mudou(); return; }
  if (d.prof) { f.skills[d.prof] = ((f.skills[d.prof] ?? 0) + 1) % 3; mudou(); return; }
  if (d.cond) {
    f.conditions = f.conditions.includes(d.cond) ? f.conditions.filter((c) => c !== d.cond) : [...f.conditions, d.cond];
    mudou(); return;
  }
  switch (d.acao) {
    case "insp": f.insp = !f.insp; mudou(); return;
    case "curto": descanso(false); return;
    case "longo": descanso(true); return;
    case "fim-conc": f.concentration = ""; mudou(); return;
    case "sorte": sorteNaProxima = !sorteNaProxima; render(); return;
    case "sorte-contra":
      f.luck.used = Math.min(f.luck.max, f.luck.used + 1);
      void anunciar(`${nomePersonagem(f)} usa Sorte: o ataque contra ele é com Desvantagem.`, sessao.noOwlbear);
      avisar("Sorte usada: o atacante rola com Desvantagem.");
      mudou(); return;
    case "dano":
    case "cura": {
      const qtd = Math.max(0, Number((document.getElementById("pv-qtd") as HTMLInputElement).value) || 0);
      if (!qtd) return;
      if (d.acao === "cura") f.hp.cur = Math.min(f.hp.max, f.hp.cur + qtd);
      else {
        const temp = Math.min(f.hp.temp, qtd);
        f.hp.temp -= temp;
        f.hp.cur = Math.max(0, f.hp.cur - (qtd - temp));
        if (f.concentration) avisar(`Concentração: salvaguarda de CON CD ${Math.max(10, Math.floor(qtd / 2))}.`);
      }
      mudou(); return;
    }
  }
});

// Campos de texto e números: grava sem redesenhar enquanto a pessoa digita.
app.addEventListener("change", (ev) => {
  const el = ev.target as HTMLInputElement | HTMLTextAreaElement;
  const k = el.dataset?.k;
  if (!k) return;
  definir(k, el.dataset.t === "n" ? Number(el.value) || 0 : el.value);
  mudou(el.tagName !== "TEXTAREA");
});
app.addEventListener("input", (ev) => {
  const el = ev.target as HTMLTextAreaElement;
  if (el.tagName === "TEXTAREA" && el.dataset.k) { definir(el.dataset.k, el.value); mudou(false); }
});

// Passar o mouse numa magia ou habilidade mostra a carta.
app.addEventListener("mouseover", (ev) => {
  const alvo = (ev.target as HTMLElement).closest<HTMLElement>("[data-card]");
  const img = document.getElementById("carta") as HTMLImageElement | null;
  if (!img) return;
  if (!alvo || !alvo.dataset.card) { img.hidden = true; return; }
  img.src = urlCarta(alvo.dataset.card);
  img.hidden = false;
  const r = alvo.getBoundingClientRect();
  const larg = 240, alt = 336;
  const esquerda = r.left > larg + 20 ? r.left - larg - 12 : Math.min(window.innerWidth - larg - 8, r.right + 12);
  img.style.left = `${Math.max(8, esquerda)}px`;
  img.style.top = `${Math.max(8, Math.min(window.innerHeight - alt - 8, r.top - 40))}px`;
});
app.addEventListener("mouseleave", () => { const img = document.getElementById("carta"); if (img) img.hidden = true; });

// ---------- Início ----------

const aoMudar = (e: Estado) => { estado = e; render(); };
render();
if (OBR.isAvailable) OBR.onReady(async () => { sessao = await iniciarOwlbear(aoMudar); render(); });
else iniciarLocal(fichaBruxo, aoMudar);
