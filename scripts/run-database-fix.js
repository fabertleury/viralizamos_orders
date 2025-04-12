/**
 * Script para corrigir problemas do banco de dados
 * Execute com: node scripts/run-database-fix.js
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Obter conexão do ambiente ou usar um valor padrão
const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/viralizamos_orders';

console.log('🔧 Conectando ao banco de dados...');
console.log(`   URL: ${databaseUrl.split('@')[1]}`); // Mostrar apenas o host, sem credenciais

// Criar cliente PostgreSQL
const client = new Client({
  connectionString: databaseUrl,
});

async function run() {
  try {
    // Conectar ao banco de dados
    await client.connect();
    console.log('✅ Conexão ao banco de dados estabelecida!');
    
    // Ler arquivo SQL
    const sqlPath = path.join(__dirname, 'fix-database.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Dividir em comandos individuais
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0);
    
    console.log(`📋 Executando ${commands.length} comandos SQL...`);
    
    // Executar cada comando individualmente
    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i];
      try {
        console.log(`\n🔄 Comando ${i+1}/${commands.length}:`);
        console.log(cmd);
        
        const result = await client.query(cmd);
        console.log(`✅ Comando executado com sucesso! (${result.rowCount || 0} linhas afetadas)`);
      } catch (err) {
        console.error(`❌ Erro ao executar comando: ${err.message}`);
      }
    }
    
    // Verificar se o serviço existe
    try {
      const serviceCheck = await client.query(`
        SELECT id, name, status FROM "Service" 
        WHERE id IN ('691a9dfa-0ea2-41a4-bd5f-6104b80365e0', '89cd99e0-83af-43f6-816e-67d68158d482')
      `);
      
      console.log(`\n✅ Serviços encontrados: ${serviceCheck.rowCount}`);
      serviceCheck.rows.forEach(row => {
        console.log(`   - ${row.id}: ${row.name} (${row.status})`);
      });
    } catch (err) {
      console.error(`❌ Erro ao verificar serviços: ${err.message}`);
    }
    
    console.log('\n🎉 Script de correção concluído!');
  } catch (err) {
    console.error('❌ Erro ao executar script:', err);
  } finally {
    // Fechar conexão
    await client.end();
  }
}

// Executar o script
run().catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
}); 