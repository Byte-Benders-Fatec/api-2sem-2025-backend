const { db, queryAsync } = require("../configs/db");

const userPropertyService = {
  // Busca todas as propriedades de um usuário
  findByUserId: async (userId) => {
    const [results] = await queryAsync(
      "SELECT * FROM property WHERE owner_user_id = ? AND is_active = 1 ORDER BY created_at DESC",
      [userId]
    );
    return results;
  },

  // Busca uma propriedade específica por ID
  findById: async (id) => {
    const [results] = await queryAsync(
      "SELECT * FROM property WHERE id = ?",
      [id]
    );
    return results[0];
  },

  // Busca uma propriedade pelo mongo_property_id e owner_user_id
  findByMongoIdAndUserId: async (mongoPropertyId, userId) => {
    const [results] = await queryAsync(
      "SELECT * FROM property WHERE mongo_property_id = ? AND owner_user_id = ?",
      [mongoPropertyId, userId]
    );
    return results[0];
  },

  // Cria uma nova propriedade para o usuário
  create: async ({ mongoPropertyId, ownerUserId, displayName, registryNumber }) => {
    // Verifica se já existe
    const existing = await userPropertyService.findByMongoIdAndUserId(mongoPropertyId, ownerUserId);
    if (existing) {
      // Se já existe mas está inativa, reativa
      if (!existing.is_active) {
        return await userPropertyService.reactivate(existing.id);
      }
      return existing;
    }

    const [result] = await queryAsync(
      `INSERT INTO property 
       (mongo_property_id, owner_user_id, display_name, registry_number, is_active, created_at, updated_at) 
       VALUES (?, ?, ?, ?, 1, NOW(), NOW())`,
      [mongoPropertyId, ownerUserId, displayName, registryNumber]
    );

    return await userPropertyService.findById(result.insertId);
  },

  // Atualiza uma propriedade
  update: async (id, { displayName, registryNumber }) => {
    const fields = [];
    const values = [];

    if (displayName !== undefined) {
      fields.push('display_name = ?');
      values.push(displayName);
    }
    if (registryNumber !== undefined) {
      fields.push('registry_number = ?');
      values.push(registryNumber);
    }

    // Se nenhum campo foi fornecido para atualização, retorna o objeto atual
    if (fields.length === 0) {
      return await userPropertyService.findById(id);
    }

    // Adiciona o ID para a cláusula WHERE
    values.push(id);

    await queryAsync(
      `UPDATE property 
       SET ${fields.join(', ')}, updated_at = NOW() 
       WHERE id = ?`,
      values
    );
    return await userPropertyService.findById(id);
  },

  // Soft delete - marca como inativa
  softDelete: async (id) => {
    await queryAsync(
      `UPDATE property 
       SET is_active = 0, deleted_at = NOW() 
       WHERE id = ?`,
      [id]
    );
    return { success: true };
  },

  // Reativa uma propriedade
  reactivate: async (id) => {
    await queryAsync(
      `UPDATE property 
       SET is_active = 1, deleted_at = NULL, updated_at = NOW() 
       WHERE id = ?`,
      [id]
    );
    return await userPropertyService.findById(id);
  },

  // Salva múltiplas propriedades vindas do serviço mongo
  bulkCreateFromMongo: async (userId, mongoProperties) => {
    const created = [];
    
    for (const prop of mongoProperties) {
      try {
        const userProperty = await userPropertyService.create({
          mongoPropertyId: prop._id,
          ownerUserId: userId,
          displayName: prop.properties?.nome_imovel || prop.properties?.cod_imovel || 'Sem nome',
          registryNumber: prop.properties?.cod_imovel || null
        });
        created.push(userProperty);
      } catch (error) {
        console.error(`Erro ao criar propriedade ${prop._id}:`, error);
      }
    }

    return created;
  }
};

module.exports = userPropertyService;

