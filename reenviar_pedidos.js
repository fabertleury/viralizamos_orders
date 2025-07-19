const { Client } = require('pg');
const axios = require('axios');
const ExcelJS = require('exceljs');

const client = new Client({
  connectionString: 'postgresql://postgres:cgbdNabKzdmLNJWfXAGgNFqjwpwouFXZ@switchyard.proxy.rlwy.net:44974/railway',
});

async function reenviarPedido(pedido, provider) {
  try {
    console.log(`\nReenviando pedido ${pedido.id} para o provedor ${provider.name}...`);

    // Preparar payload para o provedor
    const payload = {
      key: provider.api_key,
      action: 'add',
      service: pedido.external_service_id,
      link: pedido.target_url,
      quantity: pedido.quantity
    };

    console.log('Payload:', JSON.stringify(payload, null, 2));

    // Enviar para o provedor
    const response = await axios.post(provider.api_url, payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 segundos timeout
    });

    console.log('Resposta do provedor:', JSON.stringify(response.data, null, 2));

    // Extrair ID do pedido do provedor
    let externalOrderId = null;
    if (response.data.order) {
      externalOrderId = response.data.order;
    } else if (response.data.id) {
      externalOrderId = response.data.id;
    } else if (response.data.data && response.data.data.id) {
      externalOrderId = response.data.data.id;
    }

    // Atualizar o pedido no banco
    await client.query(`
      UPDATE "Order"
      SET 
        status = 'processing',
        external_order_id = $1,
        provider_response = $2,
        processed = true,
        processed_at = NOW(),
        updated_at = NOW()
      WHERE id = $3
    `, [
      externalOrderId,
      response.data,
      pedido.id
    ]);

    // Registrar log
    await client.query(`
      INSERT INTO "OrderLog" (order_id, level, message, data, created_at)
      VALUES ($1, $2, $3, $4, NOW())
    `, [
      pedido.id,
      'info',
      `Pedido reenviado com sucesso. ID do provedor: ${externalOrderId || 'não informado'}`,
      {
        provider_response: response.data,
        provider_request: payload
      }
    ]);

    return {
      success: true,
      external_order_id: externalOrderId,
      provider_response: response.data
    };
  } catch (error) {
    console.error(`Erro ao reenviar pedido ${pedido.id}:`, error.message);

    // Registrar erro no log
    await client.query(`
      INSERT INTO "OrderLog" (order_id, level, message, data, created_at)
      VALUES ($1, $2, $3, $4, NOW())
    `, [
      pedido.id,
      'error',
      `Erro ao reenviar pedido: ${error.message}`,
      {
        error: error.message,
        stack: error.stack
      }
    ]);

    return {
      success: false,
      error: error.message
    };
  }
}

async function main() {
  await client.connect();

  // Buscar pedidos para reenviar
  const pedidosRes = await client.query(`
    SELECT o.*, p.name as provider_name, p.api_key, p.api_url
    FROM "Order" o
    LEFT JOIN "Provider" p ON o.provider_id = p.id
    WHERE o.status IN ('cancelled', 'partial')
    ORDER BY o.created_at DESC
  `);

  if (pedidosRes.rows.length === 0) {
    console.log('Nenhum pedido para reenviar encontrado.');
    await client.end();
    return;
  }

  console.log(`Encontrados ${pedidosRes.rows.length} pedidos para reenviar.`);

  // Criar arquivo Excel para relatório
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Relatório de Reenvio');

  // Definir colunas
  worksheet.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'Transaction ID', key: 'transaction_id', width: 20 },
    { header: 'Provedor', key: 'provider_name', width: 20 },
    { header: 'Status Original', key: 'status_original', width: 15 },
    { header: 'Status Novo', key: 'status_novo', width: 15 },
    { header: 'ID Provedor', key: 'external_order_id', width: 20 },
    { header: 'Resultado', key: 'resultado', width: 20 },
    { header: 'Mensagem', key: 'mensagem', width: 50 }
  ];

  // Processar cada pedido
  const resultados = [];
  for (const pedido of pedidosRes.rows) {
    console.log(`\nProcessando pedido ${pedido.id}...`);

    const provider = {
      name: pedido.provider_name,
      api_key: pedido.api_key,
      api_url: pedido.api_url
    };

    const resultado = await reenviarPedido(pedido, provider);
    resultados.push({
      id: pedido.id,
      transaction_id: pedido.transaction_id,
      provider_name: pedido.provider_name,
      status_original: pedido.status,
      status_novo: resultado.success ? 'processing' : 'error',
      external_order_id: resultado.external_order_id,
      resultado: resultado.success ? 'Sucesso' : 'Erro',
      mensagem: resultado.success 
        ? `Pedido reenviado com sucesso. ID do provedor: ${resultado.external_order_id || 'não informado'}`
        : `Erro: ${resultado.error}`
    });

    // Adicionar ao Excel
    worksheet.addRow(resultados[resultados.length - 1]);
  }

  // Estilizar cabeçalho
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD3D3D3' }
  };

  // Salvar arquivo
  const fileName = `relatorio_reenvio_${new Date().toISOString().split('T')[0]}.xlsx`;
  await workbook.xlsx.writeFile(fileName);
  console.log(`\nRelatório Excel gerado: ${fileName}`);

  // Exibir resumo
  const sucessos = resultados.filter(r => r.resultado === 'Sucesso').length;
  const erros = resultados.filter(r => r.resultado === 'Erro').length;

  console.log('\nResumo do processamento:');
  console.log(`Total de pedidos: ${resultados.length}`);
  console.log(`Sucessos: ${sucessos}`);
  console.log(`Erros: ${erros}`);

  await client.end();
}

main().catch(err => {
  console.error('Erro ao executar script:', err);
}); 