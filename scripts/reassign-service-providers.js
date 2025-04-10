const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Provider mapping from SQL data
const PROVIDERS = {
  '153eb018-772e-47ff-890f-4f05b924e9ad': {
    name: 'Servicos Redes Sociais',
    slug: 'servicos-redes-sociais',
    apiUrl: 'https://servicosredessociais.com.br/api/v2'
  },
  '203a2011-b1eb-4be8-87dd-257db9377072': {
    name: 'Seja Smm',
    slug: 'seja-smm',
    apiUrl: 'https://sejasmm.com/api/v2'
  },
  '232399c2-d2c2-482a-9622-9376d4598b3f': {
    name: 'Just Another Panel',
    slug: 'just-another-panel',
    apiUrl: 'https://justanotherpanel.com/api/v2'
  },
  '7da7d672-c907-4474-a700-ca6df4c72842': {
    name: 'Mea Smm',
    slug: 'mea-smm',
    apiUrl: 'https://measmm.com/api/v2'
  },
  'dcd15b48-d42b-476d-b360-90f0b68cce2d': {
    name: 'Fama nas redes',
    slug: 'fama-nas-redes',
    apiUrl: 'https://famanasredes.com.br/api/v2'
  },
  'f5c051a0-c655-479b-bc74-70b17b6aff28': {
    name: 'Gram Fama Oficial',
    slug: 'gram-fama-oficial',
    apiUrl: 'https://gramfamaoficial.com.br/api/v2'
  }
};

// Service name patterns that can help identify the provider
const PROVIDER_PATTERNS = {
  '153eb018-772e-47ff-890f-4f05b924e9ad': [
    /SRS-/i, 
    /Serviços Redes/i
  ],
  '203a2011-b1eb-4be8-87dd-257db9377072': [
    /SSM-/i, 
    /Seja SMM/i
  ],
  '7da7d672-c907-4474-a700-ca6df4c72842': [
    /MEA-/i, 
    /Mea SMM/i
  ],
  'dcd15b48-d42b-476d-b360-90f0b68cce2d': [
    /FNR-/i, 
    /Fama nas redes/i
  ],
  'f5c051a0-c655-479b-bc74-70b17b6aff28': [
    /GFO-/i, 
    /Gram Fama/i
  ]
};

// Identify provider by service name
function identifyProviderByName(serviceName) {
  for (const providerId in PROVIDER_PATTERNS) {
    const patterns = PROVIDER_PATTERNS[providerId];
    for (const pattern of patterns) {
      if (pattern.test(serviceName)) {
        return providerId;
      }
    }
  }
  return null;
}

// Function to reassign services based on name patterns
async function reassignServiceProviders(dryRun = true) {
  try {
    console.log('Fetching services with missing or incorrect provider assignments...');
    
    const services = await prisma.service.findMany({
      where: {
        OR: [
          { provider_id: null },
          { provider_id: { not: { in: Object.keys(PROVIDERS) } } }
        ]
      },
      select: {
        id: true,
        name: true,
        type: true,
        provider_id: true
      }
    });

    console.log(`Found ${services.length} services with missing or invalid provider assignments`);
    
    const reassignments = [];
    
    // Check each service for possible provider identification
    for (const service of services) {
      const identifiedProviderId = identifyProviderByName(service.name);
      
      if (identifiedProviderId) {
        const provider = PROVIDERS[identifiedProviderId];
        
        console.log(`Service: "${service.name}" (${service.id})`);
        console.log(`  Current provider: ${service.provider_id || 'None'}`);
        console.log(`  Identified provider: ${provider.name} (${identifiedProviderId})`);
        
        reassignments.push({
          serviceId: service.id,
          serviceName: service.name,
          oldProviderId: service.provider_id,
          newProviderId: identifiedProviderId
        });
      } else {
        console.log(`Unable to identify provider for service: "${service.name}" (${service.id})`);
      }
    }
    
    console.log(`\nFound ${reassignments.length} services that can be reassigned`);
    
    // Update the services if not a dry run
    if (!dryRun && reassignments.length > 0) {
      console.log('\nUpdating service provider assignments...');
      
      for (const reassignment of reassignments) {
        await prisma.service.update({
          where: { id: reassignment.serviceId },
          data: { provider_id: reassignment.newProviderId }
        });
        
        console.log(`Updated service "${reassignment.serviceName}" to provider ${PROVIDERS[reassignment.newProviderId].name}`);
      }
      
      console.log(`\nSuccessfully updated ${reassignments.length} services`);
    } else if (dryRun) {
      console.log('\nDRY RUN - No changes made. To apply changes, set dryRun=false');
    }
    
  } catch (error) {
    console.error('Error reassigning service providers:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Parameters: dryRun (true = no changes, just report; false = apply changes)
const dryRun = process.argv.includes('--apply') ? false : true;

// Execute the function
reassignServiceProviders(dryRun)
  .then(() => console.log('Service provider reassignment process completed'))
  .catch(error => console.error('Error executing script:', error)); 