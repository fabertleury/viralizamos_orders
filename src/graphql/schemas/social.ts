import { gql } from 'graphql-tag';

export const socialTypeDefs = gql`
  type Social {
    id: ID!
    name: String!
    slug: String!
    icon: String
    icon_url: String
    description: String
    active: Boolean!
    order_position: Int!
    metadata: JSON
    created_at: String!
    updated_at: String!
    categories: [Category!]
  }
  
  # JSON scalar para campos de metadados
  scalar JSON
  
  extend type Query {
    socialNetworks: [Social!]!
    socialNetwork(id: ID!): Social
    socialNetworkBySlug(slug: String!): Social
  }
  
  extend type Mutation {
    createSocial(
      name: String!
      slug: String!
      icon: String
      icon_url: String
      description: String
      active: Boolean
      order_position: Int
      metadata: JSON
    ): Social!
    
    updateSocial(
      id: ID!
      name: String
      slug: String
      icon: String
      icon_url: String
      description: String
      active: Boolean
      order_position: Int
      metadata: JSON
    ): Social!
    
    deleteSocial(id: ID!): Boolean!
  }
`; 