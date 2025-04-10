const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Known providers from the database
const PROVIDERS = [
  {
    id: '153eb018-772e-47ff-890f-4f05b924e9ad',
    name: 'FollowersGuru',
    slug: 'followersguru'
  },
  {
    id: '203a2011-b1eb-4be8-87dd-257db9377072',
    name: 'SmartPanel',
    slug: 'smartpanel'
  },
  {
    id: '232399c2-d2c2-482a-9622-9376d4598b3f',
    name: 'BoostGram',
    slug: 'boostgram'
  },
  {
    id: '7da7d672-c907-4474-a700-ca6df4c72842',
    name: 'SMMPanel',
    slug: 'smmpanel'
  },
  {
    id: 'dcd15b48-d42b-476d-b360-90f0b68cce2d',
    name: 'InstaPanel',
    slug: 'instapanel'
  },
  {
    id: 'f5c051a0-c655-479b-bc74-70b17b6aff28',
    name: 'MediaPanel',
    slug: 'mediapanel'
  }
];

// Platform keywords to help with service categorization
const PLATFORM_KEYWORDS = {
  instagram: ['instagram', 'insta', 'ig', 'igtv', 'reels'],
  facebook: ['facebook', 'fb', 'meta'],
  twitter: ['twitter', 'tweet', 'x.com'],
  tiktok: ['tiktok', 'tik tok', 'tt'],
  youtube: ['youtube', 'yt', 'youtu.be'],
  telegram: ['telegram', 'tg'],
  spotify: ['spotify'],
  linkedin: ['linkedin', 'linked-in'],
  discord: ['discord'],
  twitch: ['twitch'],
  pinterest: ['pinterest', 'pin'],
  snapchat: ['snapchat', 'snap']
};

// Function to extract service data from SQL file content
function extractServiceDataFromSQL(sqlContent) {
  const services = [];
  const insertPattern = /INSERT INTO .*\(.*\) VALUES\s*\((.*)\);/g;
  const matches = sqlContent.matchAll(insertPattern);
  
  for (const match of matches) {
    if (match[1]) {
      try {
        const values = match[1].split(',').map(value => {
          value = value.trim();
          // Handle quoted strings
          if ((value.startsWith("'") && value.endsWith("'")) || 
              (value.startsWith('"') && value.endsWith('"'))) {
            return value.substring(1, value.length - 1);
          }
          // Handle JSON data
          if (value.startsWith("'{") && value.endsWith("}'")) {
            // Attempt to parse the JSON
            return JSON.parse(value.substring(1, value.length - 1));
          }
          // Handle NULL values
          if (value.toUpperCase() === 'NULL') {
            return null;
          }
          // Try to convert to number if appropriate
          const num = Number(value);
          return isNaN(num) ? value : num;
        });
        
        // Assuming the order of columns in the SQL INSERT statement
        const service = {
          id: values[0],
          name: values[1],
          type: values[2],
          price: values[3],
          min_order: values[4],
          max_order: values[5],
          provider_id: values[6],
          metadata: values[7] || {}
        };
        
        services.push(service);
      } catch (error) {
        console.error(`Error parsing SQL row: ${match[1]}`, error);
      }
    }
  }
  
  return services;
}

// Function to extract provider data from SQL file content
function extractProviderDataFromSQL(sqlContent) {
  const providers = [];
  const insertPattern = /INSERT INTO .*\(.*\) VALUES\s*\((.*)\);/g;
  const matches = sqlContent.matchAll(insertPattern);
  
  for (const match of matches) {
    if (match[1]) {
      try {
        const values = match[1].split(',').map(value => {
          value = value.trim();
          // Handle quoted strings
          if ((value.startsWith("'") && value.endsWith("'")) || 
              (value.startsWith('"') && value.endsWith('"'))) {
            return value.substring(1, value.length - 1);
          }
          // Handle NULL values
          if (value.toUpperCase() === 'NULL') {
            return null;
          }
          // Try to convert to number if appropriate
          const num = Number(value);
          return isNaN(num) ? value : num;
        });
        
        // Assuming the order of columns in the SQL INSERT statement for providers
        const provider = {
          id: values[0],
          name: values[1],
          slug: values[2],
          api_key: values[3],
          api_url: values[4],
          created_at: values[5],
          updated_at: values[6]
        };
        
        providers.push(provider);
      } catch (error) {
        console.error(`Error parsing provider SQL row: ${match[1]}`, error);
      }
    }
  }
  
  return providers;
}

