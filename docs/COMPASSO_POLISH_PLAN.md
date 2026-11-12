# Compasso — plano de polimento

Atualizado em 12 de novembro de 2026.

## Objetivo e base

Concluir os fluxos atuais do diário e estabilizar dados, materiais, teclado, navegação e motion antes de ampliar recursos.

Base de referência em main, commit 8ec64318ebd138399adcecaecb9b159f8737eec1. Build iOS de referência 1.0.0 (4), canal production, runtime 884f76f4decc76733cd4d0770b7173d35bb841a6. O último OTA conhecido nesta abertura de plano é o grupo 373f258a-7c34-48fc-91d5-0ca57f58ba79.

A auditoria de 10/11 identificou sete achados P01–P07 e um inventário de vidro/preenchimento. A gravação cobre aproximadamente 3min45s. Os defeitos visuais foram observados no vídeo; persistência de rascunhos, integridade de citações e custo com histórico grande exigem verificações específicas.

## Fila de execução

| Etapa | Entrega | Evidência para encerrar | Estado |
| --- | --- | --- | --- |
| 1 | Proteger rascunhos e edições | Rascunho restaurado após encerrar o app; cancelar câmera mantém conteúdo; edição alterada tem saída segura | Publicada para teste |
| 2 | Estabilizar compositor, vidro e menus | Repetir 0:49 e 2:49 do vídeo sem manchas; menu respeita cabeçalho; compositor mantém âncora | Publicada para teste |
| 3 | Uniformizar materiais e feedback | Bandeja +, Guardar, ferramentas e remoções têm estados legíveis e resposta consistente | Publicada para teste |
| 4 | Fechar leitura, edição, citações e busca | Mesma entrada legível nos diferentes caminhos; texto longo editável; citação e retorno seguem regra única | Publicada para teste |
| 5 | Consolidar arquitetura e medir performance | Testes de fluxo, componentes com responsabilidades claras e comparação antes/depois no aparelho | Em execução |
| 6 | Aceite final no iPhone | Roteiro completo aprovado, sem defeitos críticos ou altos pendentes | Pendente |

Estados usados no plano: Pendente, Em execução, Validada localmente, Publicada para teste, Validada no iPhone e Concluída. A conclusão de cada etapa exige suas evidências locais e de aparelho aplicáveis.

## Etapa 1 — conteúdo antes do acabamento

- Persistir rascunho principal, foto e referência da continuação em armazenamento próprio do app.
- Preservar a foto do rascunho além do tempo de vida do cache do seletor.
- Limpar o rascunho após a confirmação da gravação; falhas preservam uma tentativa recuperável.
- Definir a saída da edição alterada com confirmação de descarte e retorno para continuar editando.
- Proteger o rascunho de Hoje ao entrar e sair do modo Pensamento e da edição.

Aceite: texto curto e longo, foto, citação e foto com citação; cancelar seletor; alternar apps; encerrar e reabrir. O registro guardado aparece uma vez. Validar falha e nova tentativa de gravação.

## Etapa 2 — composição e movimento

- Corrigir a faixa de desfoque que atravessa o compositor e as manchas junto aos menus.
- Revisar a hierarquia de superfície, desfoque e conteúdo nos estados normal, compacto, foto, teclado e seleção.
- Reservar a região do cabeçalho na geometria das reações e ações. Conter prévias longas com rolagem própria.
- Manter o compositor ancorado na parte inferior também ao apagar a última entrada.
- Preservar a leitura ao abrir/recolher + e ao retornar da câmera, calendário e detalhes.

Aceite: comparar as cenas 0:49, 2:49, 2:55 e 3:05–3:15 da gravação; repetir sobre fotos claras e escuras. Testar mensagem no topo e rodapé, com teclado aberto e fechado.

## Etapa 3 — vidro, preenchimento e feedback

