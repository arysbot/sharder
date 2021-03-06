const GrpcClient = require("@arys/grpc-client");
const _uuid = require("uuid/v1");
const cluster = require("cluster");
const Logger = require("@arys/logger");

class Sharder {
    constructor() {
        this.grpcClient = new GrpcClient();
        this.loger = new Logger({ service: "sharder" });
    }
    identify() {
        const uuid = _uuid();
        const timestampStart = Date.now();
        const request = { uuid };
        // send grpc request
        this.grpcClient.clients.shardOrchestrator.identify(request, (error, response) => {
            const timestampEnd = Date.now();
            const latency = timestampEnd - timestampStart;
            this.loger.logRequest("Logger#Identify", uuid, response, latency);
            if(error || response.errorLog) {
                throw error;
            }

            const shardAmount = response.endShard - response.startShard;
            for(let i = 0; i < shardAmount; i++) {
                const env = {
                    shardCount: response.totalShard,
                    shardId: response.startShard + i,
                    DISCORD_TOKEN: process.env.DISCORD_TOKEN,
                    NODE_ENV: process.env.NODE_ENV
                };
                cluster.fork(env);
            }
        });
        // send logRequest to winston saying that the instanced identifies
        // send error to sentry if couldn't identify
    }
}

module.exports = Sharder;
