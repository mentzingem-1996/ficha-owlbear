# Ficha 5.5 — extensão do Owlbear Rodeo

Ficha de D&D 2024 (5.5) dentro do Owlbear: atributos, perícias, PV, espaços de magia, Sorte,
Inspiração Heroica, concentração, condições, descansos e as cartas do grupo ao passar o mouse.

Versão 0.1: só a ficha do Bruxo (Grande Antigo, nível 3).

## Rodar no próprio PC

```bash
npm install
npm run dev
```

No Owlbear: menu de extensões → **Add Custom Extension** → `http://localhost:5173/manifest.json`.
Abrindo `http://localhost:5173` direto no navegador, a ficha funciona sozinha (salva só naquele navegador).

## Como usar

1. Selecione o token do personagem no mapa.
2. Abra **Ficha 5.5** na barra de cima e clique em **Criar a ficha do Bruxo neste token**.
3. A ficha fica salva no token: quem tiver a extensão vê a mesma ficha, e as rolagens aparecem para a sala.

## Pastas

- `src/main.ts` — tela da ficha e ações (conjurar, rolar, descansos)
- `src/regras.ts` — cálculos do D&D e rolagem de dados
- `src/armazenamento.ts` — onde a ficha é salva (token no Owlbear, ou navegador)
- `src/bruxo.ts` — ficha inicial do Bruxo
- `src/background.ts` — mostra as rolagens dos outros jogadores
- `public/cartas/` — cartas do Bruxo usadas no destaque
- `public/manifest.json` — cadastro da extensão no Owlbear

## Publicar (GitHub Pages)

`npm run build` gera a pasta `dist/`, que é o que vai para o GitHub Pages.
O endereço para instalar passa a ser `https://<usuario>.github.io/ficha-owlbear/manifest.json`.
