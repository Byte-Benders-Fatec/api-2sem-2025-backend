const express = require("express");
const cors = require("cors");
require("dotenv").config();
const initSuperAdmin = require('./utils/initSuperAdmin');

const actionRoutes = require("./routes/action.routes");
const moduleRoutes = require("./routes/module.routes");
const roleRoutes = require("./routes/role.routes");
const systemRoleRoutes = require("./routes/systemrole.routes");
const permissionRoutes = require("./routes/permission.routes");
const userRoutes = require("./routes/user.routes");
const documentRoutes = require("./routes/document.routes");
const authRoutes = require('./routes/auth.routes');
const userPhotoRoutes = require("./routes/userphoto.routes");

const app = express();
const PORT = process.env.API_PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/actions", actionRoutes);
app.use("/modules", moduleRoutes);
app.use("/roles", roleRoutes);
app.use("/systemroles", systemRoleRoutes);
app.use("/permissions", permissionRoutes);
app.use("/users", userRoutes);
app.use("/documents", documentRoutes);
app.use('/auth', authRoutes);
app.use("/userphotos", userPhotoRoutes);

// Inicializa o Super Admin antes do servidor rodar
initSuperAdmin()
  .then(() => {
    app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
  })
  .catch(err => {
    console.error('Erro ao criar o Super Admin:', err);
    process.exit(1); // encerra a aplicação se algo der errado
});
