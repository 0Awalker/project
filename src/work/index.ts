import { inject, injectable, LazyServiceIdentifier } from "inversify";
import path from "node:path";
const worker_threads = require("node:worker_threads");
const worker_instance = worker_threads.Worker;
const os = require('os');

export class ThreadPool {
    workers: { worker: any; busy: boolean }[] = [];
    queue: { data: any, taskType: string, resolve: Function; reject: Function }[] = [];
    workerPath
    size
    constructor(
        workerPath: string,
        size: number = os.cpus().length
    ) {
        this.workerPath = workerPath
        this.size = size
    }

    init() {
         // 创建线程池
        //  console.log(this.workers)
        for (let i = 0; i < this.size - this.workers.length; i++) {
            const worker = new worker_instance(this.workerPath);
            
            // 监听消息响应
            worker.on('message', (result) => {
                this.handleWorkerResponse(worker, result);
            });
            
            // 监听错误
            worker.on('error', (error) => {
                this.handleWorkerError(worker, error);
            });
            
            // 监听线程退出
            worker.on('exit', (code) => {
                if (code !== 0) {
                    console.error(`Worker stopped with exit code ${code}`);
                }
            });
            
            this.workers.push({ worker, busy: false });
        }
    }

    run(data: any, taskType: string): Promise<any> {
        return new Promise((resolve, reject) => {
            // 查找空闲工作线程
            const workerObj = this.workers.find(w => !w.busy);
            
            if (workerObj) {
                this.executeTask(workerObj.worker, data, taskType, resolve, reject);
            } else {
                // 没有空闲线程则加入队列
                this.queue.push({ data, taskType, resolve, reject });
            }
        });
    }

    private executeTask(
        worker: any, 
        data: any,
        taskType: string,
        resolve: Function, 
        reject: Function
    ) {
        const workerObj = this.workers.find(w => w.worker === worker);
        if (!workerObj) return;
        
        // 标记为忙碌状态
        workerObj.busy = true;
        
        // 存储解决/拒绝方法
        worker._resolve = resolve;
        worker._reject = reject;
        
        // 发送任务到工作线程
        worker.postMessage({data, taskType});
    }

    private handleWorkerResponse(worker: any, result: any) {
        // 获取存储的resolve函数
        const resolve = worker._resolve;
        if (typeof resolve === 'function') {
            resolve(result);
        }
        
        // 清理引用
        delete worker._resolve;
        delete worker._reject;
        
        // 标记为空闲状态
        const workerObj = this.workers.find(w => w.worker === worker);
        if (workerObj) {
            workerObj.busy = false;
            
            // 处理队列中的下一个任务
            if (this.queue.length > 0) {
                const nextTask = this.queue.shift()!;
                this.executeTask(worker, nextTask.data, nextTask.taskType, nextTask.resolve, nextTask.reject);
            }
        }
    }

    private handleWorkerError(worker: any, error: Error) {
        // 获取存储的reject函数
        const reject = worker._reject;
        if (typeof reject === 'function') {
            reject(error);
        }
        
        // 清理引用
        delete worker._resolve;
        delete worker._reject;
        
        // 标记为空闲状态
        const workerObj = this.workers.find(w => w.worker === worker);
        if (workerObj) {
            workerObj.busy = false;
            
            // 处理队列中的下一个任务
            if (this.queue.length > 0) {
                const nextTask = this.queue.shift()!;
                this.executeTask(worker, nextTask.data, nextTask.taskType, nextTask.resolve, nextTask.reject);
            }
        }
    }

    destroy() {
        // 终止所有工作线程
        this.workers.forEach(({ worker }) => {
            worker.terminate();
        });
        
        // 清空队列
        this.workers = [];
        this.queue = [];
    }
}

export const threadPool = new ThreadPool(path.join(__dirname, "./merge_word.js"))