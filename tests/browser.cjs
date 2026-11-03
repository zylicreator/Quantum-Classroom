/* Test-only browser selection. The classroom application has no npm runtime. */
const {chromium}=require('playwright');

async function launchBrowser() {
  const options={headless:true};
  if(process.env.PLAYWRIGHT_EXECUTABLE_PATH) {
    options.executablePath=process.env.PLAYWRIGHT_EXECUTABLE_PATH;
  }
  return chromium.launch(options);
}

module.exports={launchBrowser};
