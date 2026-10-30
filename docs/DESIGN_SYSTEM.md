# Design system do Reif

O Reif **não tem estética própria**: ele herda o design system do SDK do tldraw (v5.6).
Tudo o que construímos (menus, painéis, barras, cartões no canvas) deve parecer ter sido
feito pelo próprio tldraw. Este documento é o inventário extraído do SDK
(`tldraw/tldraw.css`, componentes `TldrawUi*`, sprite de ícones) e as regras para aplicá-lo.

> Regra de ouro: **se o tldraw já tem, use o dele** (componente, classe, token). Se não tem,
> construa com os tokens dele, nunca com valores soltos.

---

## 1. Tokens

Todos vêm de variáveis `--tl-*` definidas no `.tl-container` e redefinidas no tema escuro
(`.tl-theme__dark`). **Nunca** use cor hexadecimal, `rgba()` ou `black/white` em UI:
o modo escuro só funciona se tudo passar pelos tokens.

No código, os tokens estão expostos ao Tailwind em `src/ui/tokens.css` (`@theme inline`):
`bg-tl-panel`, `text-tl-text-1`, `border-tl-divider`, `rounded-tl-3`, `shadow-tl-3`, etc.

### 1.1 Cores

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `--tl-color-background` | `hsl(210 20% 98%)` | `hsl(240 5% 6.5%)` | fundo do canvas (o design system de conteúdo pode trocar) |
| `--tl-color-panel` | `hsl(0 0% 99%)` | `hsl(235 6.8% 13.5%)` | **toda superfície flutuante**: toolbar, popover, menu, diálogo, painel, cartão |
| `--tl-color-panel-contrast` | branco | `hsl(245 12% 23%)` | anel interno das sombras; borda de cartões (bookmark) |
| `--tl-color-low` | `hsl(204 16% 94%)` | `hsl(260 4.5% 10.5%)` | áreas rebaixadas: fundo de mídia/prévia, botão `low`, chips |
| `--tl-color-divider` | `hsl(0 0% 91%)` | `hsl(240 9% 22%)` | separadores de menu/painel (1px) |
| `--tl-color-muted-2` | preto 4,3% | branco 5% | **hover** de botões (pseudo-elemento `::after`) |
| `--tl-color-hint` | preto 5,5% | branco 7% | estado pressionado/ativo sutil |
| `--tl-color-overlay` | preto 20% | preto 50% | véu atrás de diálogos modais |
| `--tl-color-text` | preto | `hsl(210 17% 98%)` | títulos de diálogo / ênfase máxima |
| `--tl-color-text-1` | `hsl(0 0% 18%)` | `hsl(0 0% 85%)` | **texto padrão de UI** e ícones |
| `--tl-color-text-3` | `hsl(204 4% 45%)` | `hsl(204 4% 75%)` | texto secundário, metadados, placeholders |
| `--tl-color-text-disabled` | `hsl(204 4% 50%)` | `hsl(204 4% 55%)` | desabilitado |
| `--tl-color-primary` / `--tl-color-selected` | `hsl(214 84% 56%)` | `hsl(217 89% 61%)` | ação primária (texto azul), ferramenta ativa (fundo), seleção |
| `--tl-color-selected-contrast` | branco | branco | ícone sobre fundo `selected` |
| `--tl-color-focus` | `hsl(217 76% 80%)` | `hsl(219 65% 50%)` | anel de foco (`outline: 2px`) |
| `--tl-color-danger` | `hsl(0 82% 66%)` | `hsl(0 90% 43%)` | erro, gravação ativa, ação destrutiva |
| `--tl-color-warning` | `hsl(27 98% 47%)` | `hsl(36 100% 57%)` | aviso |
| `--tl-color-success` | `hsl(123 38% 57%)` | `hsl(123 46% 34%)` | sucesso |
| `--tl-color-info` | `hsl(199 92% 56%)` | `hsl(201 98% 41%)` | informação |
| `--tl-color-tooltip` | quase preto | quase preto | fundo de tooltip (texto: `--tl-color-text-shadow`) |

### 1.2 Espaçamento (escala do SDK)

`--tl-space-1` 2px · `-2` 4px · `-3` 8px · `-4` 12px · `-5` 16px · `-6` 20px · `-7` 28px · `-8` 32px · `-9` 64px · `-10` 72px.

Padrões recorrentes: padding horizontal de botões/linhas **12px**; corpo de diálogo **12px**;
gap entre ícone e rótulo **8px**; inset do hover **4px**.

