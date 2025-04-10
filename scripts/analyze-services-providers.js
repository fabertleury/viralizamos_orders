const fs = require('fs');
const path = require('path');

/**
 * Script to analyze and cross-reference services with their respective providers
 */

// Check if data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  console.error('Data directory not found. Please run extract-sql-data.js first.');
  process.exit(1);
}

// Check for providers and services data files
const providersPath = path.join(dataDir, 'providers.js');
const servicesPath = path.join(dataDir, 'services.js');

if (!fs.existsSync(providersPath) || !fs.existsSync(servicesPath)) {
  console.error('Providers or services data files not found. Please run extract-sql-data.js first.');
  process.exit(1);
}

// Load data
const providers = require('./data/providers');
const services = require('./data/services');

// Create a mapping of provider IDs to names
const providerMap = {};
providers.forEach(provider => {
  providerMap[provider.id] = provider.name;
});

// Group services by provider
const servicesByProvider = {};
services.forEach(service => {
  const providerId = service.provider_id;
  if (!servicesByProvider[providerId]) {
    servicesByProvider[providerId] = [];
  }
  servicesByProvider[providerId].push(service);
});

// Analyze services by provider
console.log('\n===== SERVICES BY PROVIDER =====\n');
Object.keys(servicesByProvider).forEach(providerId => {
  const providerName = providerMap[providerId] || `Unknown Provider (${providerId})`;
  const providerServices = servicesByProvider[providerId];
  
  console.log(`\n${providerName} (ID: ${providerId})`);
  console.log(`Total services: ${providerServices.length}`);
  
  // Group by service type
  const serviceTypes = {};
  providerServices.forEach(service => {
    if (!serviceTypes[service.type]) {
      serviceTypes[service.type] = 0;
    }
    serviceTypes[service.type]++;
  });
  
  console.log('Service types:');
  Object.keys(serviceTypes).sort().forEach(type => {
    console.log(`  - ${type}: ${serviceTypes[type]} services`);
  });
  
  // Print first 5 services as examples
  console.log('Sample services:');
  providerServices.slice(0, 5).forEach(service => {
    console.log(`  - ${service.name} (${service.type}, $${service.price})`);
  });
});

// Create a report on missing provider mappings
const missingProviders = services.filter(service => !providerMap[service.provider_id]);
if (missingProviders.length > 0) {
  console.log('\n===== SERVICES WITH MISSING PROVIDERS =====\n');
  console.log(`Found ${missingProviders.length} services with provider IDs not in the providers list.`);
  
  const missingProviderIds = [...new Set(missingProviders.map(s => s.provider_id))];
  console.log(`Missing provider IDs: ${missingProviderIds.join(', ')}`);
  
  console.log('Sample services with missing providers:');
  missingProviders.slice(0, 5).forEach(service => {
    console.log(`  - ${service.name} (provider_id: ${service.provider_id})`);
  });
}

// Generate a mapping file that can be used for imports
const mappingData = providers.map(provider => {
  const providerServices = servicesByProvider[provider.id] || [];
  return {
    provider: {
      id: provider.id,
      name: provider.name,
      api_url: provider.api_url,
      api_key: provider.api_key,
      active: provider.active
    },
    serviceCount: providerServices.length,
    serviceTypes: [...new Set(providerServices.map(s => s.type))].sort()
  };
});

// Save mapping to a file
const mappingOutputPath = path.join(dataDir, 'provider-service-mapping.js');
const mappingContent = `const providerServiceMapping = ${JSON.stringify(mappingData, null, 2)};\n\nmodule.exports = providerServiceMapping;\n`;
fs.writeFileSync(mappingOutputPath, mappingContent, 'utf8');
console.log(`\nSaved provider-service mapping to ${mappingOutputPath}`);

console.log('\n===== SUMMARY =====\n');
console.log(`Total providers: ${providers.length}`);
console.log(`Total services: ${services.length}`);
console.log(`Providers with services: ${Object.keys(servicesByProvider).length}`);
console.log(`Services with missing providers: ${missingProviders.length}`);

// Create a script to import both providers and services
const importScriptPath = path.join(__dirname, 'import-providers-services.js');
const importScriptContent = `const { PrismaClient } = require('@prisma/client');
const providers = require('./data/providers');
const services = require('./data/services');
const providerServiceMapping = require('./data/provider-service-mapping');

const prisma = new PrismaClient();

/**
 * Script to import providers and their services into the database
 */
async function importProvidersAndServices() {
  console.log('Starting import of providers and services...');
  
  try {
    // Import providers first
    console.log('Importing providers...');
    let providerCount = 0;
    
    for (const provider of providers) {
      // Check if provider already exists
      const existingProvider = await prisma.provider.findUnique({
        where: { id: provider.id }
      });
      
      if (existingProvider) {
        // Update existing provider
        await prisma.provider.update({
          where: { id: provider.id },
          data: {
            name: provider.name,
            website: provider.website,
            api_url: provider.api_url,
            api_key: provider.api_key,
            active: provider.active
          }
        });
      } else {
        // Create new provider
        await prisma.provider.create({
          data: {
            id: provider.id,
            name: provider.name,
            website: provider.website,
            api_url: provider.api_url, 
            api_key: provider.api_key,
            active: provider.active,
            created_at: provider.created_at,
            updated_at: provider.updated_at
          }
        });
      }
      
      providerCount++;
    }
    
    console.log(\`Imported \${providerCount} providers\`);
    
    // Now import services
    console.log('Importing services...');
    let serviceCount = 0;
    let errorCount = 0;
    
    for (const service of services) {
      try {
        // Check if service already exists
        const existingService = await prisma.service.findUnique({
          where: { id: service.id }
        });
        
        if (existingService) {
          // Update existing service
          await prisma.service.update({
            where: { id: service.id },
            data: {
              provider_id: service.provider_id,
              external_id: service.external_id,
              name: service.name,
              type: service.type,
              description: service.description,
              price: service.price,
              min_order: service.min_order,
              max_order: service.max_order,
              category_id: service.category_id,
              subcategory_id: service.subcategory_id,
              active: service.active,
              metadata: service.metadata
            }
          });
        } else {
          // Create new service
          await prisma.service.create({
            data: {
              id: service.id,
              provider_id: service.provider_id,
              external_id: service.external_id,
              name: service.name,
              type: service.type,
              description: service.description,
              price: service.price,
              min_order: service.min_order,
              max_order: service.max_order,
              category_id: service.category_id,
              subcategory_id: service.subcategory_id,
              active: service.active,
              created_at: service.created_at,
              updated_at: service.updated_at,
              metadata: service.metadata
            }
          });
        }
        
        serviceCount++;
      } catch (error) {
        console.error(\`Error importing service \${service.id} (\${service.name}):\`, error.message);
        errorCount++;
      }
    }
    
    console.log(\`Imported \${serviceCount} services with \${errorCount} errors\`);
    console.log('Import completed successfully!');
    
  } catch (error) {
    console.error('Error during import:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importProvidersAndServices()
  .catch(error => {
    console.error('Critical error during import:', error);
    process.exit(1);
  });
`;

fs.writeFileSync(importScriptPath, importScriptContent, 'utf8');
console.log(`\nCreated script to import providers and services at ${importScriptPath}`);

console.log('\nAnalysis complete. Run the extract-sql-data.js script first to generate the data files, then run this script to analyze them, and finally run import-providers-services.js to import them to the database.'); 