"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupScheduler = setupScheduler;
const scheduler_1 = require("./scheduler");
// Verificar se estamos em um ambiente de produção
const isProduction = process.env.NODE_ENV === 'production';
/**
 * Inicializa o agendador de tarefas se estiver em ambiente de produção
 * ou se a variável de ambiente ENABLE_SCHEDULER estiver definida como true
 */
function setupScheduler() {
    const enableScheduler = process.env.ENABLE_SCHEDULER === 'true';
    if (isProduction || enableScheduler) {
        console.log('Inicializando agendador de tarefas...');
        const queues = (0, scheduler_1.initScheduler)();
        console.log(`Agendador inicializado com ${Object.keys(queues).length} filas.`);
        return queues;
    }
    else {
        console.log('Agendador de tarefas desabilitado. Para habilitar, defina ENABLE_SCHEDULER=true');
        return null;
    }
}
// Exportar para uso na inicialização
exports.default = setupScheduler;
