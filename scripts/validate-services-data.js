const fs = require('fs');
const path = require('path');

// Define expected structure of a service
const serviceSchema = {
  id: { type: 'string', required: true },
  name: { type: 'string', required: true },
  type: { type: 'string', required: true },
  price: { type: 'number', required: true },
  min_order: { type: 'number', required: true },
  max_order: { type: 'number', required: true },
  provider_id: { type: 'string', required: true },
  metadata: { type: 'object', required: false }
};

// Known provider IDs from SQL data
const knownProviderIds = [
  '153eb018-772e-47ff-890f-4f05b924e9ad',
  '203a2011-b1eb-4be8-87dd-257db9377072',
  '232399c2-d2c2-482a-9622-9376d4598b3f',
  '7da7d672-c907-4474-a700-ca6df4c72842',
  'dcd15b48-d42b-476d-b360-90f0b68cce2d',
  'f5c051a0-c655-479b-bc74-70b17b6aff28'
];

// Function to extract service data from SQL file content
function extractServiceDataFromSQL(sqlContent) {
  const services = [];
  const insertPattern = /INSERT INTO .*\(.*\) VALUES\s*\((.*)\);/g;
  const matches = sqlContent.matchAll(insertPattern);
  
  for (const match of matches) {
    if (match[1]) {
      try {
        // This is a simplified approach and might need adjustments based on actual SQL format
        const values = match[1].split(',').map(value => {
          value = value.trim();
          // Handle quoted strings
          if ((value.startsWith("'") && value.endsWith("'")) || 
              (value.startsWith('"') && value.endsWith('"'))) {
            return value.substring(1, value.length - 1);
          }
          // Handle JSON data
          if (value.startsWith("'{") && value.endsWith("}'")) {
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
        // This would need to be adjusted based on actual column order
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

// Validate a single service object
function validateService(service, index) {
  const errors = [];
  
  // Check for required fields and types
  for (const [field, config] of Object.entries(serviceSchema)) {
    if (config.required && (service[field] === undefined || service[field] === null)) {
      errors.push(`Missing required field: ${field}`);
    } else if (service[field] !== undefined && service[field] !== null) {
      const actualType = typeof service[field];
      if (actualType !== config.type) {
        errors.push(`Field ${field} has incorrect type: expected ${config.type}, got ${actualType}`);
      }
    }
  }
  
  // Additional validations
  if (service.min_order > service.max_order) {
    errors.push(`min_order (${service.min_order}) is greater than max_order (${service.max_order})`);
  }
  
  if (service.price < 0) {
    errors.push(`price (${service.price}) is negative`);
  }
  
  if (service.provider_id && !knownProviderIds.includes(service.provider_id)) {
    errors.push(`provider_id (${service.provider_id}) is not in the list of known providers`);
  }
  
  return {
    serviceIndex: index,
    serviceId: service.id,
    serviceName: service.name,
    hasErrors: errors.length > 0,
    errors
  };
}

// Main validation function
function validateServicesData(filePath) {
  console.log(`Validating services data from: ${filePath}`);
  
  try {
    // Read the SQL file
    const sqlContent = fs.readFileSync(filePath, 'utf8');
    
    // Extract service data
    const services = extractServiceDataFromSQL(sqlContent);
    console.log(`Extracted ${services.length} services from SQL file`);
    
    // Validate each service
    const validationResults = services.map((service, index) => validateService(service, index));
    
    // Summarize results
    const validServices = validationResults.filter(result => !result.hasErrors);
    const invalidServices = validationResults.filter(result => result.hasErrors);
    
    console.log('\n=== Validation Summary ===');
    console.log(`Total services: ${services.length}`);
    console.log(`Valid services: ${validServices.length}`);
    console.log(`Invalid services: ${invalidServices.length}`);
    
    // Log details of invalid services
    if (invalidServices.length > 0) {
      console.log('\n=== Invalid Services ===');
      invalidServices.forEach(result => {
        console.log(`\nService #${result.serviceIndex}: ${result.serviceName} (${result.serviceId})`);
        result.errors.forEach(error => console.log(`  - ${error}`));
      });
    }
    
    // Return validation results for potential further processing
    return {
      totalServices: services.length,
      validServices: validServices.length,
      invalidServices: invalidServices.length,
      detailedResults: validationResults,
      services: services
    };
    
  } catch (error) {
    console.error('Error validating services data:', error);
    return {
      error: error.message,
      totalServices: 0,
      validServices: 0,
      invalidServices: 0,
      detailedResults: [],
      services: []
    };
  }
}

// Check if file path is provided as command line argument
const filePath = process.argv[2];

if (!filePath) {
  console.log('Usage: node validate-services-data.js <path-to-sql-file>');
} else {
  validateServicesData(filePath);
} 