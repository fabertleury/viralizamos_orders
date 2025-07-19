import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Prisma with explicit configuration
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function exportFailedOrders() {
  try {
    console.log('Connecting to database...');
    
    // Query orders with failed or canceled status
    const orders = await prisma.order.findMany({
      where: {
        status: {
          in: ['failed', 'canceled']
        }
      },
      include: {
        provider: true,
        user: true
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    console.log(`Found ${orders.length} orders to export`);

    // Create a new workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Failed Orders');

    // Define columns
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 36 },
      { header: 'Transaction ID', key: 'transaction_id', width: 36 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Quantity', key: 'quantity', width: 10 },
      { header: 'Target Username', key: 'target_username', width: 30 },
      { header: 'Customer Name', key: 'customer_name', width: 30 },
      { header: 'Customer Email', key: 'customer_email', width: 30 },
      { header: 'Provider', key: 'provider_name', width: 20 },
      { header: 'Created At', key: 'created_at', width: 20 },
      { header: 'Updated At', key: 'updated_at', width: 20 }
    ];

    // Add rows
    orders.forEach(order => {
      worksheet.addRow({
        id: order.id,
        transaction_id: order.transaction_id,
        status: order.status,
        amount: order.amount,
        quantity: order.quantity,
        target_username: order.target_username,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        provider_name: order.provider?.name || 'N/A',
        created_at: order.created_at.toLocaleString(),
        updated_at: order.updated_at.toLocaleString()
      });
    });

    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `failed-orders-${timestamp}.xlsx`;
    const filepath = path.join(process.cwd(), filename);

    // Save the workbook
    await workbook.xlsx.writeFile(filepath);
    console.log(`Excel file has been saved as ${filename}`);

  } catch (error) {
    console.error('Error exporting orders:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the export
exportFailedOrders(); 