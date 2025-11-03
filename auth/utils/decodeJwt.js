const jwt = require('jsonwebtoken');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Cole o token JWT:\n', (token) => {
  try {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded) {
      console.error('Token inválido ou não decodificável.');
    } else {
      const iat = decoded.payload.iat ? decoded.payload.iat : null;
      const exp = decoded.payload.exp ? decoded.payload.exp : null;
      if(iat) {
        decoded.payload.emitido_em = new Date(iat * 1000).toLocaleString('pt-BR');
      }
      if(exp) {
        decoded.payload.expira_em = new Date(exp * 1000).toLocaleString('pt-BR');
      }
      console.log('\nHeader:');
      console.log(decoded.header);
      console.log('\nPayload:');
      console.log(decoded.payload);
      console.log('\n');
    }
  } catch (err) {
    console.error('Erro ao decodificar o token:', err.message);
  } finally {
    rl.close();
  }
});
