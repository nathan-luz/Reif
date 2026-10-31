# Integração Reif ↔ Twice — contrato v1

Status: acordado entre Reif e Twice · 2026-10-31

O Reif é o **editor** (como o Excalidraw); o Twice é o **dono do armazenamento** e quem processa o conteúdo
(assistente, mapa Campo → Tópico → Conceito, flashcards). O Reif define o formato; o Twice decide nome,
pasta e id, e faz todo o IO no disco/iCloud. O Reif nunca escolhe caminho.

```
Twice (SwiftUI, macOS/iOS)                         Reif (web, dentro de WKWebView)
  "Novo quadro" / abrir .reif ──new / open────────▶ carrega snapshot; lê assets por reif-asset://
  lê/grava Documents/Conhecimento/<pastas>/    ◀──save / asset.put── autosave
  processa content.json → StudySource/chunks
```

---

## 1. Modos

| | standalone | host (`twice`) |
|---|---|---|
| Como abre | navegador, URL do Worker | `WKWebView` do Twice: `<URL do Worker>/?host=twice` |
| Documento | `persistenceKey="reif-main"` (IndexedDB) | **nada em IndexedDB**: tudo vem e vai pela ponte |
| Arquivos (`reif-files`) e assets do tldraw | IndexedDB | no pacote `.reif` (leitura por `reif-asset://`, escrita por `asset.put`) |
| Cache de derivados (thumb, modelo do leitor) | IndexedDB | memória da sessão; texto/resumo reidratados do `content` |
| Design system | `localStorage` (global) | por documento (`snapshot` → `document.meta.reif.designSystem`) |
| IA | Worker do Reif | Worker do Reif (mesma origem), com token vindo do Twice |

Detecção do host (em ordem): `?host=twice` **e** `window.webkit.messageHandlers.reif` → ponte WebKit;
senão `?host=…` dentro de iframe → `window.parent.postMessage` (para um futuro Twice web). Sem `host` → standalone.

---

## 2. Pacote `.reif` (no disco)

Pasta com UTType próprio (`com.nathanluz.reif.board`, conforme `com.apple.package`). Não é zip.
Mora no contêiner iCloud Documents do Twice (`iCloud.com.nathanluz.twice`), em `Documents/Conhecimento/<pastas>/`.
Para exportar/compartilhar, o zip do pacote serve.

```
Título.reif/
  meta.json        { id, title, createdAt, updatedAt, revision, version, reifVersion }
  content.json     ReifContent v1 — o que o Twice lê
  snapshot.json    snapshot do tldraw — o Twice não interpreta
  thumbnail.png    prévia do quadro inteiro
  assets/<assetId>.<ext>   imagens, PDFs, áudios… — assetId = sha256 do conteúdo
```

- `id`: UUID gerado pelo Twice ("Novo quadro"); estável a renomear/mover.
- `title`: o Reif pode mudar (renomear no próprio Reif); o Twice renomeia a pasta para espelhar.
- `version`: versão do **formato** (1). `reifVersion`: versão do app que salvou.
- `revision`: inteiro, +1 a cada save (detecção de conflito e de reprocessamento).
- `snapshot.json`: `getSnapshot(editor.store).document` (sem `session`: câmera e seleção são do aparelho).
- Referências a binários no snapshot:
  - asset de imagem do tldraw: `props.src = "asset:<assetId>"`;
  - shape `file`: `props.fileId = <assetId>`;
  - imagens por hotlink (ex.: Unsplash) continuam com a URL `https` e não viram asset.
- `thumbnail.png`: todas as shapes da página, fundo do design system, lado maior ≤ 2048 px.

---

## 3. Ponte

### 3.1 Transporte

- Reif → Twice: `window.webkit.messageHandlers.reif.postMessage(msg)` (iframe: `window.parent.postMessage(msg, origin)`).
- Twice → Reif: `evaluateJavaScript("window.reifHost.receive(msg)")` (iframe: evento `message`).
- **Bytes sempre em base64** na ponte (o `WKScriptMessage` não converte `ArrayBuffer`/`Uint8Array`).
- **Leitura de assets** por `WKURLSchemeHandler`: `reif-asset://<docId>/<assetId>`, servido direto do pacote.
  - A página vem da origem `https` do Worker, então a resposta do handler precisa de
    `Access-Control-Allow-Origin: <origem do Worker>` e `Content-Type` correto (o Reif usa `fetch` e `<img src>`).
  - Em iframe (sem scheme handler) o Reif cai para `asset.get` → `asset.data`.
