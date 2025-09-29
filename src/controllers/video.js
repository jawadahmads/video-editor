const path = require("node:path");
const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const { pipeline } = require("node:stream/promises");
const util = require("../../lib/util");
const DB = require("../DB");
const FF = require("../../lib/FF");

// Return the list of all the videos that a logged in user has uploaded
const getVideos = (req, res, handleErr) => {
  DB.update();
  const videos = DB.videos.filter((video) => {
    return video.userId === req.userId;
  });

  res.status(200).json(videos);
};

// Upload a video file
const uploadVideo = async (req, res, handleErr) => {
  const specifiedFileName = req.headers.filename;
  const extension = path.extname(specifiedFileName).substring(1).toLowerCase();
  const name = path.parse(specifiedFileName).name;
  const videoId = crypto.randomBytes(4).toString("hex");

  const FORMATS_SUPPORTED = ["mov", "mp4"];

  if (FORMATS_SUPPORTED.indexOf(extension) == -1) {
    return handleErr({
      status: 400,
      message: "Only these formats are allowed: mov, mp4",
    });
  }

  try {
    await fs.mkdir(`./storage/${videoId}`);
    const fullPath = `./storage/${videoId}/original.${extension}`; // the original video path
    const file = await fs.open(fullPath, "w");
    const fileStream = file.createWriteStream();
    const thumbnailPath = `./storage/${videoId}/thumbnail.jpg`;

    await pipeline(req, fileStream);

    // Make a thumbnail for the video file
    await FF.makeThumbnail(fullPath, thumbnailPath);

    // Get the dimensions
    const dimensions = await FF.getDimensions(fullPath);

    DB.update();
    DB.videos.unshift({
      id: DB.videos.length,
      videoId,
      name,
      extension,
      dimensions,
      userId: req.userId,
      extractedAudio: false,
      resizes: {},
    });
    DB.save();

    res.status(201).json({
      status: "success",
      message: "The file was uploaded successfully!",
    });
  } catch (e) {
    // Delete the folder
    util.deleteFolder(`./storage/${videoId}`);
    if (e.code !== "ECONNRESET") return handleErr(e);
  }
};

// Extract the audio for a video file (can only be done once per video)
const extractAudio = async (req, res, handleErr) => {
  const videoId = req.params.get("videoId");

  DB.update();
  const video = DB.videos.find((video) => video.videoId === videoId);

  if (video.extractedAudio) {
    return handleErr({
      status: 400,
      message: "The audio has already been extracted for this video.",
    });
  }

  try {
    const originalVideoPath = `./storage/${videoId}/original.${video.extension}`;
    const targetAudioPath = `./storage/${videoId}/audio.aac`;

    await FF.extractAudio(originalVideoPath, targetAudioPath);

    video.extractedAudio = true;
    DB.save();

    res.status(200).json({
      status: "success",
      message: "The audio was extracted successfully!",
    });
  } catch (e) {
    util.deleteFile(targetAudioPath);
    return handleErr(e);
  }
};

// Resize a video file (creates a new video file)
const resizeVideo = async (req, res, handleErr) => {
  const videoId = req.body.videoId;
  const width = Number(req.body.width);
  const height = Number(req.body.height);

  DB.update();
  const video = DB.videos.find((video) => video.videoId === videoId);
  video.resizes[`${width}x${height}`] = { processing: true };

  const originalVideoPath = `./storage/${video.videoId}/original.${video.extension}`;
  const targetVideoPath = `./storage/${video.videoId}/${width}x${height}.${video.extension}`;

  try {
    await FF.resize(originalVideoPath, targetVideoPath, width, height);

    video.resizes[`${width}x${height}`].processing = false;
    DB.save();

    res.status(200).json({
      status: "success",
      message: "The video is now being processed!",
    });
  } catch (e) {
    util.deleteFile(targetVideoPath);
    return handleErr(e);
  }
};

// Return a video asset to the client
const getVideoAsset = async (req, res, handleErr) => {
  const videoId = req.params.get("videoId");
  const type = req.params.get("type"); // thumbnail, original, audio, resize

  DB.update();
  const video = DB.videos.find((video) => video.videoId === videoId);

  if (!video) {
    return handleErr({
      status: 404,
      message: "Video not found!",
    });
  }

  let file;
  let mimeType;
  let filename; // the final file name for the download (including the extension)

  switch (type) {
    case "thumbnail":
      file = await fs.open(`./storage/${videoId}/thumbnail.jpg`, "r");
      mimeType = "image/jpeg";
      break;
    case "audio":
      file = await fs.open(`./storage/${videoId}/audio.aac`, "r");
      mimeType = "audio/aac";
      filename = `${video.name}-audio.aac`;
      break;
    case "resize":
      const dimensions = req.params.get("dimensions");
      file = await fs.open(
        `./storage/${videoId}/${dimensions}.${video.extension}`,
        "r"
      );
      mimeType = "video/mp4"; // Not a good practice! Videos are not always MP4
      filename = `${video.name}-${dimensions}.${video.extension}`;
      break;
    case "original":
      file = await fs.open(
        `./storage/${videoId}/original.${video.extension}`,
        "r"
      );
      mimeType = "video/mp4"; // Not a good practice! Videos are not always MP4
      filename = `${video.name}.${video.extension}`;
      break;
  }

  try {
    // Grab the file size
    const stat = await file.stat();

    const fileStream = file.createReadStream();

    if (type !== "thumbnail") {
      // Set a header to prompt for download
      res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    }

    // Set the Content-Type header based on the file type
    res.setHeader("Content-Type", mimeType);
    // Set the Content-Length to the size of the file
    res.setHeader("Content-Length", stat.size);

    res.status(200);

    await pipeline(fileStream, res);
    file.close();
  } catch (e) {
    console.log(e);
  }
};

const controller = {
  getVideos,
  uploadVideo,
  extractAudio,
  resizeVideo,
  getVideoAsset,
};

module.exports = controller;