// Function to identify platform from service name
function identifyPlatform(serviceName) {
  const name = serviceName.toLowerCase();
  
  for (const [platform, keywords] of Object.entries(PLATFORM_KEYWORDS)) {
    for (const keyword of keywords) {
      if (name.includes(keyword)) {
        return platform;
      }
    }
  }
  
  return 'other';
}

// Function to identify provider based on patterns in the service name
function identifyProviderByPattern(serviceName) {
  const name = serviceName.toLowerCase();
  
  // SmartPanel pattern
  if (/\bsmart\b|\bsmp\b|^sp[0-9]/i.test(name)) {
    return '203a2011-b1eb-4be8-87dd-257db9377072'; // SmartPanel
  }
  
  // SMMPanel pattern
  if (/\bsmm\b|^smm|\bpanel\b/i.test(name)) {
    return '7da7d672-c907-4474-a700-ca6df4c72842'; // SMMPanel
  }
  
  // FollowersGuru pattern
  if (/\bguru\b|\bfollowers?\b|\bfollow\b/i.test(name)) {
    return '153eb018-772e-47ff-890f-4f05b924e9ad'; // FollowersGuru
  }
  
  // BoostGram pattern
  if (/\bboost\b|\bgram\b|\bbg\b/i.test(name)) {
    return '232399c2-d2c2-482a-9622-9376d4598b3f'; // BoostGram
  }
  
  // InstaPanel pattern
  if (/\binsta\b|\bip\b/i.test(name)) {
    return 'dcd15b48-d42b-476d-b360-90f0b68cce2d'; // InstaPanel
  }
  
  // MediaPanel pattern
  if (/\bmedia\b|\bmp\b/i.test(name)) {
    return 'f5c051a0-c655-479b-bc74-70b17b6aff28'; // MediaPanel
  }
  
  // If no match, return null
  return null;
}

