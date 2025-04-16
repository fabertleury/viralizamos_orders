// Este é o ponto de entrada principal do aplicativo
// Importar o servidor e iniciar

import './server';
import { startQueueProcessor } from './lib/queue';

// Exportar qualquer coisa que possa ser útil para outros módulos
export * from './graphql/schemas';
export * from './graphql/resolvers';

// Iniciar processador de filas se habilitado nas variáveis de ambiente
const ENABLE_QUEUE_PROCESSOR = process.env.ENABLE_QUEUE_PROCESSOR === 'true';

if (ENABLE_QUEUE_PROCESSOR) {
  console.log('Inicializando processador de filas de reposições...');
  const stopQueueProcessor = startQueueProcessor();
  
  // Registrar função para parar o processador no desligamento
  process.on('SIGTERM', () => {
    console.log('Sinal SIGTERM recebido, parando processador de filas...');
    stopQueueProcessor();
  });
  
  process.on('SIGINT', () => {
    console.log('Sinal SIGINT recebido, parando processador de filas...');
    stopQueueProcessor();
  });
}
