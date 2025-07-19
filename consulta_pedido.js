const { Client } = require('pg');
const ExcelJS = require('exceljs');

const client = new Client({
  connectionString: 'postgresql://postgres:cgbdNabKzdmLNJWfXAGgNFqjwpwouFXZ@switchyard.proxy.rlwy.net:44974/railway',
});

async function main() {
  await client.connect();

  // Buscar pedidos com status de erro e seus detalhes
  const pedidosRes = await client.query(`
    SELECT 
      o.id,
      o.status,
      o.provider_id,
      o.external_service_id,
      o.processed,
      o.processed_at,
      o.metadata,
      o.created_at,
      o.transaction_id,
      o.target_username,
      o.target_url,
      o.quantity,
      o.amount,
      o.customer_name,
      o.customer_email,
      o.provider_response,
      p.name as provider_name,
      p.api_key,
      p.api_url
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

  console.log(`\nEncontrados ${pedidosRes.rows.length} pedidos para reenviar.`);

  // Criar arquivo Excel com detalhes para reenvio
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Pedidos para Reenvio');

  // Definir colunas
  worksheet.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'Transaction ID', key: 'transaction_id', width: 20 },
    { header: 'Provedor', key: 'provider_name', width: 20 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Username Alvo', key: 'target_username', width: 20 },
    { header: 'URL Alvo', key: 'target_url', width: 30 },
    { header: 'Quantidade', key: 'quantity', width: 10 },
    { header: 'Valor', key: 'amount', width: 10 },
    { header: 'Cliente', key: 'customer_name', width: 20 },
    { header: 'Email Cliente', key: 'customer_email', width: 30 },
    { header: 'Resposta Provedor', key: 'provider_response', width: 50 },
    { header: 'Dados para Reenvio', key: 'resend_data', width: 50 }
  ];

  // Adicionar dados
  pedidosRes.rows.forEach(pedido => {
    // Preparar dados para reenvio
    const resendData = {
      provider_id: pedido.provider_id,
      target_username: pedido.target_username,
      target_url: pedido.target_url,
      quantity: pedido.quantity,
      amount: pedido.amount,
      customer_name: pedido.customer_name,
      customer_email: pedido.customer_email,
      metadata: pedido.metadata
    };

    worksheet.addRow({
      id: pedido.id,
      transaction_id: pedido.transaction_id,
      provider_name: pedido.provider_name,
      status: pedido.status,
      target_username: pedido.target_username,
      target_url: pedido.target_url,
      quantity: pedido.quantity,
      amount: pedido.amount,
      customer_name: pedido.customer_name,
      customer_email: pedido.customer_email,
      provider_response: JSON.stringify(pedido.provider_response),
      resend_data: JSON.stringify(resendData)
    });
  });

  // Estilizar cabeçalho
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD3D3D3' }
  };

  // Salvar arquivo
  const fileName = `pedidos_reenvio_${new Date().toISOString().split('T')[0]}.xlsx`;
  await workbook.xlsx.writeFile(fileName);
  console.log(`\nArquivo Excel gerado: ${fileName}`);

  // Exibir resumo por provedor
  const resumoPorProvedor = {};
  pedidosRes.rows.forEach(pedido => {
    const providerName = pedido.provider_name || 'Sem provedor';
    resumoPorProvedor[providerName] = (resumoPorProvedor[providerName] || 0) + 1;
  });

  console.log('\nResumo por provedor:');
  Object.entries(resumoPorProvedor).forEach(([provider, count]) => {
    console.log(`${provider}: ${count} pedidos para reenviar`);
  });

  // Exibir exemplo de dados para reenvio
  console.log('\nExemplo de dados necessários para reenvio:');
  const exemploPedido = pedidosRes.rows[0];
  console.log(JSON.stringify({
    provider_id: exemploPedido.provider_id,
    target_username: exemploPedido.target_username,
    target_url: exemploPedido.target_url,
    quantity: exemploPedido.quantity,
    amount: exemploPedido.amount,
    customer_name: exemploPedido.customer_name,
    customer_email: exemploPedido.customer_email,
    metadata: exemploPedido.metadata
  }, null, 2));

  await client.end();
}

main().catch(err => {
  console.error('Erro ao executar script:', err);
}); 