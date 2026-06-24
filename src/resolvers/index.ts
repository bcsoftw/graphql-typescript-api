import { UserService } from '../database/userService';
import { User, CreateUserInput, UpdateUserInput, MyContext } from '../types';
import { GraphQLError } from 'graphql';
import jwt from 'jsonwebtoken';

export const resolvers = {
  Query: {
    me: async (_: any, __: any, {userId}: MyContext) => {

      if (!userId) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' }
        });
      }

      const userService = new UserService();
      const user = await userService.getUserById(userId);
      
      if (!user) {
        throw new GraphQLError('User not found', {
          extensions: { code: 'NOT_FOUND' }
        });
      }

      return user;
    },
    users: async (): Promise<User[]> => {
      const userService = new UserService();
      return await userService.getAllUsers();
    },
    // Get a single user by ID
    user: async (_: unknown, { id }: { id: string }): Promise<User | null> => {
      const userService = new UserService();
      return await userService.getUserById(id);
    },
  },

  Mutation: {
    // Create a new user
    createUser: async (
      _: unknown,
      { name, email, role, password}: CreateUserInput
    ): Promise<User> => {
      const userService = new UserService();
      return await userService.createUser({ name, email, role, password });
    },

    // Update an existing user
    updateUser: async (
      _: unknown,
      { id, name, email }: UpdateUserInput
    ): Promise<User | null> => {
      const userService = new UserService();
      return await userService.updateUser({ id, name, email });
    },

    // Delete a user
    deleteUser: async (_: unknown, { id }: { id: string }): Promise<boolean> => {
      const userService = new UserService();
      return await userService.deleteUser(id);
    },
    register: async (_: any, { name, email, role, password }: CreateUserInput) => {

      const userService = new UserService();
      const user = await userService.createUser({ name, email, role, password});
     
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
        expiresIn: '7d'
      });

      return { user, token };
    },

    login: async (_: any, { email, password }: { email: string; password: string }) => {

      const userService = new UserService();
      const user = await userService.getUserByEmail(email);
  
      if (!user) {
        throw new Error("Usuario no encontrado");
      }

      const isValid = await userService.comparePassword(password, user.password);
        
      if (!isValid) {
        throw new Error("Contraseña incorrecta");
      }
      const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET!, {
        expiresIn: '7d'
      });

      return { user, token };
    },
  },
};
