import { MongoClient, Db } from 'mongodb';

let db: Db | null = null;
let client: MongoClient | null = null;

// Función interna para limpiar el estado si la conexión falla de forma irrecuperable
function cleanupConnection() {
  db = null;
  client = null;
}

export async function connectToDatabase(): Promise<Db> {
  if (db) {
    return db;
  }

  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI is not set');
    }
    const DB_NAME = process.env.DB_NAME || 'graphql_example';
    const APP_NAME = process.env.APP_NAME || 'devrel-graphql';

    console.log('🔌 Connecting to MongoDB...');
    
    client = new MongoClient(MONGODB_URI, {
      appName: APP_NAME,
      // Opciones de reconexión nativa (activas por defecto, pero configurables)
      retryWrites: true,           // Reintenta escrituras si fallan por red
      retryReads: true,            // Reintenta lecturas si fallan por red
      maxPoolSize: 10,             // Mantiene un pool de conexiones vivo
    });

    // Escuchar eventos de pérdida de conexión para limpiar el estado de la app
    client.on('close', () => {
      console.warn('⚠️ MongoDB connection closed. Cleaning up state...');
      cleanupConnection();
    });

    client.on('timeout', () => {
      console.error('❌ MongoDB connection timeout!');
      cleanupConnection();
    });

    await client.connect();
    db = client.db(DB_NAME);
    
    console.log(`✅ Successfully connected to MongoDB database: ${DB_NAME}`);
    
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    cleanupConnection();
    throw error;
  }
}

export function getDatabase(): Db {
  if (!db) {
    throw new Error('Database not initialized. Call connectToDatabase() first.');
  }
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (client) {
    await client.close();
    // db = null;
    // client = null;
    cleanupConnection();
    console.log('🔌 MongoDB connection closed');
  }
}
