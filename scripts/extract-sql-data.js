const fs = require('fs');
const path = require('path');

/**
 * Extract data from SQL files into JavaScript format
 */

/**
 * Parse SQL INSERT statements to extract values
 * @param {string} filePath - Path to SQL file
 * @returns {Array} - Array of extracted values
 */
function parseSqlInsertFile(filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  const values = [];

  // Find all INSERT statements (may be multiple)
  const insertStatements = sql.match(/INSERT INTO [^;]+;/g) || [];
  
  for (const statement of insertStatements) {
    // Extract values sections: VALUES (...), (...), ...
    const valuesMatch = statement.match(/VALUES\s*\((.*)\);/s);
    if (!valuesMatch) continue;
    
    let valuesText = valuesMatch[1];
    
    // Handle multiple value sets
    // Split on '),(' pattern but keep delimiters with the appropriate part
    const valuesSets = valuesText.split(/\),\s*\(/);
    
    for (let i = 0; i < valuesSets.length; i++) {
      let valueSet = valuesSets[i];
      
      // Add back the delimiters except for first and last element
      if (i > 0) {
        valueSet = '(' + valueSet;
      }
      if (i < valuesSets.length - 1) {
        valueSet = valueSet + ')';
      }
      
      // Parse individual values
      const matches = [];
      let inString = false;
      let current = '';
      let depth = 0;
      
      for (let j = 0; j < valueSet.length; j++) {
        const char = valueSet[j];
        
        if (char === "'" && (j === 0 || valueSet[j-1] !== '\\')) {
          inString = !inString;
          current += char;
        } else if (char === '(' && !inString) {
          depth++;
          current += char;
        } else if (char === ')' && !inString) {
          depth--;
          current += char;
        } else if (char === ',' && !inString && depth === 0) {
          matches.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      
      if (current) {
        matches.push(current.trim());
      }
      
      values.push(matches.map(v => processValue(v)));
    }
  }
  
  return values;
}

/**
 * Convert SQL string values to appropriate JS types
 * @param {string} value - SQL value string
 * @returns {any} - Converted JavaScript value
 */
function processValue(value) {
  if (value === 'NULL') {
    return null;
  }
  
  // Handle JSON strings
  if (value.startsWith("'{") && value.endsWith("}'")) {
    try {
      // Remove the outer quotes and any escaping
      const jsonStr = value.substring(1, value.length - 1).replace(/\\"/g, '"');
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error('Error parsing JSON:', e);
      return value;
    }
  }
  
  // Handle regular strings
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.substring(1, value.length - 1).replace(/\\'/g, "'");
  }
  
  // Handle numbers
  if (!isNaN(value)) {
    return Number(value);
  }
  
  return value;
}

/**
 * Extract provider data from SQL
 * @param {string} filePath - Path to providers SQL file
 * @returns {Array} - Array of provider objects
 */
function extractProviders(filePath) {
  const values = parseSqlInsertFile(filePath);
  
  return values.map(row => ({
    id: row[0],
    name: row[1],
    website: row[2] || null,
    api_url: row[3] || null,
    api_key: row[4] || null,
    active: row[5] === true || row[5] === 1,
    created_at: new Date(row[6]),
    updated_at: new Date(row[7]),
  }));
}

/**
 * Extract service data from SQL
 * @param {string} filePath - Path to services SQL file
 * @returns {Array} - Array of service objects
 */
function extractServices(filePath) {
  const values = parseSqlInsertFile(filePath);
  
  return values.map(row => ({
    id: row[0],
    provider_id: row[1],
    external_id: row[2] || null,
    name: row[3],
    type: row[4],
    description: row[5] || null,
    price: row[6],
    min_order: row[7],
    max_order: row[8],
    category_id: row[9] || null,
    subcategory_id: row[10] || null,
    active: row[11] === true || row[11] === 1,
    created_at: new Date(row[12]),
    updated_at: new Date(row[13]),
    metadata: row[14] || null,
  }));
}

/**
 * Save extracted data as JavaScript file
 * @param {Array} data - Data to save
 * @param {string} outputPath - Output file path
 * @param {string} variableName - JavaScript variable name
 */
function saveAsJsData(data, outputPath, variableName) {
  const jsContent = `const ${variableName} = ${JSON.stringify(data, null, 2)};\n\nmodule.exports = ${variableName};\n`;
  fs.writeFileSync(outputPath, jsContent, 'utf8');
  console.log(`Saved ${variableName} data to ${outputPath}`);
}

/**
 * Main function to extract and save providers and services data
 */
function extractData(providersFile, servicesFile) {
  try {
    // Create data directory if it doesn't exist
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir);
      console.log('Created data directory');
    }

    if (providersFile) {
      const providers = extractProviders(providersFile);
      const providersOutputPath = path.join(dataDir, 'providers.js');
      saveAsJsData(providers, providersOutputPath, 'providers');
      console.log(`Extracted ${providers.length} providers`);
    }

    if (servicesFile) {
      const services = extractServices(servicesFile);
      const servicesOutputPath = path.join(dataDir, 'services.js');
      saveAsJsData(services, servicesOutputPath, 'services');
      console.log(`Extracted ${services.length} services`);
    }

    console.log('Data extraction completed successfully!');
  } catch (error) {
    console.error('Error during data extraction:', error);
  }
}

// Default file paths (update these to point to the downloaded SQL files)
const providersFile = 'c:\\Users\\faber\\Downloads\\providers_rows (1).sql';
const servicesFile = 'c:\\Users\\faber\\Downloads\\services_rows (1).sql';

// Run the extraction
extractData(providersFile, servicesFile); 
extractData(providersFile, servicesFile); 