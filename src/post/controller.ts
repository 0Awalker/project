import { controller, httpGet as GetMapping, httpPost as PostMapping } from "inversify-express-utils";
import { inject } from "inversify";
import { Request, Response } from "express";
import { PostService } from "./service"
import { JWT } from "../jwt";
import { workerData } from "worker_threads";
import path from "path";
const { Worker } = require('worker_threads')

@controller('/post')
export class PostController {
    constructor(@inject(PostService) private readonly PostService: PostService) { }

    @PostMapping('/update', JWT.middleware())
    public async update(req: Request, res: Response) {
        let data = req.body
        // const work = new Worker(path.join(__dirname, "../work/index.ts"), {
        //     workerData: data
        // })
        let result = await this.PostService.update(data)
        // work.once("message", result => {
        //     res.json(result)
        // })
        res.json(result)
    }

    @PostMapping("/user", JWT.middleware())
    public async getUserList(req: Request, res: Response) {
        let data = req.body
        let result = await this.PostService.get_user_list({
            username: data.username,
            deviceName: null
        })
        res.json(result)
    }

    @PostMapping("/device", JWT.middleware())
    public async device(req: Request, res: Response) {
        let data = req.body
        let result = await this.PostService.get_device_info(data)
        res.json(result)
    }

    @PostMapping("/template", JWT.middleware())
    public async template(req: Request, res: Response) {
        let data = req.body
        let result = await this.PostService.get_template_docx(data.Post, data.username, data.remark)
        res.json(result)
    }

    @PostMapping("/download", JWT.middleware())
    public async download(req: Request, res: Response) {
        let data = req.body
        let result = await this.PostService.download_docx(data.file_name)
        res.download(result, data)
    }

    @PostMapping("/createtype")
    public async createType(req: Request, res: Response) {
        let data = req.body
        let result = await this.PostService.createType(data)
        res.json(result)
    }

    @GetMapping("/gettype")
    public async getType(req: Request, res: Response) {
        let result = await this.PostService.getType()
        res.json(result)
    }
    @GetMapping("/deletetype")
    public async deleteType(req: Request, res: Response) {
        let id = req.body
        let result = await this.PostService.deleteType(id)
        res.json(result)
    }
}
