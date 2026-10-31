import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { move, type Body } from './movement';
const body=():Body=>({x:0,y:0,vx:0,vy:0,facing:1,grounded:true});
test('run exceeds walking speed and world boundaries hold',()=>{
 const walk=body(),run=body();for(let i=0;i<60;i++){move(walk,{axis:1,run:false,jump:false},1/60,-10,10);move(run,{axis:1,run:true,jump:false},1/60,-10,10);}assert.ok(run.x>walk.x);for(let i=0;i<600;i++)move(run,{axis:1,run:true,jump:false},1/60,-10,10);assert.equal(run.x,10);
});
test('jump cannot repeat in the air and lands on the floor',()=>{
 const b=body();move(b,{axis:0,run:false,jump:true},1/60,-10,10);assert.ok(b.y>0);const vy=b.vy;move(b,{axis:0,run:false,jump:true},1/60,-10,10);assert.ok(b.vy<vy);for(let i=0;i<120;i++)move(b,{axis:0,run:false,jump:false},1/60,-10,10);assert.equal(b.y,0);assert.equal(b.grounded,true);
});
test('fixed simulation produces the same outcome for different render batches',()=>{
 const simulate=(batches:number[])=>{const b=body();let accumulator=0;for(const delta of batches){accumulator+=delta;while(accumulator>=1/60){move(b,{axis:1,run:false,jump:false},1/60,-10,10);accumulator-=1/60;}}return b.x;};assert.ok(Math.abs(simulate(Array(60).fill(1/60))-simulate(Array(30).fill(1/30)))<.0001);
});
