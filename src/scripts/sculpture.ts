import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';


export function createSculpture(root: HTMLElement, reduced: boolean) {
  const host=root.querySelector<HTMLElement>('.sculpture-canvas')!;
  let renderer:THREE.WebGLRenderer;
  try {renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});} catch{return ()=>{};}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
  renderer.domElement.setAttribute('aria-hidden','true');host.append(renderer.domElement);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,1,.1,50);
  camera.position.set(0,.8,9);camera.lookAt(0,0,0);
  scene.add(new THREE.HemisphereLight(0xffffff,0x657e82,2.8));
  const key=new THREE.DirectionalLight(0xfff5e5,3);key.position.set(-3,5,6);scene.add(key);
  const fill=new THREE.DirectionalLight(0xdce9e8,1.8);fill.position.set(4,0,3);scene.add(fill);
  const colors=[0x123e46,0xf7f5ef,0xb97866,0x99b9b8];
  const materials=colors.map(color=>new THREE.MeshStandardMaterial({color,roughness:.48,metalness:.08}));
  const group=new THREE.Group();scene.add(group);
  const variant=root.dataset.variant,meshes:THREE.Mesh[]=[],base:THREE.Vector3[]=[],rotations:THREE.Euler[]=[];
  function piece(geometry:THREE.BufferGeometry,material:number,position:number[],rotation=[0,0,0]){
    const mesh=new THREE.Mesh(geometry,materials[material]);mesh.position.set(...position as [number,number,number]);mesh.rotation.set(...rotation as [number,number,number]);group.add(mesh);meshes.push(mesh);base.push(mesh.position.clone());rotations.push(mesh.rotation.clone());return mesh;
  }
  if(variant==='orbit'){
    piece(new THREE.TorusGeometry(1.35,.09,16,96),0,[0,0,0],[.7,.4,.3]);
    piece(new THREE.TorusGeometry(.99,.055,12,80),2,[0,0,0],[-.4,.6,-.5]);
    piece(new THREE.SphereGeometry(.62,32,24),1,[0,0,0]);
    piece(new THREE.SphereGeometry(.23,24,16),2,[1.25,.35,.4]);
    piece(new THREE.SphereGeometry(.15,20,16),3,[-.9,-.8,-.3]);
  }else if(variant==='fold'){
    piece(new THREE.IcosahedronGeometry(1.15,0),2,[0,0,0],[.3,.4,0]);
    piece(new THREE.OctahedronGeometry(.46,0),1,[1.3,.7,.15],[.2,.3,.1]);
    piece(new THREE.OctahedronGeometry(.24,0),3,[-1.15,-.65,.3]);
  }else{
    // Closed standard geometries eliminate intersecting, back-facing ribbon surfaces.
    for(let i=0;i<5;i++)piece(new RoundedBoxGeometry(2.05,.27,1.65,4,.1),[0,3,1,2,0][i],[0,(i-2)*.38,0],[0,(i-2)*.12,0]);
    group.rotation.set(.24,-.5,-.12);
  }
  const abort=new AbortController(),opts={signal:abort.signal};
  let disposed=false,visible=false,frame=0,elapsed=0,lastFrame=0,down=false,lastX=0,targetTurn=0,turn=0,expanded=0,spread=0,progress=.5;
  const controls=root.querySelector<HTMLElement>('.sculpture-controls');
  function render(time=0){
    const delta=lastFrame?Math.min((time-lastFrame)/1000,.05):0;lastFrame=time;elapsed+=delta;
    frame=0;if(disposed||!visible||document.hidden)return;
    if(!reduced){const rect=root.getBoundingClientRect();progress=THREE.MathUtils.clamp((innerHeight-rect.top)/(innerHeight+rect.height),0,1);}
    turn=reduced?targetTurn:THREE.MathUtils.damp(turn,targetTurn,4,delta);
    spread=reduced?expanded:THREE.MathUtils.damp(spread,expanded,2.8,delta);
    group.rotation.y=(variant==='ribbons'?-.5:0)+turn+(progress-.5)*3.4+(!reduced?Math.sin(elapsed*.45)*.28:0);
    group.rotation.x=(variant==='ribbons'?.24:.12)+(progress-.5)*.7;
    group.position.y=!reduced?Math.sin(elapsed*.85)*.13:0;
    group.rotation.z=!reduced?Math.sin(elapsed*.4)*.09:0;
    meshes.forEach((mesh,i)=>{
      mesh.position.copy(base[i]);mesh.rotation.copy(rotations[i]);
      if(variant==='ribbons'){mesh.position.y+=(i-2)*spread*.45;mesh.rotation.y+=(progress-.5)*(i-2)*.5+spread*(i-2)*.25;}
      else if(variant==='orbit'&&i>=3){const angle=progress*Math.PI*3+i+(!reduced?elapsed*.3:0);mesh.position.x=Math.cos(angle)*(i===3?1.4:1.05);mesh.position.z=Math.sin(angle)*.5;}
      else if(variant==='fold'){mesh.rotation.y+=progress*Math.PI*1.7+(!reduced?elapsed*.16:0);mesh.position.y+=Math.sin(progress*Math.PI+i)*.1;}
    });
    renderer.render(scene,camera);
    if(!reduced)frame=requestAnimationFrame(render);
  }
  function invalidate(){if(!frame&&!disposed&&visible)frame=requestAnimationFrame(render);}
  window.addEventListener('scroll',invalidate,{...opts,passive:true});document.addEventListener('portfolio:refresh',invalidate,opts);
  const resize=new ResizeObserver(()=>{const {width,height}=host.getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height,false);camera.aspect=width/height;camera.position.z=Math.max(8.4,5.5/camera.aspect);camera.updateProjectionMatrix();invalidate();});resize.observe(host);
  const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)invalidate();else {cancelAnimationFrame(frame);frame=0;}});intersection.observe(root);
  document.addEventListener('visibilitychange',invalidate,opts);
  function applyMaterials(){const dark=document.documentElement.dataset.theme==='dark';const palette=dark?[0x18434b,0x65736f,0x895547,0x3c6366]:colors;materials.forEach((material,i)=>material.color.set(palette[i]));renderer.toneMappingExposure=dark?.86:1.12;invalidate();}
  const themeObserver=new MutationObserver(applyMaterials);themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});applyMaterials();
  if(controls){
    host.addEventListener('pointerdown',event=>{if(event.pointerType==='mouse'&&event.button!==0)return;down=true;lastX=event.clientX;host.setPointerCapture(event.pointerId);},opts);
    host.addEventListener('pointermove',event=>{if(!down)return;targetTurn+=(event.clientX-lastX)*.009;lastX=event.clientX;invalidate();},opts);
    for(const name of ['pointerup','pointercancel','lostpointercapture'])host.addEventListener(name,()=>{down=false;},opts);
    root.querySelector('[data-turn]')?.addEventListener('click',()=>{targetTurn+=Math.PI/3;invalidate();},opts);
    root.querySelector('[data-expand]')?.addEventListener('click',event=>{expanded=expanded?0:1;const button=event.currentTarget as HTMLButtonElement;button.setAttribute('aria-pressed',String(!!expanded));button.innerHTML=expanded?'Reunir módulos <span aria-hidden="true">−</span>':'Separar módulos <span aria-hidden="true">+</span>';invalidate();},opts);
    controls.hidden=false;
  }
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();visible=false;root.classList.remove('is-ready');if(controls)controls.hidden=true;},opts);
  root.classList.add('is-ready');
  return ()=>{disposed=true;abort.abort();cancelAnimationFrame(frame);resize.disconnect();intersection.disconnect();themeObserver.disconnect();meshes.forEach(mesh=>mesh.geometry.dispose());materials.forEach(material=>material.dispose());renderer.dispose();renderer.domElement.remove();root.classList.remove('is-ready');};
}
