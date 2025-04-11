"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.typeDefs = void 0;
const graphql_tag_1 = require("graphql-tag");
exports.typeDefs = (0, graphql_tag_1.gql) `
  scalar JSON
  
  type Order {
    id: ID!
    transaction_id: String!
    service_id: String!
    provider_id: String
    target_username: String!
    quantity: Int
    status: String!
    created_at: String!
    updated_at: String
    attributes: JSON
    service: Service
    logs: [OrderLog]
  }
  
  type OrderLog {
    id: ID!
    order_id: String!
    status: String!
    notes: String
    created_at: String!
    metadata: JSON
  }
  
  type Service {
    id: ID!
    name: String!
    description: String
    price: Float!
    min_quantity: Int
    max_quantity: Int
    default_quantity: Int
    provider_id: String!
    external_id: String
    is_active: Boolean
    created_at: String!
    updated_at: String
    provider: Provider
  }
  
  type Provider {
    id: ID!
    name: String!
    slug: String!
    description: String
    api_key: String!
    api_url: String!
    status: Boolean
    created_at: String!
    updated_at: String
    services: [Service]
  }
  
  type OrdersResult {
    orders: [Order]
    count: Int
  }
  
  type Query {
    orders(limit: Int, offset: Int, status: String, search: String): OrdersResult
    order(id: ID!): Order
    orderLogs(orderId: ID!): [OrderLog]
    services(providerId: ID): [Service]
    providers: [Provider]
    provider(id: ID!): Provider
  }
  
  type Mutation {
    createOrder(
      transaction_id: String!
      service_id: String!
      target_username: String!
      quantity: Int
      attributes: JSON
    ): Order
    
    updateOrder(
      id: ID!
      status: String
      notes: String
    ): Order
  }
`;
