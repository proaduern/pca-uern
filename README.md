# PCA UERN — Sistema de Coleta de Demandas

Sistema de gestão do Plano de Contratações Anual (PCA) da UERN: unidades
demandantes cadastram Documentos de Formalização de Demanda (DFD), a PROAD
aprova ou reprova, e o sistema controla o saldo das cotas (OP, Geral,
Convênio) e a janela de lançamento de cada PCA.

Reconstrução completa (Fase 1) do sistema anterior de coleta de demandas,
feita com autenticação server-side e sem API de escrita pública — o sistema
anterior tinha acesso público de leitura/escrita a uma tabela com senhas em
texto plano e uma senha de admin fixa, então este partiu do zero.

## Stack

- Next.js 16 (App Router) + TypeScript
- Prisma 6 + PostgreSQL
- Autenticação própria via JWT (`jose`) em cookie httpOnly, sem NextAuth
- Tailwind CSS v4
- Vitest (regras de negócio) + Playwright (smoke test end-to-end)

## Modelo de acesso

Sete tabelas de login, sem hierarquia entre si — o email decide qual:

- `Usuario` — PROAD (admin): aprova/reprova DFDs, cadastra PCA, categorias,
  catálogo, unidades, tipificações, prioridades e setores técnicos, e
  autoriza as etapas administrativas das fases seguintes (ata, atendimento
  por estoque, troca de item OP).
- `Unidade` — unidade demandante: cria e edita seus próprios DFDs (rascunho
  ou reprovado), nunca vê ou edita dados de outra unidade.
- `SetorTecnico` — consolida, para as categorias atribuídas a ele pela PROAD,
  os itens dos DFDs aprovados de todas as unidades (ver "Consolidação"
  abaixo).
- `Licitacoes` — Diretoria de Licitações e Contratos: conduz a máquina de
  status da Fase 3 para as consolidações de todos os setores técnicos.
- `AcessoExecucao` — Unidade de Execução de Compras e Contratações, por
  subperfil (Obras / Serviços / Materiais e Patrimônio): conduz os
  processos de execução da Fase 4.
- `AcessoEntrega` — Unidade de Entrega de Bens, por subperfil (Patrimônio /
  Almoxarifado): registra entregas, atendimento por estoque e troca de
  item OP.
- `AcessoGestorAta` — Unidade Gestora de Ata de Registro de Preços: solicita
  a execução das consolidações em regime de ata.

`SetorTecnico`, `Licitacoes`, `AcessoExecucao`, `AcessoEntrega` e
`AcessoGestorAta` podem ter login próprio ou ser "vinculados" ao login de
uma `Unidade` já existente (mesmo email/senha; quem loga escolhe, na hora,
em qual papel entrar).

Toda ação de servidor (`lib/actions/*.ts`) começa checando a sessão
(`exigirAdmin()` / `exigirUnidade()` / `exigirSetorTecnico()` / equivalentes
para os demais perfis), e toda ação que mexe num recurso de outro perfil
confirma que ele pertence a quem está logado antes de ler ou escrever.

## Rodando localmente

```bash
cp .env.example .env   # edite DATABASE_URL / DIRECT_URL / AUTH_SECRET
npm install
npx prisma migrate deploy
npx prisma db seed      # cria o admin PROAD e os dados padrão
npm run dev
```

Admin seed: `adj.proad@uern.br` / `TrocarEssaSenha123!` (senha temporária,
o sistema não força troca para ADMIN — só para unidades).

## Testes

```bash
npm test                # regras de negócio (cota, validação de DFD, importação)
npm run build            # inclui typecheck
npm run lint

# smoke test end-to-end (precisa do servidor rodando em :3001)
npm run build && npm run start -- -p 3001 &
node smoke-pca.mjs                      # fluxo completo: login → DFD → aprovação
node smoke-import.mjs                   # importação em lote de unidades/categorias/catálogo
node smoke-fase2.mjs                    # consolidação por setor técnico (roda smoke-pca.mjs antes)
node smoke-fase3-licitacoes.mjs         # máquina de status de Licitações
node smoke-fase4-execucao-entrega.mjs   # Execução e Entrega de Bens + confirmação do demandante
node smoke-fase5-casos-especiais.mjs    # Gestor de Ata, Atendimento por Estoque, Troca de Item OP
node smoke-admin-edicao.mjs             # edição administrativa de DFD aprovado, mesclagem de categoria, relatório de consolidação geral
node smoke-cota-visibilidade.mjs        # validação de cota/saldo (unidade, categoria, PCA) e visibilidade de catálogo por unidade
node smoke-item6-10.mjs                 # itens finais de fidelidade ao legado (6-10)
node smoke-recursos-legado.mjs          # demais recursos herdados do sistema anterior
node smoke-fase-a2-cadastros.mjs        # responsável da unidade, edição de categoria/catálogo, rubrica, tipo de bem padrão
```

