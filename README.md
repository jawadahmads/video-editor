# Video Editor Web Application

A Node.js-based video processing application that provides video editing capabilities through a web interface. Built using FFmpeg and FFprobe for robust video manipulation with queue-based processing for efficient resource management.

## Features

- **Video Resizing**: Scale videos to different resolutions
- **Audio Extraction**: Extract audio tracks from video files
- **Web Interface**: User-friendly interface for managing video operations
- **Cookie-Based Authentication**: Secure login system using cookies
- **Queue System**: Efficient processing of video operations to prevent server overload
- **Real-time Progress**: Track the status of video processing operations

## Tech Stack

- **Backend**: Node.js
- **Video Processing**: FFmpeg, FFprobe (spawned via child_process)
- **Authentication**: Cookie-based session management
- **Queue Management**: Custom queue implementation for video processing

## Prerequisites

Before running this application, ensure you have the following installed:

- Node.js (v14 or higher)
- FFmpeg (must be accessible in system PATH)
- FFprobe (usually comes with FFmpeg)

## How to Run This Project

1. Clone the repository.
2. Make sure Node.js (v22 or higher) is installed.
3. Run the examples or the mini project using:

=> simple server

```bash
npm run start
```

=> In cluster mode

```bash
npm run cluster
```
