import { socialTypeDefs } from './social';
import { categoryTypeDefs } from './category';
import { subcategoryTypeDefs } from './subcategory';

// Combine todos os typeDefs
export const typeDefs = [
  socialTypeDefs,
  categoryTypeDefs,
  subcategoryTypeDefs
]; 