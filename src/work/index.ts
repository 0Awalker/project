// import { container } from "../../main";
// import { WorkService } from "./service";

const container = require("../../main").container
const WorkService = require("./service").WorkService
const { parentPort, workerData } = require('worker_threads')

const workservice = container.get(WorkService)
const result = workservice.processRequest(workerData)
parentPort?.postMessage(result)