- Priorizar uma superfície nativa compartilhada na bandeja +, com Fotos, Câmera e Ler texto.
- Uniformizar Guardar nos estados disponível, pressionado, desabilitado e guardando.
- Refinar resposta ao toque das ferramentas do editor, setas do calendário e filtro ativo.
- Uniformizar remover foto e remover citação, mantendo contraste sobre imagens.
- Conferir pílulas, menus, seleção e detalhes que já possuem vidro, especialmente ao montar e recolher.

Regras: uma superfície por grupo visual; alvos de pelo menos 44 pontos; preenchimento e contraste suficientes; controle de conteúdo e ação com papéis claros. Um botão dentro de uma superfície de vidro deve aproveitar esse material. Adições de vidro dependem da comparação visual e da medição de custo quando relevante.

Aceite: aparelho com Liquid Glass, transparência reduzida e movimento reduzido; toque, arrasto, teclado e retorno de seletor. Verificar formação do material e fallback opaco.

## Etapa 4 — consistência dos fluxos

- Definir um contrato comum de leitura para busca, calendário e citação, com data, texto, foto, tags e favoritos.
- Padronizar retorno ao mesmo resultado, dia e ponto de leitura.
- Revisar o editor com texto maior que a tela, visibilidade do cursor, foto e teclado.
- Exibir no resultado da busca um trecho que permita reconhecer o termo encontrado.
- Preservar o instantâneo de texto citado e indicar a disponibilidade da origem separadamente.
- Definir retenção da foto citada para que a continuação permaneça coerente após excluir a origem.
- Conferir filtros ativos, limpar filtro, favoritos vazios, carregamento e falhas de leitura.

A preservação do instantâneo segue o modelo de citação já adotado no diário. A retenção de fotos citadas deve ser implementada e testada junto com sua regra de exclusão.

Aceite: abrir a mesma entrada por cada caminho; editar e cancelar; continuar entrada antiga; editar/excluir origem; reabrir; filtrar e voltar. O modo Pensamento mantém sua única continuidade, sem swipe ou ação Continuar nas mensagens.

## Etapa 5 — sustentação técnica

- Criar testes de regressão dos fluxos críticos do diário antes das extrações.
- Extrair primeiro editor e compositor de DiaryScreen, mantendo o armazenamento e os contratos dos chamadores.
- Reduzir duplicação de controles, estados de fechamento e regras de teclado somente após caracterizar o comportamento.
- Medir busca, leitura do histórico, memória de imagens e pausas de animação com diário sintético grande.
- Usar o resultado para decidir cache, índice ou mudanças de armazenamento.
- Atualizar a documentação de verificação com evidências do diário. A documentação existente contém resultados do módulo legado de alimentação.

Aceite: testes verdes, funcionamento offline e comparação antes/depois. Ganhos de CPU/GPU exigem medição no iPhone com Instruments; contagem menor de camadas, por si só, não comprova ganho.

## Etapa 6 — roteiro final

1. Abrir vazio, escrever, guardar, encerrar e reencontrar.
2. Adicionar/remover foto, cancelar câmera, ler texto e revisar antes de guardar.
3. Continuar um pensamento, preservar rascunho anterior e retornar.
4. Editar, cancelar, salvar e recuperar de falha.
5. Reagir, abrir + de emojis, recolher e voltar à mesma mensagem.
6. Buscar, favoritar, filtrar tags, abrir resultado e voltar.
7. Navegar calendário, filtrar, abrir detalhe e voltar ao carrossel.
8. Selecionar, excluir e verificar citações, fotos e estado vazio.
9. Repetir os caminhos sensíveis com texto ampliado, VoiceOver e preferências de movimento/transparência reduzidos.

## Ciclo de trabalho por entrega

