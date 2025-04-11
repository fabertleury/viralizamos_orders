/**
 * Inicializa o agendador de tarefas se estiver em ambiente de produção
 * ou se a variável de ambiente ENABLE_SCHEDULER estiver definida como true
 */
export declare function setupScheduler(): {
    pendingOrdersQueue: import("bull").Queue<any>;
    statusCheckQueue: import("bull").Queue<any>;
};
export default setupScheduler;
