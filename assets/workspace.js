/* One offline classroom, separate probability models and preserved workspaces. */
(function () {
  'use strict';
  const atomic = document.getElementById('hydrogen-demo');
  const molecular = document.getElementById('molecular-demo');
  const buttons = {atom: document.getElementById('ec-workspace-atom'), molecule: document.getElementById('ec-workspace-molecule')};
  let workspace = 'atom';
  function setWorkspace(next, updateHash = true) {
    if (next !== 'atom' && next !== 'molecule') throw new RangeError('Unknown laboratory');
    window.ElectronLab?.pause();
    window.MolecularLab?.pause();
    workspace = next;
    atomic.hidden = next !== 'atom'; molecular.hidden = next !== 'molecule';
    document.body.dataset.workspace = next;
    Object.entries(buttons).forEach(([key, button]) => button.setAttribute('aria-pressed', String(key === next)));
    document.dispatchEvent(new CustomEvent('electronlab:workspacechange', {detail:{workspace:next}}));
    if (updateHash && location.hash !== '#' + next) history.replaceState(null, '', '#' + next);
    requestAnimationFrame(() => {
      (next === 'atom' ? window.ElectronLab : window.MolecularLab)?.redraw();
      window.dispatchEvent(new Event('resize'));
    });
  }
  function record() {
    return {
      format:'ElectronCloudAtomsMoleculesRecord',version:1,createdAt:new Date().toISOString(),
      language:window.ElectronI18n.lang,workspace,
      atomic:{experiment:window.ElectronLab.snapshot(),activeLesson:window.ElectronClassroom.getActiveLesson(),activities:window.ElectronClassroom.getAnswers()},
      molecular:{experiment:window.MolecularLab.snapshot(),classroom:window.MolecularClassroom?.snapshot() ?? null},
      writtenExplanationAutomaticallyGraded:false
    };
  }
  function exportRecord() {
    const blob = new Blob([JSON.stringify(record(), null, 2)], {type:'application/json;charset=utf-8'});
    const url=URL.createObjectURL(blob), link=document.createElement('a');
    link.href=url; link.download='electron-cloud-atoms-molecules-record.json';
    document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  Object.entries(buttons).forEach(([key, button])=>button.addEventListener('click',()=>setWorkspace(key)));
  document.getElementById('ec-export-all').addEventListener('click',exportRecord);
  window.addEventListener('hashchange',()=>setWorkspace(location.hash==='#molecule'?'molecule':'atom',false));
  window.ElectronWorkspace=Object.freeze({setWorkspace,snapshot:record,exportRecord});
  setWorkspace(location.hash==='#molecule'?'molecule':'atom',false);
})();
