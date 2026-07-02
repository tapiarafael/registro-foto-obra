# Registro Fotográfico de Obra

App Android offline para engenheiros de obra registrarem fotos com data/hora, organizadas por hierarquia de construção, e exportarem relatórios PDF e ZIP — tudo no dispositivo, sem internet, login ou nuvem.

**Stack:** Expo SDK 54 · React Native 0.81 · TypeScript · SQLite local

---

## O que o app faz

| Área | Descrição |
|------|-----------|
| **Registro** | Fluxo guiado Quadra → Prédio → Pavimento → Unidade → Serviço, com câmera nativa e importação da galeria |
| **Marca d'água** | Data/hora e campos da hierarquia no overlay da câmera; aplicados também nos exports |
| **Estrutura** | CRUD da obra, reordenação manual, duplicação em massa (clone) e gerador de pavimentos/unidades |
| **Relatórios** | PDF paginado (`pdf-lib`) e ZIP com fotos originais (`fflate`), com cache em disco |
| **Histórico** | Navegação por data e hierarquia para revisar fotos antigas |
| **Armazenamento** | Estatísticas de uso e exclusão por data |

Toda a interface está em **português brasileiro**. Tema: azul `#0D47A1`, destaque `#F59E0B`.

---

## Pré-requisitos

- **Node.js** 20+
- **[pnpm](https://pnpm.io/)**
- **Android** com build nativo — a câmera usa `react-native-vision-camera` e **não funciona no Expo Go**
- **[EAS CLI](https://docs.expo.dev/build/setup/)** para builds na nuvem (`npm install -g eas-cli`)

Para build local, também é necessário JDK 17+, Android SDK e um dispositivo/emulador configurado. Verifique o ambiente com:

```bash
pnpm android:check
```

---

## Início rápido

```bash
pnpm install
pnpm start          # Metro bundler (QR para dev client)
pnpm typecheck      # Verificação TypeScript
```

Nenhuma variável de ambiente é necessária.

### Rodar no Android (local)

```bash
pnpm android              # expo run:android (prebuild automático se faltar android/)
pnpm android:prebuild     # Gera pasta android/ via expo prebuild
pnpm android:apk:release  # APK release local (Gradle)
pnpm android:install:release
```

Scripts auxiliares ficam em `scripts/` (`android-env.sh`, `check-android-env.sh`, etc.).

### Builds na nuvem (EAS)

```bash
eas login
pnpm build:preview      # APK interno para sideload
pnpm build:production   # AAB para Google Play
```

Após alterar dependências nativas (câmera, SQLite, etc.), gere um novo build e reinstale o APK no dispositivo.

---

## Estrutura do projeto

```
app/                          # Rotas (expo-router)
  (tabs)/                     # Registrar · Configurações · Relatórios · Estrutura
  registrar/                  # Fluxo de captura (wrappers finos)
  estrutura/                  # Gestão da obra + gerador em massa
  setup.tsx                   # Onboarding inicial da obra
  historico.tsx               # Navegação por data
  armazenamento.tsx           # Uso de disco
  marca-dagua.tsx             # Configuração da marca d'água
  relatorio-config.tsx        # Opções de PDF/ZIP

components/
  structure/                  # Telas compartilhadas capture | manage
    BlocksScreen.tsx          # Quadras
    BuildingsScreen.tsx       # Prédios
    FloorsScreen.tsx          # Pavimentos
    UnitsScreen.tsx           # Unidades
    ServicesScreen.tsx        # Serviços
    CloneNameModal.tsx
  CrudList.tsx                # Lista CRUD reutilizável (drag-to-reorder)
  HierarchyCard.tsx           # Card de navegação
  …

context/AppContext.tsx        # useApp() — projeto, sessão, captureNav

db/
  database.ts                 # SQLite CRUD (~1.3k linhas, fonte da verdade)
  migrate.ts                  # Migrations versionadas (PRAGMA user_version)
  migrations/*.sql            # Referência SQL (conteúdo embutido em migrate.ts)

services/
  photoService.ts             # Armazenamento, thumbnails, I/O de fotos
  reportService.ts            # Orquestração PDF/ZIP + cache
  pdfReportBuilder.ts         # Montagem do PDF
  zipReportBuilder.ts         # ZIP streaming para disco

utils/datetime.ts             # Formatação pt-BR (Intl.DateTimeFormat)

constants/colors.ts           # Design tokens (paleta light)
```

### Rotas `registrar` vs `estrutura`

As rotas em `app/registrar/*` e `app/estrutura/*` são wrappers de ~5 linhas que renderizam os mesmos componentes em `components/structure/`, com `mode="capture"` ou `mode="manage"`:

- **capture** — navega pela hierarquia até a câmera; usa `captureNav` do contexto
- **manage** — edita a estrutura, reordena itens e duplica quadras/prédios/pavimentos/unidades

---

## Arquitetura

### Offline por design

- Banco SQLite `obra.db` via `expo-sqlite` (WAL, foreign keys)
- Fotos em `documentDirectory/photos/` (original + thumbnail)
- Relatórios em `documentDirectory/reports/`
- Sem rede, autenticação ou sincronização

### Hierarquia de dados

```
Projeto
 └── Quadra (block)
      └── Prédio (building)
           └── Pavimento (floor)
                └── Unidade (unit)
                     └── Serviço (service) ← lista global por projeto
                          └── Fotos (photo_group → photo)
```

Sessões de inspeção (`inspection_session`) agrupam capturas do dia; `photo_group` liga unidade + serviço dentro de uma sessão.

### Exportação

**PDF** — fotos embutidas sequencialmente com `pdf-lib`; qualidade configurável (rápida/média/alta).

**ZIP** — fotos copiadas do disco sem recompressão; montagem entry-a-entry com `fflate` streaming + `expo-file-system` `FileHandle.writeBytes`, mantendo pico de memória em ~uma foto. Escala para centenas de fotos em dispositivos com pouca RAM.

**Cache** — `generated_report` guarda hash de config + contagem de fotos; reexporta só quando os dados mudam.

### Migrations

Schema versionado em `db/migrate.ts` com `PRAGMA user_version`. Os arquivos em `db/migrations/` servem de referência; o SQL é aplicado a partir de strings embutidas no runtime (sem `expo-asset`).

---

## Scripts disponíveis

| Comando | Descrição |
|---------|-----------|
| `pnpm start` | Inicia o Metro bundler |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm android` | Build e run no dispositivo/emulador |
| `pnpm android:check` | Valida JDK, SDK, adb |
| `pnpm android:prebuild` | `expo prebuild` para Android |
| `pnpm android:prebuild:clean` | Prebuild limpando `android/` |
| `pnpm android:apk:debug` | APK debug via Gradle |
| `pnpm android:apk:release` | APK release via Gradle |
| `pnpm android:install:debug` | Instala APK debug |
| `pnpm android:install:release` | Instala APK release |
| `pnpm build:preview` | EAS build — APK preview |
| `pnpm build:production` | EAS build — AAB produção |

---

## Dependências principais

| Pacote | Uso |
|--------|-----|
| `expo-sqlite` | Banco local |
| `react-native-vision-camera` | Câmera nativa |
| `expo-image-picker` | Importar da galeria |
| `expo-image-manipulator` | Resize/compressão ao salvar |
| `expo-file-system` | I/O de fotos e relatórios |
| `pdf-lib` | Geração de PDF |
| `fflate` | ZIP streaming |
| `expo-sharing` | Compartilhar exports |
| `react-native-draggable-flatlist` | Reordenação manual na estrutura |
| `expo-router` | Navegação baseada em arquivos |

---

## Cuidados

- **Expo Go não serve** — use dev client, APK preview ou build local.
- **Teste em dispositivo real** — câmera, SQLite e compartilhamento só funcionam nativamente.
- **Rebuild após deps nativas** — mudanças em `react-native-vision-camera`, plugins do `app.json`, etc. exigem novo prebuild/EAS build.
- **Alinhar versões Expo** — após mudar pacotes, rode `pnpm exec expo install --fix`.

---

## Roadmap

Planos detalhados de melhorias futuras: [`docs/tasks/README.md`](docs/tasks/README.md).

**Já entregue:** migrations, `captured_date`, clone com progresso, PDF via pdf-lib, cache de relatórios, ZIP streaming, unificação das telas de estrutura.

**Próximo:** suite de testes, `photo_group` UNIQUE, CI, polish de navegação.

---

## Licença

Projeto privado (`"private": true`).
