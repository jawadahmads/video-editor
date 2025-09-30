const FF = require("./FF.js");
const DB = require("../src/DB.js");
const util = require("./util.js");

class JobQueue {
  constructor() {
    this.jobs = [];
    this.currentJob = null;
  }

  enqueue(job) {
    this.jobs.push(job);
    this.executeNext();
  }

  dequeue() {
    return this.jobs.shift();
  }

  executeNext() {
    if (this.currentJob) return;
    this.currentJob = this.dequeue();
    if (!this.currentJob) return;
    this.exectute(this.currentJob);
  }

  async exectute(job) {
    if (job.type === "resize") {
      const { videoId, width, height } = job;
      const video = DB.videos.find((video) => video.videoId === videoId);
      const originalVideoPath = `./storage/${video.videoId}/original.${video.extension}`;
      const targetVideoPath = `./storage/${video.videoId}/${width}x${height}.${video.extension}`;

      try {
        await FF.resize(originalVideoPath, targetVideoPath, width, height);
        // do it each video seprately
        DB.update();
        const video = DB.videos.find((video) => video.videoId === videoId);
        video.resizes[`${width}x${height}`].processing = false;
        DB.save();

        console.log(`Done resize number of jobs remaing : ${this.jobs.length}`);
      } catch (e) {
        console.log(e);
        util.deleteFile(targetVideoPath);
      }
    }

    this.currentJob = null;
    this.executeNext();
  }
}

module.exports = JobQueue;
