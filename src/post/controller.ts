import { controller, httpGet as GetMapping, httpPost as PostMapping } from "inversify-express-utils";
import { inject } from "inversify";
import { Request, Response } from "express";
import { PostService } from "./service"
import { JWT } from "../jwt";
import { workerData } from "worker_threads";
import path from "path";
import os from "node:os"
import { threadPool } from "../work";

@controller('/post')
export class PostController {
    // private threadPool: ThreadPool
    constructor(@inject("PostService") private readonly PostService: PostService) { 
    }

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
        res.download(result)
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
    @PostMapping("/import", JWT.middleware())
    public async import(req: Request, res: Response) {
        // threadPool.init()
        let data = req.body
        let file = req.files as Express.Multer.File[]
        let curSheetValue = await this.PostService.import(file, JSON.parse(data.option), JSON.parse(data.isAccountAndPwd), JSON.parse(data.isUpdateSDP))
        const cpus = os.cpus()
        let total_task = cpus.length
        if (curSheetValue.length < cpus.length) total_task = curSheetValue.length
        const perCpuData = Math.ceil(curSheetValue.length / cpus.length)
        // this.threadPool = new ThreadPool(path.join(__dirname, "../work/merge_word.js"))
        const task = []
        for (let i = 0; i < total_task; i++) {
            const slice = curSheetValue.slice(perCpuData * i, perCpuData * (i + 1))
            const next_slice = i > 0 ? curSheetValue.slice(perCpuData * (i + 1), perCpuData * (i + 2)) : []
            console.log(i)
            const template_container = [...slice]
            task.push(threadPool.run({curSheetValue: template_container, isAccountAndPwd: JSON.parse(data.isAccountAndPwd), option: JSON.parse(data.option)}, "merge_word"))
            if (i != 0 && next_slice.length == 0) break
        }
        const result = await Promise.all(task)
        // threadPool.destroy()
        const errorCollect = result.map(i => i.errorCollect).flat()
        const correctValue = result.map(i => i.correctValue).flat()
        const buffers = result.map(i => i.buffers).flat()
        const staff_buffers = result.map(i => i.staff_buffers).flat()
        const file_name = `merged_word.docx`
        const file_path = `${process.env.DOCX_PATH}\\import-docx\\${file_name}`
        // console.log(buffers)
        await this.PostService.merge_word(JSON.parse(data.isAccountAndPwd), file_path, buffers, staff_buffers)
        JSON.parse(data.isUpdateSDP) && await this.PostService.batch_update_sdp(correctValue)

        if (errorCollect.length > 0) {
            res.setHeader('Access-Control-Expose-Headers', 'X-Error-Info');
            res.setHeader("X-Error-Info", JSON.stringify({errorCollect:errorCollect}))
        }
        buffers.length = 0
        staff_buffers.length = 0
        res.download(file_path)
        // res.json({
        //     message: "成功",
        //     file_path
        // })
    }
    @PostMapping("/import1", JWT.middleware())
    public async import1(req: Request, res: Response) {
        let data = req.body
        let file = req.files as Express.Multer.File[]
        let result = await this.PostService.import1(file, JSON.parse(data.option), JSON.parse(data.isAccountAndPwd), JSON.parse(data.isUpdateSDP))
        const file_path = result.data?.file_path
        if (result.data?.errorCollect.length > 0) {
            delete result.data.file_path
            res.setHeader('Access-Control-Expose-Headers', 'X-Error-Info');
            res.setHeader("X-Error-Info", JSON.stringify(result.data))
        }
        res.download(file_path)
    }
}
