# Etapa 1: build (compila TS para JS)
FROM node:20-alpine3.21 AS builder

# Atualiza pacotes do sistema
RUN apk upgrade --no-cache

# Diretório de trabalho
WORKDIR /usr/src/app

# Copia arquivos de dependência
COPY package*.json ./
COPY tsconfig*.json ./

# Instala TODAS dependências (inclui devDependencies: typescript, tsx, etc.)
RUN npm install

# Copia o restante do código (TS)
COPY src ./src

# Compila TypeScript para dist/
RUN npm run build


# Etapa 2: runtime (imagem final, mais enxuta)
FROM node:20-alpine3.21

# Atualiza pacotes
RUN apk upgrade --no-cache

WORKDIR /usr/src/app

# Copia apenas package.json/package-lock para instalar deps de produção
COPY package*.json ./

# Instala apenas dependências de produção
RUN npm install --omit=dev

# Copia o build já compilado da etapa anterior
COPY --from=builder /usr/src/app/dist ./dist

# Ambiente de produção
ENV NODE_ENV=production

# Porta padrão do serviço mongo (ajuste se for outra)
EXPOSE 3001

# Comando para iniciar a aplicação
CMD ["npm", "start"]