- Envelope único:

```ts
type Msg = { v: 1; type: string; id?: string; replyTo?: string; payload?: unknown }
```

`id` em toda requisição que espera resposta; a resposta traz `replyTo`.

### 3.2 Mensagens

| Direção | `type` | `payload` | Observação |
|---|---|---|---|
| Reif → Twice | `ready` | `{ reifVersion, protocol: 1 }` | página pronta; só então o Twice manda `new` ou `open` |
| Twice → Reif | `new` | `{ docId, title, context, auth }` | quadro vazio; o `docId` é UUID gerado pelo Twice |
| Twice → Reif | `open` | `{ meta, snapshot, content?, assets, context, auth, readOnly? }` | ver abaixo |
| Reif → Twice | `change` | `{ dirty: boolean }` | só nas transições |
| Reif → Twice | `asset.put` | `{ id, name, mime, base64 }` | `id` = assetId (sha256); só para asset **novo**, antes do `save` que o referencia |
| Reif → Twice | `save` | ver abaixo | autosave ou resposta a `save.request` |
| Twice → Reif | `save.request` | `{ reason: "background" \| "close" \| "manual" }` | com `id`; o Reif responde `save` com `replyTo` (mesmo se limpo) |
| Twice → Reif | `saved` | `{ revision, updatedAt }` | confirma gravação; o Reif zera `dirty` |
| Reif → Twice | `close` | `{}` | usuário pediu para fechar; antes, um `save` se sujo |
| Reif → Twice | `asset.get` | `{ assetId }` | só em iframe; com `id` |
| Twice → Reif | `asset.data` / `asset.error` | `{ assetId, mime, base64 }` / `{ assetId, message }` | `replyTo` |
| ambos | `error` | `{ code, message, replyTo? }` | |

```ts
type Context = {
  folderId: string
  folderPath: string[]              // ex.: ["Faculdade", "Direito Civil"]
  subject: string
  relatedConcepts?: { id: string; name: string }[]
}

type Auth = { apiToken: string }    // do Keychain do Twice; nunca na URL

type OpenPayload = {
  meta: Meta
  snapshot: unknown
  content?: ReifContent             // reidrata texto extraído/resumos sem reprocessar
  assets: { assetId: string; mime: string; name: string; size: number }[]
  context: Context
  auth: Auth
  readOnly?: boolean                // o Twice manda true quando meta.version > a que ele conhece
}

type SavePayload = {
  meta: Meta                        // updatedAt novo, revision = baseRevision + 1, title atual
  baseRevision: number              // revision recebida no open/new (0) ou no último saved
  snapshot: unknown
  content: ReifContent
  thumbnailBase64: string
  assetRefs: string[]               // assetIds referenciados; o Twice pode apagar os órfãos de assets/
}
```

### 3.3 Salvamento

- Autosave: 1,5 s após a última mudança (fora de arraste/digitação ativa).
- `save.request` é atendido imediatamente (iOS indo para segundo plano, janela fechando).
- O Twice grava com `NSFileCoordinator` (escrita atômica por arquivo) e continua processando só depois de
  2 min sem edição, e só se `revision` mudou.
- Em `readOnly`, o Reif desliga a edição e não envia `save`.

### 3.4 Conflito

Se no disco `revision ≠ baseRevision` (outro aparelho salvou), o Twice não sobrescreve: grava uma cópia
(`Título (conflito <aparelho>).reif`) e responde `saved` com a nova revision.

### 3.5 Contexto nos prompts

`context.folderPath`, `subject` e `relatedConcepts[].name` entram no contexto de toda requisição de IA
(`/api/transform` e afins), como contexto somente leitura — do mesmo jeito que o contexto do quadro (`boardContext`).

---

## 4. ReifContent v1 (`content.json`)

