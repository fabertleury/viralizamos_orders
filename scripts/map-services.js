const fs = require('fs');
const path = require('path');

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

// Function to identify platform from service name
function identifyPlatform(serviceName) {
  const name = serviceName.toLowerCase();
  
  if (/instagram|insta|ig|igtv|reels/i.test(name)) return 'instagram';
  if (/facebook|fb|meta/i.test(name)) return 'facebook';
  if (/twitter|tweet|x\.com/i.test(name)) return 'twitter';
  if (/tiktok|tik tok|tt/i.test(name)) return 'tiktok';
  if (/youtube|yt|youtu\.be/i.test(name)) return 'youtube';
  if (/telegram|tg/i.test(name)) return 'telegram';
  if (/spotify/i.test(name)) return 'spotify';
  if (/linkedin|linked-in/i.test(name)) return 'linkedin';
  if (/discord/i.test(name)) return 'discord';
  if (/twitch/i.test(name)) return 'twitch';
  if (/pinterest|pin/i.test(name)) return 'pinterest';
  if (/snapchat|snap/i.test(name)) return 'snapchat';
  
  return 'other';
}

// Main function to analyze services and map to providers
function mapServices(servicesFilePath) {
  console.log('Analyzing services from SQL file...');
  
  try {
    // Read the services SQL file
    const servicesSqlContent = fs.readFileSync(servicesFilePath, 'utf8');
    const services = extractServiceDataFromSQL(servicesSqlContent);
    console.log(`Extracted ${services.length} services from SQL file`);
    
    // Stats tracking
    const stats = {
      total: services.length,
      mapped: 0,
      unmapped: 0,
      byProvider: {},
      byPlatform: {}
    };
    
    // Initialize provider stats
    PROVIDERS.forEach(provider => {
      stats.byProvider[provider.id] = {
        name: provider.name,
        count: 0,
        services: []
      };
    });
    
    // Process each service
    services.forEach(service => {
      // Check if already has provider_id
      if (service.provider_id) {
        stats.mapped++;
        
        // Add to provider stats if known provider
        if (stats.byProvider[service.provider_id]) {
          stats.byProvider[service.provider_id].count++;
          stats.byProvider[service.provider_id].services.push({
            id: service.id,
            name: service.name
          });
        }
      } else {
        // Try to identify provider
        const providerId = identifyProviderByPattern(service.name);
        
        if (providerId) {
          service.provider_id = providerId;
          stats.mapped++;
          
          stats.byProvider[providerId].count++;
          stats.byProvider[providerId].services.push({
            id: service.id,
            name: service.name
          });
        } else {
          stats.unmapped++;
        }
      }
      
      // Track platform stats
      const platform = identifyPlatform(service.name);
      if (!stats.byPlatform[platform]) {
        stats.byPlatform[platform] = {
          count: 0,
          byProvider: {}
        };
      }
      
      stats.byPlatform[platform].count++;
      
      if (service.provider_id) {
        if (!stats.byPlatform[platform].byProvider[service.provider_id]) {
          stats.byPlatform[platform].byProvider[service.provider_id] = 0;
        }
        stats.byPlatform[platform].byProvider[service.provider_id]++;
      }
    });
    
    // Generate SQL for updating provider_id
    let sqlContent = '-- SQL to update provider_id for mapped services\n\n';
    
    services.forEach(service => {
      if (service.provider_id && service.id) {
        sqlContent += `UPDATE "Service" SET provider_id = '${service.provider_id}' WHERE id = '${service.id}';\n`;
      }
    });
    
    const outputDir = path.dirname(servicesFilePath);
    const sqlOutputPath = path.join(outputDir, 'update_providers.sql');
    fs.writeFileSync(sqlOutputPath, sqlContent);
    
    // Generate provider summary
    console.log('\n=== Provider Summary ===');
    Object.entries(stats.byProvider).forEach(([providerId, providerStats]) => {
      console.log(`${providerStats.name}: ${providerStats.count} services`);
    });
    
    console.log('\n=== Platform Summary ===');
    Object.entries(stats.byPlatform).forEach(([platform, platformStats]) => {
      console.log(`${platform}: ${platformStats.count} services`);
      
      // Show provider distribution
      if (Object.keys(platformStats.byProvider).length > 0) {
        console.log('  Provider distribution:');
        Object.entries(platformStats.byProvider).forEach(([providerId, count]) => {
          const providerName = PROVIDERS.find(p => p.id === providerId)?.name || 'Unknown';
          console.log(`    ${providerName}: ${count} services`);
        });
      }
    });
    
    console.log(`\nTotal: ${stats.total} services`);
    console.log(`Mapped: ${stats.mapped} services`);
    console.log(`Unmapped: ${stats.unmapped} services`);
    console.log(`\nSQL updates written to: ${sqlOutputPath}`);
    
    // Save full results to JSON
    const jsonOutputPath = path.join(outputDir, 'service_mapping_results.json');
    fs.writeFileSync(jsonOutputPath, JSON.stringify(stats, null, 2));
    console.log(`Detailed results written to: ${jsonOutputPath}`);
    
    return stats;
  } catch (error) {
    console.error('Error processing services:', error);
    return { error: error.message };
  }
}

// Check if file path is provided as command line argument
const servicesFilePath = process.argv[2];

if (!servicesFilePath) {
  console.log('Usage: node map-services.js <path-to-services-sql-file>');
} else {
  mapServices(servicesFilePath);
} 