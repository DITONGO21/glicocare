# Manual do Utilizador

O GlicoCare tem três perfis de acesso, cada um com o seu próprio painel e menu lateral:
**Administrador**, **Médico** e **Utente**. Este manual descreve as funcionalidades
principais de cada um.

## Contas de demonstração

Todas as contas usam a password **`Demo1234!`**.

| Perfil | Email |
|---|---|
| Admin | `admin@glicocare.demo` |
| Médica | `dra.ana.silva@glicocare.demo` |
| Médico | `dr.joao.pereira@glicocare.demo` |
| Médica | `dra.marta.costa@glicocare.demo` |
| Utente | `carlos.mendes@glicocare.demo` |
| Utente | `beatriz.fernandes@glicocare.demo` |
| Utente | `rui.santos@glicocare.demo` |
| Utente | `sofia.oliveira@glicocare.demo` |
| Utente | (restantes utentes seguem o padrão `nome.apelido@glicocare.demo`, ver `database/supabase/seed.mjs`) |

Estas contas já têm meses de medições simuladas, o que é útil para testar o calendário,
o diário, os gráficos e as exportações.

---

## Perfil Administrador

O admin gere contas e associações — **não tem acesso a medições, mensagens nem notas
clínicas**, que são dados clínicos/privados reservados a médico e utente.

- **Dashboard**: visão geral de contagens (médicos, utentes, associações ativas).
- **Médicos**: criar, editar e desativar contas de médicos (nome, especialidade, número
  de cédula, telefone).
- **Utentes**: criar, editar e desativar contas de utentes (dados pessoais, tipo de
  diabetes, intervalo-alvo de glicemia).
- **Associações**: ligar um ou mais utentes a um médico responsável (é esta associação
  que determina quais utentes cada médico vê no seu painel).

## Perfil Médico

Um médico só vê os utentes que lhe estão associados pelo admin.

- **Dashboard**: resumo de alertas recentes e medições dos seus utentes.
- **Utentes**: lista dos utentes associados, com acesso ao perfil detalhado de cada um.
- **Perfil do utente** (separadores):
  - *Resumo* — dados pessoais e intervalo-alvo de glicemia.
  - *Histórico* — tabela de todas as medições, com opção de alterar o estado de um
    alerta (Em observação / Resolvido / Ignorado) e botões para **exportar o histórico
    em Excel ou PDF**.
  - *Gráficos* — evolução da glicemia ao longo do tempo.
  - *Análise IA* — análise automática (baseada em regras, não substitui diagnóstico
    médico) por período diário/semanal/mensal.
  - *Mensagens* — conversa direta com o utente.
  - *Notas Clínicas* — notas privadas do médico sobre o utente (nunca visíveis ao admin).
- **Mensagens**: caixa de entrada com todas as conversas dos seus utentes.

## Perfil Utente

- **Dashboard**: última medição, média semanal, contagem de alertas, atalho para gerar
  uma medição simulada (simula a leitura de um sensor ESP32) e análise inteligente do
  período.
- **Registos**: adicionar/editar/remover medições manuais (valor, data/hora, notas).
- **Histórico**: tabela filtrável por intervalo de datas, com botões **Exportar Excel**
  e **Exportar PDF** do histórico de medições (inclui data/hora, valor, origem, estado
  do alerta e notas).
- **Calendário**: vista mensal em que cada dia mostra o número de medições, a média
  diária e uma cor (verde/amarelo/vermelho) conforme o estado predominante das medições
  desse dia. Clicar num dia abre os detalhes de todas as medições desse dia.
- **Diário**: as medições apresentadas em formato cronológico tipo "diário", agrupadas
  por dia com hora, valor, origem, observações e estado — uma forma mais narrativa de
  rever o histórico do que a tabela do Histórico.
- **Mensagens**: conversa direta com o médico associado.

## Notas gerais

- A "Análise Inteligente" é uma simulação baseada em regras simples sobre os valores
  registados — **não é um diagnóstico médico** e não substitui aconselhamento clínico.
- Os alertas (Em observação, Resolvido, Ignorado) refletem apenas se um valor saiu do
  intervalo-alvo definido para o utente; a gestão do alerta é feita pelo médico.
- As exportações (Excel/PDF) são geradas inteiramente no browser — não são enviados
  dados para nenhum servidor externo além do que já é usado pela aplicação.
