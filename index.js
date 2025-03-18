const core = require('@actions/core');
const axios = require('axios');
const {getFileSize} = require('./src/fileHelpers');
const sendFile = require('./src/sendFile');
const sendMultipartFile = require('./src/sendMultipartFile');
core.info(`> Starting to upload the app to Oversecured...`)

const API_KEY = core.getInput('access_token');
const INTEGRATION_ID = core.getInput('integration_id');
const BRANCH_NAME = core.getInput('branch_name') || 'main';
const APP_PATH = core.getInput('app_path');
const DELETE_RUNNING = core.getInput('delete_running');

const BASE_URL = 'https://api.oversecured.com/v1';
const ADD_VERSION = `${BASE_URL}/integrations/${INTEGRATION_ID}/branches/${BRANCH_NAME}/versions/add`;

async function run() {
    try {
        core.info(`App path: ${APP_PATH}`)
        core.info(`Integration ID: ${INTEGRATION_ID}`)
        core.info(`Branch name: ${BRANCH_NAME}`)
        core.info(`Delete running: ${DELETE_RUNNING}`)

        const apiSession = axios.create({
            baseURL: BASE_URL,
            headers: {'Authorization': API_KEY}
        });

        const fileName = APP_PATH.split('/').pop();
        const platform = getPlatform(fileName);

        let bucket_key
        let fileSize = getFileSize(APP_PATH);
        if (fileSize > 500 * 1024 * 1024) { // 500 MB
            bucket_key = await sendMultipartFile(apiSession, fileName, platform, APP_PATH)
        } else {
            bucket_key = await sendFile(apiSession, fileName, platform, APP_PATH)
        }

        if (bucket_key) {
            core.info(`Creating a new version...`)
            let addVersionReq = {
                'file_name': fileName,
                'bucket_key': bucket_key
            };

            if (DELETE_RUNNING === 'true') {
                addVersionReq = {
                    ...addVersionReq,
                    'delete_running': true
                }
            }

            let addVersionResponse = await apiSession.post(ADD_VERSION, addVersionReq);
            if (addVersionResponse.status !== 200) {
                core.error(`Wrong response code: ${addVersionResponse.status}`);
                core.error('> App upload failed!')
            } else {
                core.info('> App uploaded successfully!')
            }
        } else {
            core.error('> App upload failed!')
        }
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