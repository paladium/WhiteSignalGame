import * as THREE from 'three';
export class FollowCamera {
  camera = new THREE.OrthographicCamera(-16,16,9,-9,.1,150);
  x=-3; height=20; halfWidth=16;
  resize(width:number,height:number) {
    this.height=width/height<1 ? 19 : 20;
    const half=this.height/2, aspect=width/height; this.halfWidth=half*aspect;
    Object.assign(this.camera,{left:-half*aspect,right:half*aspect,top:half,bottom:-half});
    this.camera.updateProjectionMatrix();
  }
  update(x:number, facing:number,dt:number,inside:boolean) {
    const lead=Math.min(6,this.halfWidth*.4);
    const roomLimit=Math.max(0,11-this.halfWidth);
    const target=inside?THREE.MathUtils.clamp(x+facing*Math.min(2,lead),-roomLimit,roomLimit):THREE.MathUtils.clamp(x+facing*lead,-10,20);
    this.x=THREE.MathUtils.lerp(this.x,target,1-Math.exp(-2.6*dt));
    this.camera.position.set(this.x,7.8,25); this.camera.lookAt(this.x,4.1,0);
  }
}