// Function to analyze and map services to providers
async function mapServicesToProviders(servicesFilePath, providersFilePath = null) {
  console.log('Mapping services to providers...');
  
  try {
    // Read the services SQL file
    const servicesSqlContent = fs.readFileSync(servicesFilePath, 'utf8');
    let services = extractServiceDataFromSQL(servicesSqlContent);
    console.log(`Extracted ${services.length} services from SQL file`);
    
    // Read providers if a file is provided
    let externalProviders = [];
    if (providersFilePath) {
      const providersSqlContent = fs.readFileSync(providersFilePath, 'utf8');
      externalProviders = extractProviderDataFromSQL(providersSqlContent);
      console.log(`Extracted ${externalProviders.length} providers from SQL file`);
    }
    
    // Analyze services without provider_id
    const unmappedServices = services.filter(service => !service.provider_id);
    console.log(`Found ${unmappedServices.length} services without provider mapping`);
    
    // Create mapping results structure
    const mappingResults = {
      total: services.length,
      unmapped: unmappedServices.length,
      mapped: services.length - unmappedServices.length,
      newlyMapped: 0,
      byProvider: {},
      byPlatform: {}
    };
    
    // Initialize counters for providers
    PROVIDERS.forEach(provider => {
      mappingResults.byProvider[provider.id] = {
        name: provider.name,
        count: services.filter(service => service.provider_id === provider.id).length,
        newlyMapped: 0
      };
    });
    
    // Map unmapped services to providers
    for (const service of unmappedServices) {
      const providerId = identifyProviderByPattern(service.name);
      
      if (providerId) {
        service.provider_id = providerId;
        mappingResults.newlyMapped++;
        mappingResults.byProvider[providerId].newlyMapped++;
        
        // Identify platform
        const platform = identifyPlatform(service.name);
        if (!mappingResults.byPlatform[platform]) {
          mappingResults.byPlatform[platform] = {
            count: 0,
            providers: {}
          };
        }
        mappingResults.byPlatform[platform].count++;
        
        if (!mappingResults.byPlatform[platform].providers[providerId]) {
          mappingResults.byPlatform[platform].providers[providerId] = 0;
        }
        mappingResults.byPlatform[platform].providers[providerId]++;
      }
    }
    
    // Generate mapping report
    console.log('\n=== Service to Provider Mapping Report ===');
    console.log(`Total services: ${mappingResults.total}`);
    console.log(`Previously mapped: ${mappingResults.mapped}`);
    console.log(`Newly mapped: ${mappingResults.newlyMapped}`);
    console.log(`Remaining unmapped: ${mappingResults.unmapped - mappingResults.newlyMapped}`);
    
    console.log('\nMapping by provider:');
    for (const provider of PROVIDERS) {
      const providerStats = mappingResults.byProvider[provider.id];
      console.log(`  ${provider.name}: ${providerStats.count} existing + ${providerStats.newlyMapped} new = ${providerStats.count + providerStats.newlyMapped} total`);
    }
    
    console.log('\nMapping by platform:');
    for (const [platform, stats] of Object.entries(mappingResults.byPlatform)) {
      console.log(`  ${platform.charAt(0).toUpperCase() + platform.slice(1)}: ${stats.count} services`);
      
      // Show provider distribution for this platform
      const providerDistribution = Object.entries(stats.providers)
        .map(([providerId, count]) => {
          const provider = PROVIDERS.find(p => p.id === providerId);
          return `${provider.name}: ${count}`;
        })
        .join(', ');
      
      if (providerDistribution) {
        console.log(`    Distribution: ${providerDistribution}`);
      }
    }
    
    // Generate SQL for updating provider_id
    const outputDir = path.dirname(servicesFilePath);
    const outputFilePath = path.join(outputDir, 'update_provider_mapping.sql');
    
    let sqlContent = '-- SQL to update provider_id for mapped services\n\n';
    
    for (const service of services) {
      if (service.provider_id && service.id) {
        sqlContent += `UPDATE "Service" SET provider_id = '${service.provider_id}' WHERE id = '${service.id}';\n`;
      }
    }
    
    fs.writeFileSync(outputFilePath, sqlContent);
    console.log(`\nSQL update statements written to: ${outputFilePath}`);
    
    // Generate statistics for unmapped services
    const remainingUnmapped = services.filter(service => !service.provider_id);
    if (remainingUnmapped.length > 0) {
      console.log(`\n${remainingUnmapped.length} services remain unmapped. Sample of unmapped services:`);
      
      for (const service of remainingUnmapped.slice(0, 10)) {
        console.log(`  - ID: ${service.id}, Name: ${service.name}`);
      }
      
      // Write unmapped services to file for further analysis
      const unmappedFilePath = path.join(outputDir, 'unmapped_services.json');
      fs.writeFileSync(unmappedFilePath, JSON.stringify(remainingUnmapped, null, 2));
      console.log(`Full list of unmapped services written to: ${unmappedFilePath}`);
    }
    
    // Generate JavaScript function for identifying providers
    const jsFilePath = path.join(outputDir, 'identify_provider.js');
    const jsContent = `
/**
 * Identifies the provider based on the service name pattern
 * 
 * @param {string} serviceName - The name of the service
 * @returns {string|null} - Provider ID or null if no match
 */
function identifyProviderByName(serviceName) {
  const name = serviceName.toLowerCase();
  
  // SmartPanel pattern
  if (/\\bsmart\\b|\\bsmp\\b|^sp[0-9]/i.test(name)) {
    return '203a2011-b1eb-4be8-87dd-257db9377072'; // SmartPanel
  }
  
  // SMMPanel pattern
  if (/\\bsmm\\b|^smm|\\bpanel\\b/i.test(name)) {
    return '7da7d672-c907-4474-a700-ca6df4c72842'; // SMMPanel
  }
  
  // FollowersGuru pattern
  if (/\\bguru\\b|\\bfollowers?\\b|\\bfollow\\b/i.test(name)) {
    return '153eb018-772e-47ff-890f-4f05b924e9ad'; // FollowersGuru
  }
  
  // BoostGram pattern
  if (/\\bboost\\b|\\bgram\\b|\\bbg\\b/i.test(name)) {
    return '232399c2-d2c2-482a-9622-9376d4598b3f'; // BoostGram
  }
  
  // InstaPanel pattern
  if (/\\binsta\\b|\\bip\\b/i.test(name)) {
    return 'dcd15b48-d42b-476d-b360-90f0b68cce2d'; // InstaPanel
  }
  
  // MediaPanel pattern
  if (/\\bmedia\\b|\\bmp\\b/i.test(name)) {
    return 'f5c051a0-c655-479b-bc74-70b17b6aff28'; // MediaPanel
  }
  
  // If no match, return null
  return null;
}

module.exports = { identifyProviderByName };
`;
    
    fs.writeFileSync(jsFilePath, jsContent);
    console.log(`Provider identification function written to: ${jsFilePath}`);
    
    return mappingResults;
    
  } catch (error) {
    console.error('Error mapping services to providers:', error);
    return {
      error: error.message
    };
  }
}

// Check if file paths are provided as command line arguments
const servicesFilePath = process.argv[2];
const providersFilePath = process.argv[3];

if (!servicesFilePath) {
  console.log('Usage: node map-services-to-providers.js <path-to-services-sql-file> [path-to-providers-sql-file]');
} else {
  mapServicesToProviders(servicesFilePath, providersFilePath).then(() => {
    console.log('\nMapping complete');
    process.exit(0);
  }).catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
} 