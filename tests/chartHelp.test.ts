import test from 'node:test';
import assert from 'node:assert/strict';
import {bindChartHelp} from '../src/chartHelp.ts';
class Surface extends EventTarget {
 hidden=true;attributes=new Map<string,string>();
 setAttribute(key:string,value:string){this.attributes.set(key,value);}
 contains(target:unknown){return target===this;}
 emit(type:string,properties:Record<string,unknown>={}){const event=new Event(type);for(const [key,value] of Object.entries(properties))Object.defineProperty(event,key,{value});this.dispatchEvent(event);}
}
function help(){const trigger=new Surface(),tooltip=new Surface(),owner=new Surface();const control=bindChartHelp(trigger as unknown as HTMLElement,tooltip as unknown as HTMLElement,owner as unknown as Document);return {trigger,tooltip,owner,control};}
test('repeated hover leaves geometry ownership to CSS and Escape stays dismissed until fresh interest',()=>{
 const {trigger,tooltip,owner}=help();
 for(let i=0;i<3;i++){trigger.emit('pointerenter');assert.equal(tooltip.hidden,false);trigger.emit('pointerleave');assert.equal(tooltip.hidden,true);}
 trigger.emit('focusin');owner.emit('keydown',{key:'Escape'});assert.equal(tooltip.hidden,true);trigger.emit('pointerleave');assert.equal(tooltip.hidden,true);trigger.emit('focusout');trigger.emit('focusin');assert.equal(tooltip.hidden,false);
});
test('touch click pins help, second click and outside interaction dismiss it',()=>{
 const {trigger,tooltip,owner}=help();trigger.emit('click');assert.equal(tooltip.hidden,false);trigger.emit('pointerleave');assert.equal(tooltip.hidden,false);trigger.emit('click');assert.equal(tooltip.hidden,true);trigger.emit('click');owner.emit('pointerdown');assert.equal(tooltip.hidden,true);
});
test('tooltip remains hoverable and date navigation can explicitly dismiss it',()=>{
 const {trigger,tooltip,control}=help();trigger.emit('pointerenter');trigger.emit('pointerleave',{relatedTarget:tooltip});assert.equal(tooltip.hidden,false);tooltip.emit('pointerenter');tooltip.emit('pointerleave');assert.equal(tooltip.hidden,true);trigger.emit('click');control.dismiss();assert.equal(tooltip.hidden,true);
});
test('Escape stays dismissed after focus leaves a hovered trigger until fresh entry or click',()=>{
 const {trigger,tooltip,owner}=help();
 for(let i=0;i<3;i++){
  trigger.emit('pointerenter');trigger.emit('focusin');assert.equal(tooltip.hidden,false);
  owner.emit('keydown',{key:'Escape'});trigger.emit('focusout');assert.equal(tooltip.hidden,true);
  assert.equal(trigger.attributes.get('aria-expanded'),'false');
  tooltip.emit('pointerenter');assert.equal(tooltip.hidden,true);
  trigger.emit('pointerleave');assert.equal(tooltip.hidden,true);
 }
 trigger.emit('focusin');assert.equal(tooltip.hidden,false);
 owner.emit('keydown',{key:'Escape'});trigger.emit('focusout');assert.equal(tooltip.hidden,true);
 trigger.emit('click');assert.equal(tooltip.hidden,false);
});