### 1.3 Raios

| Token | Valor | Onde o SDK usa |
|---|---|---|
| `--tl-radius-0` | 2px | detalhes mínimos |
| `--tl-radius-1` | 4px | tooltip |
| `--tl-radius-2` | 6px | hover de botão (`::after`), bookmark/cartões no canvas |
| `--tl-radius-3` | 9px | **popover, menu, diálogo, toast, painel de estilos**, botão `low` |
| `--tl-radius-4` | 11px | **toolbar principal** |

### 1.4 Elevação (sombras)

| Token | Uso |
|---|---|
| `--tl-shadow-1` | elemento levemente destacado (cartões no canvas) |
| `--tl-shadow-2` | **barras**: toolbar principal, painel de estilos, toasts |
| `--tl-shadow-3` | **camadas sobrepostas**: popover, menu, diálogo, barra contextual |
| `--tl-shadow-4` | máxima (raro) |

Todas incluem `inset 0 0 0 1px var(--tl-color-panel-contrast)`, que faz o "fio" interno das superfícies.

### 1.5 Tipografia

- **Fonte de UI**: a pilha do sistema herdada do `.tl-container`
  (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, …`). Nunca definir `font-family` em UI.
- As fontes `--tl-font-draw/sans/serif/mono` são **para conteúdo do canvas**, não para UI.
- Tamanhos: **12px** é o padrão de tudo (botões, menus, diálogos, inputs, títulos de diálogo);
  **11px** para kbd e metadados; 16px só em conteúdo (ex.: título do bookmark).
- Pesos: 400 (menus, corpo) e 500 (toolbar). Negrito só em conteúdo (títulos de cartão/leitura).
- Sem caixa-alta decorativa, sem tracking.

### 1.6 Camadas (z-index)

`--tl-layer-panels` 300 · `--tl-layer-menus` 400 · `--tl-layer-toasts` 650 · `--tl-layer-cursor` 700 · `--tl-layer-header-footer` 999.
Sobreposições do Reif vivem na `.reif-overlay` (350): acima dos painéis, abaixo dos menus.

### 1.7 Movimento

Transições curtas e discretas: **0.08–0.12s, ease-out** (fade do overlay, aparição da barra
contextual). Nada de bounce/escala. Respeitar `prefers-reduced-motion`.

---

## 2. Iconografia

- Sprite oficial: `cdn.tldraw.com/<versão>/icons/icon/0_merged.svg#<nome>`. Renderização por
  **máscara CSS** (`.tlui-icon`: 18×18, `background-color: currentColor`; `small` = 15px).
- Grade **30×30**, traço **2px**, pontas e junções **arredondadas**, ícones em **contorno**.
  Preenchimento sólido só para glifos de mídia (play, pause, stop, gravar).
- Ícones nativos úteis: `cross-2`, `check`, `chevron-*`, `download`, `external-link`, `link`,
  `code`, `trash`, `duplicate`, `plus`, `minus`, `info-circle`, `warning-triangle`, `tool-media`…
- Ícones do Reif (`src/ui/icons.ts`, prefixo `reif-`) seguem a mesma grade e são registrados em
  `assetUrls.icons`, então funcionam em **qualquer** `TldrawUiIcon`/`TldrawUiButtonIcon`/ferramenta:
  `reif-upload`, `reif-image-search`, `reif-search`, `reif-mic`, `reif-link`, `reif-sparkle`,
  `reif-send`, `reif-transcript`, `reif-play`, `reif-pause`, `reif-stop`, `reif-record`,
  `reif-download`, `reif-image` e os de tipo de arquivo (`reif-file`, `reif-file-text`,
  `reif-file-pdf`, `reif-book`, `reif-slides`, `reif-table`, `reif-globe`, `reif-notebook`,
  `reif-code`, `reif-quote`, `reif-audio`, `reif-video`).
- Dentro de shapes (sem contexto de UI) use `<ReifIcon>` — mesma técnica e classes.
- **Proibido emoji** em UI.

---

## 3. Superfícies e componentes

| Necessidade | Use | Visual |
|---|---|---|
| Botão de ícone | `TldrawUiButton type="icon"` + `TldrawUiButtonIcon` (+ `tooltip`) | 40×40, ícone 18px, hover `::after` inset 4px raio 6 `muted-2` |
| Ferramenta (toolbar) | `TldrawUiButton type="tool"` / item de `tools` | 48×48; ativo = fundo `selected`, ícone branco |
| Linha de menu | `TldrawUiButton type="menu"` (+ ícone + `TldrawUiButtonLabel` + `TldrawUiKbd`) | 40px de altura, 12px, padding 12px |
| Ação de texto | `TldrawUiButton type="normal"` / `primary` (texto azul) / `low` (fundo `low`, raio 9) | 40px |
| Seleção (dropdown) | `TldrawUiSelect` + `Trigger`/`Value`/`Content`/`Item` | igual aos menus |
| Campo de texto | `TldrawUiInput` ou `.reif-field` (ícone à esquerda, 40px, sem borda) | herda o painel |
| Grade de ferramentas | `.reif-grid` (4 colunas de 40px) dentro de `.reif-panel` | = popover de shapes |
| Popover/menu | `.reif-panel` (panel · raio 3 · sombra 3) | = `.tlui-popover__content` |
| Barra flutuante | `.reif-toolbar` (panel · raio 4 · sombra 2) | = toolbar principal |
| Barra sobre seleção | `.reif-panel` com linha de 40px | = `TldrawUiContextualToolbar` |
| Diálogo | `helpers.addDialog` + `TldrawUiDialogHeader/Title/CloseButton/Body/Footer` | raio 3 · sombra 3 · header 40px |
| Painel lateral | `.reif-panel` + `.reif-panel-header` | = painel de estilos ampliado |
| Notificação | `useToasts().addToast` (via `notify()`) | toast nativo |
| Etiqueta/status | `.reif-chip` (`data-tone`) | 22px, raio 2, fundo `low` |
| Cartão no canvas | `.reif-card` | = bookmark: panel, borda `panel-contrast`, raio 2 |
| Ações dentro de shape | `<ShapeToolbar>` / `<ShapeError>` (`src/shapes/shared`) = `.reif-shape-toolbar` + `button.tlui-button` + `<ReifIcon>` | barra contextual compacta (32px) |
| Separador | `.reif-divider` | 1px `divider` |

### Estados

- **Hover**: nunca muda a cor do botão; um pseudo-elemento `::after` (inset 4px, raio 6) recebe `--tl-color-muted-2`.
- **Ativo/selecionado**: ferramenta = fundo `--tl-color-selected` + ícone `selected-contrast`;
  item de toggle = `::after` com `muted-2` opaco.
- **Foco**: `outline: 2px solid var(--tl-color-focus)`.
- **Desabilitado**: `--tl-color-text-disabled`, sem hover.
- **Carregando**: texto no próprio rótulo ("Resumindo…"), ícone com `.reif-pulse`. Sem spinners coloridos.
- **Erro**: texto `--tl-color-danger` numa superfície `panel` (ou toast `error`).

---

## 4. Padrões de interação

1. **Popover ancorado na toolbar** (ex.: Inserir): abre acima do botão, `.reif-panel` com `.reif-grid`
   de ícones com tooltip; modos secundários (link, gravação) trocam o conteúdo **no mesmo popover**.
   Fecha com Esc ou clique fora.
2. **Barra contextual sobre a seleção** (barra de prompt): 12px acima do bounding box, some durante
   arraste/redimensionamento, reposicionada fora do ciclo do React.
3. **Diálogo modal** só para tarefas focadas e longas (busca de imagens): véu `overlay`, painel central.
4. **Painel lateral** para leitura (leitor de arquivos): à direita, não modal, canvas continua usável.
5. **Toasts** para resultados assíncronos e erros fora de contexto.
6. **Conteúdo no canvas** (cartões, vídeo, slot de imagem) segue o bookmark do tldraw; ações aparecem
   só com o shape selecionado, numa barra compacta no canto.

---

## 5. Checklist para qualquer UI nova

- [ ] Usa componente/classe do tldraw quando existe (seção 3)?
- [ ] Só tokens `--tl-*` / utilitários `tl-*` — nenhuma cor, raio, sombra ou fonte solta?
- [ ] Ícones do sprite ou `reif-*` (30×30, traço 2, contorno) — **sem emoji**?
- [ ] Texto 12px (11px para meta), fonte herdada?
- [ ] Hover/ativo/foco/desabilitado como na seção 3?
- [ ] Funciona e foi conferido no **modo escuro**?
- [ ] Sobreposição na camada certa (`.reif-overlay`) e fecha com Esc?
