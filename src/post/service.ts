import { inject, injectable } from "inversify";
import axios from 'axios'
// import { DataType, apiStatus } from "./post.d";
import { DataType, ApiStatus } from "./postd";
import { PostDto, TypeDto } from "./post.dto";
import { plainToClass } from "class-transformer";
import { validate } from "class-validator";
import { PrismaDB } from "../db";
import { createReport } from 'docx-templates'
const path = require('path');
const fs = require('fs')
const moment = require('moment-timezone')

const python_path = path.join(__dirname, "../../", "../../../", "PycharmProjects", "pythonProject1")
// const python_path = path.join(__dirname, "../../", "../", "PythonScripts", "change_sdp_user")
@injectable()
export class PostService {
    constructor(@inject(PrismaDB) private readonly PrismaDB: PrismaDB) { }

    static status = ApiStatus.wait

    public async update(Post: any) {
        try {
            //复数设备
            let device = null
            if (Post.deviceName.indexOf(";") > 0) {
                device = Post.deviceName.split(";")
                if (Post.deviceName.endsWith(";")) {
                    device.pop()
                }
            } else {
                device = [Post.deviceName]
            }
            //用户名格式判断
            const regx = /(^\s+|\s+$)/
            if (regx.test(Post.username)) return {message: "用户名格式不正确", data: null}
            for (const i of device) {
                let result_assets = await this.get_search_list(i) as any
                if (result_assets.list_info.row_count === 0) {
                    return {
                        message: '资产未找到',
                        data: null
                    }
                }
            }

            let result_users = await this.get_user_list(Post) as any
            if (result_users.list_info.row_count === 0) {
                return {
                    message: '用户未找到',
                    data: null
                }
            }
            //执行python，不过设备数据要重新数组化，可以优化
            //轮询逻辑，可以新增轮询接口来优化
            (PostService.status !== ApiStatus.process 
                && PostService.status !== ApiStatus.success
                && PostService.status !== ApiStatus.error) 
                && this.change_assets_user(Post.deviceName, Post.username)
            // if (result == 'success') {
            if (PostService.status === ApiStatus.success) {
                PostService.status = ApiStatus.wait
                return {
                    message: "修改成功",
                    data: {
                        ...Post,
                        finish: true
                    }
                }
            } else if (PostService.status === ApiStatus.process) {
                return {
                    message: "处理中",
                    data: {
                        finish: false
                    }
                }
            } else if (PostService.status === ApiStatus.wait) {
                return {
                    message: "等待中",
                    data: {
                        finish: false
                    }
                }
            } else {
                PostService.status = ApiStatus.wait
                return {
                    message: "修改失败",
                    data: {
                        finish: true
                    }
                }
            }
        } catch (error) {
            PostService.status = ApiStatus.wait
            return {
                message: error,
                data: null
            }
        }



    }

    public change_assets_user(assets: any, user_info: any) {
        PostService.status = ApiStatus.process
        const { execSync, exec } = require('child_process')
        const arg1 = `${user_info.indexOf(" ") > 0 ? user_info.replace(" ", ".") : user_info}`
        const arg2 = assets
        const venvPython = path.join(python_path, '.venv', 'Scripts', 'activate');
        const pythonScript = path.join(python_path, 'src', 'SDP_AUTO.py');
        // try {
        //     const stdout2 = execSync(`${venvPython} && python ${pythonScript} ${arg1} ${arg2}`).toString()
        //     return stdout2
        // } catch (error) {
        //     return error.toString()
        // }
        const child = exec(`${venvPython} && python ${pythonScript} ${arg1} ${arg2}`, (err, stdout, stderr) => {
            if (err) {
                PostService.status = ApiStatus.error
            }
            if (stderr) {
                PostService.status = ApiStatus.error
            }
            if (stdout) {
                PostService.status = ApiStatus.process
                if (stdout === "success") (PostService.status = ApiStatus.success)
                if (stdout === "error") (PostService.status = ApiStatus.error)
            }
        })
    }

    public get_search_list(data: string) {
        let params = {
            list_info: {
                start_index: 1,
                sort_field: "name",
                sort_order: "asc",
                row_count: "100",
                gsearch: `${data}`,
                get_total_count: true,
                // fields_required: ["asset_tag", "product", "org_serial_number", "product_type", "vendor", "name", "is_loaned", "state", "purchase_cost", "department", "user", "barcode", "loan_end", "ci", "last_success_audit","service_tag"]
            }
        }
        const input_data = encodeURIComponent(JSON.stringify(params))

        // console.log(`https://service.wellingtoncollege.cn/api/v3/assets?input_data=${params}`)
        const options = {
            url: `https://service.wellingtoncollege.cn/api/v3/assets?input_data=${input_data}`,
            method: 'get',
            headers: {
                Authtoken: process.env.API_KEY
            }
        }
        return new Promise((resolve, rej) => {
            axios(options).then(res => {
                resolve(res.data)
            }).catch(err => {
                rej(err)
            })
        })
    }


    public get_workstation_item(data: string) {
        // const input_data = encodeURIComponent(JSON.stringify(params))

        const options = {
            url: `https://service.wellingtoncollege.cn/api/v3/workstations/${data}`,
            method: 'get',
            headers: {
                Authtoken: process.env.API_KEY
            }
        }
        return new Promise((resolve, rej) => {
            axios(options).then(res => {
                resolve(res.data)
            }).catch(err => {
                rej(err)
            })
        })
    }

