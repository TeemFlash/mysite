import {fragment} from './vendor/trail-shader.js';
export function createTrail(canvas){
 const gl=canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:true,antialias:false,preserveDrawingBuffer:true});
 if(!gl)return {add(){},clear(){},resize(){},end(){},supported:false};
 function compile(type,s){const sh=gl.createShader(type);gl.shaderSource(sh,s);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));return sh}
 const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,`#version 300 es
const vec2 corners[3]=vec2[3](vec2(-1.,-1.),vec2(3.,-1.),vec2(-1.,3.));void main(){gl_Position=vec4(corners[gl_VertexID],0.,1.);}`));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
 const U=Object.fromEntries(['uSize','uRatio','uTime','uChaos','uThickness','uCore','uGlowColor','uGlow','uArcEnds','uArcShape'].map(x=>[x,gl.getUniformLocation(program,x)]));
 let segments=[],last=null,raf=0;let ratio=1;
 const ends=new Float32Array(128),info=new Float32Array(128);
 function resize(){ratio=Math.min(devicePixelRatio||1,1.25);canvas.width=Math.round(innerWidth*ratio);canvas.height=Math.round(innerHeight*ratio);draw(performance.now())}
 function draw(now){raf=0;segments=segments.filter(s=>now-s.born<360);ends.fill(0);info.fill(0);segments.forEach((s,i)=>{ends.set([s.a.x,s.a.y,s.b.x,s.b.y],i*4);info.set([s.bend,Math.pow(1-(now-s.born)/360,1.3),s.seed,0],i*4)});gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(program);gl.uniform2f(U.uSize,innerWidth,innerHeight);gl.uniform1f(U.uRatio,ratio);gl.uniform1f(U.uTime,now/1000);gl.uniform1f(U.uChaos,.7);gl.uniform1f(U.uThickness,.45);gl.uniform3f(U.uCore,.65,.55,.33);gl.uniform3f(U.uGlowColor,.6,.46,.21);gl.uniform1f(U.uGlow,.35);gl.uniform4fv(U.uArcEnds,ends);gl.uniform4fv(U.uArcShape,info);if(segments.length){const points=segments.flatMap(s=>[s.a,s.b]);const x=Math.max(0,Math.min(...points.map(p=>p.x))-55),y=Math.max(0,Math.min(...points.map(p=>p.y))-55),right=Math.min(innerWidth,Math.max(...points.map(p=>p.x))+55),bottom=Math.min(innerHeight,Math.max(...points.map(p=>p.y))+55);gl.enable(gl.SCISSOR_TEST);gl.scissor(Math.floor(x*ratio),Math.floor((innerHeight-bottom)*ratio),Math.ceil((right-x)*ratio),Math.ceil((bottom-y)*ratio));gl.drawArrays(gl.TRIANGLES,0,3);gl.disable(gl.SCISSOR_TEST)}if(segments.length)raf=requestAnimationFrame(draw)}
 function add(x,y){const b={x,y};if(last&&Math.hypot(x-last.x,y-last.y)>5){segments.push({a:last,b,born:performance.now(),seed:Math.random()*90,bend:(Math.random()-.5)*4});if(segments.length>32)segments.shift();if(!raf)raf=requestAnimationFrame(draw)}last=b}
 function clear(){last=null;segments=[];cancelAnimationFrame(raf);raf=0;draw(performance.now())}
 resize();gl.enable(gl.SCISSOR_TEST);gl.scissor(0,0,1,1);gl.drawArrays(gl.TRIANGLES,0,3);gl.disable(gl.SCISSOR_TEST);return {add,clear,resize,end(){last=null},supported:true};
}
