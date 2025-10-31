// import { MongoClient } from 'mongodb';

/*
 * Requires the MongoDB Node.js Driver
 * https://mongodb.github.io/node-mongodb-native
 */

const agg = [
  {
    '$group': {
      '_id': '$properties.cod_cpf', 
      'total_imoveis': {
        '$sum': 1
      }, 
      'area_total': {
        '$sum': '$properties.num_area'
      }, 
      'municipios': {
        '$addToSet': '$properties.municipio'
      }, 
      'status_distintos': {
        '$addToSet': '$properties.ind_status'
      }, 
      'tipos': {
        '$addToSet': '$properties.ind_tipo'
      }, 
      'data_criacao_mais_antiga': {
        '$min': '$properties.dat_criaca'
      }, 
      'data_atualizacao_mais_recente': {
        '$max': '$properties.dat_atual'
      }
    }
  }, {
    '$project': {
      '_id': 0, 
      'cpf': '$_id', 
      'total_imoveis': 1, 
      'area_total': 1, 
      'municipios': 1, 
      'status_distintos': 1, 
      'tipos': 1, 
      'data_criacao_mais_antiga': 1, 
      'data_atualizacao_mais_recente': 1
    }
  }, {
    '$sort': {
      'total_imoveis': -1
    }
  }
];

use("app");

const coll = db.imoveis_rurais;
const cursor = coll.aggregate(agg);
const result = cursor.toArray();