1. Conferir HEAD, cópia limpa, build instalada e runtime.
2. Escolher um lote coeso da próxima etapa, com os critérios deste plano.
3. Implementar a menor mudança completa e os testes de regressão necessários.
4. Rodar npm run verify. Fazer export/build quando a mudança justificar.
5. Registrar commit. Publicar OTA iOS em production quando compatível; alterações nativas seguem para nova build e TestFlight.
6. Informar commit, link do EAS, build compatível, o que mudou e o roteiro curto de teste no iPhone.
7. Incorporar o retorno de Juice, atualizar o estado e corrigir regressões antes do lote dependente.
8. Enquanto um teste de aparelho está pendente, avançar apenas em trabalho independente. Manter explícita a validação que falta.

## Registro de continuidade

- Próxima ação — validar no iPhone editor longo, teclado/cursor, filtros e retornos das etapas publicadas; preparar a etapa 5 com regressões e extração do editor preservando seus contratos.
- Evidência local da base — npm run verify passou com 20 testes na auditoria de 10/11.
- Evidência pendente — validação de aparelho dos achados; baseline de performance.
- Registro por entrega — data, etapa, estado, commit, build/runtime, OTA/EAS, testes e retorno de Juice.
- Decisões de produto — diário local, uma voz, balões rosa à direita, componentes nativos e comparação de referências antes de mudar a interface.
- Logo — depende do arquivo de Juice; integração prevista para a identidade visual.


Entrega da etapa 1 em 10/11/2026. Proteção de rascunhos, fotos duráveis, restauração de foco/edição, confirmação de descarte e identidade estável na gravação. Verificação local com 23 testes; validação no iPhone pendente.

Registro da entrega 1 — commit 49d3ccf714ef87dc8ef95fa52b319db91a6dff90, build 1.0.0 (4), canal production, OTA ff6b20bd-e285-45aa-ba4e-6dc3f29456d5. Link do EAS https://expo.dev/accounts/juiceluqi/projects/zest-kcal-tracker-template/updates/ff6b20bd-e285-45aa-ba4e-6dc3f29456d5. npm run verify passou com 23 testes. Pendente no iPhone: encerrar/reabrir com foto e citação, cancelar câmera e descartar/retomar edição.

Registro da entrega 2 — commit 3152d0deeb521acda3a21c8597cc479e38dedc7f, build 1.0.0 (4), canal production. OTA https://expo.dev/accounts/juiceluqi/projects/zest-kcal-tracker-template/updates/8e77681d-711b-4116-a035-cd56c48c2909. Removida a camada mascarada de desfoque atrás do compositor, preservado o vidro nativo, campo ancorado no rodapé vazio e menus com limite de cabeçalho e rolagem das ações em telas menores. npm run verify passou com 25 testes. Pendente no iPhone: manchas sobre fotos, fechamento/abertura de teclado e bandeja, mensagem longa no topo/rodapé, arrasto pelas reações e retorno à mesma mensagem.

Registro da entrega 3 — commit a049c72d12dc3e82dac7b86340b73021be318a04, build 1.0.0 (4), canal production. OTA https://expo.dev/accounts/juiceluqi/projects/zest-kcal-tracker-template/updates/e34f9919-4644-444a-8ad0-e8c1528c5c6f. Bandeja com vidro compartilhado, Guardar com botão nativo preenchido, feedback e hápticos nos controles de anexos/editor e feedback visual na remoção da foto. Setas do calendário já usam Touch. A ação de remover a referência será revista junto com as citações na etapa 4. npm run verify passou com 25 testes. Pendente no iPhone: retorno de seletor, visibilidade/material da bandeja, estados de Guardar, hápticos e preferências de movimento/transparência reduzidos.


Entrega parcial da etapa 4 em 10/11/2026 — conteúdo compartilhado entre linha do tempo, calendário, busca e painel da origem. Busca e painel da origem incluem tags, reação, favorito e citação. A busca exibe trecho próximo do termo, com acentos e espaços normalizados, e permite abrir a origem e retornar à entrada anterior, conservando a lista montada e registrando a rolagem dos detalhes.

