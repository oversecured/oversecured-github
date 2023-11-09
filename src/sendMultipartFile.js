const core = require('@actions/core');
const axios = require('axios');
const {getFileSize, createChunkStream, streamToBuffer} = require('./fileHelpers');

const BASE_URL = 'https://api.oversecured.com/v1';
const CREATE_MULTIPART_UPLOAD = `${BASE_URL}/upload/app/multi/create`;
const GET_PART_SIGNED_LINK = `${BASE_URL}/upload/app/multi/part`;
const COMPLETE_MULTIPART_UPLOAD = `${BASE_URL}/upload/app/multi/complete`;

async function sendMultipartFile(apiSession, fileName, platform, appPath) {
    let {uploadId, key} = await createMultipartUpload(apiSession, fileName, platform);
    const CHUNK_SIZE_MB = 300;
    const FILE_SIZE = getFileSize(appPath);
    const CHUNK_SIZE = CHUNK_SIZE_MB * 1024 * 1024; // 300MB
    const CHUNKS_COUNT = Math.ceil(FILE_SIZE / CHUNK_SIZE);

    core.info(`Uploading the file to Oversecured with ${CHUNKS_COUNT} parts(${CHUNK_SIZE_MB}MB each)...`)

    for (let i = 0; i < CHUNKS_COUNT; i++) {
        const start = i * CHUNK_SIZE;
        const end = (i + 1) * CHUNK_SIZE;
        const chunkStream = createChunkStream(appPath, start, end);

        // Convert stream to buffer for axios
        const chunkBuffer = await streamToBuffer(chunkStream);

        try {
            const {url} = await getSignedUrl(apiSession, key, uploadId, i + 1);
            if (url) {
                await uploadPart(i + 1, url, chunkBuffer);
            }
        } catch (error) {
            core.error("Error while uploading part " + (i + 1))
        }
    }

    await completeMultipartUpload(apiSession, uploadId, key)
    return key
}


async function createMultipartUpload(apiSession, fileName, platform) {
    core.info('Requesting a multipart upload id...')
    const signReq = {
        'file_name': fileName,
        'platform': platform
    };
    const getMultipartUploadResponse = await apiSession.post(CREATE_MULTIPART_UPLOAD, signReq);
    if (getMultipartUploadResponse.status !== 200) {
        throw new Error(`Failed to get a multipart upload id: ${getMultipartUploadResponse.data}`);
    }
    const uploadId = getMultipartUploadResponse.data['upload_id'];
    const key = getMultipartUploadResponse.data['key'];

    return {uploadId, key}
}

async function getSignedUrl(apiSession, key, uploadId, partNumber) {
    core.info(`Requesting a signed url for part ${partNumber}...`)
    const signReq = {
        'key': key,
        'upload_id': uploadId,
        'part_number': partNumber
    };
    try {
        const getUrlResponse = await apiSession.post(GET_PART_SIGNED_LINK, signReq);
        if (getUrlResponse.status !== 200) {
            core.error("Error while getting signed url for part " + partNumber)
            return null
        }
        return getUrlResponse.data;
    } catch (error) {
        throw new Error(`Failed to get a signed url: ${error.message} for part ${partNumber}`);
    }
}

async function uploadPart(partNumber, signedUrl, chunk) {
    core.info(`Uploading part ${partNumber}...`)
    let putFileResponse
    try {
        putFileResponse = await axios.put(signedUrl, chunk, {
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 10 * 60 * 1000, // 10 minutes
            headers: {
                'Content-Length': chunk.length
            },
        });
    } catch (error) {
        throw new Error(`Failed to upload file: ${error.message}`);
    }
    if (putFileResponse.status !== 200) {
        throw new Error(`Wrong response code: ${putFileResponse.status}`);
    }
}

async function completeMultipartUpload(apiSession, uploadId, key) {
    core.info('Requesting a complete multipart upload...')
    const signReq = {
        'upload_id': uploadId,
        'key': key
    };
    const completeMultipartUploadResponse = await apiSession.post(COMPLETE_MULTIPART_UPLOAD, signReq);
    if (completeMultipartUploadResponse.status !== 200) {
        throw new Error(`Failed to complete a multipart upload: ${completeMultipartUploadResponse.data}`);
    }

    return true
}

module.exports = sendMultipartFile;