// Script para atualizar o arquivo schema.prisma
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

function updateSchema() {
  console.log('Atualizando o arquivo schema.prisma com o modelo simplificado...');
  
  try {
    // Criar backup do schema original
    const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
    const backupPath = path.join(process.cwd(), 'prisma', 'schema.prisma.backup');
    
    // Verificar se o arquivo já existe
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(schemaPath, backupPath);
      console.log('✅ Backup do schema original criado com sucesso');
    } else {
      console.log('ℹ️ Backup já existente, não foi necessário criar um novo');
    }
    
    // Copiar o novo schema
    const newSchemaPath = path.join(process.cwd(), 'prisma', 'schema-clean.prisma');
    
    if (fs.existsSync(newSchemaPath)) {
      const newSchemaContent = fs.readFileSync(newSchemaPath, 'utf8');
      fs.writeFileSync(schemaPath, newSchemaContent);
      console.log('✅ schema.prisma atualizado com o modelo simplificado');
      
      // Tentar gerar o cliente Prisma
      console.log('Tentando regenerar o cliente Prisma...');
      
      exec('npx prisma generate', (error, stdout, stderr) => {
        if (error) {
          console.error(`❌ Erro ao regenerar cliente Prisma: ${error.message}`);
          console.log('\nVocê pode executar o comando manualmente:');
          console.log('npx prisma generate');
          return;
        }
        
        console.log('✅ Cliente Prisma regenerado com sucesso');
      });
      
    } else {
      console.error('❌ Arquivo schema-clean.prisma não encontrado');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Erro ao atualizar schema:', error);
    process.exit(1);
  }
}

updateSchema(); 