Citações novas guardam cópia própria da foto. Antes de excluir uma origem, citações antigas recebem instantâneos de texto e foto; falha de leitura, cópia ou publicação retém a origem para nova tentativa. A exclusão da origem preserva o conteúdo citado e mostra sua indisponibilidade separadamente. Ao excluir a própria continuação, sua cópia da foto também é removida. Citações cuja origem já havia sido excluída antes deste ajuste só podem preservar o texto que já estava salvo; fotos já apagadas não podem ser recuperadas.

Verificação local: npm run verify, 29 testes passando. Testes novos cobrem migração de citações antigas, independência da origem editada, nova tentativa, falhas de cópia/publicação e trechos de busca com acentos, quebras de linha e emojis. A extração de leitura preserva os materiais existentes e não adiciona camadas de vidro. Pendentes: aceite visual e retorno de rolagem no iPhone, editor longo e revisão dos estados de filtros/carregamento/falha. Custo de exclusão com histórico grande será medido na etapa 5.


Registro da entrega 4a — commit 02e42dc0a9c0562c09dd265c34f28336420d9f7e, build 1.0.0 (4), canal production, runtime 884f76f4decc76733cd4d0770b7173d35bb841a6. OTA publicado: https://expo.dev/accounts/juiceluqi/projects/zest-kcal-tracker-template/updates/164d0022-4f11-404a-b7d3-ce97d8618e2c. npm run verify passou com 29 testes e a exportação iOS concluiu. A etapa 4 continua Em execução pelas pendências descritas acima. No iPhone: criar continuação de texto/foto, editar e excluir a origem, encerrar/reabrir; testar citações antigas e exclusão em lote; buscar termo no fim de entrada longa; abrir citação pelo resultado e voltar à entrada e à lista no mesmo ponto.


Entrega 4b em 10/11/2026 — editor com campo que acompanha o conteúdo e uma rolagem externa com acompanhamento nativo do cursor pelo KeyboardAwareScrollView já instalado. O cabeçalho tem região reservada, a pílula segue o teclado pelo KeyboardStickyView e seu espaço é reservado no conteúdo; a compensação anterior por KeyboardAvoidingView foi removida deste sheet. Texto, foto compacta e tags permanecem no mesmo cartão. O rascunho de Hoje e a confirmação de descarte continuam preservados.

Busca com estados separados de carregamento, atualização da consulta, ausência de resultados, leitura parcial e falha, incluindo nova tentativa. Limpar filtros mantém o termo escrito. O seletor nativo de tags sinaliza o filtro ativo, permite limpar por Todas as entradas e oferece nova tentativa quando a leitura falha. Resultados antigos ficam indisponíveis ao toque durante a atualização da consulta. No calendário, falha em um registro preserva os demais registros legíveis e mostra leitura incompleta; filtro ativo não revela temporariamente o histórico sem filtro enquanto carrega.

npm run verify passou com 32 testes. Regressões novas cobrem combinação de texto/favorito/tag, remoção de filtros preservando consulta, agrupamento por dia e leitura com registros ausentes ou inválidos. O comportamento de cursor, teclado, seleção e movimento depende do aceite no iPhone; nenhum ganho de performance foi declarado. Roteiro: editar/pastar texto maior que a tela, mover cursor ao início/meio/fim, ampliar fonte, anexar foto e editar tags, recolher e reabrir teclado, cancelar e retomar; testar favoritos vazios, tag sem resultados, limpar filtro e alternar buscar/favoritos.


Registro da entrega 4b — commit 9512ac04e04750e67b99d08ced7b8e69ac2adef3, build 1.0.0 (4), canal production, runtime 884f76f4decc76733cd4d0770b7173d35bb841a6. OTA publicado: https://expo.dev/accounts/juiceluqi/projects/zest-kcal-tracker-template/updates/b0d6b7e9-dbfe-4c3a-8a05-14141142e2ca. Verificação local: tipos, lint e 32 testes; exportação iOS concluída. Etapa 4 publicada para teste, com aceite no iPhone pendente conforme o roteiro acima. A próxima etapa técnica é consolidar arquitetura e medir performance sem ampliar os recursos do produto.

