# sistema-visiona-api

## Dependências
### Obrigatórias
- [Node](https://nodejs.org/en/download)

### Opcionais
- [Postman](https://www.postman.com/downloads/)


## Instalação
### 1. Acessando o Projeto: 
Clonar o projeto _**sistema-visiona-api**_ pelo terminal digitando:
```bash
git clone https://github.com/Byte-Benders-Fatec/api-2sem-2025-backend.git
```

### 2. Instalação das dependências:
Após clonar o projeto, efetue a instalação das dependências digitando no terminal:
```bash
npm install
```

### 3. Configurar variáveis de ambiente:
Para configurar as variáveis de ambiente, crie um arquivo com o nome `.env` e copie o conteúdo do arquivo `.env.example` e cole dentro dele, ou peça para alguém do time enviar o arquivo `.env`.

### 4. Configurar o banco de dados:
Inicie e configure o banco de dados localmente.

### 5. Rodar as migrations:
Para rodar as migrations do projeto, execute no terminal:
```bash
npm run migrations:run
```

### 6. Rodar o projeto:
Para rodar o projeto, no terminal:
```bash
npm run dev
```

## Migrations
Como rodar as migrations:
```bash
npm run migrations:run
```

Como gerar as migrations automaticamente:
```bash
npm run migrations:generate "nome_da_migration"
```

Como reverter a última migration executada:
```bash
npm run migrations:revert
```

## Documentação
Para acessar a documentação da API utilize o Postman e importe todos os arquivos dentro de `docs/postman`.


## Dicas
- Para pular a autenticação, vá ao arquivo `.env` e altere a variável `SKIP_AUTH` para `true`.