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

Três tabelas de login, sem hierarquia entre si — o email decide qual:

- `Usuario` — PROAD (admin): aprova/reprova DFDs, cadastra PCA, categorias,
  catálogo, unidades, tipificações, prioridades e setores técnicos.
- `Unidade` — unidade demandante: cria e edita seus próprios DFDs (rascunho
  ou reprovado), nunca vê ou edita dados de outra unidade.
- `SetorTecnico` — consolida, para as categorias atribuídas a ele pela PROAD,
  os itens dos DFDs aprovados de todas as unidades (ver "Consolidação"
  abaixo).

Toda ação de servidor (`lib/actions/*.ts`) começa checando a sessão
(`exigirAdmin()` / `exigirUnidade()` / `exigirSetorTecnico()`), e toda ação
que mexe num DFD ou numa consolidação confirma que ele pertence à
unidade/setor logado antes de ler ou escrever.

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
node smoke-pca.mjs       # fluxo completo: login → DFD → aprovação
node smoke-import.mjs    # importação em lote de unidades/categorias/catálogo
node smoke-fase2.mjs     # consolidação por setor técnico (roda smoke-pca.mjs antes)
node smoke-fase-a2-cadastros.mjs  # responsável da unidade, edição de categoria/catálogo, rubrica, tipo de bem padrão
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

## Roadmap

Fase 1 (autenticação, cadastros administrativos, wizard de DFD e aprovação
da PROAD) e Fase 2 (consolidação por Setor Técnico) prontas. Fases seguintes
(licitação — máquina de 13 status, execução, entrega de bens, ata de
registro de preços, casos especiais) ainda não foram iniciadas.
