// Shared by the isolated runner, the validator and standalone downloads.
export const RUNTIME_VERSION = 1;
export function workerSource(code) {
  return `"use strict";
for (const key of ['fetch','XMLHttpRequest','WebSocket','EventSource','Worker','SharedWorker','importScripts']) {
  Object.defineProperty(self,key,{value:undefined,writable:false,configurable:false});
}
${code}
let game, timer, previous=0, input={};
self.onmessage=event=>{
  const m=event.data;
  if(m.type==='init'){
    const canvas=m.canvas, ctx=canvas.getContext('2d');
    try{game=createGame({canvas,ctx,width:canvas.width,height:canvas.height});}
    catch(e){self.postMessage({type:'error',message:String(e.message).slice(0,200)});return;}
    self.postMessage({type:'ready'});
    timer=setInterval(()=>{
      try {
        const now=performance.now(); const dt=previous?Math.min((now-previous)/1000,.04):.016; previous=now;
        game.update(dt,input); game.draw();
        self.postMessage({type:'frame',state:game.getState?game.getState():null});
      }catch(e){clearInterval(timer);self.postMessage({type:'error',message:String(e.message).slice(0,200)});}
    },33);
  }
  if(m.type==='input')input=m.input;
};`;
}

export function bootRunner() {
  let canvas = document.querySelector('canvas');
  const message = document.querySelector('#message');
  let worker, url, timer, lastFrame = 0, expectedOrigin, nonce, currentCode;
  const input = {left:false,right:false,up:false,down:false,action:false};
  const tell = (type, extra = {}) => {
    if (expectedOrigin) parent.postMessage({type,nonce,...extra}, expectedOrigin);
    document.documentElement.dataset.state = type;
  };
  const stop = () => { worker?.terminate(); clearInterval(timer); if(url)URL.revokeObjectURL(url); };
  const start = code => {
    stop();
    for(const key of Object.keys(input))input[key]=false;
    if(!('transferControlToOffscreen' in HTMLCanvasElement.prototype)){
      message.textContent='Your browser needs Canvas worker support. Try a current browser.'; tell('error');return;
    }
    const fresh = canvas.cloneNode(); canvas.replaceWith(fresh); canvas=fresh;
    // A fresh canvas is necessary after an OffscreenCanvas has been transferred.
    const target=document.querySelector('canvas');
    target.focus();
    url=URL.createObjectURL(new Blob([window.buildWorker(code)],{type:'text/javascript'}));
    worker=new Worker(url); lastFrame=Date.now(); message.textContent='Starting your game…';
    worker.onmessage=e=>{
      if(e.data?.type==='frame'){
        lastFrame=Date.now();message.textContent='';document.documentElement.dataset.gameState=JSON.stringify(e.data.state);tell('frame',{state:e.data.state});
      }else if(e.data?.type==='error'){
        stop();message.textContent='This game stopped. Press Restart to try again.';document.documentElement.dataset.error=String(e.data.message||'').slice(0,200);tell('error',{message:e.data.message});
      }
    };
    worker.onerror=()=>{stop();message.textContent='This game could not start. Try Restart.';tell('error');};
    const surface=target.transferControlToOffscreen();
    worker.postMessage({type:'init',canvas:surface},[surface]);
    timer=setInterval(()=>{if(Date.now()-lastFrame>3000){stop();message.textContent='Game paused after it stopped responding. Press Restart.';tell('error',{message:'Game stopped responding'});}},500);
  };
  const sendInput=()=>worker?.postMessage({type:'input',input});
  const keys={ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right',ArrowUp:'up',w:'up',ArrowDown:'down',s:'down',' ':'action',Enter:'action'};
  for(const event of ['keydown','keyup'])window.addEventListener(event,e=>{
    const key=keys[e.key];if(key){e.preventDefault();input[key]=event==='keydown';sendInput();}
  });
  window.addEventListener('blur',()=>{for(const key of Object.keys(input))input[key]=false;sendInput();});
  for(const button of document.querySelectorAll('[data-key]')){
    button.addEventListener('pointerdown',e=>{button.setPointerCapture(e.pointerId);input[button.dataset.key]=true;sendInput();});
    for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,()=>{input[button.dataset.key]=false;sendInput();});
  }
  window.addEventListener('message',event=>{
    if(event.source!==parent || !window.allowedParents.includes(event.origin))return;
    const m=event.data;if(!m||typeof m.nonce!=='string')return;
    if(m.type==='load' && typeof m.code==='string' && m.code.length<=131072){
      expectedOrigin=event.origin;nonce=m.nonce;currentCode=m.code;start(currentCode);
    }else if(event.origin===expectedOrigin && m.nonce===nonce && m.type==='restart' && currentCode)start(currentCode);
  });
  // Standalone exports have their payload inserted by the download endpoint.
  if(window.standaloneCode){currentCode=window.standaloneCode;start(currentCode);document.querySelector('#restart').hidden=false;}
  document.querySelector('#restart').onclick=()=>start(currentCode);
  window.addEventListener('pagehide',stop);
}

/** @param {{parents?: string[], code?: string}} options */
export function runnerHtml({parents=[],code}={}) {
  const escape = x => JSON.stringify(x).replace(/</g,'\\u003c');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Game player</title>
<style>*{box-sizing:border-box}body{margin:0;background:#edf4ef;color:#24352b;font:14px system-ui;overflow:hidden}canvas{width:100%;aspect-ratio:16/10;display:block;outline:none}#message{position:absolute;top:15px;left:15px;pointer-events:none}.controls{display:flex;justify-content:center;gap:6px;padding:10px;background:#fff}button{touch-action:none;border:1px solid #d4dfd8;border-radius:10px;background:#fff;min-width:40px;height:38px;font:600 14px system-ui}button:active{background:#c3f1da}#restart{margin-left:10px}</style></head><body><canvas tabindex="0" width="800" height="500" aria-label="Playable game canvas"></canvas><div id="message">Select a game to play.</div><div class="controls"><button data-key="left" aria-label="Move left">←</button><button data-key="up" aria-label="Move up">↑</button><button data-key="down" aria-label="Move down">↓</button><button data-key="right" aria-label="Move right">→</button><button data-key="action" aria-label="Action">Action</button><button id="restart" hidden>Restart</button></div><script>window.allowedParents=${escape(parents)};window.buildWorker=${workerSource.toString()};window.standaloneCode=${escape(code||null)};(${bootRunner.toString()})();</script></body></html>`;
}
