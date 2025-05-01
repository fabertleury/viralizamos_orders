import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { logger } from '@/lib/logger';

// String de conexão com o banco de dados de pagamentos
const paymentsDbUrl = 'postgresql://postgres:zacEqGceWerpWpBZZqttjamDOCcdhRbO@shinkansen.proxy.rlwy.net:29036/railway';

/**
 * Endpoint para atualizar o metadata de uma transação com o order_id
 * Este endpoint é chamado pelo microserviço de orders quando recebe a resposta do provedor
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar a chave de API
    const apiKey = request.headers.get('x-api-key');
    const expectedApiKey = process.env.ORDERS_API_KEY;
    
    if (!apiKey || apiKey !== expectedApiKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Obter os dados da requisição
    const data = await request.json();
    
    // Validar os dados
    if (!data.transaction_id) {
      return NextResponse.json({ error: 'Missing transaction_id' }, { status: 400 });
    }
    
    if (!data.order_id) {
      return NextResponse.json({ error: 'Missing order_id' }, { status: 400 });
    }
    
    // Conectar ao banco de dados de pagamentos
    const client = new Client({ connectionString: paymentsDbUrl });
    await client.connect();
    
    // Obter o metadata atual da transação
    const getMetadataQuery = `
      SELECT metadata
      FROM transactions
      WHERE id = $1;
    `;
    
    const metadataResult = await client.query(getMetadataQuery, [data.transaction_id]);
    
    if (metadataResult.rows.length === 0) {
      await client.end();
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }
    
    // Obter o metadata atual
    let metadata: any = {};
    try {
      metadata = JSON.parse(metadataResult.rows[0].metadata || '{}');
    } catch (error) {
      logger.error('Error parsing metadata', { error, metadata: metadataResult.rows[0].metadata });
      metadata = {};
    }
    
    // Atualizar o metadata com o order_id
    
    // 1. Adicionar ao array processed_orders se não existir
    if (!metadata.processed_orders) {
      metadata.processed_orders = [];
    }
    
    if (!metadata.processed_orders.includes(data.order_id)) {
      metadata.processed_orders.push(data.order_id);
    }
    
    // 2. Adicionar às provider_responses se não existir
    if (!metadata.provider_responses) {
      metadata.provider_responses = [];
    }
    
    // Verificar se já existe uma resposta para este order_id
    const existingResponseIndex = metadata.provider_responses.findIndex(
      (response: any) => response.order_id === data.order_id
    );
    
    if (existingResponseIndex >= 0) {
      // Atualizar a resposta existente
      metadata.provider_responses[existingResponseIndex] = {
        ...metadata.provider_responses[existingResponseIndex],
        ...data.provider_response
      };
    } else {
      // Adicionar nova resposta
      metadata.provider_responses.push({
        order_id: data.order_id,
        ...data.provider_response
      });
    }
    
    // Atualizar o metadata na tabela transactions
    const updateMetadataQuery = `
      UPDATE transactions
      SET metadata = $1
      WHERE id = $2;
    `;
    
    await client.query(updateMetadataQuery, [JSON.stringify(metadata), data.transaction_id]);
    
    // Fechar a conexão com o banco de dados
    await client.end();
    
    // Registrar o sucesso
    logger.info('Transaction metadata updated successfully', {
      transaction_id: data.transaction_id,
      order_id: data.order_id
    });
    
    // Retornar sucesso
    return NextResponse.json({ 
      success: true,
      message: 'Transaction metadata updated successfully',
      transaction_id: data.transaction_id,
      order_id: data.order_id
    });
    
  } catch (error: any) {
    logger.error('Error updating transaction metadata', { error });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Endpoint para verificar o status da integração
 */
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    message: 'Transaction update endpoint is working'
  });
}
