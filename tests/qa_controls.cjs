const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const{pathToFileURL}=require('url');
const{launchBrowser}=require('./browser.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts','controls');
fs.mkdirSync(out,{recursive:true});const checks=[],errors=[];let browser,page;
const s=()=>page.evaluate(()=>MolecularLab.snapshot());
const pass=(name,evidence)=>{checks.push({name,evidence});console.log('PASS '+name);};
(async()=>{
 browser=await launchBrowser();
 const ctx=await browser.newContext({viewport:{width:1280,height:1000},reducedMotion:'reduce'});page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.join(root,'electron-cloud-classroom.html')).href+'#molecule');await page.waitForFunction(()=>window.MolecularClassroom);
 assert.equal(await page.locator('#molecular-demo').isVisible(),true);
 await page.click('#mo-one');assert.equal((await s()).count,1);await page.click('#mo-batch');assert.equal((await s()).count,101);
 const original=await s();await page.selectOption('#mo-total','100');assert.equal((await s()).count,100);
 await page.selectOption('#mo-total','1000');let v=await s();assert.equal(v.count,100);assert.equal(v.seed,original.seed);assert.equal(v.runId,original.runId);
 await page.click('#mo-finish');assert.equal((await s()).count,1000);await page.selectOption('#mo-total','100000');assert.equal((await s()).count,1000);
 pass('Real one/batch/finish controls and total changes preserve the sample prefix');

 const beforeView=await s();await page.selectOption('#mo-color','phase');await page.selectOption('#mo-view','xy');let next=await s();
 for(const key of ['count','seed','runId','hits','probability'])assert.equal(next[key],beforeView[key]);
 assert.equal(await page.locator('#mo-projection-note').isVisible(),true);assert.equal(await page.locator('#mo-yaw').isDisabled(),true);
 await page.selectOption('#mo-view','3d');const box=await page.locator('#mo-cloud').boundingBox();
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+50,box.y+box.height/2+15,{steps:4});await page.mouse.up();
 next=await s();assert.notEqual(next.yaw,beforeView.yaw);assert.equal(next.count,beforeView.count);
 await page.locator('#mo-yaw').focus();const angle=next.yaw;await page.keyboard.press('ArrowRight');assert.ok((await s()).yaw>angle);
 pass('Projection, phase color, pointer rotation and keyboard angle controls preserve measurements');

 await page.click('#mo-reveal');assert.equal((await s()).revealed,true);assert.match(await page.locator('#mo-probability').innerText(),/25\.95%/);
 await page.selectOption('#mo-state','antibonding');next=await s();assert.equal(next.count,0);assert.equal(next.revealed,false);assert.ok(next.runId>original.runId);
 await page.locator('#mo-distance').focus();await page.keyboard.press('ArrowRight');next=await s();assert.equal(next.R,2.1);assert.equal(next.count,0);
 pass('Reveal is numerical; orbital and distance changes start a new run');

 const invalid=[{R:.5},{R:9},{state:'unknown'},{total:500000},{count:-1},{seed:-1},{color:'charge'},{view:'unknown'},{pitch:81},{speed:10},{revealed:'yes'},{playing:1}];
 const failures=await page.evaluate(cases=>cases.map(cfg=>{const before=JSON.stringify(MolecularLab.snapshot());let rejected=false;try{MolecularLab.loadPreset(cfg);}catch(e){rejected=true;}return{rejected,unchanged:before===JSON.stringify(MolecularLab.snapshot())};}),invalid);
 assert.ok(failures.every(r=>r.rejected&&r.unchanged));pass('Invalid presets fail before changing the experiment',failures.length);

 await page.evaluate(()=>MolecularLab.loadPreset({R:2,state:'bonding',seed:1701,total:100000,count:0,speed:500,playing:false}));await page.click('#mo-play');await page.waitForFunction(()=>MolecularLab.snapshot().count>=30);
 const playing=await s();await page.click('#ec-lang-en');next=await s();assert.equal(next.playing,true);assert.equal(next.seed,playing.seed);assert.equal(next.runId,playing.runId);assert.ok(next.count>=playing.count);
 await page.click('#ec-workspace-atom');const paused=await s();assert.equal(paused.playing,false);await page.waitForTimeout(200);assert.equal((await s()).count,paused.count);
 await page.evaluate(()=>ElectronLab.loadPreset({model:'hydrogen',state:'1s',guided:false,total:10000,count:0}));await page.click('#ec-play');await page.waitForFunction(()=>ElectronLab.snapshot().count>0);
 await page.click('#ec-workspace-molecule');const atomPaused=await page.evaluate(()=>ElectronLab.snapshot());assert.equal(atomPaused.playing,false);await page.waitForTimeout(200);assert.equal((await page.evaluate(()=>ElectronLab.snapshot())).count,atomPaused.count);
 pass('Language changes preserve playback; leaving either workspace pauses it');

 await page.click('#ec-lang-zh');await page.click('#mo-lesson-one-electron');await page.check('#mo-prediction-copies');await page.click('#mo-task-start');
 await page.waitForFunction(()=>document.querySelector('.mo-lab-grid').getBoundingClientRect().top<innerHeight/2);
 assert.equal(await page.locator('#mo-return-task').isVisible(),true);await page.click('#mo-return-task');
 assert.equal(await page.locator('#mo-task-panel').evaluate(e=>e.open),true);await page.waitForFunction(()=>document.querySelector('#mo-task-panel').getBoundingClientRect().top<innerHeight/2);
 pass('Starting a student experiment brings controls into view, with a return-to-task action');

 await page.emulateMedia({colorScheme:'dark'});const colors=await page.locator('#molecular-demo').evaluate(e=>({foreground:getComputedStyle(e).color,background:getComputedStyle(e).backgroundColor,scheme:getComputedStyle(e).colorScheme}));
 assert.equal(colors.scheme,'light');assert.equal(colors.background,'rgb(255, 255, 255)');
 await page.locator('#mo-task-panel').evaluate(e=>e.open=false);await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(out,'molecular-system-dark.png')});pass('Molecular paper panel remains readable with a dark system theme',colors);

 // Fresh context: delivery previews have no answers or completed classroom task.
 const fresh=await browser.newContext({viewport:{width:1280,height:1000},locale:'zh-CN',colorScheme:'light'});const preview=await fresh.newPage();
 await preview.goto(pathToFileURL(path.join(root,'electron-cloud-classroom.html')).href+'#molecule');await preview.waitForFunction(()=>window.MolecularLab);
 await preview.evaluate(()=>MolecularLab.loadPreset({R:2,state:'antibonding',seed:2026101202,total:10000,count:10000,revealed:true,color:'phase',view:'xz'}));
 await preview.screenshot({path:path.join(out,'molecular-preview-zh.png')});
 await preview.locator('.mo-lab-grid').screenshot({path:path.join(out,'molecular-experiment-zh.png')});
 await preview.locator('.mo-axis-grid').screenshot({path:path.join(out,'molecular-axis-zh.png')});
 await preview.click('#ec-lang-en');await preview.setViewportSize({width:390,height:1000});await preview.evaluate(()=>scrollTo(0,0));await preview.screenshot({path:path.join(out,'molecular-preview-mobile-en.png'),fullPage:true});
 await preview.setViewportSize({width:320,height:1000});assert.ok(await preview.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'qa-controls.json'),JSON.stringify({passed:true,checks,pageErrors:errors},null,2));console.log(JSON.stringify({passed:true,checks:checks.length}));
})().catch(async e=>{console.error(e.stack);if(page)await page.screenshot({path:path.join(out,'qa-controls-failure.png'),fullPage:true}).catch(()=>{});fs.writeFileSync(path.join(out,'qa-controls-failure.json'),JSON.stringify({error:e.stack,checks,pageErrors:errors},null,2));process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();});
