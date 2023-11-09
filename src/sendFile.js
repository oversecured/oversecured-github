const core = require('@actions/core');
const axios = require('axios');
const {readFileSync} = require('./fileHelpers');

const BASE_URL = 'https://api.oversecured.com/v1';
const GET_SIGNED_LINK = `${BASE_URL}/upload/app`;

async function sendFile(apiSession, fileName, platform, appPath) {
    const signReq = {
        'file_name': fileName,
        'platform': platform
    };

    core.info('Reading app file...')
    let fileData = readFileSync(appPath);

    core.info('Requesting a signed url...')
    const getUrlResponse = await apiSession.post(GET_SIGNED_LINK, signReq);
    if (getUrlResponse.status !== 200) {
        throw new Error(`Failed to get a signed url: ${getUrlResponse.data}`);
    }
    const {url, bucket_key} = getUrlResponse.data;

    if (url && bucket_key) {
        core.info(`Uploading the file to Oversecured...`)
        let putFileResponse
        try {
            putFileResponse = await axios.put(url, fileData, {
                maxBodyLength: Infinity
            });
            if (putFileResponse.status !== 200) {
                core.error(`Wrong response code: ${putFileResponse.status}`);
                return null
            }
            return bucket_key;
        } catch (error) {
            throw new Error(`Failed to upload file: ${error.message}`);
        }
    } else {
        throw new Error(`Failed to get a signed url: ${getUrlResponse.data}`);
    }
}

module.exports = sendFile;