const cluster = require("node:cluster");
const os = require("node:os");
const JobQueue = require("../lib/jobQueue.js");

const jobs = new JobQueue();
if (cluster.isPrimary) {
  // its a parent

  const cores = os.availableParallelism();
  console.log("Number of cores :", cores);

  for (let i = 0; i < cores; i++) {
    const worker = cluster.fork();
  }

  cluster.on("message", (worker, message) => {
    if (message.messageType === "queue:resize") {
      const { width, height, videoId } = message.data;
      jobs.enqueue({
        type: "resize",
        width,
        height,
        videoId,
      });
    }
  });
} else {
  require("./index.js");
}
