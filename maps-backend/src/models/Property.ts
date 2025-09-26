import mongoose, { Document, Schema } from 'mongoose';

interface IPropertyDocument extends Document {
  type: string;
  geometry: {
    type: string;
    coordinates: number[][][];
  };
  properties: {
    cod_tema?: string;
    nom_tema?: string;
    cod_imovel?: string;
    mod_fiscal?: number;
    num_area?: number;
    ind_status?: string;
    ind_tipo?: string;
    des_condic?: string;
    municipio?: string;
    cod_estado?: string;
    dat_criaca?: string;
    dat_atuali?: string;
    cod_cpf?: string;
  };
}

const PropertySchema = new Schema({
  type: String,
  geometry: {
    type: String,
    coordinates: Schema.Types.Mixed 
  },
  properties: {
    cod_tema: String,
    nom_tema: String,
    cod_imovel: String,
    mod_fiscal: Schema.Types.Mixed,
    num_area: Schema.Types.Mixed,
    ind_status: String,
    ind_tipo: String,
    des_condic: String,
    municipio: String,
    cod_estado: String,
    dat_criaca: String,
    dat_atuali: String,
    cod_cpf: String
  }
}, { 
  collection: 'imoveis_rurais',
  strict: false 
});

export { IPropertyDocument };
export default mongoose.model<IPropertyDocument>('Property', PropertySchema);
