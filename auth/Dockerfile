# Imagem base leve com Node
FROM node:20-alpine3.21

# Atualiza pacotes do sistema para corrigir vulnerabilidades
RUN apk upgrade --no-cache

# Diretório de trabalho dentro do container
WORKDIR /usr/src/app

# Copia apenas os arquivos de dependências primeiro (melhora cache)
COPY package*.json ./

# Instala apenas dependências de produção
RUN npm install --omit=dev

# Copia o restante do código do backend
COPY . .

# Define o ambiente como produção
ENV NODE_ENV=production

# Porta usada pelo serviço auth (ajuste se for diferente)
EXPOSE 5000

# Comando padrão para iniciar a aplicação
CMD ["npm", "start"]
