"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subcategoryTypeDefs = void 0;
const graphql_tag_1 = require("graphql-tag");
exports.subcategoryTypeDefs = (0, graphql_tag_1.gql) `
  type Subcategory {
    id: ID!
    name: String!
    slug: String!
    description: String
    icon: String
    active: Boolean!
    order_position: Int!
    category_id: ID!
    metadata: JSON
    created_at: String!
    updated_at: String!
    category: Category
    services: [Service!]
  }
  
  type Query {
    subcategories: [Subcategory!]!
    subcategoriesByCategory(categoryId: ID!): [Subcategory!]!
    subcategory(id: ID!): Subcategory
    subcategoryBySlug(slug: String!): Subcategory
  }
  
  type Mutation {
    createSubcategory(
      name: String!
      slug: String!
      description: String
      icon: String
      active: Boolean
      order_position: Int
      category_id: ID!
      metadata: JSON
    ): Subcategory!
    
    updateSubcategory(
      id: ID!
      name: String
      slug: String
      description: String
      icon: String
      active: Boolean
      order_position: Int
      category_id: ID
      metadata: JSON
    ): Subcategory!
    
    deleteSubcategory(id: ID!): Boolean!
  }
`;
