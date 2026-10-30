/* Fw 190A-8, 10 model units/metre. Photographic interpretation, not a museum scan.
   Sources and limits: CREDITOS.html. Nose points toward -Z. */
Aurora.Fw190 = (()=>{
  const T=THREE,dimensions={variant:'Fw 190A-8',length:8.95,span:10.50,wingArea:18.30};
  let materials;
  function paint(body=false){return Aurora.Aircraft.texture((c,w,h)=>{
    c.fillStyle=body?'#9aa9ac':'#606c67';c.fillRect(0,0,w,h);
    c.fillStyle='#465551';if(body)c.fillRect(w*.08,0,w*.34,h);
    else {c.beginPath();c.moveTo(0,h*.3);c.lineTo(w*.63,0);c.lineTo(w*.48,h*.53);c.lineTo(w,h*.85);c.lineTo(w*.63,h);c.lineTo(0,h*.75);c.closePath();c.fill();}
    let seed=190;const rand=()=>((seed=seed*16807%2147483647)/2147483647);
    if(body)for(let i=0;i<350;i++){const x=(i%2?.44:.02)*w+(rand()-.5)*w*.17;c.fillStyle='rgba(62,79,72,.26)';c.beginPath();c.ellipse(x,rand()*h,5+rand()*14,4+rand()*14,rand()*6,0,7);c.fill();}
    for(let i=0;i<14000;i++){c.fillStyle=rand()>.5?'#dae1cf12':'#10232416';c.fillRect(rand()*w,rand()*h,1+rand()*7,1+rand()*2);}
    for(let y=0;y<h;y+=128){c.fillStyle='#15232255';c.fillRect(0,y,w,1);for(let x=7;x<w;x+=18){c.fillStyle='#dde0ce55';c.fillRect(x,y+4,1,1);}}
    for(let x=0;x<w;x+=256){c.fillStyle='#10221e55';c.fillRect(x,0,1,h);}
  },1024,1024);}
  function marking(){return Aurora.Aircraft.texture((c,w,h)=>{
    c.fillStyle='#e3e4db';c.fillRect(w*.32,h*.06,w*.36,h*.88);c.fillRect(w*.06,h*.32,w*.88,h*.36);
    c.fillStyle='#202726';c.fillRect(w*.40,h*.06,w*.20,h*.88);c.fillRect(w*.06,h*.40,w*.88,h*.20);
  },256,256);}
  function getMaterials(){if(materials)return materials;
    materials={body:new T.MeshStandardMaterial({map:paint(true),roughness:.63,metalness:.32,side:T.DoubleSide}),upper:new T.MeshStandardMaterial({map:paint(),roughness:.66,metalness:.25,side:T.FrontSide}),lower:new T.MeshStandardMaterial({color:0x94a4a8,roughness:.65,metalness:.25}),dark:new T.MeshStandardMaterial({color:0x202927,roughness:.65,metalness:.38}),steel:new T.MeshStandardMaterial({color:0x6b7776,roughness:.48,metalness:.7}),yellow:new T.MeshStandardMaterial({color:0xc5a749,roughness:.72}),glass:new T.MeshPhysicalMaterial({color:0x819fa5,roughness:.18,transparent:true,opacity:.34,depthWrite:false,side:T.DoubleSide}),cross:new T.MeshStandardMaterial({map:marking(),transparent:true,side:T.DoubleSide,depthWrite:false,roughness:.75}),pilot:new T.MeshStandardMaterial({color:0x6c5542,roughness:1})};return materials;
  }
  function mesh(g,geo,mat,x=0,y=0,z=0,name=''){const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.name=name;m.castShadow=true;m.receiveShadow=true;g.add(m);return m;}
  function oval(g,mat,x,y,z,rx,ry,rz){const m=mesh(g,new T.SphereGeometry(1,24,16),mat,x,y,z);m.scale.set(rx,ry,rz);return m;}
  function line(g,points,r,mat){return mesh(g,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),24,r,5,false),mat);}
  function rawProfile(x,tail=false){
    if(tail){const t=Math.min(1,Math.max(0,(x-2)/16));let front=-6+6*t,back=10-3*t;if(x>18){const r=Math.sqrt(Math.max(0,1-((x-18)/2)**2)),mid=(front+back)/2;front=mid-(mid-front)*r;back=mid+(back-mid)*r;}return {front,back,rise:0};}
    const t=Math.min(1,Math.max(0,(x-4)/45));let front=-14+12*t,back=17-9*t;
    if(x>49){const r=Math.sqrt(Math.max(0,1-((x-49)/3.5)**2)),mid=(front+back)/2;front=mid-(mid-front)*r;back=mid+(back-mid)*r;}
    return {front,back,rise:Math.max(0,x-7)*.085};
  }
  const steps=64,root=4,tip=52.5,step=(tip-root)/steps;
  let area=8*31;for(let i=0;i<steps;i++){const a=rawProfile(root+i*step),b=rawProfile(root+(i+1)*step);area+=((a.back-a.front)+(b.back-b.front))*step;}
  const chordScale=1830/(area*(89.5/89.85));
  function profile(x,tail=false){const p=rawProfile(x,tail);if(!tail){p.front*=chordScale;p.back*=chordScale;}return p;}
  function surface(x,z,tail=false){const p=profile(Math.abs(x),tail),chord=p.back-p.front,u=chord?T.MathUtils.clamp((z-p.front)/chord,0,1):0;return p.rise+5*(tail?.075:.12)*chord*(.2969*Math.sqrt(u)-.126*u-.3516*u*u+.2843*u*u*u-.1036*u*u*u*u);}
  function wing(side,tail=false){const p=[],uv=[],idx=[],n=64,nc=24,r=tail?2:4,span=tail?20:52.5;
    for(let surf=0;surf<2;surf++)for(let i=0;i<=n;i++)for(let j=0;j<=nc;j++){
      const x=r+(span-r)*i/n,a=profile(x,tail),z=a.front+(a.back-a.front)*j/n,h=surface(x,z,tail)-a.rise;
      p.push(side*x,a.rise+(surf?-h:h),z);uv.push(i/n,j/n);
    }
    // Outward winding: upper normals point up, lower normals point down.
    const count=(n+1)*(nc+1);for(let k=0;k<2;k++)for(let i=0;i<n;i++)for(let j=0;j<nc;j++){const a=k*count+i*(nc+1)+j,b=a+nc+1;idx.push(...(((side>0)!==Boolean(k))?[a,a+1,b,b,a+1,b+1]:[a,b,a+1,b,b+1,a+1]));}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.addGroup(0,idx.length/2,0);geo.addGroup(idx.length/2,idx.length/2,1);geo.computeVertexNormals();return geo;
  }
  function fin(){const shape=new T.Shape();shape.moveTo(24,0);shape.bezierCurveTo(29,3,31,12,35,17.5);shape.bezierCurveTo(36.8,20,40,20,41,17.6);shape.lineTo(42.5,2);shape.quadraticCurveTo(41,0,38,0);shape.closePath();const geo=new T.ExtrudeGeometry(shape,{depth:1,bevelEnabled:true,bevelThickness:.35,bevelSize:.35,bevelSegments:3,curveSegments:24});geo.rotateY(-Math.PI/2);geo.translate(.5,0,0);return geo;}
  function create(){
    const m=getMaterials(),g=new T.Group();g.name='Focke-Wulf Fw 190A-8';g.userData.dimensions=dimensions;
    const body=mesh(g,Aurora.Aircraft.loft([[-39,6.6,6.8,0],[-36,7.4,7.4,0],[-26,7.6,7.8,.1],[-19,6.7,7.7,.4],[-8,5.7,7.7,1],[5,4.8,6.6,1],[18,3.5,4.8,1],[31,2,2.9,1],[41,1,1.6,1],[42.5,.1,.1,1]]),m.body,0,0,0,'fw190-fuselage');
    oval(g,m.lower,0,-4,-11,6.1,4.2,23);
    const opening=mesh(g,new T.CylinderGeometry(6.7,6.7,.5,48),m.dark,0,0,-39.2);opening.rotation.x=Math.PI/2;
    mesh(g,new T.TorusGeometry(6.8,.42,10,64),m.lower,0,0,-39.5);
    // Cooling fan and radial cylinder heads remain visible around the spinner.
    for(let i=0;i<14;i++){const a=i*Math.PI/7;oval(g,m.steel,Math.cos(a)*4.7,Math.sin(a)*4.7,-39.3,.8,1.1,.6);}
    for(const side of [-1,1]){
      mesh(g,wing(side),[m.upper,m.lower],0,-3,0,'fw190-main-wing');mesh(g,wing(side,true),[m.upper,m.lower],0,1.5,32);
      for(const x of [12,26]){const p=profile(x),barrel=mesh(g,new T.CylinderGeometry(.23,.23,3.6,10),m.dark,side*x,-3+p.rise,p.front-1.3,'fw190-wing-cannon');barrel.rotation.x=Math.PI/2;}
      for(let i=0;i<4;i++){const vent=mesh(g,new T.BoxGeometry(.12,2.6,1.2),m.dark,side*7.1,1,-25+i*1.8);vent.rotation.z=side*.15;}
      oval(g,m.body,side*2.7,7.2,-23,1.5,1.1,5);
      const gun=mesh(g,new T.CylinderGeometry(.18,.18,3,8),m.dark,side*2.7,7,-29,'fw190-cowl-gun');gun.rotation.x=Math.PI/2;
      const badge=new T.PlaneGeometry(13,10,8,8),bp=badge.attributes.position;
      for(let i=0;i<bp.count;i++){const x=side*36+bp.getX(i),z=2-bp.getY(i);bp.setXYZ(i,x,-3+surface(x,z)+.06,z);}badge.computeVertexNormals();const cross=mesh(g,badge,m.cross,0,0,0,'fw190-wing-marking');cross.castShadow=false;
      const sideCross=mesh(g,new T.PlaneGeometry(9,8),m.cross,side*3.7,1.5,17);sideCross.rotation.y=side*Math.PI/2;sideCross.castShadow=false;
      line(g,[15,26,39,46].map(x=>{const p=profile(x),z=p.front+(p.back-p.front)*.78;return [side*x,-3+surface(x,z)+.04,z];}),.045,m.dark);
      const number=new T.MeshStandardMaterial({map:Aurora.Aircraft.texture((c,w,h)=>{c.fillStyle='#e4dcc0';c.font='bold 180px monospace';c.textAlign='center';c.fillText('8',w/2,h*.78);},256,256),transparent:true,side:T.DoubleSide,depthWrite:false});
      const code=mesh(g,new T.PlaneGeometry(5,7),number,side*4.8,2,7);code.rotation.y=side*Math.PI/2;code.castShadow=false;
    }
    mesh(g,fin(),m.upper,0,1,0,'fw190-fin');
    // Low framed canopy with sloped windscreen and tapered sliding hood.
    oval(g,m.dark,0,8,-5,4.2,.7,10);oval(g,m.pilot,0,10,-4,1.8,2.4,1.8);
    const stations=[[-17,2,8],[-13,3.7,12.6],[-9,4.1,13.4],[-1,3.6,12.6],[8,2,9],[10,.2,7.8]],v=[],uv=[],ids=[];
    for(let j=0;j<stations.length;j++){const [z,w,h]=stations[j];v.push(-w,7.8,z,-w*.72,h,z,w*.72,h,z,w,7.8,z);uv.push(0,j/5,.25,j/5,.75,j/5,1,j/5);if(j<stations.length-1)for(let k=0;k<3;k++){const a=j*4+k;ids.push(a,a+1,a+4,a+1,a+5,a+4);}}
    const canopy=new T.BufferGeometry();canopy.setAttribute('position',new T.Float32BufferAttribute(v,3));canopy.setAttribute('uv',new T.Float32BufferAttribute(uv,2));canopy.setIndex(ids);canopy.computeVertexNormals();mesh(g,canopy,m.glass);
    for(const j of [0,1,4]){const [z,w,h]=stations[j];line(g,[[-w,7.8,z],[-w*.72,h,z],[w*.72,h,z],[w,7.8,z]],.17,m.dark);}
    for(const side of [-1,1])line(g,stations.map(([z,w])=>[side*w,7.8,z]),.16,m.dark);
    line(g,[[0,10,11],[0,16,35]],.045,m.dark);
    const prop=new T.Group();prop.name='propeller';prop.position.set(0,0,-40);g.add(prop);
    // A broad conical spinner, rather than the P-47's exposed small hub.
    const spinner=mesh(prop,new T.ConeGeometry(3.5,7,48),m.dark,0,0,-3.5);spinner.rotation.x=-Math.PI/2;
    for(let i=0;i<3;i++){const blade=new T.Group();blade.name='fw190-propeller-blade';blade.rotation.z=i*Math.PI*2/3;prop.add(blade);oval(blade,m.dark,.7,8.8,.2,2,8.8,.5);}

    // Normalize the complete assembly including spinner and fin bevels.
    const box=new T.Box3().setFromObject(g),size=box.getSize(new T.Vector3());g.scale.set(105/size.x,1,89.5/size.z);
    const model=new T.Group();model.name=g.name;model.add(g);model.userData.dimensions=dimensions;return model;
  }
  return {create,dimensions,wing,profile};
})();
