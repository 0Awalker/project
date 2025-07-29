require('ts-node/register');
require("reflect-metadata");
const { parentPort } = require('node:worker_threads');
const dotenv = require('dotenv');
const path = require("path");
const { container } = require("../../main");
const { buffer } = require('node:stream/consumers');

let PostService_instance = null;

// 初始化环境配置（只需一次）
dotenv.config({
    path: path.join(__dirname, "../../", '.env')
});

// 监听主线程消息
parentPort.on('message', async (taskData) => {

    const { data, taskType } = taskData

    try {
        console.log("Worker received task");
        if (taskType === "merge_word") {
            // 延迟加载服务（避免在消息循环外创建）
            if (!PostService_instance) {
                // 动态引入服务避免全局状态
                // const { PostService } = require("../post/service");
                PostService_instance = container.get("PostService");
            }

            const { curSheetValue, isAccountAndPwd, option } = data;

            // 处理逻辑
            const result = await processTaskData(
                PostService_instance,
                curSheetValue,
                isAccountAndPwd,
                option
            );

            // 发送结果回主线程
            parentPort.postMessage(result);
        }

        if (taskType === "update_sdp") {
            const { assets, user_info, multiple } = data
            change_assets_user(assets, user_info, multiple)
        }

    } catch (error) {
        console.error('Worker error:', error);

        // 发送错误回主线程
        parentPort.postMessage({
            status: 'error',
            error: error.message
        });
    } finally {
        // 清理资源
        if (PostService_instance && PostService_instance.cleanup) {
            PostService_instance.cleanup();
        }
    }
});

async function processTaskData(
    service,
    curSheetValue,
    isAccountAndPwd,
    option
) {
    const correctValue = [];
    const errorCollect = [];

    for (let i = 0; i < curSheetValue.length; i++) {
        const curRowValue = curSheetValue[i];
        let is_error = false;
        try {
            // 验证用户
            let result_users = curRowValue.username
                ? await service.get_user_list({
                    username: curRowValue.username,
                    deviceName: curRowValue.deviceName
                })
                : null;

            if (!result_users || result_users?.list_info.row_count === 0) {
                errorCollect.push({
                    code: 1,
                    username: curRowValue.username,
                });
                is_error = true;
            }

            // 验证设备
            const deviceInfo = curRowValue.deviceName
                ? await service.get_device_info({
                    username: curRowValue.username,
                    deviceName: curRowValue.deviceName
                })
                : null;

            if (!deviceInfo?.data) {
                errorCollect.push({
                    code: 2,
                    deviceName: curRowValue.deviceName,
                });
                is_error = true;
            }

            if (!is_error) {
                correctValue.push(curRowValue);

                // 处理设备信息
                const deviceObj = {
                    type: deviceInfo.data.assets[0].model,
                    deviceName: deviceInfo.data.assets[0].name.toUpperCase(),
                    assets_tag: deviceInfo.data.assets[0].asset_tag,
                    sn: (deviceInfo.data.assets[0].SN || deviceInfo.data.assets[0].service_tag || ""),
                    number: 1
                };

                // 生成模板
                await service.get_template_docx(
                    [deviceObj, ...option],
                    curRowValue.username,
                    curRowValue.remark
                );

                // 生成账户信息
                if (isAccountAndPwd) {
                    await service.staff_template_create({
                        email: curRowValue.email ? curRowValue.email : result_users?.user[0]?.email_id,
                        password: curRowValue.password
                    });
                }
            }
        } catch (error) {
            console.log(error)
        }

        // 准备结果（复制缓冲区）
        // console.log(service.buffers)
    }
    return {
        correctValue,
        errorCollect,
        buffers: [...service.buffers],
        staff_buffers: [...service.staff_buffers]
    };
}

const python_path = path.join(__dirname, "../../", "../../../", "PycharmProjects", "pythonProject1")
// const python_path = path.join(__dirname, "../../", "../", "PythonScripts", "change_sdp_user")
function change_assets_user(assets, user_info, multiple = false) {
    // 为了区分批量的传值，python里判断如果assets为batch则执行批量
    const { execSync, exec } = require('child_process')
    const arg1 = multiple ? encodeURIComponent(user_info) : `${user_info.indexOf(" ") > 0 ? user_info.replace(" ", ".") : user_info}`
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
        if (stdout) {
            console.log(stdout)
        }
    })
}

// 监听终止信号
parentPort.on('exit', () => {
    console.log('Worker terminated');
    // 确保清理资源
    // if (PostService_instance && PostService_instance.cleanup) {
    //     PostService_instance.cleanup();
    // }
})