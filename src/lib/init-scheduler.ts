import { initScheduler } from './scheduler';

// Verificar se estamos em um ambiente de produção
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Inicializa o agendador de tarefas se estiver em ambiente de produção
 * ou se a variável de ambiente ENABLE_SCHEDULER estiver definida como true
 */
export function setupScheduler() {
  const enableScheduler = process.env.ENABLE_SCHEDULER === 'true';
  
  if (isProduction || enableScheduler) {
    console.log('Inicializando agendador de tarefas...');
    const queues = initScheduler();
    console.log(`Agendador inicializado com ${Object.keys(queues).length} filas.`);
    return queues;
  } else {
    console.log('Agendador de tarefas desabilitado. Para habilitar, defina ENABLE_SCHEDULER=true');
    return null;
  }
}

// Exportar para uso na inicialização
export default setupScheduler; 