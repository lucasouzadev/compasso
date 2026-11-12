# Verification

## Diário pessoal — 12/11/2026

A rota principal abre `src/diary`. Os resultados abaixo são do diário atual; os registros de outubro nas seções seguintes pertencem ao módulo legado de alimentação.

- `npm run verify` passou na base b59c9d7 e após a extração: tipos, lint sem avisos e 32 testes individuais. Os testes cobrem rascunho restaurado, falha e nova tentativa, instantâneos de citações, busca, filtros e geometria genérica de menus. Não simulam cursor, teclado ou Liquid Glass.
- Editor e cartão do compositor foram extraídos preservando o JSX (comparação das árvores sintáticas com a base), valores de estilos, refs, estados e contratos de armazenamento. A bandeja, o dock e os gestos continuam na tela para uma próxima extração gradual. Nenhum `memo`, cache, índice ou alteração nativa foi introduzido.
- Exportação iOS concluída com Hermes, 2344 módulos e bundle de aproximadamente 5,9 MB. Isso não comprova interação nativa.
- `node scripts/benchmark-diary.mjs` mede 1.000 e 10.000 entradas sintéticas (~1.093 caracteres), 5 aquecimentos e 30 amostras por operação. Os dados brutos estão em [diary-performance-baseline.json](diary-performance-baseline.json). Leitura usa JSON em memória e ordenação; não mede disco, decodificação de imagens, renderização ou memória nativa.

| 10.000 entradas; mediana / p95 (ms) | Base b59c9d7 | Após extração |
| --- | --- | --- |
| Parse JSON + ordenar | 12,543 / 16,159 | 14,251 / 19,857 |
| Normalizar textos da busca | 102,663 / 134,452 | 100,261 / 139,867 |
| Buscar com favorito e tag | 2,115 / 2,724 | 2,161 / 2,520 |

Node v24.22.1, Linux x64. As funções medidas não mudaram; as diferenças são variação entre execuções, sem alegação de ganho ou regressão. A normalização merece medição no aparelho antes de decidir otimização.

Pendente no iPhone: comparar antes/depois usando o mesmo histórico sintético, aparelho e preferências, com Instruments (Time Profiler, Allocations e Animation Hitches); registrar abertura do histórico/busca, memória com fotos, pausas ao rolar, abrir editor e teclado. Nenhum diário real é importado pelo script. Não substituir os dados pessoais de Juice para medir.

Aceite funcional pendente: bordas do carrossel e desfoque do OTA 63b6a4dc; editor longo com cursor/foto/tags/teclado; retorno ao mesmo ponto; recuperação de rascunho; texto e foto citados após editar/excluir origem. O menu do detalhe do calendário ainda depende da geometria do cabeçalho principal: a data dentro do detalhe não tem proteção própria. Rever a gravação de Juice antes de corrigir a interface; as imagens/vídeo legados deste repositório não são essa referência.

Publicação: EAS CLI retornou `Not logged in`. O fingerprint iOS calculado neste Linux é `90269544546e544a985d514455abd6128d04794d`, idêntico na base e após extração, mas diferente do runtime instalado `884f76f4decc76733cd4d0770b7173d35bb841a6`. Comparar as fontes do fingerprint com a build pelo EAS autenticado antes de publicar; não forçar um runtime nem gerar uma build por essa divergência sem diagnóstico. Nenhum OTA foi publicado neste lote.


This file records the standalone project checks, separate from the original chat collection's historical QA.

Validated October 6, 2026 with a bundled Release build in a fresh isolated iPhone 17 Pro simulator running iOS 27.0, built with Xcode 27.0. The installed binary declares `iphonesimulator27.0`, Xcode 27, and `EXExpoAppSceneDelegate` scene support. The app opens without Metro or any service. Device layout is 402 × 874 points; direct captures are 1206 × 2622 pixels. Raw evidence stays under ignored `.qa/`.

## Automated checks

