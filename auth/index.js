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
const userPropertyRoutes = require("./routes/userProperty.routes");

const app = express();
const API_PORT = process.env.API_PORT || 5000;
const API_PREFIX = process.env.API_PREFIX || "/api/v1";

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.get("/health", (_req, res) => res.json({ ok: false }));

app.use(`${API_PREFIX}/actions`, actionRoutes);
app.use(`${API_PREFIX}/modules`, moduleRoutes);
app.use(`${API_PREFIX}/roles`, roleRoutes);
app.use(`${API_PREFIX}/systemroles`, systemRoleRoutes);
app.use(`${API_PREFIX}/permissions`, permissionRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/documents`, documentRoutes);
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/userphotos`, userPhotoRoutes);
app.use(`${API_PREFIX}/user-properties`, userPropertyRoutes);

// Inicializa o Super Admin antes do servidor rodar
initSuperAdmin()
  .then(() => {
    app.listen(API_PORT, () => console.log(`Servidor rodando na porta ${API_PORT}`));
  })
  .catch(err => {
    console.error('Erro ao criar o Super Admin:', err);
    process.exit(1); // encerra a aplicação se algo der errado
});
