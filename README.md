# RotinaFit

Aplicativo para controle de treinos e hábitos, com foco em disciplina e constância.

**Alunos:** Davi Fernandes Almeida, Luis Felype Lino Paixão, Pedro Henrique Soares Barbosa, Igor Pinto Soares

**Versão online:** https://rotinafit-eight.vercel.app

---

## O que o app faz

- Cadastro e login de usuário
- Planejamento de treinos por dia da semana
- Cadastro e execução de exercícios (marcação de progresso)
- Check-in diário com sequência (streak)
- Checklist diário de hábitos
- Grupos de treino com código de convite
- Estatísticas semanais e histórico

---

## Tecnologias

| Tecnologia | Uso no projeto |
|---|---|
| **React Native** | Interface do app |
| **Expo** | Ambiente e build |
| **Expo Router** | Navegação entre telas |
| **TypeScript** | Tipagem do código |
| **Supabase** | Banco de dados e autenticação |
| **Context API** | Estado global (usuário logado) |
| **Vercel** | Deploy da versão web |

---

## Como rodar no computador

### 1. Pré-requisitos

- [Node.js](https://nodejs.org) instalado (versão 18 ou superior)
- Conta no Supabase (banco já configurado pelo grupo)

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
EXPO_PUBLIC_SUPABASE_URL=sua_url_do_supabase
EXPO_PUBLIC_SUPABASE_KEY=sua_chave_publica_do_supabase
```

> As chaves ficam no painel do Supabase em **Project Settings → API**.

### 4. Iniciar o app

```bash
npm start
```

Depois escolha:

- **`w`** → abre no navegador (web)
- **`a`** → abre no emulador Android
- **`i`** → abre no simulador iOS

Ou direto no navegador:

```bash
npm run web
```

---

## Estrutura do projeto

```
app/                  → Telas (Expo Router)
  (auth)/             → Login, cadastro, recuperar senha
  (tabs)/             → Abas principais (início, treinos, hábitos...)
  groups/             → Detalhe do grupo
  workout/            → Detalhe e criação de treino

src/
  components/         → Componentes reutilizáveis (Button, Card, Input...)
  context/            → Context API (autenticação)
  database/
    repositories/     → Funções de acesso ao Supabase
  interfaces/         → Tipos TypeScript
  lib/                → Configuração do Supabase
  utils/              → Funções auxiliares (tema, erros, streak...)
```

---

## Funcionalidades por tela

| Tela | Função |
|---|---|
| **Início** | Resumo do dia, checklist de hábitos, atalhos |
| **Treinos** | Lista e criação de treinos por dia |
| **Check-in** | Registro diário com sequência |
| **Hábitos** | Checklist diário e metas semanais |
| **Grupos** | Criar/entrar em grupo por código |
| **Estatísticas** | Gráficos e histórico |
| **Perfil** | Dados pessoais e lembretes |

---

## Deploy (web)

O app web é publicado na Vercel. O build usa:

```bash
npm run build:web
```

A pasta gerada é `dist/`, configurada no `vercel.json`.

---

## Repositório

https://github.com/DevLust/rotinafit
