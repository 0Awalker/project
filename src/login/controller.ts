import { controller, httpGet as GetMapping, httpPost as PostMapping } from "inversify-express-utils";
import { inject } from "inversify";
import { Request, Response } from "express";
import { LoginService } from "./service";
import { JWT } from "../jwt";
import crypto from 'crypto'

@controller('/login')
export class LoginController {

    static storedPrivateKey = null
    constructor(@inject(LoginService) private readonly LoginService: LoginService) { }

    @PostMapping("/user")
    public async login(req: Request, res: Response) {
        let user = req.body
        try {
            // 使用私钥解密
            const decrypted = crypto.privateDecrypt(
                {
                    key: LoginController.storedPrivateKey,
                    padding: crypto.constants.RSA_PKCS1_PADDING,
                    oaepHash: 'sha256'
                },
                Buffer.from(user.password, 'base64') // 前端传输的应该是base64编码
            );
            const password = decrypted.toString();
            user.password = password

            let result = await this.LoginService.handleLogin(user)
            // console.log(result)
            if (result) {
                res.json(result)
            } else {
                res.status(401).json({
                    authorize: "unauthoriztion"
                })
            }

        } catch (error) {
            res.status(400).json({ error: '解密失败' });
        }

    }

    @GetMapping("/auth", JWT.middleware())
    public auth(req: Request, res: Response) {
        let user = req.user
        res.json({
            data: {
                message: "success"
            },
            message: "success"
        })
    }

    @GetMapping("/getkey")
    public getKey(req: Request, res: Response) {
        // 生成RSA密钥对
        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048, // 密钥长度
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem'
            }
        });

        // 存储私钥（实际项目中应该安全存储，这里简化）
        LoginController.storedPrivateKey = privateKey
        res.json({
            message: "success",
            data: {
                publicKey,
            }
        });
    }
}