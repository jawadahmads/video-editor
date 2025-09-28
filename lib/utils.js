const fs = require("fs/promises");

const util = {};

util.deleteFolder = async (path) => {
  try {
    fs.rm(path, { recursive: true });
  } catch (e) {
    // do nothing
  }
};

util.deleteFile = async (path) => {
  try {
    fs.unlink(path);
  } catch (e) {
    // do nothing
  }
};
module.exports = util;
