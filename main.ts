import { Container } from "inversify";
import { InversifyExpressServer } from "inversify-express-utils";
import { PrismaClient } from "@prisma/client";
import { PostController } from "./src/post/controller";
import { PostService } from "./src/post/service";
import { LoginController } from "./src/login/controller";
import { LoginService } from "./src/login/service";
import { WorkService } from "./src/work/service";
import { PrismaDB } from "./src/db";
import { JWT } from "./src/jwt";
import express from 'express';
import dotenv from 'dotenv'

let container = new Container()
container.bind(PostController).to(PostController)
container.bind(PostService).to(PostService)
container.bind(LoginController).to(LoginController)
container.bind(LoginService).to(LoginService)
container.bind(WorkService).to(WorkService)

container.bind<PrismaClient>('PrismaClient').toFactory(() => {
    return () => {
        return new PrismaClient()
    }
})

container.bind(PrismaDB).to(PrismaDB)
container.bind(JWT).to(JWT)

//多线程
//环境变量
dotenv.config()
let server = new InversifyExpressServer(container)

server.setConfig(app => {
    app.use(express.json())
    app.use(container.get(JWT).init())
})

const app = server.build()

app.listen(3001, () => {
    console.log('服务端启动成功')
})

module.exports = {
    container
}