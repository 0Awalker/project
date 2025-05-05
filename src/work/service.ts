const { parentPort, workerData } = require('worker_threads')
import { inject, injectable } from "inversify"
import { PostService } from "../post/service"

@injectable()
export class WorkService {
    constructor(@inject(PostService) private readonly PostService:PostService){}

    public async processRequest(data:any) {
        let result = await this.PostService.update(data)
    }
}

module.exports = {
    WorkService
}