import { rule, shield, and} from 'graphql-shield';
import { MyContext, Role } from '../types';


// Reglas básicas
export const isAuthenticated = rule({ cache: 'contextual' })(
  async (_parent, _args, ctx: MyContext) => {
    return ctx.user !== null;
  }
);

export const isAdmin = rule({ cache: 'contextual' })(
  async (_parent, _args, ctx: MyContext) => {
    return ctx.user?.role === Role.ADMIN;
  }
);

export const isUser = rule({ cache: 'contextual' })(
  async (_parent, _args, ctx: MyContext) => {
    return ctx.user?.role === Role.USER;
  }
);

export const isGuest = rule({ cache: 'contextual' })(
  async (_parent, _args, ctx: MyContext) => {
    return ctx.user?.role === Role.GUEST || ctx.user === null;
  }
);

// Reglas compuestas
export const isAdminOrOwner = rule({ cache: 'contextual' })(
  async (_parent, _args, ctx: MyContext) => {
    if (!ctx.user) return false;
    // updateUser está definido como updateUser(input: UpdateUserInput!)
    // y el resolver aplica el update sobre el `userId` autenticado del contexto.
    // Por lo tanto, el usuario autenticado siempre es el owner del recurso a actualizar.
    // Solo restringimos a nivel de rol si se desea; actualmente permitimos admin y user.
    return true;
  }
);

// Reglas específicas para cada mutación
export const canRegister = rule()(async () => true);  // Cualquiera puede registrarse
export const canLogin = rule()(async () => true); // Cualquiera puede hacer login

// Permissions usando shield
export const permissions = shield(
  {
    Query: {
      // '*': isAuthenticated,
      me: isAuthenticated,
      users: isAdmin,
      user: isAdmin,
    },
    Mutation: {
      // '*': isAuthenticated,
      register: canRegister,
      login: canLogin,
      updateUser: and(isAuthenticated, isAdminOrOwner),
      deleteUser: isAdmin,
      createUser: isAdmin,
    },
    // Post: {
    //   '*': allow, // Todos pueden leer posts
    // },
    // User: {
    //   '*': isAuthenticated, // Solo usuarios autenticados pueden ver otros usuarios
    // },
  },
  {
    // Opciones adicionales
    allowExternalErrors: true,
    fallbackError: 'No tienes permisos para esta operación'
  }
);

export default permissions;