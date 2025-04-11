"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryTypeDefs = void 0;
const graphql_tag_1 = require("graphql-tag");
exports.categoryTypeDefs = (0, graphql_tag_1.gql) `
  type Category {
    id: ID!
    name: String!
    slug: String!
    description: String
    icon: String
    active: Boolean!
    order_position: Int!
    social_id: ID!
    metadata: JSON
    created_at: String!
    updated_at: String!
    social: Social
    subcategories: [Subcategory!]
    services: [Service!]
  }
  
  type Service {
    id: ID!
    name: String!
    description: String
    type: String!
    platform: String!
    price: Float!
    is_active: Boolean!
  }
  
  extend type Query {
    categories: [Category!]!
    categoriesBySocial(socialId: ID!): [Category!]!
    category(id: ID!): Category
    categoryBySlug(slug: String!): Category
  }
  
  extend type Mutation {
    createCategory(
      name: String!
      slug: String!
      description: String
      icon: String
      active: Boolean
      order_position: Int
      social_id: ID!
      metadata: JSON
    ): Category!
    
    updateCategory(
      id: ID!
      name: String
      slug: String
      description: String
      icon: String
      active: Boolean
      order_position: Int
      social_id: ID
      metadata: JSON
    ): Category!
    
    deleteCategory(id: ID!): Boolean!
  }
`;