Teste de Juice no iPhone (10/11/2026). O vídeo mostra abertura e retorno da busca, filtros por tag no calendário, detalhe no rodapé e acesso à entrada original. A bandeja + abriu e a câmera devolveu uma prévia. O alerta “Não foi possível proteger o rascunho” apareceu após a câmera (0:27) e ao voltar a editar o texto recuperado (0:57). No detalhe do calendário, o menu cobre parte da data (1:40). Ainda falta testar o editor com texto longo, a citação após editar ou excluir a origem, a área de toque das linhas do menu e o retorno do + das reações à mesma mensagem.

Correção publicada no commit e55c6abf14670bb45c438fc0b35b6fbb38044438. Gravações e cópias terminam antes da publicação de arquivos, revisões e exclusão da origem citada. npm run verify passou com 32 testes. OTA iOS production para a build 1.0.0 (4) em https://expo.dev/accounts/juiceluqi/projects/zest-kcal-tracker-template/updates/b30943d0-711e-44a2-8f78-0c93cd1eca36. Repetir no aparelho o retorno da câmera, a edição do rascunho após reabrir e a persistência de uma edição com foto.

Ajustes das capturas de 10/11/2026. Busca e calendário usam um único menu SwiftUI para o filtro no iOS, com vidro nativo disponível. As setas de mês compartilham uma pílula e a seta do dia tem botão de vidro próprio. A alça do calendário fica fora da rolagem, os dias com registros e Hoje usam o vermelho do Compasso e o carrossel usa a largura da tela. A bandeja de anexos tem fundo fosco sem sombra e os atalhos somem juntos durante a redução de altura. npm run verify passou com 32 testes. Commit 47f0ddbfbb4f2b2b02c4a9294c651f7e5a7c0947, OTA production para a build 1.0.0 (4) em https://expo.dev/accounts/juiceluqi/projects/zest-kcal-tracker-template/updates/645b5138-a6b7-4fa8-9be7-a60cdcca8e7e. Pendente no iPhone: conferir a abertura e o fechamento do filtro, o carrossel nas laterais e a transição entre bandeja e teclado.


Retomada em 12/11/2026 — `origin/main` confirmado em b59c9d7701c532610910941ddbcc038a35570301, cópia nova sem mudanças locais. Referência de Juice: OTA 63b6a4dc-87b0-468f-86c4-30f0c5b6d37b, build 1.0.0 (4), production, runtime 884f76f4decc76733cd4d0770b7173d35bb841a6. Carrossel contido no vidro e desfoque curto do calendário aguardam o próximo retorno do iPhone.

Etapa 5, primeiro lote validado localmente: extração de DiaryEditor e do cartão DiaryComposer, mantendo refs, estado, persistência, materiais e teclado nos contratos existentes. Estilos movidos sem alteração de valores. DiaryScreen passa de 2.558 para 1.869 linhas; isso não é evidência de performance. Dock, bandeja e gestos permanecem na tela para extração posterior. JSX comparado por árvore sintática com a base. `npm run verify` passou com 32 testes antes/depois e exportação iOS concluiu. Baseline sintético documentado em [VERIFICATION.md](VERIFICATION.md), sem otimizações. Medições nativas e aceite continuam pendentes.

OTA deste lote bloqueado por ausência de autenticação EAS (`Not logged in`). Fingerprint calculado neste Linux é 90269544546e544a985d514455abd6128d04794d tanto na base quanto no lote; diverge do instalado. A publicação exige comparar as fontes com a build autenticada antes de escolher o runtime. Sem alteração nativa ou dependências; nenhum runtime foi forçado. Menu do calendário: proteção atual usa cabeçalho principal e não reserva a data do detalhe; conferir a gravação antes de mudar sua geometria.
