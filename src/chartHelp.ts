// Polaris owns the trigger and tooltip content. This small controller anchors
// help below the title without letting an overlay resize the measured chart.
export function bindChartHelp(trigger:HTMLElement,tooltip:HTMLElement,owner:Document,onChange:(open:boolean)=>void=()=>{}){
 let hovered=false,focused=false,pinned=false,dismissed=false;
 const render=()=>{const open=!dismissed&&(hovered||focused||pinned);tooltip.hidden=!open;trigger.setAttribute('aria-expanded',String(open));onChange(open);};
 const dismiss=()=>{pinned=false;dismissed=true;render();};
 trigger.addEventListener('pointerenter',()=>{hovered=true;dismissed=false;render();});
 trigger.addEventListener('pointerleave',event=>{if(event.relatedTarget&&tooltip.contains(event.relatedTarget as Node))return;hovered=false;render();});
 tooltip.addEventListener('pointerenter',()=>{hovered=true;render();});
 tooltip.addEventListener('pointerleave',()=>{hovered=false;render();});
 trigger.addEventListener('focusin',()=>{focused=true;dismissed=false;render();});
 trigger.addEventListener('focusout',()=>{focused=false;render();});
 trigger.addEventListener('click',()=>{if(pinned){dismiss();}else{pinned=true;dismissed=false;render();}});
 owner.addEventListener('keydown',event=>{if(event.key==='Escape')dismiss();});
 owner.addEventListener('pointerdown',event=>{if(!event.composedPath().includes(trigger)&&!event.composedPath().includes(tooltip))dismiss();});
 render();return {dismiss};
}
