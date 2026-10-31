import * as THREE from 'three';
const materials = new Map<string,THREE.MeshStandardMaterial>();
function mat(color:string,glow=false) {
 const key=color+glow; if(!materials.has(key)) materials.set(key,new THREE.MeshStandardMaterial({color,roughness:.93,emissive:glow?color:0,emissiveIntensity:glow?.65:0})); return materials.get(key)!;
}
const boxGeo = new THREE.BoxGeometry(1,1,1);
function box(g:THREE.Group,x:number,y:number,z:number,w:number,h:number,d:number,color:string,glow=false) {
 const m=new THREE.Mesh(boxGeo,mat(color,glow));m.position.set(x,y,z);m.scale.set(w,h,d);g.add(m);return m;
}
function label(g:THREE.Group,text:string,x:number,y:number,z:number,w:number,color='#b5c8cb',bg='') {
 const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d')!;
 if(bg){ctx.fillStyle=bg;ctx.fillRect(0,0,512,128);}ctx.fillStyle=color;ctx.font='500 48px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,64);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
 const m=new THREE.Mesh(new THREE.PlaneGeometry(w,w/4),new THREE.MeshBasicMaterial({map:t,transparent:true}));m.position.set(x,y,z);g.add(m);
}
function mountain(g:THREE.Group,x:number,z:number,height:number,width:number,color:string,seed:number) {
 const shape=new THREE.Shape();shape.moveTo(-width/2,-3);
 for(let i=0;i<=24;i++){const p=i/24;const peak=Math.sin(p*Math.PI)*height*.55;shape.lineTo((p-.5)*width,peak+(Math.sin(i*2.7+seed)*.55+Math.sin(i*1.2)*.6)*Math.sin(p*Math.PI));}
 shape.lineTo(width/2,-3);const m=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshBasicMaterial({color}));m.position.set(x,-.5,z);g.add(m);
 // Narrow ice faces give the ridges an angular, glacial texture.
 for(let i=0;i<7;i++) {
  const px=(i/7-.5)*width*.7;const h=Math.sin((i/7*.7+.15)*Math.PI)*height*.55;
  const s=new THREE.Shape();s.moveTo(px,h);s.lineTo(px-width*.1,1);s.lineTo(px+width*.035,2);s.closePath();
  const face=new THREE.Mesh(new THREE.ShapeGeometry(s),new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(1.19)}));face.position.set(x,-.4,z+.03);g.add(face);
 }
}
function lamp(g:THREE.Group,x:number,y:number,z:number) {
 box(g,x,y,z,.36,.12,.3,'#ef963d',true);
 const light=new THREE.PointLight('#ffaf66',13,9,2);light.position.set(x,y-.3,z+.6);g.add(light);
 const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d')!,grad=ctx.createRadialGradient(32,32,1,32,32,32);grad.addColorStop(0,'rgba(255,174,92,.35)');grad.addColorStop(1,'rgba(255,174,92,0)');ctx.fillStyle=grad;ctx.fillRect(0,0,64,64);
 const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),depthWrite:false,blending:THREE.AdditiveBlending}));sprite.position.set(x,y,z+.4);sprite.scale.set(3,3,1);g.add(sprite);
}
export class Levels {
 outside=new THREE.Group();inside=new THREE.Group(); snow:THREE.Points; snowPositions:Float32Array; terminalLight:THREE.PointLight;
 constructor(public scene:THREE.Scene) {
  scene.add(this.outside,this.inside);this.inside.visible=false;
  scene.add(new THREE.HemisphereLight('#a8c9de','#17212c',2.3));
  const moon=new THREE.DirectionalLight('#9cbdd6',2.1);moon.position.set(-12,18,8);scene.add(moon);
  const o=this.outside;
  mountain(o,-18,-26,13,34,'#172c3a',2);mountain(o,12,-28,16,37,'#182e3e',4);
  mountain(o,-10,-18,10,23,'#233d4c',6);mountain(o,20,-20,11,27,'#213a48',5);
  mountain(o,-21,-11,6,18,'#335261',1);mountain(o,24,-12,5,19,'#2c4b5c',3);
  box(o,0,-1,-2,110,1.9,22,'#607983');
  // Irregular snow banks and ice shelves.
  for(let i=0;i<32;i++) {
   const m=new THREE.Mesh(new THREE.IcosahedronGeometry(1,0),mat(i%3?'#6f8992':'#80979d'));
   m.position.set(i*2.6-40,-.45,-5-Math.sin(i*7)*2);m.scale.set(2.6,.5+Math.sin(i)*.2,2);o.add(m);
  }
  // Raised, corrugated research module.
  box(o,9,2.45,-3.8,12,4.5,3.6,'#263e49');
  box(o,9,4.8,-3.7,12.8,.3,4.3,'#8ba1a6');
  box(o,9,4.55,-1.87,12.5,.18,.18,'#a8b7b6');
  box(o,9,.35,-2.3,12.5,.45,3.6,'#263844');
  for(let i=0;i<34;i++) box(o,3.25+i*.35,2.5,-1.96,.045,3.9,.065,'#3c525c');
  box(o,9,1.3,-1.84,11.9,.35,.09,'#763d2c');
  for(const x of [4.9,7.3,12.9]) {
   box(o,x,3.1,-1.8,1.65,1.4,.2,'#132631');box(o,x,3.1,-1.65,1.4,1.16,.08,'#dd762e',true);
   box(o,x,3.1,-1.5,.06,1.3,.09,'#22343d');box(o,x,3.1,-1.5,1.5,.06,.09,'#22343d');
   box(o,x,3.8,-1.5,1.8,.1,.5,'#8b9a9d');
  }
  box(o,10.2,1.85,-1.65,1.6,3.2,.4,'#0d202b');box(o,10.2,1.85,-1.38,1.24,2.9,.12,'#344953');
  box(o,10.2,2.55,-1.26,.73,.64,.05,'#e99039',true);box(o,10.65,1.5,-1.2,.08,.35,.08,'#c9b99b');
  box(o,10.2,.18,-.8,2.4,.35,1.6,'#71868d');lamp(o,10.2,3.85,-1.2);
  label(o,'KESTREL  /  04',6.15,4.13,-1.75,4.5,'#c2cfd0');label(o,'ENTRY',10.2,3.4,-1.2,1.15,'#f3c596');
  box(o,15.6,1.1,-3.3,1.3,2.2,2.3,'#253b46');
  for(let i=0;i<6;i++)box(o,15.6,.5+i*.22,-2.1,1,.05,.06,'#52656d');
  // Antenna, cables, rooftop machinery.
  box(o,12,5.3,-3.2,1.8,.8,1.5,'#344b57');box(o,5.8,6.7,-3,.09,4,.09,'#6e858f');
  for(let i=0;i<4;i++)box(o,5.8,6.2+i*.55,-3,2.2-i*.35,.045,.06,'#7f949c');
  const red=new THREE.Mesh(new THREE.SphereGeometry(.07,8,6),mat('#ec704f',true));red.position.set(5.8,8.8,-3);o.add(red);
  for(const x of [-13,-2,20]) {
   box(o,x,2.5,-3,.12,5,.16,'#344b58');box(o,x,5,-3,1.6,.12,.15,'#586e78');
   const pts=[new THREE.Vector3(x,5,-3),new THREE.Vector3(x+5,4.3,-3),new THREE.Vector3(x+11,5,-3)];
   const curve=new THREE.CatmullRomCurve3(pts);o.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(24)),new THREE.LineBasicMaterial({color:'#142c3a'})));
  }
  // Expedition equipment and foreground landmarks.
  for(const [x,z] of [[-2,1],[-.5,1.2],[18,0]]) {
   box(o,x,.47,z,1.2,.95,.9,'#344b53');box(o,x,.94,z,1.3,.1,1,'#99acaf');
   box(o,x,.46,z+.47,.05,.7,.02,'#738b90');
  }
  box(o,-8.5,1.1,-2,.1,2.2,.1,'#526974');box(o,-8.5,1.8,-1.9,2.5,.7,.12,'#1d3643');label(o,'STATION 04 →',-8.5,1.8,-1.8,2.2,'#b5c5c7');
  for(let i=0;i<25;i++) {
   const x=i*3.6-35;box(o,x,-.02,2.6+Math.sin(i)*.3,.5,.06,.2,'#385561');
  }
  const indoor=this.inside;
  box(indoor,0,3.5,-4,21,7,1,'#1c303b');box(indoor,0,-.35,-1,22,.7,9,'#34454b');
  box(indoor,0,6.7,-1.9,22,.35,5,'#24353d');
  for(let i=0;i<14;i++)box(indoor,-10+i*1.5,3.3,-3.43,.08,6.4,.08,'#42535a');
  box(indoor,0,1,-3.3,20,.16,.1,'#9a633d');
  for(const x of [-6,1,7])lamp(indoor,x,6,-2);
  box(indoor,-8.1,1.65,-3.2,1.8,3.3,.3,'#59646a');label(indoor,'EXIT',-8.1,3.7,-2.9,1.3,'#edbb7d');
  box(indoor,3.2,1.5,-2,5,.2,2,'#776956');
  for(const x of [1.1,5.3])box(indoor,x,.72,-2,.15,1.4,1.7,'#273b43');
  box(indoor,3.2,2.35,-2,1.7,1.45,1,'#101e26');box(indoor,3.2,2.4,-1.47,1.35,.94,.05,'#83bba5',true);
  label(indoor,'87.6 MHz',3.2,2.4,-1.4,1.2,'#193e35');
  box(indoor,3.2,1.65,-1.05,1.7,.09,.55,'#99a39a');
  box(indoor,5,2,-2.2,1.2,.8,.7,'#2f4046');
  for(let i=0;i<4;i++)box(indoor,4.7+i*.15,2,-1.82,.04,.5,.02,'#13262d');
  box(indoor,-4.4,1.9,-2.7,2.2,3.8,1.2,'#33464c');
  for(let i=0;i<5;i++)box(indoor,-4.4,.5+i*.66,-2.03,1.95,.06,.04,'#708085');
  label(indoor,'COMMUNICATIONS',.1,5,-3.3,7,'#c0c1b0');
  label(indoor,'NO OUTGOING SIGNAL',.1,4.35,-3.3,4,'#9a7960');
  this.terminalLight=new THREE.PointLight('#80d9b5',5,5);this.terminalLight.position.set(3.2,2.7,-.6);indoor.add(this.terminalLight);
  const count=1100;this.snowPositions=new Float32Array(count*3);
  for(let i=0;i<count;i++){this.snowPositions[i*3]=Math.random()*70-35;this.snowPositions[i*3+1]=Math.random()*19;this.snowPositions[i*3+2]=Math.random()*23-12;}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(this.snowPositions,3));
  const c=document.createElement('canvas');c.width=c.height=16;const ctx=c.getContext('2d')!;
  const gradient=ctx.createRadialGradient(8,8,0,8,8,8);gradient.addColorStop(0,'#fff');gradient.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,16,16);
  this.batchBoxes(this.outside);this.batchBoxes(this.inside);
  this.snow=new THREE.Points(geometry,new THREE.PointsMaterial({color:'#d5e5e9',size:2.1,map:new THREE.CanvasTexture(c),transparent:true,opacity:.65,depthWrite:false,sizeAttenuation:false}));scene.add(this.snow); 
 }
 private batchBoxes(group:THREE.Group) {
  const batches=new Map<THREE.Material,THREE.Mesh[]>();
  for(const item of [...group.children]) {
   if(item instanceof THREE.Mesh && item.geometry===boxGeo) {
    const material=item.material as THREE.Material;
    const list=batches.get(material)||[];list.push(item);batches.set(material,list);
   }
  }
  for(const [material, meshes] of batches) {
   const batch=new THREE.InstancedMesh(boxGeo,material,meshes.length);
   meshes.forEach((mesh,i)=>{mesh.updateMatrix();batch.setMatrixAt(i,mesh.matrix);group.remove(mesh);});
   batch.computeBoundingSphere();group.add(batch);
  }
 }
 update(dt:number, x:number) {
  const p=this.snowPositions;
  for(let i=0;i<p.length;i+=3) {
   p[i]-=dt*(2.3+(i%7)*.12);p[i+1]-=dt*(1.4+(i%5)*.2);
   if(p[i+1]<-.1){p[i+1]=18;p[i]=x+Math.random()*58-29;}
   if(p[i]<x-32)p[i]=x+32;
  }
  this.snow.geometry.attributes.position.needsUpdate=true;
 }
 setLevel(inside:boolean){this.outside.visible=!inside;this.inside.visible=inside;this.snow.visible=!inside;}
}
