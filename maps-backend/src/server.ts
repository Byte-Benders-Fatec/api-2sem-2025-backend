import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import Property from './models/Property';
import { calculateDistance, getPolygonCenter } from './utils/distance';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI || '').then(() => {
  console.log('Conectado ao MongoDB');
}).catch(err => {
  console.error('Erro ao conectar ao MongoDB:', err);
});

app.get('/api/properties', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    const userLat = parseFloat(lat as string);
    const userLng = parseFloat(lng as string);

    console.log(`\n--- NOVO REQUEST ---`);
    console.log(`Procurando propriedades perto das coordenadas: (${userLat}, ${userLng})`);

    const properties = await Property.find({}).lean();
    console.log(`Total de propriedades encontradas no bd: ${properties.length}`);
    
    const validProperties = properties.filter((property: any) => {
      return property.geometry && 
             property.geometry.coordinates && 
             Array.isArray(property.geometry.coordinates) &&
             property.geometry.coordinates.length > 0 &&
             Array.isArray(property.geometry.coordinates[0]) &&
             property.geometry.coordinates[0].length > 0;
    });

    const filteredCount = properties.length - validProperties.length;
    console.log(`Properties filtardas (geometria inválida): ${filteredCount}`);
    console.log(`Propriedades válidas: ${validProperties.length}`);
    
    const propertiesWithDistance = validProperties
      .map((property: any) => {
        try {
          const coordinates = property.geometry.coordinates as number[][][];
          const [centerLng, centerLat] = getPolygonCenter(coordinates);
          const distance = calculateDistance(userLat, userLng, centerLat, centerLng);
          
          return {
            ...property,
            distance,
            center: { lat: centerLat, lng: centerLng }
          };
        } catch (error) {
          console.error('Erro ao processar propriedade:', property._id, error);
          return null;
        }
      })
      .filter(property => property !== null);

    const processingErrorsCount = validProperties.length - propertiesWithDistance.length;
    if (processingErrorsCount > 0) {
      console.log(`Propriedades com erro: ${processingErrorsCount}`);
    }
    console.log(`Propriedades processadas: ${propertiesWithDistance.length}`);

    const closest = propertiesWithDistance
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);

    console.log(`Retornando as ${closest.length} propriedades mais próximas:`);
    closest.forEach((prop, index) => {
      console.log(`  ${index + 1}. Propriedades ${prop._id} - Distância: ${prop.distance.toFixed(2)}km`);
    });
    console.log(`--- FIM DO REQUEST ---\n`);

    res.json(closest);
  } catch (error) {
    console.error('Erro de Fetch:', error);
    res.status(500).json({ error: 'Erro de fetch' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server rodando em: http://0.0.0.0:${PORT}`);
  console.log(`Acesso pelo emulador: http://10.0.2.2:${PORT}`);
  console.log(`Test endpoint: http://10.0.2.2:${PORT}/api/test`);
});
