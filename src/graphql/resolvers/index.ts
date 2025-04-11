import { socialResolvers } from './social';
import { categoryResolvers } from './category';
import { subcategoryResolvers } from './subcategory';
import { GraphQLScalarType } from 'graphql';

// Resolver para o tipo JSON
const JSONResolver = {
  JSON: new GraphQLScalarType({
    name: 'JSON',
    description: 'JSON custom scalar type',
    serialize(value) {
      return value;
    },
    parseValue(value) {
      return value;
    },
    parseLiteral(ast: any) {
      return ast.value;
    }
  })
};

// Combinar todos os resolvers
export const resolvers = {
  ...JSONResolver,
  ...socialResolvers,
  ...categoryResolvers,
  ...subcategoryResolvers
}; 