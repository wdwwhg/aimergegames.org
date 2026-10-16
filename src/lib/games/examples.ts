import type { GameOutput } from './types';

export type ExampleGame = GameOutput & {
  id: string;
  pair: string;
  category: string;
  accent: string;
  image: string;
  gameA: string;
  gameB: string;
};

const common = `
  function text(s,x,y,size=18,color='#24463a'){ctx.fillStyle=color;ctx.font='600 '+size+'px system-ui';ctx.fillText(s,x,y);}
  function circle(x,y,r,c){ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
  function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(x,y,w,h);}
  function backdrop(){rect(0,0,width,height,'#e6f2e8');ctx.strokeStyle='#cedfd3';ctx.lineWidth=1;for(let x=0;x<width;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,height);ctx.stroke();}for(let y=0;y<height;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke();}}
`;
export const exampleGames: ExampleGame[] = [
  {
    id: 'moss-knight',
    gameA: 'Minecraft',
    gameB: 'Elden Ring',
    pair: 'Minecraft × Elden Ring',
    category: 'Exploration + combat',
    accent: 'green',
    image: '/games/moss-knight.svg',
    title: 'Moss Knight',
    summary:
      'Explore a tiny wild world. Gather five amber shards, dodge the sentinels, and find your way back to the gate.',
    controls:
      'Move: arrow keys or WASD. Attack: Space / Action. Gather 5 shards and reach the gate. Three hits end the run.',
    code: `function createGame({ctx,width,height}){
${common}
let p={x:90,y:250},hp=3,score=0,time=0,cooldown=0,ended=false,won=false;
const gems=[{x:190,y:120},{x:350,y:340},{x:450,y:150},{x:600,y:340},{x:690,y:100}];
let enemies=[{x:300,y:200},{x:570,y:250},{x:650,y:400}];
return{update(dt,i){if(ended)return;time+=dt;cooldown=Math.max(0,cooldown-dt);p.x=Math.max(20,Math.min(780,p.x+((i.right?1:0)-(i.left?1:0))*190*dt));p.y=Math.max(65,Math.min(470,p.y+((i.down?1:0)-(i.up?1:0))*190*dt));for(const g of gems)if(!g.taken&&Math.hypot(p.x-g.x,p.y-g.y)<24){g.taken=true;score++;}enemies=enemies.filter(e=>!(i.action&&Math.hypot(p.x-e.x,p.y-e.y)<65));for(const e of enemies){const d=Math.hypot(p.x-e.x,p.y-e.y)||1;e.x+=(p.x-e.x)/d*42*dt;e.y+=(p.y-e.y)/d*42*dt;if(d<23&&cooldown===0){hp--;cooldown=1.8;if(hp<=0)ended=true;}}if(score===5&&p.x<115&&p.y>380){won=true;ended=true;}},draw(){backdrop();rect(35,385,75,80,'#376d54');text('GATE',44,430,17,'#fff');for(const b of [{x:240,y:80},{x:400,y:260},{x:640,y:190}]){rect(b.x,b.y,55,55,'#bdd3bd');rect(b.x-5,b.y-9,65,18,'#7fae88');}for(const g of gems)if(!g.taken){circle(g.x,g.y,11,'#eda94f');circle(g.x-3,g.y-3,3,'#fff0bd');}for(const e of enemies){circle(e.x,e.y,15,'#c96961');circle(e.x-4,e.y-2,3,'#fff');circle(e.x+4,e.y-2,3,'#fff');}if(cooldown===0||Math.floor(time*8)%2){circle(p.x,p.y,16,'#e7ab55');rect(p.x-9,p.y-23,18,15,'#f3d5a9');rect(p.x+12,p.y-8,5,27,'#456858');}rect(0,0,800,50,'#fff');text('MOSS KNIGHT',20,32);text('Shards '+score+'/5',480,32);text('Hearts '+hp,650,32);if(ended){rect(150,175,500,150,'#fff');text(won?'The gate is open. You made it!':'The moss keeps your story.',190,230,24);text('Press Restart for a new adventure.',205,273,18);}},getState(){return{x:p.x,y:p.y,score,hp,ended,won};}};}`,
  },
  {
    id: 'portal-hop',
    gameA: 'Super Mario',
    gameB: 'Portal',
    pair: 'Super Mario × Portal',
    category: 'Platforming + puzzles',
    accent: 'purple',
    image: '/games/portal-hop.svg',
    title: 'Portal Hop',
    summary:
      'Jump between floating platforms, collect three light orbs, then step into the blue portal to reach the exit.',
    controls:
      'Left / Right or A / D to move. Up, W or Action to jump. Collect 3 orbs, use the blue portal and reach the green exit.',
    code: `function createGame({ctx,width,height}){
${common}
let p={x:45,y:400,vy:0},ground=false,score=0,ended=false,won=false,lastJump=false;
const platforms=[{x:0,y:460,w:230},{x:230,y:370,w:140},{x:425,y:285,w:150},{x:630,y:380,w:170}];const orbs=[{x:130,y:422},{x:292,y:335},{x:490,y:250}];
return{update(dt,i){if(ended)return;const jump=i.up||i.action;if(jump&&!lastJump&&ground){p.vy=-470;ground=false;}lastJump=jump;const old=p.y;p.x=Math.max(15,Math.min(785,p.x+((i.right?1:0)-(i.left?1:0))*210*dt));p.vy+=1000*dt;p.y+=p.vy*dt;ground=false;for(const b of platforms)if(p.x>b.x-10&&p.x<b.x+b.w+10&&p.vy>=0&&old+17<=b.y+4&&p.y+17>=b.y){p.y=b.y-17;p.vy=0;ground=true;}for(const o of orbs)if(!o.taken&&Math.hypot(p.x-o.x,p.y-o.y)<28){o.taken=true;score++;}if(score===3&&p.x>530&&p.x<580&&p.y>210&&p.y<300){p.x=665;p.y=340;p.vy=0;}if(p.x>745&&p.y>300&&p.y<390&&score===3){ended=true;won=true;}if(p.y>550)ended=true;},draw(){rect(0,0,800,500,'#eeebfa');for(let n=0;n<8;n++)circle(n*120+30,100+(n%3)*55,35,'#e1dcf4');for(const b of platforms){rect(b.x,b.y,b.w,26,'#9c8bbd');rect(b.x,b.y,b.w,7,'#baa7dc');}for(const o of orbs)if(!o.taken)circle(o.x,o.y,10,'#e8b457');ctx.strokeStyle=score===3?'#529dd9':'#a9b3c4';ctx.lineWidth=8;ctx.beginPath();ctx.ellipse(557,250,12,34,0,0,7);ctx.stroke();ctx.strokeStyle='#e7aa57';ctx.beginPath();ctx.ellipse(660,340,12,30,0,0,7);ctx.stroke();rect(750,310,30,70,'#70ac8a');circle(p.x,p.y,16,'#a28bcf');rect(p.x-10,p.y-23,20,12,'#edb06a');rect(0,0,800,50,'#fff');text('PORTAL HOP',20,32);text('Orbs '+score+'/3',630,32);if(ended){rect(160,175,480,150,'#fff');text(won?'A little leap. A big discovery.':'One more jump?',195,235,24);text('Press Restart to play again.',240,275,18);}},getState(){return{x:p.x,y:p.y,score,ended,won};}};}`,
  },
  {
    id: 'meadow-survivor',
    gameA: 'Stardew Valley',
    gameB: 'Vampire Survivors',
    pair: 'Stardew Valley × Vampire Survivors',
    category: 'Survival + collecting',
    accent: 'peach',
    image: '/games/meadow-survivor.svg',
    title: 'Meadow Survivor',
    summary:
      'A peaceful meadow with a mischievous side. Gather eight seeds while keeping your distance from the wandering thorns.',
    controls:
      'Move with WASD, arrows or touch controls. Action clears nearby thorns, with a 2-second cooldown. Gather 8 seeds to win.',
    code: `function createGame({ctx,width,height}){
${common}
let p={x:400,y:250},time=0,score=0,hp=3,cooldown=0,hit=0,ended=false,won=false;
let seeds=Array.from({length:8},(_,n)=>({x:80+(n%4)*210,y:135+Math.floor(n/4)*220,taken:false}));let thorns=Array.from({length:5},(_,n)=>({x:n*170+30,y:n%2?440:65}));
return{update(dt,i){if(ended)return;time+=dt;cooldown=Math.max(0,cooldown-dt);hit=Math.max(0,hit-dt);p.x=Math.max(20,Math.min(780,p.x+((i.right?1:0)-(i.left?1:0))*175*dt));p.y=Math.max(65,Math.min(480,p.y+((i.down?1:0)-(i.up?1:0))*175*dt));if(i.action&&cooldown===0){thorns=thorns.filter(e=>Math.hypot(e.x-p.x,e.y-p.y)>100);cooldown=2;}for(const s of seeds)if(!s.taken&&Math.hypot(s.x-p.x,s.y-p.y)<27){s.taken=true;score++;}for(const e of thorns){const d=Math.hypot(e.x-p.x,e.y-p.y)||1;e.x+=(p.x-e.x)/d*48*dt;e.y+=(p.y-e.y)/d*48*dt;if(d<24&&hit===0){hp--;hit=2;if(hp<=0)ended=true;}}if(score===8){won=true;ended=true;}},draw(){backdrop();for(let n=0;n<35;n++){const x=(n*137)%780,y=80+(n*83)%400;rect(x,y,3,9,'#a3c7a4');}for(const s of seeds)if(!s.taken){circle(s.x,s.y,11,'#d8a34d');rect(s.x-2,s.y-18,4,12,'#58805e');}for(const e of thorns){circle(e.x,e.y,17,'#8b6994');rect(e.x-23,e.y-2,46,4,'#8b6994');rect(e.x-2,e.y-23,4,46,'#8b6994');}if(hit===0||Math.floor(time*8)%2){circle(p.x,p.y,16,'#f2b37b');rect(p.x-16,p.y-17,32,7,'#e3b959');}if(cooldown>1.7){ctx.strokeStyle='#9dca9f';ctx.lineWidth=4;ctx.beginPath();ctx.arc(p.x,p.y,90,0,7);ctx.stroke();}rect(0,0,800,50,'#fff');text('MEADOW SURVIVOR',20,32);text('Seeds '+score+'/8',455,32);text('Hearts '+hp,650,32);if(ended){rect(150,175,500,150,'#fff');text(won?'Your little meadow is blooming.':'The thorns got a little too close.',185,235,23);text('Press Restart for a fresh start.',235,275,18);}},getState(){return{x:p.x,y:p.y,score,hp,ended,won};}};}`,
  },
];
