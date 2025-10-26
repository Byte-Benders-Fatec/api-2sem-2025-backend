const userPropertyService = require("../services/userProperty.service");
const axios = require("axios");

const MONGO_SERVICE_URL = process.env.MONGO_SERVICE_URL || "http://localhost:3001/api/v1";
const MONGO_API_KEY = process.env.MONGO_API_KEY;

const userPropertyController = {
  // Lista todas as propriedades do usuário logado
  getMyProperties: async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }

      const properties = await userPropertyService.findByUserId(userId);
      return res.status(200).json(properties);
    } catch (error) {
      console.error("Erro ao buscar propriedades:", error);
      return res.status(500).json({ 
        error: "Erro ao buscar propriedades",
        details: error.message 
      });
    }
  },

  // Salva múltiplas propriedades vindas do frontend (nova arquitetura)
  bulkSave: async (req, res) => {
    try {
      const userId = req.user?.id;
      const { properties } = req.body;

      if (!userId) {
        return res.status(401).json({ 
          error: "Usuário não autenticado" 
        });
      }

      if (!properties || !Array.isArray(properties)) {
        return res.status(400).json({ 
          error: "Lista de propriedades é obrigatória" 
        });
      }

      // Salva as propriedades no MySQL
      const savedProperties = await userPropertyService.bulkCreateFromMongo(
        userId,
        properties
      );

      return res.status(200).json(savedProperties);

    } catch (error) {
      console.error("Erro ao salvar propriedades:", error);
      return res.status(500).json({ 
        error: "Erro ao salvar propriedades",
        details: error.message 
      });
    }
  },

  // Busca uma propriedade específica por ID
  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const property = await userPropertyService.findById(id);

      if (!property) {
        return res.status(404).json({ error: "Propriedade não encontrada" });
      }

      // Verifica se a propriedade pertence ao usuário
      if (property.owner_user_id !== userId) {
        return res.status(403).json({ error: "Acesso negado a esta propriedade" });
      }

      return res.status(200).json(property);
    } catch (error) {
      console.error("Erro ao buscar propriedade:", error);
      return res.status(500).json({ 
        error: "Erro ao buscar propriedade",
        details: error.message 
      });
    }
  },

  // Atualiza uma propriedade
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const { display_name, registry_number } = req.body;

      const property = await userPropertyService.findById(id);

      if (!property) {
        return res.status(404).json({ error: "Propriedade não encontrada" });
      }

      // Verifica se a propriedade pertence ao usuário
      if (property.owner_user_id !== userId) {
        return res.status(403).json({ error: "Acesso negado a esta propriedade" });
      }

      const updated = await userPropertyService.update(id, {
        displayName: display_name,
        registryNumber: registry_number
      });

      return res.status(200).json(updated);
    } catch (error) {
      console.error("Erro ao atualizar propriedade:", error);
      return res.status(500).json({ 
        error: "Erro ao atualizar propriedade",
        details: error.message 
      });
    }
  },

  // Remove uma propriedade (soft delete)
  remove: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const property = await userPropertyService.findById(id);

      if (!property) {
        return res.status(404).json({ error: "Propriedade não encontrada" });
      }

      // Verifica se a propriedade pertence ao usuário
      if (property.owner_user_id !== userId) {
        return res.status(403).json({ error: "Acesso negado a esta propriedade" });
      }

      await userPropertyService.softDelete(id);

      return res.status(200).json({ 
        message: "Propriedade removida com sucesso" 
      });
    } catch (error) {
      console.error("Erro ao remover propriedade:", error);
      return res.status(500).json({ 
        error: "Erro ao remover propriedade",
        details: error.message 
      });
    }
  },

  // Busca detalhes completos de uma propriedade no serviço mongo
  getMongoDetails: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const property = await userPropertyService.findById(id);

      if (!property) {
        return res.status(404).json({ error: "Propriedade não encontrada" });
      }

      // Verifica se a propriedade pertence ao usuário
      if (property.owner_user_id !== userId) {
        return res.status(403).json({ error: "Acesso negado a esta propriedade" });
      }

      if (!MONGO_API_KEY) {
        return res.status(500).json({ 
          error: "Configuração do servidor incompleta (MONGO_API_KEY não definida)" 
        });
      }

      // Busca detalhes completos no serviço mongo
      const mongoResponse = await axios.get(
        `${MONGO_SERVICE_URL}/imoveis/${property.mongo_property_id}`,
        {
          headers: {
            "x-api-key": MONGO_API_KEY
          }
        }
      );

      return res.status(200).json({
        ...property,
        mongo_details: mongoResponse.data
      });

    } catch (error) {
      console.error("Erro ao buscar detalhes da propriedade:", error);
      
      if (error.response) {
        return res.status(error.response.status).json({
          error: "Erro ao buscar detalhes no serviço de imóveis",
          details: error.response.data
        });
      }

      return res.status(500).json({ 
        error: "Erro ao buscar detalhes da propriedade",
        details: error.message 
      });
    }
  }
};

module.exports = userPropertyController;

