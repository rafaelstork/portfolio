import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(Flip);
export function setupProjects(signal: AbortSignal,reduced: boolean){
 const root=document.querySelector<HTMLElement>('[data-project-explorer]');if(!root)return ()=>{};
 const choices=[...root.querySelectorAll<HTMLAnchorElement>('[data-project-choice]')],panels=[...root.querySelectorAll<HTMLElement>('[data-project-panel]')];
 const stage=root.querySelector<HTMLElement>('.project-previews')!,marker=root.querySelector<HTMLElement>('.project-marker')!;
 const indexRoot=root.querySelector<HTMLElement>('.project-index')!;
 root.dataset.enhanced='true';indexRoot.setAttribute('role','tablist');indexRoot.setAttribute('aria-orientation','vertical');
 let selected=0,version=0,animation:gsap.core.Timeline|undefined,disposed=false;
 function moveMarker(index:number,animate:boolean){const choice=choices[index];gsap.to(marker,{y:choice.offsetTop,height:choice.offsetHeight,duration:animate&&!reduced?.45:0,ease:'power3.inOut',overwrite:true});}
 function select(index:number,animate=true){
  const token=++version;animation?.kill();gsap.killTweensOf(stage);panels.forEach(p=>gsap.set(p,{clearProps:'opacity,transform,position,top,left,width'}));
  const before=stage.getBoundingClientRect().height;
  panels.forEach(p=>{Flip.killFlipsOf(p.querySelectorAll('.preview-shot'));gsap.set(p.querySelectorAll('.preview-shot'),{clearProps:'transform,width,height'});gsap.set(p.querySelectorAll('img,.preview-caption'),{clearProps:'opacity'});});
  const old=panels[selected],oldShots=[...old.querySelectorAll<HTMLElement>('.preview-shot')];
  oldShots.forEach((el,i)=>el.dataset.flipId=`project-shot-${i}`);
  const state=Flip.getState(oldShots,{props:'borderRadius'});
  choices.forEach((choice,i)=>{choice.setAttribute('aria-selected',String(i===index));choice.tabIndex=i===index?0:-1;});moveMarker(index,animate);
  panels.forEach((panel,i)=>panel.hidden=i!==index);selected=index;
  const panel=panels[index];panel.querySelectorAll<HTMLElement>('.preview-shot').forEach((el,i)=>el.dataset.flipId=`project-shot-${i}`);
  const images=[...panel.querySelectorAll('img')];images.forEach(img=>img.loading='eager');
  if(animate&&!reduced){
   const after=panel.getBoundingClientRect().height;gsap.set(stage,{height:before,overflow:'hidden'});
   animation=gsap.timeline({onComplete:()=>{if(disposed||token!==version)return;gsap.set(stage,{clearProps:'height,overflow'});ScrollTrigger.refresh();}})
    .add(Flip.from(state,{targets:panel.querySelectorAll('.preview-shot'),duration:.65,ease:'power3.inOut',scale:true,absolute:false}),0)
    .fromTo(panel.querySelectorAll('img,.preview-caption'),{opacity:0},{opacity:1,duration:.45,stagger:.04,ease:'power2.out'},.08)
    .to(stage,{height:after,duration:.65,ease:'power3.inOut'},0);
  }else{gsap.set(stage,{clearProps:'height,overflow'});ScrollTrigger.refresh();}
 }
 choices.forEach((choice,index)=>{
  choice.setAttribute('role','tab');choice.setAttribute('aria-controls',panels[index].id);panels[index].setAttribute('role','tabpanel');panels[index].tabIndex=0;
  choice.addEventListener('click',event=>{event.preventDefault();if(index!==selected)select(index);},{signal});
  choice.addEventListener('keydown',event=>{if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?choices.length-1:(index+(event.key==='ArrowDown'?1:-1)+choices.length)%choices.length;select(next);choices[next].focus({preventScroll:true});},{signal});
 });
 const resize=new ResizeObserver(()=>moveMarker(selected,false));resize.observe(indexRoot);select(0,false);
 return ()=>{disposed=true;version++;animation?.kill();gsap.killTweensOf([stage,marker]);resize.disconnect();};
}

