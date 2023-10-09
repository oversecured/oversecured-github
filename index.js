const core = require('@actions/core');
const axios = require('axios');
const fs = require('fs');
core.info(`> Starting to upload the app to Oversecured...`)

async function run() {
    try {
        const API_KEY = core.getInput('access_token');
        const INTEGRATION_ID = core.getInput('integration_id');
        const BRANCH_NAME = core.getInput('branch_name') || 'main';
        const appPath = core.getInput('app_path');

        core.info(`App path: ${appPath}`)
        core.info(`Integration ID: ${INTEGRATION_ID}`)
        core.info(`Branch name: ${BRANCH_NAME}`)

        const BASE_URL = 'https://api.oversecured.com/v1';
        const ADD_VERSION = `${BASE_URL}/integrations/${INTEGRATION_ID}/branches/${BRANCH_NAME}/versions/add`;
        const GET_SIGNED_LINK = `${BASE_URL}/upload/app`;

        const apiSession = axios.create({
            baseURL: BASE_URL,
            headers: {'Authorization': API_KEY}
        });

        const fileName = appPath.split('/').pop();
        const platform = getPlatform(fileName);

        const signReq = {
            'file_name': fileName,
            'platform': platform
        };
        core.info('Requesting a signed url...')
        const getUrlResponse = await apiSession.post(GET_SIGNED_LINK, signReq);
        if (getUrlResponse.status !== 200) {
            throw new Error(`Failed to get a signed url: ${getUrlResponse.data}`);
        }
        const signInfo = getUrlResponse.data;
        core.info('Reading app file...')
        let fileData
        try {
            fileData = fs.readFileSync(appPath);
        } catch (error) {
            throw new Error(`Failed to read the file: ${error.message}`);
        }
        core.info(`Uploading the file to Oversecured...`)
        let putFileResponse
        try {
            putFileResponse = await axios.put(signInfo['url'], fileData);
        } catch (error) {
            throw new Error(`Failed to upload file: ${error.message}`);
        }
        if (putFileResponse.status !== 200) {
            throw new Error(`Wrong response code: ${putFileResponse.status}`);
        }

        core.info(`Creating a new version...`)
        const addVersionReq = {
            'file_name': fileName,
            'bucket_key': signInfo['bucket_key']
        };

        let addVersionResponse = await apiSession.post(ADD_VERSION, addVersionReq);
        if (addVersionResponse.status !== 200) {
            throw new Error(`Failed to add version: ${addVersionResponse.data}`);
        }

        core.info('> App uploaded successfully!')

    } catch (error) {
        core.setFailed(error.message);
    }
}

function getPlatform(fileName) {
    fileName = fileName.toLowerCase();
    if (fileName.endsWith('.apk') || fileName.endsWith('.aab')) {
        return 'android';
    }
    if (fileName.endsWith('.zip')) {
        return 'ios';
    }
    throw new Error(`App file ${fileName} has invalid extension. Only .apk, .aab, and .zip are allowed.`);
}

run();