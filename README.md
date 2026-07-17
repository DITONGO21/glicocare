# GlicoCare — Sistema Inteligente de Monitorização de Glicemia

GlicoCare é uma aplicação web para monitorização de glicemia capilar, com três perfis de
acesso — **Utente**, **Médico** e **Administrador** — cada um com o seu próprio painel.
Projeto desenvolvido no âmbito da PAP (Prova de Aptidão Profissional).

🔗 Em produção: [glicocare.netlify.app](https://glicocare.netlify.app)

## Funcionalidades principais

- **Medições de glicemia**: registo manual ou por simulação de sensor ESP32, histórico
  filtrável, calendário mensal, diário cronológico e exportação para Excel/PDF.
- **Análise inteligente**: resumo automático baseado em regras sobre os valores
  registados (diário/semanal/mensal) — não substitui diagnóstico médico.
- **Consultas**: o utente **requisita** uma consulta (fica `Pendente`); o médico
  **aprova** (podendo ajustar data/hora/local), **recusa** ou marca como realizada.
- **Medicação**: registo de medicamentos com dosagem, frequência e período.
- **Mensagens**: conversa direta entre médico e utente associado.
- **Notas clínicas**: notas privadas do médico sobre o utente (nunca visíveis ao admin).
- **Notificações push** e **login biométrico** (WebAuthn — impressão digital/Face
  ID/Windows Hello), além do login normal por email/password.
- **Gestão administrativa**: o admin cria/edita/desativa contas de médicos e utentes e
  gere as associações médico-utente — sem acesso a dados clínicos (medições, mensagens,
  notas), que são exclusivos de médico e utente.
- **Perfil**: cada utilizador pode alterar nome, email, password e fotografia (upload por
  ficheiro ou colar com Ctrl+V), com pré-visualização em tamanho maior.

Ver o [Manual do Utilizador](docs/MANUAL_UTILIZADOR.md) para uma descrição detalhada por
perfil, e as [contas de demonstração](docs/MANUAL_UTILIZADOR.md#contas-de-demonstração)
para testar a aplicação.

## Tecnologias usadas e porquê

| Camada | Tecnologia | Porquê |
|---|---|---|
| Frontend | React 19 + Vite + TypeScript | SPA rápida, tipagem forte, HMR instantâneo |
| Estilo | Tailwind CSS v4 + componentes shadcn/ui (sobre `@base-ui/react`) | consistência visual, acessibilidade dos primitivos, produtividade |
| Estado servidor | TanStack Query | cache, invalidação e loading/error states sem código repetido |
| Dados/Auth | Supabase (Postgres + Auth + RLS) | backend-as-a-service hospedado; Row Level Security garante isolamento de dados por utilizador sem precisar de uma API própria |
| Operações admin | Netlify Functions | criar utilizadores exige a `service_role key` do Supabase, que nunca pode estar no browser — as functions correm no servidor da Netlify e escondem essa chave |
| Deploy | Netlify (build automático a cada push para `main`) | grátis, simples, integra bem com Vite |
| Backend .NET | ASP.NET Core, Clean Architecture (Domain/Application/Infrastructure/API) | demonstra conhecimentos de arquitetura em camadas e boas práticas de API REST — construído como peça curricular da PAP, mas **não está em produção** (ver [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md)) |

## Estrutura de pastas

```
PAP/
├── frontend/            Aplicação React (produção — é o que corre em glicocare.netlify.app)
│   ├── src/
│   │   ├── pages/         Páginas por rota (Admin*, Medico*, Utente*)
│   │   ├── components/    Componentes reutilizáveis, incl. components/ui (shadcn/base-ui)
│   │   ├── hooks/         Hooks TanStack Query por domínio (measurements, appointments, ...)
│   │   ├── services/      Chamadas Supabase (auth, medições, consultas, mensagens...)
│   │   ├── layouts/       AppLayout (sidebar + navegação responsiva)
│   │   ├── context/       AuthContext
│   │   └── utils/         Funções auxiliares (export PDF/Excel, roleHome, etc.)
│   └── netlify/functions/ Netlify Functions (operações administrativas privilegiadas)
├── backend/              API .NET (Clean Architecture) — peça de arquitetura demonstrativa,
│                         NÃO está em produção (ver docs/ARQUITETURA.md)
├── database/supabase/    Schema SQL, políticas RLS e script de seed de dados de demonstração
├── docs/                 Documentação detalhada do projeto
└── netlify.toml          Configuração de deploy (base = frontend)
```

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

A base de dados corre num projeto Supabase próprio — para replicar o schema, aplica por
ordem os ficheiros em `database/supabase/*.sql`. Para popular com dados de demonstração,
ver `database/supabase/seed.mjs` (requer a `service_role key`, nunca comitada).

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
arquitetura da PAP (ver [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md)).

## Documentação

- [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md) — arquitetura atual do sistema
- [`docs/BASE_DE_DADOS.md`](docs/BASE_DE_DADOS.md) — modelo de dados e políticas de RLS
- [`docs/MANUAL_UTILIZADOR.md`](docs/MANUAL_UTILIZADOR.md) — manual por perfil de utilizador e contas de demonstração
