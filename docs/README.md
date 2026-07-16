# GlicoCare — Sistema Inteligente de Monitorização de Glicemia

GlicoCare é um sistema web para monitorização de glicemia capilar, pensado para três
perfis de utilizador: **Utente** (doente), **Médico** e **Administrador**. Permite
registar medições de glicemia (manualmente ou via simulação de um sensor ESP32),
acompanhar tendências, gerar análises automáticas simples, trocar mensagens
médico-utente, e gerir contas/associações a partir do painel de administração.

Este documento dá uma visão geral do projeto. Ver também:

- [`ARQUITETURA.md`](./ARQUITETURA.md) — arquitetura atual do sistema
- [`BASE_DE_DADOS.md`](./BASE_DE_DADOS.md) — modelo de dados e políticas de RLS
- [`MANUAL_UTILIZADOR.md`](./MANUAL_UTILIZADOR.md) — manual por perfil de utilizador

## Estrutura de pastas

```
PAP/
├── frontend/            Aplicação React (produção — é o que corre em glicocare.netlify.app)
│   ├── src/
│   │   ├── pages/        Páginas por rota (Admin*, Medico*, Utente*)
│   │   ├── components/   Componentes reutilizáveis, incl. components/ui (shadcn/base-ui)
│   │   ├── hooks/         Hooks TanStack Query por domínio (measurements, patients, ...)
│   │   ├── services/      Chamadas Supabase (auth, medições, mensagens, notas clínicas...)
│   │   ├── layouts/        AppLayout (sidebar + navegação responsiva)
│   │   ├── context/         AuthContext
│   │   └── utils/            Funções auxiliares (export PDF/Excel, roleHome, etc.)
│   └── netlify/functions/  Netlify Functions (operações administrativas privilegiadas)
├── backend/              API .NET (Clean Architecture) — peça de arquitetura demonstrativa,
│                          NÃO está em produção (ver ARQUITETURA.md)
├── database/supabase/    Schema SQL, políticas RLS e script de seed de dados de demonstração
├── docs/                 Este conjunto de documentos
└── netlify.toml           Configuração de deploy (base = frontend)
```

## Tecnologias usadas e porquê

| Camada | Tecnologia | Porquê |
|---|---|---|
| Frontend | React 19 + Vite + TypeScript | SPA rápida, tipagem forte, HMR instantâneo |
| Estilo | Tailwind CSS v4 + componentes shadcn/ui (sobre `@base-ui/react`) | consistência visual, acessibilidade dos primitivos, produtividade |
| Estado servidor | TanStack Query | cache, invalidação e loading/error states sem código repetido |
| Dados/Auth | Supabase (Postgres + Auth + RLS) | backend-as-a-service gratuito/hospedado, Row Level Security garante isolamento de dados por utilizador sem precisar de uma API própria |
| Operações admin | Netlify Functions | criar utilizadores exige a `service_role key` do Supabase, que nunca pode estar no browser — as functions correm no servidor da Netlify e escondem essa chave |
| Deploy | Netlify (build automático a cada push para `main`) | grátis, simples, integra bem com Vite |
| Backend .NET | ASP.NET Core, Clean Architecture (Domain/Application/Infrastructure/API) | demonstra conhecimentos de arquitetura em camadas, DDD leve e boas práticas de API REST — construído como parte curricular da PAP, mas **não está em produção** (ver ARQUITETURA.md) |

## Como correr localmente

### Frontend (obrigatório)

```bash
cd frontend
npm install
npm run dev       # http://localhost:5173
```

Precisa de um ficheiro `.env.local` (ou `.env`) com as credenciais do projeto Supabase:

```
VITE_SUPABASE_URL=https://<projeto>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key pública>
```

A base de dados já está criada na instância Supabase de produção (ver
`database/supabase/001_schema.sql` e `002_rls_policies.sql`). Para popular com dados de
demonstração, ver `database/supabase/seed.mjs` (requer a `service_role key`, nunca
comitada).

### Build de produção

```bash
cd frontend
npm run build      # gera frontend/dist
```

### Backend .NET (opcional — arquitetura de referência, não necessário para correr o site)

```bash
cd backend
dotnet build
dotnet run --project src/GlicoCare.API
```

O backend .NET não é chamado pelo frontend em produção; está congelado como peça de
arquitetura da PAP (ver `docs/ARQUITETURA.md`).

## Contas de demonstração

Ver `docs/MANUAL_UTILIZADOR.md` para a lista de contas de teste (password comum
`Demo1234!`) criadas por `database/supabase/seed.mjs`.