## Importação em lote

As telas de Unidades, Categorias e Catálogo aceitam upload de planilha
(`.xlsx`, `.xls` ou `.csv`) para cadastro em massa, além do formulário
unitário. Ver `lib/importacao.ts` para o formato esperado de cada uma
(também descrito na própria tela, com modelo para download). CSV com
separador `;` e número no formato brasileiro (`1.234,56`) são detectados
automaticamente.

Usa `exceljs` (não o pacote `xlsx` do npm, que carrega duas vulnerabilidades
altas — prototype pollution e ReDoS — sem correção disponível no registro
do npm; as versões corrigidas só são publicadas no CDN da própria SheetJS).

## Consolidação (Fase 2 — Setor Técnico)

Depois que a PROAD aprova DFDs de várias unidades, o Setor Técnico
responsável por cada categoria consolida os itens iguais numa única linha de
compra (soma as quantidades independente de qual unidade pediu ou de que
enquadramento — OP/Geral/Convênio) para alimentar a licitação (Fase 3).

Regras:

- Uma categoria pertence a no máximo um setor técnico (`Categoria.setorTecnicoId`,
  atribuído pela PROAD na tela de Categorias); um setor pode ter várias
  categorias.
- Agrupamento é por categoria + nome do item (`lib/consolidacao.ts`,
  `agruparPorCategoriaEItem`), não por origem — mas a origem nunca desaparece:
  cada `ItemDfd` some agrupado, mas continua existindo com seu
  `enquadramento` e sua unidade intactos, só ganha uma referência
  (`itemConsolidadoId`) para a linha consolidada. A tela de consolidação
  mostra esse detalhamento por unidade/enquadramento em cada linha — é o que
  o setor de materiais e patrimônio vai precisar para executar a despesa
  depois.
- "Atualizar consolidação" só processa itens ainda não consolidados; nunca
  altera uma linha já **aprovada** — um item aprovado depois cai numa linha
  rascunho separada com a mesma chave, para revisão manual (evita mudar em
  silêncio algo que o setor técnico já validou).
- O Setor Técnico pode renomear uma linha rascunho, mesclar duas linhas
  rascunho da mesma categoria, ou aprovar (trava a edição).

## Deploy

Neon (Postgres) + Vercel, conectado ao GitHub — todo push em `main` builda
e publica automaticamente. O build (`prisma generate && prisma migrate
deploy && next build`) já aplica as migrações pendentes sozinho; não aplica
seed de produção automaticamente (rodar o script de seed manualmente uma
vez, via SQL Editor do Neon, no primeiro deploy).

Variáveis de ambiente (Vercel → Environment Variables, Production +
Preview): `DATABASE_URL` (connection string pooled do Neon, com
`-pooler` no host), `DIRECT_URL` (connection string direta, sem
`-pooler` — é a que o `prisma migrate deploy` usa no build), `AUTH_SECRET`
(uma string aleatória só desta aplicação — `openssl rand -base64 32`).

## Fases implementadas

- **Fase 1** — autenticação, cadastros administrativos (unidades, categorias,
  catálogo, tipificações, prioridades, PCA/parâmetros), wizard de DFD,
  aprovação/reprovação pela PROAD, validação de cota/saldo e visibilidade de
  catálogo por unidade, importação em lote via planilha.
- **Fase 2** — consolidação de itens por Setor Técnico (ver seção acima).
- **Fase 3** — Licitações: máquina de 13 status por consolidação
  (`StatusLicitacaoValor`, de pesquisa de preços a remessa para execução ou
  para o Gestor de Ata), histórico append-only.
- **Fase 4** — Execução (processos por subperfil Obras/Serviços/Materiais e
  Patrimônio, com seu próprio histórico de status) e Entrega de Bens, com
  confirmação/contestação do demandante (aceite tácito em 10 dias).
- **Fase 5** — casos especiais: Gestor de Ata de Registro de Preços
  (solicitação de execução autorizada pela PROAD), Atendimento por Estoque
  (exceção do Patrimônio para itens OP já consolidados) e Troca de Item OP
  (fluxo demandante → PROAD → Patrimônio → PROAD).

Todas as fases têm regras de negócio cobertas por testes (`lib/__tests__/`)
e smoke test end-to-end dedicado (ver seção "Testes").
