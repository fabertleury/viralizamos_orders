/**
 * Script para corrigir problemas do banco de dados
 * Este script executa o SQL para:
 * 1. Remover a restrição de chave estrangeira na tabela Order
 * 2. Adicionar o serviço faltante que está causando o erro
 */
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function runFixes() {
  console.log('🔧 Iniciando correções no banco de dados...');
  
  try {
    // Ler o arquivo SQL
    const sqlFilePath = path.join(__dirname, '../prisma/remove_service_id_constraint.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Dividir o arquivo em comandos SQL individuais
    const sqlCommands = sqlContent
      .split(';')
      .map(command => command.trim())
      .filter(command => command.length > 0);
      
    console.log(`📋 Encontrados ${sqlCommands.length} comandos SQL para executar`);
    
    // Executar cada comando individualmente
    for (let i = 0; i < sqlCommands.length; i++) {
      const command = sqlCommands[i];
      console.log(`🔄 Executando comando ${i + 1}/${sqlCommands.length}:`);
      console.log(command);
      
      try {
        await prisma.$executeRawUnsafe(`${command};`);
        console.log('✅ Comando executado com sucesso!');
      } catch (commandError) {
        console.error('❌ Erro ao executar comando:', commandError);
      }
    }
    
    // Verificar se o serviço existe agora
    const service = await prisma.service.findUnique({
      where: { id: '691a9dfa-0ea2-41a4-bd5f-6104b80365e0' }
    });
    
    if (service) {
      console.log('✅ Serviço encontrado no banco de dados:', {
        id: service.id,
        name: service.name,
        status: service.status
      });
    } else {
      console.warn('⚠️ Serviço ainda não está disponível!');
    }
    
    console.log('🎉 Processo de correção concluído!');
  } catch (error) {
    console.error('❌ Erro durante a execução do script de correção:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar o script
runFixes(); 