/**
 * Script para verificar transações recebidas do microserviço de pagamentos
 * e diagnosticar problemas na criação de orders
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTransactions() {
  console.log('=== VERIFICANDO COMUNICAÇÃO ENTRE PAGAMENTOS E ORDERS ===\n');
  
  try {
    // 1. Verificar os logs de webhooks recebidos do serviço de pagamentos
    console.log('Verificando webhooks recebidos do serviço de pagamentos...');
    
    const webhooks = await prisma.webhookLog.findMany({
      where: {
        webhook_type: 'payment_notification',
        source: 'payment-service'
      },
      orderBy: {
        received_at: 'desc'
      },
      take: 10
    });
    
    console.log(`\nForam encontrados ${webhooks.length} webhooks de pagamento.`);
    
    if (webhooks.length === 0) {
      console.log('\n❌ PROBLEMA: Nenhum webhook recebido do serviço de pagamentos.');
      console.log('   Possíveis causas:');
      console.log('   1. Problemas de rede ou firewall entre os serviços');
      console.log('   2. URL incorreta configurada no serviço de pagamentos');
      console.log('   3. Não há pagamentos sendo processados');
      console.log('\n   Recomendação: Verifique a configuração ORDERS_SERVICE_URL no ambiente de pagamentos');
    } else {
      console.log('\n✅ Webhooks estão sendo recebidos do serviço de pagamentos.');
      
      // Mostrar os 3 webhooks mais recentes
      console.log('\nWebhooks mais recentes:');
      webhooks.slice(0, 3).forEach((webhook, index) => {
        console.log(`\n[${index + 1}] ID: ${webhook.id}`);
        console.log(`    Recebido em: ${webhook.received_at}`);
        console.log(`    Processado: ${webhook.processed ? 'Sim' : 'Não'}`);
        if (webhook.processed) {
          console.log(`    Processado em: ${webhook.processed_at}`);
        }
        
        try {
          const payload = typeof webhook.payload === 'string' 
            ? JSON.parse(webhook.payload) 
            : webhook.payload;
          
          console.log(`    Tipo: ${payload.type || 'N/A'}`);
          console.log(`    Transaction ID: ${payload.transaction_id || 'N/A'}`);
          console.log(`    Payment ID: ${payload.payment_id || 'N/A'}`);
        } catch (e) {
          console.log(`    Erro ao processar payload: ${e.message}`);
        }
      });
    }
    
    // 2. Verificar ordens criadas recentemente
    console.log('\n\nVerificando ordens recentes...');
    
    const recentOrders = await prisma.order.findMany({
      orderBy: {
        created_at: 'desc'
      },
      take: 5
    });
    
    console.log(`\nForam encontradas ${recentOrders.length} ordens recentes.`);
    
    if (recentOrders.length === 0) {
      console.log('\n❌ PROBLEMA: Nenhuma ordem recente encontrada.');
      console.log('   Possíveis causas:');
      console.log('   1. Webhooks não estão sendo processados corretamente');
      console.log('   2. Erros na criação das ordens');
    } else {
      console.log('\n✅ Ordens estão sendo criadas no sistema.');
      
      // Mostrar as ordens mais recentes
      console.log('\nOrdens mais recentes:');
      recentOrders.forEach((order, index) => {
        console.log(`\n[${index + 1}] ID: ${order.id}`);
        console.log(`    Transaction ID: ${order.transaction_id}`);
        console.log(`    Service ID: ${order.service_id}`);
        console.log(`    External Service ID: ${order.external_service_id || 'N/A'}`);
        console.log(`    Status: ${order.status}`);
        console.log(`    Criado em: ${order.created_at}`);
      });
    }
    
    // 3. Verificar logs de erros recentes relacionados a webhooks
    console.log('\n\nVerificando logs de ordens com erros...');
    
    const errorLogs = await prisma.orderLog.findMany({
      where: {
        level: 'error',
        message: {
          contains: 'webhook'
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      take: 5
    });
    
    console.log(`\nForam encontrados ${errorLogs.length} logs de erro relacionados a webhooks.`);
    
    if (errorLogs.length > 0) {
      console.log('\n⚠️ ATENÇÃO: Há erros no processamento de webhooks.');
      
      // Mostrar os erros mais recentes
      console.log('\nErros mais recentes:');
      errorLogs.forEach((log, index) => {
        console.log(`\n[${index + 1}] ID: ${log.id}`);
        console.log(`    Ordem ID: ${log.order_id}`);
        console.log(`    Mensagem: ${log.message}`);
        console.log(`    Data: ${log.created_at}`);
        
        if (log.data) {
          try {
            const data = typeof log.data === 'string' ? JSON.parse(log.data) : log.data;
            console.log(`    Dados adicionais:`, JSON.stringify(data, null, 2));
          } catch (e) {
            console.log(`    Dados adicionais: ${log.data}`);
          }
        }
      });
    } else {
      console.log('\n✅ Não foram encontrados erros recentes relacionados a webhooks.');
    }
    
    // 4. Verificar webhooks não processados
    console.log('\n\nVerificando webhooks não processados...');
    
    const unprocessedWebhooks = await prisma.webhookLog.findMany({
      where: {
        webhook_type: 'payment_notification',
        source: 'payment-service',
        processed: false
      },
      orderBy: {
        received_at: 'desc'
      },
      take: 5
    });
    
    console.log(`\nForam encontrados ${unprocessedWebhooks.length} webhooks não processados.`);
    
    if (unprocessedWebhooks.length > 0) {
      console.log('\n⚠️ ATENÇÃO: Há webhooks que não foram processados.');
      
      // Mostrar os webhooks não processados
      console.log('\nWebhooks não processados:');
      unprocessedWebhooks.forEach((webhook, index) => {
        console.log(`\n[${index + 1}] ID: ${webhook.id}`);
        console.log(`    Recebido em: ${webhook.received_at}`);
        
        try {
          const payload = typeof webhook.payload === 'string' 
            ? JSON.parse(webhook.payload) 
            : webhook.payload;
          
          console.log(`    Tipo: ${payload.type || 'N/A'}`);
          console.log(`    Transaction ID: ${payload.transaction_id || 'N/A'}`);
          console.log(`    Payment ID: ${payload.payment_id || 'N/A'}`);
        } catch (e) {
          console.log(`    Erro ao processar payload: ${e.message}`);
        }
      });
      
      console.log('\n   Recomendação: Verifique os logs de erro para entender por que esses webhooks não foram processados.');
    } else {
      console.log('\n✅ Todos os webhooks recebidos foram processados.');
    }
    
    // 5. Resumo e diagnóstico
    console.log('\n\n=== RESUMO E DIAGNÓSTICO ===');
    
    if (webhooks.length === 0) {
      console.log('\n❌ PROBLEMA CRÍTICO: Não há comunicação entre os serviços de pagamento e orders.');
      console.log('   Ação recomendada: Verifique a configuração ORDERS_SERVICE_URL no serviço de pagamentos.');
    } else if (unprocessedWebhooks.length > 0) {
      console.log('\n⚠️ PROBLEMA DETECTADO: Há webhooks não processados.');
      console.log('   Ação recomendada: Verifique os logs de erro para identificar a causa.');
    } else if (recentOrders.length === 0) {
      console.log('\n⚠️ PROBLEMA DETECTADO: Webhooks recebidos, mas nenhuma ordem criada.');
      console.log('   Ação recomendada: Verifique se há erros no processamento dos webhooks.');
    } else {
      console.log('\n✅ Comunicação entre pagamentos e orders parece estar funcionando corretamente.');
      console.log('   Webhooks estão sendo recebidos e processados, e ordens estão sendo criadas.');
    }
    
  } catch (error) {
    console.error('\n❌ Erro ao executar verificação:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar a verificação
checkTransactions()
  .then(() => {
    console.log('\nVerificação concluída.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Erro fatal:', error);
    process.exit(1);
  }); 