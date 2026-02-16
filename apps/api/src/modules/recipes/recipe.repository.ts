import type { Recipe, CreateRecipeDTO, UpdateRecipeDTO } from './recipe.types.js';
import { ObjectId } from 'mongodb';

export interface IRecipeRepository {
  findById(id: string): Promise<Recipe | null>;
  findAll(filters?: { category?: string; search?: string }): Promise<Recipe[]>;
  create(data: CreateRecipeDTO): Promise<Recipe>;
  update(id: string, data: UpdateRecipeDTO): Promise<Recipe>;
  delete(id: string): Promise<void>;
}

import { mongoClient } from '../../core/database/mongodb.js';

export class MongoRecipeRepository implements IRecipeRepository {
  private get collection() {
    return mongoClient.getDb().collection('recipes');
  }

  async findById(id: string): Promise<Recipe | null> {
    let objectId: ObjectId;
    try {
      objectId = new ObjectId(id);
    } catch {
      return null;
    }
    const doc = await this.collection.findOne({ _id: objectId });
    return doc ? this.mapDoc(doc) : null;
  }

  async findAll(filters?: { category?: string; search?: string }): Promise<Recipe[]> {
    const query: Record<string, unknown> = {};
    if (filters?.category) {
      // Ensure category is a plain string, not an object (NoSQL injection prevention)
      if (typeof filters.category !== 'string') throw new Error('Invalid category filter');
      query['category'] = filters.category;
    }
    if (filters?.search) {
      // Sanitize: escape regex special chars and ensure it's a plain string
      if (typeof filters.search !== 'string') throw new Error('Invalid search filter');
      const escapedSearch = filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query['name'] = { $regex: escapedSearch, $options: 'i' };
    }
    const docs = await this.collection.find(query).sort({ name: 1 }).toArray();
    return docs.map((d) => this.mapDoc(d));
  }

  async create(data: CreateRecipeDTO): Promise<Recipe> {
    const now = new Date();
    const doc = {
      ...data,
      totalCost: 0,
      costPerUnit: 0,
      photos: [],
      createdAt: now,
      updatedAt: now,
    };
    const result = await this.collection.insertOne(doc);
    return this.mapDoc({ _id: result.insertedId, ...doc });
  }

  async update(id: string, data: UpdateRecipeDTO): Promise<Recipe> {
    const objectId = new ObjectId(id);
    const updateFields: Record<string, unknown> = { ...data, updatedAt: new Date() };
    await this.collection.updateOne(
      { _id: objectId },
      { $set: updateFields },
    );
    const doc = await this.collection.findOne({ _id: objectId });
    return this.mapDoc(doc!);
  }

  async delete(id: string): Promise<void> {
    const objectId = new ObjectId(id);
    await this.collection.deleteOne({ _id: objectId });
  }

  private mapDoc(doc: Record<string, unknown>): Recipe {
    const id = doc['_id'];
    return {
      id: id instanceof ObjectId ? id.toHexString() : String(id),
      name: doc['name'] as string,
      description: doc['description'] as string | undefined,
      category: doc['category'] as string | undefined,
      tags: doc['tags'] as string[] | undefined,
      ingredients: (doc['ingredients'] as Recipe['ingredients']) ?? [],
      steps: (doc['steps'] as Recipe['steps']) ?? [],
      yield: doc['yield'] as number | undefined,
      yieldUnit: doc['yieldUnit'] as string | undefined,
      costPerUnit: doc['costPerUnit'] as number | undefined,
      totalCost: doc['totalCost'] as number | undefined,
      sellingPrice: doc['sellingPrice'] as number | undefined,
      photos: doc['photos'] as string[] | undefined,
      notes: doc['notes'] as string | undefined,
      variations: doc['variations'] as string[] | undefined,
      createdAt: new Date(doc['createdAt'] as string | Date),
      updatedAt: new Date(doc['updatedAt'] as string | Date),
    };
  }
}