```ts
type ReifContent = {
  schema: 'reif-content/1'
  revision: number                 // igual a meta.revision
  title: string
  summary?: string

  /** Na ordem de leitura (§4.1). O Twice quebra em trechos nessa ordem. */
  blocks: {
    id: string                     // id da shape
    kind: 'heading' | 'note' | 'label' | 'sticky'
    text: string                   // texto puro (rich text achatado; listas como "- ")
    groupId?: string
  }[]

  groups: { id: string; title?: string; parentId?: string }[]   // frames e grupos

  /** Um por diagrama; setas soltas fora de diagramas vão num graph `free`. */
  graphs: {
    id: string
    type: 'mindmap' | 'tree' | 'flow' | 'radial' | 'cycle' | 'timeline' | 'columns' | 'grid' | 'sheet' | 'labeled' | 'free'
    rootId?: string
    nodes: { id: string; label: string }[]   // id = id do block correspondente
    edges: { from: string; to: string; label?: string; dashed?: boolean }[]
  }[]

  files: {
    assetId?: string               // ausente quando o arquivo é só link
    sourceUrl?: string
    name: string
    mime: string
    kind: string                   // pdf, doc, sheet, slides, audio, video, code…
    extractedText?: string         // presente → o Twice não reprocessa o arquivo
    extractedTextTruncated?: boolean   // true → o Twice pode processar o asset ele mesmo
    summary?: string
  }[]

  media: {
    kind: 'youtube' | 'audio' | 'video'
    url?: string
    assetId?: string
    title: string
    transcript?: string
    summary?: string
  }[]

  images: {
    assetId?: string
    url?: string
    caption?: string               // texto ligado à imagem (rótulos do layout `labeled`)
    ocrText?: string               // v1: ausente; o Twice faz OCR se quiser
    prompt?: string                // imagem gerada por IA
  }[]
}
```

Mapeamento das shapes:
- **heading**: título de frame e shapes com `meta.reif.role` de título/hero.
- **note**: shape `text` e cartões gerados (resumo, TL;DR).
- **label**: `geo` com texto (nós de diagrama).
- **sticky**: shape `note` do tldraw.
- Rótulos de seta não viram block: vão em `edges[].label`.

Diagramas:
- São identificados pela raiz com `meta.reif.layoutRoot` ou inferidos pelo grafo de setas (`findDiagram`).
- Só setas ligadas nas duas pontas viram `edges`.

`extractedText` tem limite de 200 mil caracteres por arquivo.

### 4.1 Ordem de leitura

1. Agrupar por frame/grupo de nível superior.
2. Ordenar os grupos por linha (y), depois coluna (x), com tolerância de meia altura.
3. Dentro de um diagrama, seguir a ordem do layout: raiz primeiro, depois a ordem das `edges` (a mesma ordem de leitura do plano).
4. No resto, ordenar de cima para baixo e da esquerda para a direita.

---

## 5. Versionamento

- `meta.json.version` (formato do pacote), `content.json.schema` (`reif-content/1`) e `v` do envelope (ponte).
- Mudança **aditiva** (campo opcional novo, `type` novo): não muda versão; quem não conhece, ignora.
- Mudança **incompatível**: sobe a versão correspondente. O Twice abre versão maior que a que conhece
  **só para leitura** (`open.readOnly = true`).

---

## 6. Trabalho do lado do Reif

1. `src/host/`: detecção do modo, adaptador WebKit/iframe, envelope e correlação `id`/`replyTo`.
2. App em modo host: sem `persistenceKey`; `loadSnapshot` no `open`; quadro vazio no `new`; `readOnly`.
3. `TLAssetStore` do host: `upload` → sha256 + `asset.put` (base64); `resolve` → `reif-asset://<docId>/<assetId>` (iframe: `asset.get` → object URL).
4. `files/store.ts` atrás de uma interface: IndexedDB (standalone) | host (assetId, derivados em memória reidratados do `content`).
5. Design system por documento no modo host.
6. Exportadores: `content.json` (ReifContent v1, com testes de ordem de leitura e grafos), `thumbnail.png`.
7. Autosave, `save.request`, `saved`, estado `dirty`; título editável e botão "Fechar" no menu em modo host.
8. `context` do Twice entrando no contexto dos prompts (§3.5).
9. Worker: token de API opcional (`REIF_API_TOKEN`); se definido, exigido em `/api/*` (header `Authorization: Bearer`, valor vindo de `auth.apiToken`).

## 7. Responsabilidades do lado do Twice

- Ligar o iCloud Documents no contêiner `iCloud.com.nathanluz.twice`.
- Garantir o download do pacote e dos assets do iCloud (`startDownloadingUbiquitousItem`) antes do `open` e das leituras por `reif-asset://`.
- Implementar o `WKURLSchemeHandler` de `reif-asset` (com CORS para a origem do Worker).
- Gravar com `NSFileCoordinator`; renomear a pasta quando `meta.title` mudar.
- Apagar de `assets/` o que saiu de `assetRefs`.
- Tratar conflito (§3.4).
- Processar `content.json` → `StudySource(kind: board)` + `StudyChunk`, só quando `revision` mudar; usar `files[].extractedText` quando presente.
- Guardar o token do Worker no Keychain e enviá-lo em `new`/`open`.
