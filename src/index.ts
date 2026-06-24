import dotenv from 'dotenv';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import express from 'express';
import http from 'http';
import jwt from 'jsonwebtoken';
import bodyParser from 'body-parser';
import { typeDefs } from './schema/typeDefs';
import { resolvers } from './resolvers';
import { MyContext, User } from './types';
import { connectToDatabase, closeDatabase } from './database/connection';
import { UserService } from './database/userService';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { applyMiddleware } from 'graphql-middleware';
import permissions from './guards/permissions';

const app = express();
dotenv.config();

async function startServer() {
  try {
    // Connect to MongoDB
    await connectToDatabase();
    
    // Initialize database indexes
    const userService = new UserService();
    await userService.createIndexes();

    // Create Express app
   
    
    // Create HTTP server
    const httpServer = http.createServer(app);

    const schema = makeExecutableSchema({
      typeDefs,
      resolvers,
    });

  // Aplicar permisos con graphql-shield
    const schemaWithPermissions = applyMiddleware(schema, permissions);

    const server = new ApolloServer({
      schema: schemaWithPermissions,
      plugins: [
        {
          async serverWillStart() {
            return {
              async drainServer() {},
            };
          },
        },
      ],
    });

    // Start Apollo Server
    await server.start();

   // 6. Aplicar Middlewares de Express
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    app.use(
      '/graphql', 
      bodyParser.json(), 
      expressMiddleware(server, { 
        // La función context se ejecuta en cada petición HTTP
        context: async ({ req }): Promise<MyContext> => {
          const authHeader = req.headers.authorization;
          const token = authHeader?.startsWith('Bearer ') 
            ? authHeader.split(' ')[1] 
            : undefined;

          let user: User | null = null;
          let userId: string | undefined;
          let role: string | undefined;

          if (token) {
            try {
              // Verificar y decodificar el token JWT
              const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { 
                userId: string; 
                email: string; 
                role: string; 
              };
     
              userId = decoded.userId;
              role = decoded.role;

              if (userId) {
                // Buscar usuario en la base de datos excluyendo la contraseña
                user = await userService.getUserById(userId);
                if (!user) {
                  console.warn(`User not found with ID: ${userId}`);
                }
              }
            } catch (err) {
              user = null;
              userId = undefined;
              role = undefined;
            }
          }

          return { req, user, userId, role };
        } 
      })
    );
    

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({ status: 'ok', message: 'Server is running' });
    });

    // Start the HTTP server
    const PORT = process.env.PORT || 3000;
    await new Promise<void>((resolve) => httpServer.listen({ port: PORT }, resolve));
    
    console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
    console.log(`🏥 Health check at http://localhost:${PORT}/health`);

    // Graceful shutdown handler
    const shutdown = async () => {
      console.log('\n🛑 Shutting down gracefully...');
      await closeDatabase();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } catch (error) {
    console.error('❌ Error starting server:', error);
    await closeDatabase();
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;
