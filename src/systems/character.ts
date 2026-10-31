import * as THREE from 'three';
import type { Body } from './movement';
// Original, code-drawn pixel artwork based on the supplied scientist reference.
function frame(step:number) {
 const c=document.createElement('canvas'); c.width=32;c.height=48; const p=c.getContext('2d')!;
 const r=(x:number,y:number,w:number,h:number,color:string)=>{p.fillStyle=color;p.fillRect(x,y,w,h);};
 const stride=Math.round(Math.sin(step)*3);
 r(10-stride,33,6,11,'#18232d');r(18+stride,33,5,11,'#1d2b35');
 r(9-stride,43,8,3,'#b5c5c9');r(18+stride,43,8,3,'#7a919e');
 r(8,17,16,19,'#17232d');r(5,19,5,13,'#263844');r(6,31,5,4,'#b98c72');
 r(10,18,12,16,'#4b626d');r(11,22,3,11,'#627884');r(20,19,3,17,'#263a46');
 r(15,18,2,17,'#bc7549');r(9,18,3,7,'#d4874a');r(17,18,4,3,'#d4874a');
 r(11,28,5,4,'#253743');r(18,28,5,4,'#263843');r(9,35,15,2,'#111e26');
 r(22,20,4,11,'#536a73');r(23,30,4,4,'#b98c72');r(25,29,5,3,'#25333b');r(29,29,2,3,'#d9e5c5');
 r(11,6,12,12,'#b58a70');r(21,9,4,6,'#d5ac89');r(13,13,9,5,'#9e715c');
 r(10,5,13,6,'#111c23');r(12,3,9,3,'#101a20');r(9,8,5,7,'#16212a');r(21,9,3,2,'#131f26');r(21,12,2,1,'#1a252b');r(12,17,8,3,'#23343e');
 return new THREE.CanvasTexture(c);
}
export class Character {
 body:Body={x:-7,y:0,vx:0,vy:0,facing:1,grounded:true};
 mesh:THREE.Sprite; frames=Array.from({length:8},(_,i)=>frame(i*Math.PI/4)); time=0;
 constructor(scene:THREE.Scene) {
  this.frames.forEach(t=>{t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestFilter;t.colorSpace=THREE.SRGBColorSpace;});
  this.mesh=new THREE.Sprite(new THREE.SpriteMaterial({map:this.frames[0],depthTest:true}));
  this.mesh.scale.set(1.4,2.1,1); scene.add(this.mesh);
 }
 update(dt:number) {
  this.time+=dt*Math.abs(this.body.vx)*3;
  (this.mesh.material as THREE.SpriteMaterial).map=this.frames[Math.abs(this.body.vx)>.15?Math.floor(this.time)%8:0];
  this.mesh.scale.x=this.body.facing*1.4;
  this.mesh.position.set(this.body.x,1.06+this.body.y,-.15);
 }
}
