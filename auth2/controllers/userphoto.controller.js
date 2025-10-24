const userPhotoService = require("../services/userphoto.service");

const allowedTypes = ["image/jpeg", "image/png"];

const getAll = async (req, res) => {
  try {
    const photos = await userPhotoService.findAll();
    res.json(photos);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar fotos de perfil" });
  }
};

const getById = async (req, res) => {
  try {
    const id = req.params.id; // UUID é string
    const photo = await userPhotoService.findById(id);
    if (!photo) return res.status(204).send();
    res.json(photo);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar foto de perfil" });
  }
};

const upload = async (req, res) => {
  try {
    const id = req.params.id; // UUID é string

    const { originalname, mimetype, buffer } = req.file;
    if (!id || !originalname || !mimetype || !buffer) {
      return res.status(400).json({ error: "Id, Nome, tipo e conteúdo são obrigatórios" });
    }

    // Verifica se o tipo de arquivo é permitido
    if (!allowedTypes.includes(mimetype?.toLowerCase())) {
      return res.status(400).json({ error: "Tipo de arquivo inválido. Apenas JPEG e PNG são suportados." });
    }

    // Verifica o tamanho do arquivo: 16MB = 16 * 1024 * 1024 bytes
    if (buffer.length > 16 * 1024 * 1024) {
      return res.status(400).json({ error: "Arquivo muito grande. Limite de 16MB." });
    }
    
    const result = await userPhotoService.upload(id, {
      name: originalname,
      mime_type: mimetype,
      content: buffer,
    });

    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: "Erro ao salvar foto de perfil", details: err.message });
  }
};

const download = async (req, res) => {
  try {

    const id = req.params.id; // UUID é string
    const photo = await userPhotoService.getContent(id);

    if (!photo) return res.status(204).send();

    res.setHeader("Content-Disposition", `attachment; filename="${photo.name}"`);
    res.setHeader("Content-Type", photo.mime_type);
    res.send(photo.content);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar foto de perfil" });
  }
};

const view = async (req, res) => {
  try {

    const id = req.params.id; // UUID é string
    const photo = await userPhotoService.getContent(id);

    if (!photo) return res.status(204).send();

    res.setHeader("Content-Disposition", `inline; filename="${photo.name}"`);
    res.setHeader("Content-Type", photo.mime_type);
    res.send(photo.content);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar foto de perfil" });
  }
};

const remove = async (req, res) => {
  try {
    const id = req.params.id;
    await userPhotoService.remove(id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Erro ao deletar foto de perfil" });
  }
};

module.exports = {
  getAll,
  getById,
  upload,
  download,
  view,
  remove,
};
