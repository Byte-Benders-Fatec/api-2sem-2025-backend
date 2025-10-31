// MongoDB Playground
// Use Ctrl+Space inside a snippet or a string literal to trigger completions.

// The current database to use.
use("app");

// Find a document in a collection.
// db.getCollection("imoveis_rurais").findOne({

// });


db.imoveis_rurais.getIndexes();
db.imoveis_rurais.createIndex({ geometry: "2dsphere" })
db.imoveis_rurais.getIndexes();

// use app

// Cria uma coleção temporária

// db.tmp_geo.drop()
// db.tmp_geo.insertOne(
//   db.imoveis_rurais.findOne({_id: ObjectId("68ca44149778768780398ea9")})
// )

// db.tmp_geo.createIndex({ geometry: "2dsphere" })
