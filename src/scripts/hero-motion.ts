import gsap from 'gsap';
import * as THREE from 'three';
import {createHeroReveal} from './hero-reveal';

// A video surface, not a reconstruction of the reference's 3D environment.
// A shared DOM filter now supplies the same fluid response across every page.
const vertex = `varying vec2 vUv;
void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
const sceneFragment = `
precision highp float;
varying vec2 vUv;
uniform sampler2D image;
uniform vec2 resolution, imageSize, pointer;
uniform vec3 background;
uniform float aperture, tilt, roll, centerY, arrival, travel, reveal;
vec2 cover(vec2 uv){
  float viewportRatio=resolution.x/resolution.y;
  float sourceRatio=imageSize.x/imageSize.y;
  vec2 scale=vec2(min(viewportRatio/sourceRatio,1.),min(sourceRatio/viewportRatio,1.));
  return (uv-.5)*scale+.5;
}
void main(){
  float zoom=1.08+travel*.19;
  vec2 uv=(vUv-.5)/zoom+.5;
  uv+=vec2(arrival*.055,travel*.055)+pointer*vec2(.013,.009);
  uv=cover(uv);
  gl_FragColor=vec4(texture2D(image,uv).rgb,1.);
}`;

export function setupHeroMotion(signal: AbortSignal, reduced: boolean) {
  const stage=document.querySelector<HTMLElement>('.hero-stage');
  const film=stage?.querySelector<HTMLElement>('.hero-film');
  const video=stage?.querySelector('video');
  if(!stage||!film||!video||reduced)return ()=>{};
  let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({alpha:false,antialias:false,powerPreference:'low-power'});}catch{return ()=>{};}
  renderer.outputColorSpace=THREE.LinearSRGBColorSpace;
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  const canvas=renderer.domElement;
  canvas.className='hero-motion-canvas';canvas.setAttribute('aria-hidden','true');
  film.append(canvas);
  const geometry=new THREE.PlaneGeometry(2,2),camera=new THREE.Camera();
  const scene=new THREE.Scene();
  const state={aperture:0,tilt:1.05,roll:-.65,centerY:-.2,arrival:1,reveal:0};
  const pointer=new THREE.Vector2(),target=new THREE.Vector2();
  const videoTexture=new THREE.VideoTexture(video);
  videoTexture.colorSpace=THREE.NoColorSpace;
  const uniforms={image:{value:videoTexture as THREE.Texture},resolution:{value:new THREE.Vector2()},imageSize:{value:new THREE.Vector2(1600,900)},pointer:{value:pointer},background:{value:new THREE.Vector3(.969,.961,.937)},aperture:{value:0},tilt:{value:0},roll:{value:0},centerY:{value:0},arrival:{value:1},travel:{value:0},reveal:{value:0}};
  const material=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:sceneFragment,uniforms,depthTest:false,depthWrite:false});
  scene.add(new THREE.Mesh(geometry,material));
  let disposed=false,frame=0,previousTime=0,visible=true,ready=false,paused=false,started=false;
  let poster:THREE.Texture|undefined;
  let uploadedTime=-1;
  let reveal:ReturnType<typeof createHeroReveal>|undefined;
  const copy=stage.querySelectorAll('.hero-copy,.hero-bottom');
  const intro=gsap.timeline({paused:true,onComplete:()=>{state.aperture=fullSize();stage.classList.remove('hero-entering');reveal?.remove();reveal=undefined;}});
  const fullSize=()=>Math.hypot(stage.clientWidth/stage.clientHeight,1)*.57;
  intro.to(state,{aperture:.23,centerY:.55,tilt:0,roll:0,duration:1.35,ease:'expo.out'},0)
    .to(state,{aperture:fullSize,centerY:.5,reveal:1,duration:1.25,ease:'power4.inOut'},.42)
    .to(state,{arrival:0,duration:2.05,ease:'expo.out'},0)
    .fromTo(copy,{opacity:0,y:16},{opacity:1,y:0,duration:.55,stagger:.08,ease:'power3.out',immediateRender:false},1.25);
  function start(){
    if(disposed||started)return;
    started=true;ready=true;
    if(scrollY>24||paused){intro.progress(1);state.aperture=fullSize();}
    else{reveal=createHeroReveal();reveal.update(state);stage!.classList.add('hero-entering');gsap.set(copy,{opacity:0});intro.play();}
    wake();
  }
  function resize(){
    const width=stage!.clientWidth,height=stage!.clientHeight;
    renderer.setSize(width,height,false);uniforms.resolution.value.set(width,height);
    if(intro.progress()===1)state.aperture=fullSize();
    wake();
  }
  function render(time:number){
    frame=0;if(disposed||!visible||document.hidden||!ready)return;
    const dt=Math.min((time-previousTime)/1000||.016,.05);previousTime=time;
    if(!paused){
      pointer.lerp(target,1-Math.exp(-3.8*dt));
      // Measure after pinning: camera travel starts as the completed film leaves.
      uniforms.travel.value=gsap.utils.clamp(0,1,-stage!.getBoundingClientRect().top/stage!.clientHeight);
    }
    if(video!.readyState>=2){if(uploadedTime!==video!.currentTime){videoTexture.needsUpdate=true;uploadedTime=video!.currentTime;}uniforms.image.value=videoTexture;uniforms.imageSize.value.set(video!.videoWidth,video!.videoHeight);}
    for(const key of ['aperture','tilt','roll','centerY','arrival','reveal'] as const)uniforms[key].value=state[key];
    renderer.render(scene,camera);reveal?.update(state);
    film!.classList.add('hero-webgl-ready');stage!.classList.remove('hero-awaiting');
    if(!paused)wake();
  }
  function wake(){if(!frame&&!disposed&&visible&&!document.hidden)frame=requestAnimationFrame(render);}
  stage.querySelector('.film-toggle')?.addEventListener('click',()=>{
    if(disposed)return;
    paused=stage.querySelector('.film-toggle')?.getAttribute('aria-pressed')==='true';
    if(paused){intro.progress(1);target.set(0,0);pointer.set(0,0);}
    wake();
  },{signal});
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();dispose();},{signal});
  video.addEventListener('loadeddata',start,{signal});
  document.addEventListener('visibilitychange',()=>{previousTime=0;wake();},{signal});
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(!visible){cancelAnimationFrame(frame);frame=0;}else wake();});observer.observe(stage);
  const resizer=new ResizeObserver(resize);resizer.observe(stage);
  poster=new THREE.TextureLoader().load(video.poster,texture=>{
    if(disposed){texture.dispose();return;}
    uniforms.image.value=texture;uniforms.imageSize.value.set(texture.image.width,texture.image.height);start();
  },undefined,()=>{if(video.readyState>=2)start();});
  resize();if(video.readyState>=2)start();
  function dispose(){
    if(disposed)return;disposed=true;cancelAnimationFrame(frame);intro.kill();
    observer.disconnect();resizer.disconnect();reveal?.remove();poster?.dispose();videoTexture.dispose();material.dispose();geometry.dispose();renderer.dispose();canvas.remove();
    film!.classList.remove('hero-webgl-ready');stage!.classList.remove('hero-entering','hero-awaiting');
    gsap.set(copy,{clearProps:'opacity,transform'});
  }
  return dispose;
}



