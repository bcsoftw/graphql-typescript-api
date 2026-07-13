import dotenv from 'dotenv';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
// import express from 'express';
import express, { Request, Response } from 'express';
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
import { ApolloServerPluginLandingPageLocalDefault} from '@apollo/server/plugin/landingPage/default';


const app = express();
const path = require('path');
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
      introspection: true,
      plugins: [
        ApolloServerPluginDrainHttpServer({ httpServer }),
        ApolloServerPluginLandingPageLocalDefault({ footer: false }),
      ]
    });

    // Start Apollo Server
    await server.start();

   // 6. Aplicar Middlewares de Express
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));



// Ruta principal convertida en página HTML
app.get("/", (req: Request, res: Response) => {
  res.send(`
    <!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API GraphQL</title>
    <style>
        :root {
            --bg-color: #0b0f19;
            --card-bg: #161b26;
            --text-color: #f3f4f6;
            --text-muted: #9ca3af;
            --primary-color: #e10098; /* Color característico de GraphQL */
            --primary-hover: #b8007d;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-color);
            margin: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }

        .container {
            text-align: center;
            padding: 2.5rem;
            background-color: var(--card-bg);
            border-radius: 16px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
            max-width: 500px;
            width: 90%;
            border: 1px solid #232936;
        }

        .logo {
            width: 80px;
            height: 80px;
            margin-bottom: 1.5rem;
        }

        h1 {
            font-size: 2rem;
            margin-bottom: 0.5rem;
            font-weight: 600;
        }

        p {
            color: var(--text-muted);
            font-size: 1rem;
            line-height: 1.6;
            margin-bottom: 2rem;
        }

        .btn-graphql {
            display: inline-block;
            background-color: var(--primary-color);
            color: white;
            text-decoration: none;
            padding: 0.8rem 2rem;
            font-weight: bold;
            border-radius: 8px;
            transition: background-color 0.3s ease, transform 0.2s ease;
            box-shadow: 0 4px 12px rgba(225, 0, 152, 0.3);
        }

        .btn-graphql:hover {
            background-color: var(--primary-hover);
            transform: translateY(-2px);
        }

        .btn-graphql:active {
            transform: translateY(0);
        }

        .footer {
            margin-top: 2rem;
            font-size: 0.85rem;
            color: #6b7280;
        }
    </style>
</head>
<body>

    <div class="container">
        <!-- Icono representativo de GraphQL (SVG integrado) -->
        <svg class="logo" viewBox="0 0 100 100" fill="none" xmlns="http://w3.org">
            <path d="M50 96.5L9.5 73.1V26.9L50 3.5L90.5 26.9V73.1L50 96.5Z" stroke="#e10098" stroke-width="4"/>
            <circle cx="50" cy="50" r="12" fill="#e10098"/>
            <circle cx="50" cy="3.5" r="6" fill="#e10098"/>
            <circle cx="50" cy="96.5" r="6" fill="#e10098"/>
            <circle cx="9.5" cy="26.9" r="6" fill="#e10098"/>
            <circle cx="9.5" cy="73.1" r="6" fill="#e10098"/>
            <circle cx="90.5" cy="26.9" r="6" fill="#e10098"/>
            <circle cx="90.5" cy="73.1" r="6" fill="#e10098"/>
            <path d="M50 3.5V96.5M9.5 26.9L90.5 73.1M9.5 73.1L90.5 26.9" stroke="#e10098" stroke-width="2"/>
        </svg>

        <h1>¡Bienvenido a la API!</h1>
        <p>Has accedido exitosamente al servidor. Nuestro servicio utiliza la arquitectura eficiente de GraphQL para proveerte exactamente los datos que necesitas de forma estructurada.</p>
        
        <!-- REEMPLAZA EL ATRIBUTO HREF CON TU ENDPOINT REAL -->
        <a href="/graphql" target="_blank" class="btn-graphql">Explorar GraphQL Playground</a>

        <div class="footer">
            Desarrollado por <a href="https://bcsoftw.github.io/" target="_blank" style="color: #e10098; text-decoration: none;">bcsoftw</a> con la especificación oficial de <a href="https://graphql.org/" target="_blank" style="color: #e10098; text-decoration: none;">GraphQL</a>.
        </div>
    </div>

</body>
</html>

  `);
});

    
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
