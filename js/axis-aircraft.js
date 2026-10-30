/* Procedural Bf 109G-10 and Me 262A-1a, 10 units/metre. References: CREDITOS.html. */
Aurora.AxisAircraft=(()=>{
 const T=THREE;
 const specs={bf109:{name:'Messerschmitt Bf 109G-10',span:9.92,length:9.0,maxSpeed:686},me262:{name:'Messerschmitt Me 262A-1a',span:12.5,length:10.6,maxSpeed:869}};
 let mats;
 function materials(){if(mats)return mats;
  const map=Aurora.Aircraft.texture((c,w,h)=>{c.fillStyle='#65766a';c.fillRect(0,0,w,h);c.fillStyle='#394d46';c.beginPath();c.moveTo(0,0);c.lineTo(w*.8,0);c.lineTo(w*.3,h*.6);c.lineTo(w,h);c.lineTo(0,h);c.fill();for(let y=0;y<h;y+=64){c.fillStyle='#172e3444';c.fillRect(0,y,w,1);for(let x=3;x<w;x+=12){c.fillStyle='#d7d8c34a';c.fillRect(x,y+3,1,1);}}},512,512);
  const cross=Aurora.Aircraft.texture((c,w,h)=>{c.fillStyle='#e4e5dc';c.fillRect(w*.32,0,w*.36,h);c.fillRect(0,h*.32,w,h*.36);c.fillStyle='#202724';c.fillRect(w*.4,0,w*.2,h);c.fillRect(0,h*.4,w,h*.2);},128,128);
  return mats={upper:new T.MeshStandardMaterial({map,roughness:.7,metalness:.2}),lower:new T.MeshStandardMaterial({color:0x9caeaf,roughness:.7}),dark:new T.MeshStandardMaterial({color:0x202928,roughness:.7}),metal:new T.MeshStandardMaterial({color:0x657573,metalness:.6,roughness:.5}),yellow:new T.MeshStandardMaterial({color:0xc5ad58,roughness:.7}),glass:new T.MeshPhysicalMaterial({color:0x95afb5,transparent:true,opacity:.45,depthWrite:false,roughness:.18,side:T.DoubleSide}),cross:new T.MeshStandardMaterial({map:cross,transparent:true,depthWrite:false,side:T.DoubleSide}),pilot:new T.MeshStandardMaterial({color:0x8a7055})};
 }
 function add(g,geo,mat,x=0,y=0,z=0,name=''){const o=new T.Mesh(geo,mat);o.position.set(x,y,z);o.name=name;o.castShadow=true;o.receiveShadow=true;g.add(o);return o;}
 function oval(g,mat,x,y,z,a,b,c){const o=add(g,new T.SphereGeometry(1,24,16),mat,x,y,z);o.scale.set(a,b,c);return o;}
 function section(x,span,jet,tail){const t=Math.max(0,(x-3)/(span-3)),round=Math.sqrt(Math.max(0,1-Math.max(0,(t-.93)/.07)**2));const front=(tail?-6:jet?-15:-12)+(tail?8:jet?25:7)*t;const chord=((tail?17:jet?31:25)*(1-t)+(tail?6:jet?10:10)*t)*round;return {front,back:front+chord,rise:tail?0:(x-3)*.065};}
 function wing(side,span,jet,tail=false){const p=[],uv=[],idx=[],n=48,k=24,count=(n+1)*(k+1);
  for(let surf=0;surf<2;surf++)for(let i=0;i<=n;i++)for(let j=0;j<=k;j++){const x=3+(span-3)*i/n,s=section(x,span,jet,tail),u=j/k,h=5*(tail?.08:.13)*(s.back-s.front)*(.2969*Math.sqrt(u)-.126*u-.3516*u*u+.2843*u**3-.1036*u**4);p.push(side*x,s.rise+(surf?-h:h),s.front+(s.back-s.front)*u);uv.push(i/n,u);}
  for(let surf=0;surf<2;surf++)for(let i=0;i<n;i++)for(let j=0;j<k;j++){const a=surf*count+i*(k+1)+j,b=a+k+1;idx.push(...((side>0)!==Boolean(surf)?[a,a+1,b,b,a+1,b+1]:[a,b,a+1,b,b+1,a+1]));}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.addGroup(0,idx.length/2,0);geo.addGroup(idx.length/2,idx.length/2,1);geo.computeVertexNormals();return geo;
 }
 function fin(g,m,jet){const s=new T.Shape();s.moveTo(26,0);s.bezierCurveTo(31,4,33,15,39,19);s.quadraticCurveTo(43,21,44,17);s.lineTo(jet?51:43,0);s.closePath();const geo=new T.ExtrudeGeometry(s,{depth:.7,bevelEnabled:true,bevelSize:.25,bevelThickness:.25,bevelSegments:2,curveSegments:16});geo.rotateY(-Math.PI/2);geo.translate(.35,0,0);add(g,geo,m.upper,0,1,0,'fin');}
 function create(type){const jet=type==='me262',s=specs[type],m=materials(),g=new T.Group();g.name=s.name;
  const rings=jet?[[-53,.1,.1,0],[-48,3,3,0],[-37,5.5,5,0],[-22,6.2,6,0],[-5,6.5,7,0],[12,5,5.8,0],[29,3.5,4,0],[43,1.9,2.5,0],[53,.15,.2,0]]:[[-38,3,4,0],[-33,4.2,5.3,0],[-20,4.8,6.1,0],[-8,4.4,6.1,0],[7,3.7,5.5,0],[24,2.3,3.8,0],[37,1.1,2,0],[44,.15,.2,0]];
  add(g,Aurora.Aircraft.loft(rings),m.upper,0,0,0,'fuselage');oval(g,m.lower,0,-3,jet?-5:-8,jet?5.5:4,3,jet?37:29);
  const span=s.span*5;
  for(const side of [-1,1]){add(g,wing(side,span,jet),[m.upper,m.lower],0,-2,0,'main-wing');add(g,wing(side,jet?24:20,jet,true),[m.upper,m.lower],0,1,jet?36:30,'tailplane');
   const x=span*.72,sec=section(x,span,jet,false),mark=add(g,new T.PlaneGeometry(10,8),m.cross,side*x,sec.rise-.9,(sec.front+sec.back)/2,'wing-marking');mark.rotation.x=-Math.PI/2;mark.castShadow=false;
   const badge=add(g,new T.PlaneGeometry(8,7),m.cross,side*2.8,1,24,'side-marking');badge.rotation.y=side*Math.PI/2;badge.castShadow=false;
   if(jet){const pod=new T.Group();pod.position.set(side*27,-6,1);g.add(pod);pod.name='jumo004';add(pod,Aurora.Aircraft.loft([[-25,4.5,4.5,0],[-20,5.6,5.6,0],[-7,5.3,5.3,0],[10,4.2,4.2,0],[23,2.8,2.8,0]]),m.metal);for(const z of [-25,23]){const disk=add(pod,new T.CircleGeometry(z<0?4.4:2.7,32),m.dark,0,0,z);disk.rotation.y=z<0?Math.PI:0;}add(pod,new T.TorusGeometry(4.6,.35,8,32),m.lower,0,0,-25);oval(pod,m.metal,0,0,-24,1.3,1.3,2);}
   else {add(g,new T.BoxGeometry(10,2.8,12),m.lower,side*15,-3.7,9,'radiator');add(g,new T.BoxGeometry(8,1.4,.2),m.dark,side*15,-3.8,2.9);for(let i=0;i<6;i++)add(g,new T.BoxGeometry(.8,1,1.5),m.dark,side*4.7,-.3,-28+i*2,'exhaust');const gun=add(g,new T.CylinderGeometry(.18,.18,3,8),m.dark,side*2,5,-29,'cowl-gun');gun.rotation.x=Math.PI/2;}
  }
  fin(g,m,jet);
  oval(g,m.dark,0,6,jet?-12:-8,4,.5,9);oval(g,m.pilot,0,8.1,jet?-9:-5,1.5,2,1.5);
  const canopy=oval(g,m.glass,0,7.7,jet?-11:-7,3.8,4.2,10);canopy.name='canopy';
  for(const z of [jet?-17:-13,jet?-5:-1]){const arch=new T.EllipseCurve(0,0,3.9,4.3,0,Math.PI,false,0).getPoints(20).map(p=>new T.Vector3(p.x,7.7+p.y,z));add(g,new T.TubeGeometry(new T.CatmullRomCurve3(arch),20,.14,5,false),m.dark);}
  if(jet){for(const side of [-1,1])for(const y of [1,3]){const gun=add(g,new T.CylinderGeometry(.38,.38,2,10),m.dark,side*1.7,y,-47,'mk108');gun.rotation.x=Math.PI/2;}}
  else {const prop=new T.Group();prop.name='propeller';prop.position.z=-38;g.add(prop);const spinner=add(prop,new T.ConeGeometry(3.5,8,32),m.yellow,0,0,-4);spinner.rotation.x=-Math.PI/2;const muzzle=add(prop,new T.CircleGeometry(.4,12),m.dark,0,0,-8.02);muzzle.rotation.y=Math.PI;for(let i=0;i<3;i++){const b=new T.Group();b.rotation.z=i*Math.PI*2/3;prop.add(b);oval(b,m.dark,1,8,0,1.7,8,.45);}}
  const size=new T.Box3().setFromObject(g).getSize(new T.Vector3());g.scale.set(s.span*10/size.x,1,s.length*10/size.z);const model=new T.Group();model.add(g);model.name=s.name;model.userData.specs=s;return model;
 }
 return {create,specs,wing};
})();
