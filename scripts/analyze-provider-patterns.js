const fs = require('fs');
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

// Function to analyze patterns in service names for each provider
async function analyzeProviderPatterns(filePath) {
  console.log('Analyzing provider patterns from services data...');
  
  try {
    // Read the SQL file
    const sqlContent = fs.readFileSync(filePath, 'utf8');
    
    // Extract service data
    const services = extractServiceDataFromSQL(sqlContent);
    console.log(`Extracted ${services.length} services from SQL file`);
    
    // Group services by provider
    const servicesByProvider = {};
    PROVIDERS.forEach(provider => {
      servicesByProvider[provider.id] = services.filter(
        service => service.provider_id === provider.id
      );
    });
    
    // Analyze patterns for each provider
    const patterns = {};
    
    for (const provider of PROVIDERS) {
      const providerServices = servicesByProvider[provider.id] || [];
      console.log(`\n=== Provider: ${provider.name} (${provider.id}) ===`);
      console.log(`Total services: ${providerServices.length}`);
      
      if (providerServices.length > 0) {
        // Extract common words and patterns
        const words = {};
        const prefixes = {};
        const suffixes = {};
        
        providerServices.forEach(service => {
          // Split service name into words
          const serviceWords = service.name.split(/\s+/);
          serviceWords.forEach(word => {
            word = word.toLowerCase();
            words[word] = (words[word] || 0) + 1;
          });
          
          // Check for common prefixes (first 3-5 characters)
          const name = service.name.toLowerCase();
          for (let i = 3; i <= 5 && i < name.length; i++) {
            const prefix = name.substring(0, i);
            prefixes[prefix] = (prefixes[prefix] || 0) + 1;
          }
          
          // Check for common suffixes (last 3-5 characters)
          for (let i = 3; i <= 5 && i < name.length; i++) {
            const suffix = name.substring(name.length - i);
            suffixes[suffix] = (suffixes[suffix] || 0) + 1;
          }
        });
        
        // Find the most common words (appearing in at least 30% of services)
        const threshold = Math.ceil(providerServices.length * 0.3);
        const commonWords = Object.entries(words)
          .filter(([word, count]) => count >= threshold && word.length > 2)
          .sort((a, b) => b[1] - a[1])
          .map(([word, count]) => ({ word, count, percentage: (count / providerServices.length * 100).toFixed(1) }));
        
        // Find the most common prefixes and suffixes
        const commonPrefixes = Object.entries(prefixes)
          .filter(([prefix, count]) => count >= threshold)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([prefix, count]) => ({ prefix, count, percentage: (count / providerServices.length * 100).toFixed(1) }));
        
        const commonSuffixes = Object.entries(suffixes)
          .filter(([suffix, count]) => count >= threshold)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([suffix, count]) => ({ suffix, count, percentage: (count / providerServices.length * 100).toFixed(1) }));
        
        // Store the patterns
        patterns[provider.id] = {
          commonWords,
          commonPrefixes,
          commonSuffixes,
          serviceCount: providerServices.length
        };
        
        // Log the results
        console.log('\nCommon words:');
        commonWords.forEach(({ word, count, percentage }) => {
          console.log(`  ${word}: ${count} services (${percentage}%)`);
        });
        
        console.log('\nCommon prefixes:');
        commonPrefixes.forEach(({ prefix, count, percentage }) => {
          console.log(`  ${prefix}: ${count} services (${percentage}%)`);
        });
        
        console.log('\nCommon suffixes:');
        commonSuffixes.forEach(({ suffix, count, percentage }) => {
          console.log(`  ${suffix}: ${count} services (${percentage}%)`);
        });
        
        // Sample service names
        console.log('\nSample service names:');
        providerServices.slice(0, 5).forEach(service => {
          console.log(`  - ${service.name}`);
        });
      }
    }
    
    // Generate regex patterns based on the analysis
    console.log('\n=== Suggested Regex Patterns for Provider Identification ===');
    const regexPatterns = {};
    
    for (const provider of PROVIDERS) {
      const pattern = patterns[provider.id];
      if (pattern && pattern.serviceCount > 0) {
        let regexParts = [];
        
        // Use common words for the pattern
        if (pattern.commonWords.length > 0) {
          const wordPatterns = pattern.commonWords
            .slice(0, 3)
            .map(({ word }) => `\\b${word}\\b`)
            .join('|');
          
          if (wordPatterns) {
            regexParts.push(`(?:${wordPatterns})`);
          }
        }
        
        // Use common prefixes for the pattern
        if (pattern.commonPrefixes.length > 0) {
          const prefixPatterns = pattern.commonPrefixes
            .map(({ prefix }) => `^${prefix}`)
            .join('|');
          
          if (prefixPatterns) {
            regexParts.push(`(?:${prefixPatterns})`);
          }
        }
        
        // Use common suffixes for the pattern
        if (pattern.commonSuffixes.length > 0) {
          const suffixPatterns = pattern.commonSuffixes
            .map(({ suffix }) => `${suffix}$`)
            .join('|');
          
          if (suffixPatterns) {
            regexParts.push(`(?:${suffixPatterns})`);
          }
        }
        
        const regexPattern = regexParts.length > 0 
          ? regexParts.join('|') 
          : null;
        
        if (regexPattern) {
          regexPatterns[provider.id] = regexPattern;
          console.log(`\n${provider.name}: /${regexPattern}/i`);
        } else {
          console.log(`\n${provider.name}: No distinctive pattern identified`);
        }
      }
    }
    
    // Generate helper function for provider identification
    console.log('\n=== Provider Identification Function ===');
    console.log(`
function identifyProviderByName(serviceName) {
  const name = serviceName.toLowerCase();
  
  ${PROVIDERS.map(provider => {
    const pattern = regexPatterns[provider.id];
    if (pattern) {
      return `// ${provider.name}\n  if (/${pattern}/i.test(name)) {\n    return '${provider.id}';\n  }`;
    }
    return `// ${provider.name} - No distinctive pattern identified`;
  }).join('\n\n  ')}
  
  // Default provider if no match is found
  return null;
}
`);
    
    return {
      patterns,
      regexPatterns
    };
    
  } catch (error) {
    console.error('Error analyzing provider patterns:', error);
    return {
      error: error.message
    };
  }
}

// Check if file path is provided as command line argument
const filePath = process.argv[2];

if (!filePath) {
  console.log('Usage: node analyze-provider-patterns.js <path-to-sql-file>');
} else {
  analyzeProviderPatterns(filePath).then(() => {
    console.log('\nAnalysis complete');
    process.exit(0);
  }).catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
} 