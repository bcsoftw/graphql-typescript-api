import { Collection, ObjectId } from 'mongodb';
import { getDatabase } from './connection';
import { User, CreateUserInput, UpdateUserInput } from '../types';
import bcrypt from 'bcrypt';

// MongoDB User document interface
interface UserDocument {
  _id: ObjectId;
  name: string;
  email: string;
  role: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

export class UserService {
  private collection: Collection<UserDocument>;

  constructor() {
    const db = getDatabase();
    this.collection = db.collection<UserDocument>('users');
  }

  // Helper to convert MongoDB document to GraphQL User type
  private toUser(doc: UserDocument): User {
    return {
      id: doc._id.toString(),
      name: doc.name,
      email: doc.email,
      role: doc.role,
      password: doc.password,
      createdAt: doc.createdAt?.toISOString(),
      updatedAt: doc.updatedAt?.toISOString(),
    };
  }

  async getAllUsers(): Promise<User[]> {
    const users = await this.collection.find().toArray();
    return users.map(doc => this.toUser(doc));
  }

  async getUserById(id: string): Promise<User | null> {
    try {
      const doc = await this.collection.findOne({ _id: new ObjectId(id) });
      return doc ? this.toUser(doc) : null;
    } catch (error) {
      // Invalid ObjectId format
      return null;
    }
  }

  async createUser(input: CreateUserInput): Promise<User> {

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(input.password, saltRounds);
 
    const newUser: Omit<UserDocument, '_id'> = {
      name: input.name,
      email: input.email,
      role: input.role,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await this.collection.insertOne(newUser as UserDocument);
    
    const createdUser = await this.collection.findOne({ _id: result.insertedId });
    
    if (!createdUser) {
      throw new Error('Failed to create user');
    }

    return this.toUser(createdUser);
  }

  async updateUser(input: UpdateUserInput): Promise<User | null> {
    try {
      const updateFields: Partial<Omit<UserDocument, '_id'>> = {};
      
      if (input.name !== undefined) updateFields.name = input.name;
      if (input.email !== undefined) updateFields.email = input.email;
      // if (input.age !== undefined) updateFields.age = input.age;

      const result = await this.collection.findOneAndUpdate(
        { _id: new ObjectId(input.id) },
        { $set: updateFields },
        { returnDocument: 'after' }
      );

      return result ? this.toUser(result) : null;
    } catch (error) {
      // Invalid ObjectId format
      return null;
    }
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      const result = await this.collection.deleteOne({ _id: new ObjectId(id) });
      return result.deletedCount > 0;
    } catch (error) {
      // Invalid ObjectId format
      return false;
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      // Normalmente los emails se guardan en minúsculas para evitar duplicados
      const doc = await this.collection.findOne({ email: email.toLowerCase() });
      return doc ? this.toUser(doc) : null;
    } catch (error) {
      console.error("Error fetching user by email:", error);
      return null;
    }
  }

 
  async comparePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    try {
      const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
      return isMatch;
    } catch (error) {
      console.error("Error comparing passwords:", error);
      return false;
    }
  }


  // Create indexes for better performance
  async createIndexes(): Promise<void> {
    await this.collection.createIndex({ email: 1 }, { unique: true });
    await this.collection.createIndex({ createdAt: -1 });
    console.log('✅ Database indexes created');
  }
}
