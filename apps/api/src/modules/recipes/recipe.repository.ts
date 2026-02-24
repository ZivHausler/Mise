import type { Recipe, CreateRecipeDTO, UpdateRecipeDTO } from './recipe.types.js';
import { ObjectId } from 'mongodb';
import { mongoClient } from '../../core/database/mongodb.js';

export class MongoRecipeRepository {
  private static get collection() {
    return mongoClient.getDb().collection('recipes');
  }

  static async findById(storeId: number, id: string): Promise<Recipe | null> {
    let objectId: ObjectId;
    try {
      objectId = new ObjectId(id);
    } catch {
      return null;
    }
    const doc = await this.collection.findOne({ _id: objectId, storeId });
    return doc ? this.mapDoc(doc) : null;
  }

  static async findAll(storeId: number, filters?: { tag?: string; search?: string }): Promise<Recipe[]> {
    const query: Record<string, unknown> = {};
    query['storeId'] = storeId;
    if (filters?.tag) {
      if (typeof filters.tag !== 'string') throw new Error('Invalid tag filter');
      query['tags'] = { $in: [filters.tag] };
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

  static async create(storeId: number, data: CreateRecipeDTO): Promise<Recipe> {
    const now = new Date();
    const doc = {
      ...data,
      storeId,
      totalCost: 0,
      costPerUnit: 0,
      photos: data.photos ?? [],
      createdAt: now,
      updatedAt: now,
    };
    const result = await this.collection.insertOne(doc);
    return this.mapDoc({ _id: result.insertedId, ...doc });
  }

  static async update(storeId: number, id: string, data: UpdateRecipeDTO): Promise<Recipe> {
    const objectId = new ObjectId(id);
    const updateFields: Record<string, unknown> = { ...data, updatedAt: new Date() };
    await this.collection.updateOne(
      { _id: objectId, storeId },
      { $set: updateFields },
    );
    const doc = await this.collection.findOne({ _id: objectId, storeId });
    return this.mapDoc(doc!);
  }

  static async delete(storeId: number, id: string): Promise<void> {
    const objectId = new ObjectId(id);
    await this.collection.deleteOne({ _id: objectId, storeId });
  }

  private static mapDoc(doc: Record<string, unknown>): Recipe {
    const id = doc['_id'];
    return {
      id: id instanceof ObjectId ? id.toHexString() : String(id),
      name: doc['name'] as string,
      description: doc['description'] as string | undefined,
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
