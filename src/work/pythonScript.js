const { parentPort } = require("node:worker_threads")

const path = require("node:path")


parentPort.on("message", (data) => {
    try {
        const { assets, user_info, multiple } = data
        change_assets_user(assets, user_info, multiple)
    } catch (error) {
        console.log(error)
    }
})