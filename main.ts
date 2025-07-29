import 'reflect-metadata'
import { Container } from "inversify";
import { InversifyExpressServer } from "inversify-express-utils";
import { PrismaClient } from "@prisma/client";
import { PostController } from "./src/post/controller";
import { PostService } from "./src/post/service";
import { LoginController } from "./src/login/controller";
import { LoginService } from "./src/login/service";
// import { ThreadPool } from "./src/work";
import { isMainThread } from 'node:worker_threads';
import { PrismaDB } from "./src/db";
import { JWT } from "./src/jwt";
import express from 'express';
import multer from "multer"
import dotenv from 'dotenv'
import { threadPool } from './src/work';

global.XMLSerializer = require('xmldom').XMLSerializer;
global.DOMParser = require('xmldom').DOMParser;;

export let container = new Container()
container.bind(PostController).to(PostController)
container.bind<PostService>("PostService").to(PostService)
container.bind(LoginController).to(LoginController)
container.bind(LoginService).to(LoginService)
// container.bind(ThreadPool).to(ThreadPool)
// container.bind<(path: string) => ThreadPool>('ThreadPool').toFactory((context) => {
//     return (path) => {
//         return new ThreadPool(path)
//     }
// })

container.bind<PrismaClient>('PrismaClient').toFactory(() => {
    return () => {
        return new PrismaClient()
    }
})

container.bind(PrismaDB).to(PrismaDB)
container.bind(JWT).to(JWT)

//环境变量
dotenv.config()
if (isMainThread) {
    //多线程
    let server = new InversifyExpressServer(container)

    threadPool.init()


    const upload = multer()
    server.setConfig(app => {
        app.use(express.json())
        app.use(upload.any())
        app.use(container.get(JWT).init())
    })

    const app = server.build()

    app.listen(3001, () => {
        console.log('服务端启动成功')
    })
}

module.exports = {
    container,
}