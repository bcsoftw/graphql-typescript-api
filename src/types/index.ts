import { Request } from 'express';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  password: string;
  age?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
  role: string;
  age?: number;
  password: string;
}

export interface UpdateUserInput {
  id: string;
  name?: string;
  email?: string;
  age?: number;
}

export interface MyContext {
  req: Request;
  user?: User | null;
  userId?: string | undefined;
  role: string| undefined;
}

// Define roles como enum
export enum Role {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest',
}