    public get_user_list(data: DataType) {
        let username = `${data.username.indexOf(".") > 0 ? data.username.replace(".", " ") : data.username}`
        let params = {
            list_info: {
                row_count: 25,
                start_index: 1,
                fields_required: ["email_id", "department", "employee_id", "name", "is_vipuser"],
                search_criteria: {
                    field: "name",
                    condition: "like",
                    values: [`${username}`],
                    logical_operator: "OR",
                    children: [
                        {
                            field: "email_id",
                            condition: "like",
                            values: [`${username}`],
                            logical_operator: "OR"
                        },
                        {
                            field: "employee_id",
                            condition: "like",
                            values: [`${username}`],
                            logical_operator: "OR"
                        },
                        {
                            field: "login_name",
                            condition: "like",
                            values: [`${username}`],
                            logical_operator: "OR"
                        }
                    ]
                }
            }
        }
        const input_data = encodeURIComponent(JSON.stringify(params))
        const options = {
            url: `https://service.wellingtoncollege.cn/api/v3/assets/user?input_data=${input_data}`,
            method: 'get',
            headers: {
                Authtoken: process.env.API_KEY
            }
        }

        return new Promise((resolve, rej) => {
            axios(options).then(res => {
                resolve(res.data)
            }).catch(err => {
                rej(err)
            })
        })

    }

    public async get_device_info(Post: DataType) {
        try {
            let device = null
            let data = []
            let result_workstation = null
            let result_assets = null
            if (Post.deviceName.indexOf(";") > 0) {
                device = Post.deviceName.split(";")
                if (Post.deviceName.endsWith(";")) {
                    device.pop()
                }
            } else {
                device = [Post.deviceName]
            }
            // console.log(device)
            for (const i of device) {
                result_assets = await this.get_search_list(i) as any
                if (result_assets.list_info.row_count === 0) {
                    return {
                        message: `资产未找到${i}`,
                        data: null
                    }
                } else {
                    try {
                        const id = result_assets.assets[0].id
                        result_workstation = await this.get_workstation_item(id) as any
                    } catch (error) {

                    } finally {
                        let name = result_assets.assets[0].name
                        name = name.indexOf(".") > 0 ? name.split(".")[0] : name
                        const obj = {
                            name,
                            asset_tag: result_assets.assets[0].asset_tag,
                            SN: result_assets.assets[0].org_serial_number,
                            service_tag: result_workstation?.workstation?.computer_system?.service_tag,
                            model: result_workstation?.workstation?.product?.name || result_assets.assets[0].product_type.name
                        }
                        data.push(obj)
                    }
                }
            }
            return {
                message: "success",
                data: {
                    assets: data,
                    user: Post.username ? undefined : result_assets.assets[0]?.user?.name
                }
            }
        } catch (error) {
            return {
                message: error,
                data: null
            }
        }
    }

    public async get_template_docx(Post: PostDto[], user: string, remark: string) {
        const dto = []
        try {
            const docx_name = `${user}-${Date.now()}.docx`
            const file_name = `${process.env.DOCX_PATH}/template-docx/${docx_name}`
            await this.template_create(Post, user, file_name, remark)
            Post.forEach(async i => {
                const post = plainToClass(PostDto, i)
                const errors = await validate(post)
                if (errors.length) {
                    errors.forEach(error => {
                        Object.keys(error.constraints).forEach(key => {
                            dto.push({
                                [error.property]: error.constraints[key]
                            })
                        })
                    })
                } else {
                    const postInfo = await this.PrismaDB.prisma.records.create({
                        data: {
                            ...i,
                            user,
                            file_name: docx_name,
                            time: moment().tz('Asia/Shanghai').format("YYYY-MM-DD HH:mm:ss")
                        }
                    })
                }
            })
            return {
                data: {
                    Post,
                    user,
                    file_name: docx_name
                },
                message: "成功"
            }
        } catch (error) {
            return {
                message: dto || error,
                data: null
            }
        }
    }

    public async template_create(Post: PostDto[], user: string, file_name: string, remark: string) {
        const template = fs.readFileSync(path.join(__dirname, "../../assets/template.docx"))
        const buffer = await createReport({
            template,
            data: {
                user,
                Post,
                remark,
                time: moment().tz('Asia/Shanghai').format("YYYY-MM-DD")
            },
            cmdDelimiter: ['<<<', '>>>'],
        });

        fs.writeFileSync(file_name, buffer)

    }

    public async download_docx(file_name: string) {
        let docx_path = path.join(process.env.DOCX_PATH, "template-docx", file_name)
        return docx_path
    }

    public async createType(data: TypeDto) {
        const dto = []
        const post = plainToClass(TypeDto, data)
        const errors = await validate(post)
        if (errors.length) {
            errors.forEach(error => {
                Object.keys(error.constraints).forEach(key => {
                    dto.push({
                        [error.property]: error.constraints[key]
                    })
                })
            })

            return dto
        } else {
            const typeInfo = await this.PrismaDB.prisma.options.create({
                data: {
                    ...data
                }
            })

            return typeInfo
        }
    }
    public async getType() {
        const typeInfo = await this.PrismaDB.prisma.options.findMany()
        return {
            message: "成功",
            data: typeInfo
        }
    }

    public async deleteType(id: number) {
        const typeInfo = await this.PrismaDB.prisma.options.delete({
            where: {
                id: id
            }
        })
        return typeInfo
    }
}
