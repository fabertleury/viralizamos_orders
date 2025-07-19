import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Prisma with explicit configuration
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function checkOrder(orderId: string) {
  try {
    console.log(`Checking order ${orderId}...`);
    
    // Query the specific order with all related information
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { id: orderId },
          { external_id: orderId }
        ]
      },
      include: {
        provider: true,
        user: true,
        OrderLog: {
          orderBy: {
            created_at: 'desc'
          }
        }
      }
    });

    if (!order) {
      console.log(`Order ${orderId} not found!`);
      return;
    }

    console.log('\n===== ORDER DETAILS =====');
    console.log(`ID: ${order.id}`);
    console.log(`External ID: ${order.external_id}`);
    console.log(`Status: ${order.status}`);
    console.log(`Amount: ${order.amount}`);
    console.log(`Quantity: ${order.quantity}`);
    console.log(`Target Username: ${order.target_username}`);
    console.log(`Customer Name: ${order.customer_name}`);
    console.log(`Customer Email: ${order.customer_email}`);
    console.log(`Provider: ${order.provider?.name || 'N/A'}`);
    console.log(`Created At: ${order.created_at.toLocaleString()}`);
    console.log(`Updated At: ${order.updated_at.toLocaleString()}`);

    if (order.OrderLog && order.OrderLog.length > 0) {
      console.log('\n===== ORDER LOGS =====');
      order.OrderLog.forEach((log, index) => {
        console.log(`\nLog Entry #${index + 1}:`);
        console.log(`Status: ${log.status}`);
        console.log(`Message: ${log.message}`);
        console.log(`Created At: ${log.created_at.toLocaleString()}`);
        if (log.error) {
          console.log(`Error: ${log.error}`);
        }
      });
    }

  } catch (error) {
    console.error('Error checking order:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Check the specific order
checkOrder('VP-90b713fd');
