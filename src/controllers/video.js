const fs = require("fs/promises");
const path = require("path/posix");
const crypto = require("node:crypto");
const { pipeline } = require("node:stream/promises");
const util = require("../../lib/utils.js");
const DB = require("../DB.js");
const childProcess = require("child_process");

const getVideos = (req, res, handleErr) => {
  // this req and res and handleErr is passed by the framework when where the url hits
  const name = req.params.get("name");
  if (name) {
    res.status(200).json({ message: `Your name is ${name}` });
  } else {
    return handleErr({ status: 401, message: "Pass name as a param" });
  }
};

const uploadVideo = async (req, res, handleErr) => {
  // get the data from the req
  const fileName = req.headers.filename;
  // extract extenstion and file name
  const extenstion = path.extname(fileName).substring(1).toLowerCase();
  const name = path.parse(fileName).name;
  // random id for the video
  const videoId = crypto.randomBytes(4).toString("hex");

  // update the vides storage
  DB.update();
  DB.videos.unshift({
    id: DB.videos.length,
    videoId,
    extenstion,
    userId: req.userId,
    extractedAudio: false,
    resizes: {},
  });
  DB.save();

  try {
    await fs.mkdir(`./Storage/${videoId}`);
    const fullPath = `./Storage/${videoId}/original.${extenstion}`;
    const file = await fs.open(fullPath, "w");
    const fileStream = file.createWriteStream();

    await pipeline(req, fileStream);
  } catch (e) {
    // delete the folder
    util.deleteFolder(`./Storage/${videoId}`);
    if (e !== "ECONNRESET") return handleErr(e);
  }
};

const controler = {
  getVideos,
  uploadVideo,
};

module.exports = controler;
