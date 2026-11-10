# Compasso — plano de polimento

Atualizado em 10 de novembro de 2026.

## Objetivo e base

Concluir os fluxos atuais do diário e estabilizar dados, materiais, teclado, navegação e motion antes de ampliar recursos.

Base de referência em main, commit 8ec64318ebd138399adcecaecb9b159f8737eec1. Build iOS de referência 1.0.0 (4), canal production, runtime 884f76f4decc76733cd4d0770b7173d35bb841a6. O último OTA conhecido nesta abertura de plano é o grupo 373f258a-7c34-48fc-91d5-0ca57f58ba79.

A auditoria de 10/11 identificou sete achados P01–P07 e um inventário de vidro/preenchimento. A gravação cobre aproximadamente 3min45s. Os defeitos visuais foram observados no vídeo; persistência de rascunhos, integridade de citações e custo com histórico grande exigem verificações específicas.

## Fila de execução

| Etapa | Entrega | Evidência para encerrar | Estado |
| --- | --- | --- | --- |
| 1 | Proteger rascunhos e edições | Rascunho restaurado após encerrar o app; cancelar câmera mantém conteúdo; edição alterada tem saída segura | Validada localmente |
| 2 | Estabilizar compositor, vidro e menus | Repetir 0:49 e 2:49 do vídeo sem manchas; menu respeita cabeçalho; compositor mantém âncora | Pendente |
| 3 | Uniformizar materiais e feedback | Bandeja +, Guardar, ferramentas e remoções têm estados legíveis e resposta consistente | Pendente |
| 4 | Fechar leitura, edição, citações e busca | Mesma entrada legível nos diferentes caminhos; texto longo editável; citação e retorno seguem regra única | Pendente |
| 5 | Consolidar arquitetura e medir performance | Testes de fluxo, componentes com responsabilidades claras e comparação antes/depois no aparelho | Pendente |
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

- Próxima ação — validar a etapa 1 no iPhone e iniciar o diagnóstico de composição da etapa 2.
- Evidência local da base — npm run verify passou com 20 testes na auditoria de 10/11.
- Evidência pendente — validação de aparelho dos achados; baseline de performance.
- Registro por entrega — data, etapa, estado, commit, build/runtime, OTA/EAS, testes e retorno de Juice.
- Decisões de produto — diário local, uma voz, balões rosa à direita, componentes nativos e comparação de referências antes de mudar a interface.
- Logo — depende do arquivo de Juice; integração prevista para a identidade visual.


Entrega da etapa 1 em 10/11/2026. Proteção de rascunhos, fotos duráveis, restauração de foco/edição, confirmação de descarte e identidade estável na gravação. Verificação local com 23 testes; validação no iPhone pendente.
