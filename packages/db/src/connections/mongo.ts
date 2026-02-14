export const mongoConfig = {
  uri: process.env['MONGODB_URI'] ?? 'mongodb://localhost:27017/mise',
  options: {
    maxPoolSize: 10,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
  },
};
