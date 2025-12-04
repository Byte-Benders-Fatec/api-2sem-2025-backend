# api-2sem-2025-backend

Repositório destinado ao grupo **Byte Benders** para desenvolvimento do backend da API do quinto semestre de ADS.

Este backend é composto por **dois serviços separados**:

- `auth` – Responsável pela autenticação de usuários e conexão com o banco **MySQL**.  
- `mongo` – Responsável pela integração com o banco **MongoDB Atlas** (nuvem).

Ambos são aplicações Node.js independentes, mas trabalham em conjunto para atender o aplicativo mobile **Rural CAR**.

---

## 📁 Estrutura do projeto

```
api-2sem-2025-backend/
├── auth/   # Backend de autenticação (MySQL)
└── mongo/  # Backend de integração com MongoDB Atlas
```

Cada pasta (`auth` e `mongo`) possui seu próprio `package.json`, `.env.example` e scripts de execução.

---

## ✅ Pré-requisitos

Antes de rodar os serviços, certifique-se de ter instalado:

- Node.js (versão LTS recomendada)
- npm (vem junto com o Node.js)
- Acesso às credenciais:
  - Banco **MySQL** (para o serviço `auth`)
  - Cluster **MongoDB Atlas** (para o serviço `mongo`)

---

## ⚙️ Configuração do serviço `mongo`

1. Acesse a pasta:

```
cd mongo
```

2. Crie seu arquivo `.env`:

```
cp .env.example .env
```

3. Preencha as variáveis no `.env`.

4. Instale dependências:

```
npm install
```

5. Execute:

```
npm run dev
```

Rodando por padrão em: `http://localhost:3001`

---

## 🔐 Configuração do serviço `auth`

1. Acesse a pasta:

```
cd auth
```

2. Crie o arquivo `.env`:

```
cp .env.example .env
```

3. Preencha as variáveis (MySQL, JWT, etc.).

4. Instale dependências:

```
npm install
```

5. Execute:

```
npm run dev
```

Rodando por padrão em: `http://localhost:5000`

---

## 🚀 Rodando os dois serviços simultaneamente

1. Abra dois terminais.

2. No primeiro:

```
cd mongo
npm run dev
```

3. No segundo:

```
cd auth
npm run dev
```

---

## 🧩 Variáveis de ambiente

Cada serviço possui seu próprio `.env.example`.  
Crie o `.env` assim:

```
cp .env.example .env
```

---

## 🛠 Scripts comuns

- `npm install` — instala dependências  
- `npm run dev` — executa em modo desenvolvedor  

---

## ❗ Possíveis Problemas

- **MySQL não conecta:** verifique host, porta, usuário e senha.  
- **MongoDB Atlas não conecta:** confirme a URI e o IP liberado no painel do Atlas.  
