# Base de Dados

Postgres (Supabase). Schema completo em `database/supabase/001_schema.sql`, políticas de
Row Level Security em `database/supabase/002_rls_policies.sql`, dados de demonstração em
`database/supabase/seed.mjs`.

## Diagrama entidade-relação

```mermaid
erDiagram
    PROFILES ||--o| DOCTORS : "1:1 (user_id)"
    PROFILES ||--o| PATIENTS : "1:1 (user_id)"
    DOCTORS ||--o{ DOCTOR_PATIENTS : tem
    PATIENTS ||--o{ DOCTOR_PATIENTS : tem
    PATIENTS ||--o{ GLUCOSE_MEASUREMENTS : regista
    DOCTORS ||--o{ CONVERSATIONS : participa
    PATIENTS ||--o{ CONVERSATIONS : participa
    CONVERSATIONS ||--o{ MESSAGES : contém
    PROFILES ||--o{ MESSAGES : envia
    DOCTORS ||--o{ MEDICAL_NOTES : escreve
    PATIENTS ||--o{ MEDICAL_NOTES : "é sobre"
    PATIENTS ||--o{ AI_REPORTS : gera
    PROFILES ||--o{ NOTIFICATIONS : recebe
    PROFILES ||--o{ ACTIVITY_LOGS : gera

    PROFILES {
        uuid id PK "= auth.users.id"
        text full_name
        text email UK
        text role "Admin | Doctor | Patient"
        boolean is_active
        timestamptz last_login_at
    }
    DOCTORS {
        uuid id PK
        uuid user_id FK "-> profiles.id"
        text license_number
        text specialty
        text phone_number
    }
    PATIENTS {
        uuid id PK
        uuid user_id FK "-> profiles.id"
        date date_of_birth
        text diabetes_type
        double target_glucose_min
        double target_glucose_max
    }
    DOCTOR_PATIENTS {
        uuid id PK
        uuid doctor_id FK
        uuid patient_id FK
        timestamptz assigned_at
        boolean is_active
    }
    GLUCOSE_MEASUREMENTS {
        uuid id PK
        uuid patient_id FK
        double value_mg_dl
        timestamptz measured_at
        text source "Manual | ESP32Simulado"
        text notes
        text alert_status "None | Resolved | UnderObservation | Ignored"
    }
    CONVERSATIONS {
        uuid id PK
        uuid doctor_id FK
        uuid patient_id FK
        boolean is_archived
    }
    MESSAGES {
        uuid id PK
        uuid conversation_id FK
        uuid sender_user_id FK
        text content
        text status "Unread | Read"
    }
    MEDICAL_NOTES {
        uuid id PK
        uuid doctor_id FK
        uuid patient_id FK
        text content
    }
    AI_REPORTS {
        uuid id PK
        uuid patient_id FK
        text type "Daily | Weekly | Monthly"
        text summary
        text recommendations
        timestamptz reference_date
    }
    NOTIFICATIONS {
        uuid id PK
        uuid user_id FK
        text type
        text title
        text message
        boolean is_read
    }
    ACTIVITY_LOGS {
        uuid id PK
        uuid user_id FK
        text action
        text details
    }
```

## Tabelas

- **profiles** — espelha `auth.users` 1:1 (o `id` é o mesmo). Guarda nome, email, `role`
  (Admin/Doctor/Patient) e estado da conta.
- **doctors** / **patients** — dados de perfil específicos de cada papel, ligados a
  `profiles` por `user_id`.
- **doctor_patients** — associação muitos-para-muitos entre médicos e utentes; é o admin
  quem cria/gere estas associações.
- **glucose_measurements** — cada leitura de glicemia de um utente: valor, momento,
  origem (`Manual` ou `ESP32Simulado`), notas e `alert_status` calculado
  automaticamente com base no intervalo-alvo do utente.
- **conversations** / **messages** — mensagens diretas entre um médico e um utente
  associados; uma conversa por par médico-utente.
- **medical_notes** — notas clínicas privadas, escritas por um médico sobre um utente.
- **ai_reports** — resultado da "análise inteligente" (simulação baseada em regras, não
  um modelo de ML real) por período (diário/semanal/mensal).
- **notifications** — notificações in-app por utilizador.
- **activity_logs** — registo de auditoria simples por utilizador.

Todas as tabelas têm `created_at`/`updated_at` (com trigger automático) e `deleted_at`
para soft-delete.

## Políticas de RLS mais importantes

RLS está ativo em todas as tabelas. Regras centrais (ver `002_rls_policies.sql` para o
detalhe completo):

- **O admin nunca vê mensagens nem notas clínicas.** Não existe nenhuma policy de
  `select`/`all` para Admin em `conversations`, `messages` ou `medical_notes` — só
  médico (participante/autor) e utente (participante, apenas mensagens) têm acesso.
  Isto é uma regra de negócio explícita da especificação: dados clínicos/privados ficam
  fora do alcance da administração.
- **O admin também não vê `glucose_measurements`.** Só o próprio utente e o(s) médico(s)
  associados a ele têm acesso — o admin gere contas e associações, não dados clínicos.
- **Um médico só vê os utentes que lhe estão associados** (via `doctor_patients` com
  `is_active = true`), tanto para `patients`, `profiles`, medições, mensagens e notas.
- **Um médico só pode alterar o `alert_status` de uma medição**, nunca o valor ou as
  notas — a policy de update permite a linha, mas a aplicação só envia `alert_status` no
  pedido (a restrição de coluna é reforçada na camada de aplicação, não apenas na BD).
- **Um utente só acede aos seus próprios dados** (medições, perfil, conversas onde é
  participante).
- **`activity_logs`**: o admin vê tudo (auditoria); cada utilizador só vê o seu próprio
  registo.
