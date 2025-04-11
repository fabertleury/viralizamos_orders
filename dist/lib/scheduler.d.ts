import Queue from 'bull';
declare const pendingOrdersQueue: Queue.Queue<any>;
declare const statusCheckQueue: Queue.Queue<any>;
export declare const initScheduler: () => {
    pendingOrdersQueue: Queue.Queue<any>;
    statusCheckQueue: Queue.Queue<any>;
};
export { pendingOrdersQueue, statusCheckQueue };
