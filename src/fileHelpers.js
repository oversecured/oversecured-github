const fs = require('fs');

function getFileSize(path) {
    return fs.statSync(path).size;
}

function readFileSync(path) {
    try {
        return fs.readFileSync(path);
    } catch (error) {
        throw new Error(`Failed to read the file: ${error.message}`);
    }
}

function createChunkStream(filePath, start, end) {
    try {
        return fs.createReadStream(filePath, {start, end: end - 1});
    } catch (error) {
        throw new Error(`Failed to read the file chunk: ${error.message}`);
    }
}

function streamToBuffer(stream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
}

module.exports = {
    getFileSize,
    readFileSync,
    createChunkStream,
    streamToBuffer
}