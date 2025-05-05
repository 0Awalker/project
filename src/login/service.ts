import { inject, injectable } from "inversify";
import { user } from './login'
import ldap from 'ldapjs'
import { JWT } from "../jwt";

@injectable()
export class LoginService {
    constructor(@inject(JWT) private readonly JWT: JWT) { }

    public async handleLogin(user: user) {
        try {
            let { username, password } = user
            let AD_OU_Name = username.replace(".", " ")
            let OU = `CN=${AD_OU_Name},OU=WCCH Admin,DC=hz,DC=wellingtoncollege,DC=cn`

            const client = ldap.createClient(
                {
                    url: 'ldap://hz.wellingtoncollege.cn:389',
                    timeout: 5000,
                    connectTimeout: 10000,
                }
            )

            return new Promise((res, rej) => {

                let result = null
                client.bind(OU, password, err => {
                    if (err) {
                        result = null
                    } else {
                        result = {
                            username,
                            token: this.JWT.createToken(user)
                        }
                    }
                    res(result)
                })
            }).then(res => {
                client.unbind()
                return res
            })
        } catch (error) {
            return {
                message: "域控连接失败",
                data: null
            }
        }
    }
}