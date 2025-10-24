const documentService = require("../services/document.service");

const getAll = async (req, res) => {
  try {
    const documents = await documentService.findAll();
    res.json(documents);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar documento" });
  }
};

const getById = async (req, res) => {
  try {
    const id = req.params.id; // UUID é string
    const document = await documentService.findById(id);
    if (!document) return res.status(404).json({ message: "Documento não encontrado" });
    res.json(document);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar documento" });
  }
};

const upload = async (req, res) => {
  try {
    const { originalname, mimetype, buffer } = req.file;
    if (!originalname || !mimetype || !buffer) {
      return res.status(400).json({ error: "Nome, tipo e conteúdo são obrigatórios" });
    }

    // Verifica o tamanho do arquivo: 16MB = 16 * 1024 * 1024 bytes
    if (buffer.length > 16 * 1024 * 1024) {
      return res.status(400).json({ error: "Arquivo muito grande. Limite de 16MB." });
    }
    
    const result = await documentService.create({
      name: originalname,
      mime_type: mimetype,
      content: buffer,
    });

    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: "Erro ao salvar documento", details: err.message });
  }
};

const download = async (req, res) => {
  try {

    const id = req.params.id; // UUID é string
    const document = await documentService.getContent(id);

    if (!document) return res.status(404).json({ error: "Documento não encontrado" });

    res.setHeader("Content-Disposition", `attachment; filename="${document.name}"`);
    res.setHeader("Content-Type", document.mime_type);
    res.send(document.content);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar documento" });
  }
};

const view = async (req, res) => {
  try {

    const id = req.params.id; // UUID é string
    const document = await documentService.getContent(id);

    if (!document) return res.status(404).json({ error: "Documento não encontrado" });

    res.setHeader("Content-Disposition", `inline; filename="${document.name}"`);
    res.setHeader("Content-Type", document.mime_type);
    res.send(document.content);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar documento" });
  }
};

const update = async (req, res) => {
  const id = req.params.id;
  const { name, is_active } = req.body;

  try {
    const result = await documentService.update(id, { name, is_active });
    res.status(200).json({ message: "Documento atualizado com sucesso", result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const id = req.params.id;
    await documentService.remove(id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Erro ao deletar documento" });
  }
};

module.exports = {
  getAll,
  getById,
  upload,
  download,
  view,
  update,
  remove,
};