| Check | Result |
| --- | --- |
| Independent `npm ci` | Passed with the project's own lockfile and dependencies. |
| Strict TypeScript and Expo ESLint | Passed. |
| Node regression suite | 19 passing checks: local dates/leap years, totals, partial protein, supportive guide answers, sample identity, reactions, duplicate confirmation, edit/delete/persistence, storage isolation, actual router parser, malformed URI handling, native-tool UUIDs, assets, routes and documentation links. |
| `npx expo-doctor` | 21/21 checks passed. |
| iOS JavaScript export | Passed; all bundled food artwork resolves. |
| Native Release build | Passed, zero errors and one native build-script warning. Built directly from a checkout whose parent path contains spaces. |
| Shipped Maestro flow | Passed 1/1 in 1 minute 8 seconds: sample camera retake, dinner receipt, protein, calendar navigation, close, and retained diary after a new chat. |
| npm security audit | Not clean: 20 high-severity affected entries from two unpatched transitive tooling advisories. See [dependency notes](DEPENDENCIES.md). |

## Native interaction results

Direct IDB input passed: one mascot and no root back action; camera focus/review/retake/cancel; exactly one sample dinner; a fully visible 70 g protein answer; invalid calorie edit rejection and valid edit updating the total; guide changes and the above-guide expression; month navigation; deletion; native photo-picker cancel; and persisted diary/guide after app termination. The complete result is retained locally in `.qa/native/native-results.json`.

The [keyboard preview](images/keyboard.png) also records the native composer clearance. The README images are fresh direct captures of this standalone build. Its native glass, stable photo identity, sticker/receipt alignment, calendar, and open-keyboard 12-point composer clearance were reviewed visually. The raw images and normal-speed recordings remain under `.qa/`.

The [23-second walkthrough](images/walkthrough.mp4) shows real native input through sample capture, dinner confirmation, month navigation, and a protein question after closing the calendar. The completed answer was asserted in the native accessibility tree. Its export keeps the original 1206 × 2622 resolution and normal playback speed at 60 fps; this encoding rate is not a physical-device performance measurement.

## Reproduce

```bash
npm ci
npm run verify
npx expo-doctor
npx expo export --platform ios
npx expo run:ios --configuration Release --device <simulator-udid>
SIMULATOR_UDID=<booted-device> npm run test:ios
```

After a Maestro XCTest run or native reinstall, restart the dedicated simulator and IDB companion if IDB returns an empty accessibility tree. This resets the test service, not the diary.

The Maestro test clears only this application's data, seeds the explicit sample diary, and exercises camera retake/use, dinner confirmation, protein, month navigation and diary continuity after a new conversation. Use a dedicated simulator. The URI decoder regression uses the actual installed Expo Router parser, including malformed input, rather than a mock parser.

The additional IDB regression targets the verified iPhone 17 Pro geometry and checks editor/guide validation, native photo-picker cancellation, and persistence. Its fallback coordinates work around cached UIKit accessibility transforms following full-screen modals; they are not app layout coordinates to reuse on other devices.

```bash
python3 -m venv .qa/venv
.qa/venv/bin/pip install -r scripts/requirements-native.txt
idb_companion --udid <device-id> --grpc-port 11021
# In another terminal:
SIMULATOR_UDID=<device-id> .qa/venv/bin/python scripts/verify-native.py
```

Maestro is the default; IDB is optional. Both native scripts were verified on iPhone 17 Pro. The Maestro close action also uses a documented top-right percentage target because the hosted SwiftUI accessibility frame can remain offscreen after its entry animation. Both use real native input. Neither is a substitute for visual review of glass or motion.

## Limits

This is a UI template with local fixture answers. Android/web, a nutrition model or backend, hardware camera/sensors/haptics, and physical-device frame-rate measurement are not verified. CI performs install, TypeScript, lint, regression checks, and iOS JavaScript export; native builds and motion review run separately on macOS. Live workflow results are available in the repository's [Actions tab](https://github.com/Appllama/zest-kcal-tracker/actions).
