Oversecured Action for GitHub
============================

This GitHub Action enables you to automatically upload your app versions to Oversecured for security scanning. An action user must have an [active Integration](https://oversecured.com/integrations).

### Inputs

- `access_token`: Required. Your Oversecured API key
- `integration_id`: Required. The integration ID from Oversecured
- `branch_name`: Optional. The branch name, `main` is default
- `app_path`: Required. The path to the app file you wish to upload

### Usage

1. Store your Oversecured API key as a secret in your GitHub repository. Navigate to your GitHub repository, go to the `Settings` tab, select `Secrets` from the left sidebar, and click the `New repository secret` button. Name the secret `OVERSECURED_API_KEY` and paste your key.
2. Add the Oversecured job to your GitHub Actions workflow.

Android example:
```yml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Change wrapper permissions
        run: chmod +x ./gradlew

      - name: Build gradle project
        run: ./gradlew build

      - name: Build debug apk
        run: ./gradlew assembleDebug

      - name: Oversecured Scanner
        uses: oversecured/oversecured-github@v1
        with:
          access_token: ${{ secrets.OVERSECURED_API_KEY }}
          integration_id: ${{ vars.OVERSECURED_INTEGRATION_ID }}
          branch_name: ${{ vars.OVERSECURED_BRANCH_NAME }}
          app_path: ./app/build/outputs/apk/debug/app-debug.apk
```

iOS example:
```yml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Pods Install
        run: |
          pod install

      - name: Zip Sources
        run: |
          zip -q -r OversecuredZipped.zip .

      - name: Oversecured Scanner
        uses: oversecured/oversecured-github@v1
        with:
          access_token: ${{ secrets.OVERSECURED_API_KEY }}
          integration_id: ${{ vars.OVERSECURED_INTEGRATION_ID }}
          branch_name: ${{ vars.OVERSECURED_BRANCH_NAME }}
          app_path: OversecuredZipped.zip
```


Have Question or Feedback?
--------------------------

Submit a request using the [contact form](https://support.oversecured.com/hc/en-us/requests/new).


### License

The scripts and documentation in this project are released under the [MIT License](https://github.com/oversecured/oversecured-github/blob/main/LICENSE).
