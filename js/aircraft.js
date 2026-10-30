/* Modelo construído a partir de perfis curvos, inspirado nas referências B4.
   Unidade local: cerca de 10 unidades por metro. Nariz aponta para -Z. */
Aurora.Aircraft = (() => {
  const T=THREE;
  let materials;
  const dimensions={length:11.02,span:12.42,wingArea:27.87,groundHeight:[4.30,4.47],unitsPerMeter:10};
  const lengthScale=110.2/115,spanScale=124.2/124;
  // Planform area includes the wing section hidden by the fuselage.
  let rawArea=12*(rawWingProfile(6).back-rawWingProfile(6).front);
  for(let i=0;i<56;i++){const a=rawWingProfile(6+i),b=rawWingProfile(7+i);rawArea+=(a.back-a.front)+(b.back-b.front);}
  const chordScale=2787/(rawArea*lengthScale*spanScale);
  function texture(draw,w=1024,h=1024){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;tx.anisotropy=4;return tx;}
  function paint(){return texture((c,w,h)=>{
    c.fillStyle='#50543f';c.fillRect(0,0,w,h);
    let seed=47;const rand=()=>((seed=seed*16807%2147483647)/2147483647);
    for(let i=0;i<22000;i++){const light=rand()>.5;c.fillStyle=light?'rgba(210,204,167,.05)':'rgba(16,23,12,.06)';c.fillRect(rand()*w,rand()*h,rand()*9+1,rand()*3+1);}
    for(let y=0;y<h;y+=128){c.fillStyle='#1b211b55';c.fillRect(0,y,w,2);c.fillStyle='#bebc9660';c.fillRect(0,y+2,w,1);for(let x=8;x<w;x+=15){c.fillStyle='#1d211b88';c.beginPath();c.arc(x,y+7,1.4,0,7);c.fill();}}
    for(let x=0;x<w;x+=256){c.fillStyle='#22271b66';c.fillRect(x,0,1,h);for(let y=8;y<h;y+=15){c.fillStyle='#b2b29366';c.fillRect(x+5,y,2,2);}}
    for(let i=0;i<55;i++){c.strokeStyle='#c7c5a430';c.beginPath();const x=rand()*w,y=rand()*h;c.moveTo(x,y);c.lineTo(x+rand()*30,y+rand()*3);c.stroke();}
  });}
  function star(c,x,y,r){c.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.42:r;c.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}c.closePath();c.fill();}
  function roundel(){return texture((c,w,h)=>{
    c.fillStyle='#e1dfc8';c.fillRect(0,h*.36,w,h*.28);c.fillStyle='#294c6a';c.beginPath();c.arc(w/2,h/2,h*.46,0,7);c.fill();
    c.fillStyle='#d8ba48';star(c,w/2,h/2,h*.43);c.fillStyle='#426d55';star(c,w/2,h/2,h*.32);
    c.fillStyle='#e3e2ce';c.beginPath();c.arc(w/2,h/2,h*.16,0,7);c.fill();c.fillStyle='#27516d';c.beginPath();c.arc(w/2,h/2,h*.13,0,7);c.fill();
  },512,256);}
  function getMaterials(){if(materials)return materials;
    const metal=new T.MeshStandardMaterial({color:0xffffff,map:paint(),roughness:.62,metalness:.35});
    const badge=new T.TextureLoader().load(AuroraMedia.emblem);badge.colorSpace=T.SRGBColorSpace;
    materials={olive:metal,gray:new T.MeshStandardMaterial({color:0x8d9390,roughness:.64,metalness:.35}),dark:new T.MeshStandardMaterial({color:0x171c1b,roughness:.7,metalness:.4}),rim:new T.MeshStandardMaterial({color:0x4c5040,roughness:.48,metalness:.6}),glass:new T.MeshPhysicalMaterial({color:0x779b9b,metalness:.1,roughness:.15,transparent:true,opacity:.35,depthWrite:false,side:T.DoubleSide}),skin:new T.MeshStandardMaterial({color:0xbe9169,roughness:.9}),leather:new T.MeshStandardMaterial({color:0x4b3827,roughness:.95}),green:new T.MeshStandardMaterial({color:0x4a754b,roughness:.8}),yellow:new T.MeshStandardMaterial({color:0xd7b94e,roughness:.7}),red:new T.MeshStandardMaterial({color:0x973d32,roughness:.8}),roundel:new T.MeshStandardMaterial({map:roundel(),transparent:true,roughness:.7,depthWrite:false,side:T.DoubleSide}),badge:new T.MeshBasicMaterial({map:badge,transparent:true,side:T.DoubleSide,depthWrite:false})};
    return materials;
  }
  function mesh(parent,geometry,material,x=0,y=0,z=0){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  function ellipsoid(parent,material,x,y,z,rx,ry,rz){const m=mesh(parent,new T.SphereGeometry(1,28,18),material,x,y,z);m.scale.set(rx,ry,rz);return m;}
  function tube(parent,points,radius,material){return mesh(parent,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),Math.max(8,points.length*5),radius,5,false),material);}
  function loft(rings,segments=48){
    const smooth=[];
    for(let k=0;k<rings.length-1;k++)for(let step=0;step<8;step++){
      const t=step/8,t2=t*t,t3=t2*t;
      smooth.push(rings[k].map((v,c)=>{const a=rings[Math.max(0,k-1)][c],b=v,d=rings[k+1][c],e=rings[Math.min(rings.length-1,k+2)][c];return .5*((2*b)+(-a+d)*t+(2*a-5*b+4*d-e)*t2+(-a+3*b-3*d+e)*t3);}));
    }
    smooth.push(rings.at(-1));rings=smooth;
    const positions=[],uv=[],indices=[];
    rings.forEach(([z,rx,ry,cy],j)=>{for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2;positions.push(Math.cos(a)*rx,Math.sin(a)*ry+cy,z);uv.push(i/segments,j/(rings.length-1));}});
    for(let j=0;j<rings.length-1;j++)for(let i=0;i<segments;i++){const a=j*(segments+1)+i,b=a+segments+1;indices.push(a,a+1,b,b,a+1,b+1);}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
  }
  // Broad tapered planform: the rounding is confined to the outer wingtip.
  function rawWingProfile(x,tail=false){
    if(tail){const t=Math.min(1,Math.max(0,(x-1.5)/18.5));let front=-9+5*t,back=12-3*t;if(x>20){const r=Math.sqrt(Math.max(0,1-((x-20)/4)**2)),mid=(front+back)/2;front=mid-(mid-front)*r;back=mid+(back-mid)*r;}return {front,back,dihedral:0};}
    // Contour interpreted from the Smithsonian overhead and Nellie air-to-air photos.
    // The leading edge remains almost straight; the trailing edge curves inward earlier.
    const stations=[[6,-17,21],[16,-17,20],[28,-16.6,18.8],[40,-16,15.2],[49,-15,11],[55,-13.6,6.8],[59,-11,2.3],[61,-8.2,-1],[62,-4.3,-4.3]];
    let i=0;while(i<stations.length-2&&x>stations[i+1][0])i++;
    const a=stations[i],b=stations[i+1],prev=stations[Math.max(0,i-1)],next=stations[Math.min(stations.length-1,i+2)],dx=b[0]-a[0],t=Math.max(0,Math.min(1,(x-a[0])/dx));
    const sample=c=>{const m0=(b[c]-prev[c])/(b[0]-prev[0]),m1=(next[c]-a[c])/(next[0]-a[0]);return (2*t**3-3*t*t+1)*a[c]+(t**3-2*t*t+t)*dx*m0+(-2*t**3+3*t*t)*b[c]+(t**3-t*t)*dx*m1;};
    const front=sample(1);return {front,back:Math.max(front,sample(2)),dihedral:Math.max(0,x-9)*.075};
  }
  function wingProfile(x,tail=false){const p=rawWingProfile(x,tail);if(!tail){p.front*=chordScale;p.back*=chordScale;}return p;}
  function wingGeometry(side=1,tail=false){
    const pos=[],uv=[],ind=[],ns=56,nc=30,span=tail?24:62,root=tail?1.5:6;
    for(let surface=0;surface<2;surface++)for(let i=0;i<=ns;i++){
      const x=root+(span-root)*i/ns,p=wingProfile(x,tail),chord=p.back-p.front;
      for(let j=0;j<=nc;j++){
        const u=j/nc;
        // Closed NACA-style section: rounded leading edge and sharp trailing edge.
        const thick=5*(tail?.075:.115)*chord*(.2969*Math.sqrt(u)-.126*u-.3516*u*u+.2843*u*u*u-.1036*u*u*u*u);
        pos.push(x*side,(surface?-1:1)*thick+p.dihedral,p.front+chord*u);uv.push(x/span,u);
      }
    }
    const count=(ns+1)*(nc+1);
    for(let k=0;k<2;k++)for(let i=0;i<ns;i++)for(let j=0;j<nc;j++){
      const a=k*count+i*(nc+1)+j,b=a+nc+1;
      ind.push(...(((side<0)!==Boolean(k))?[a,a+1,b,b,a+1,b+1]:[a,b,a+1,b,b+1,a+1]));
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ind);g.computeVertexNormals();return g;
  }
  function finGeometry(){
    // Each station is [height, leading edge Z, trailing edge Z, half thickness].
    const stations=[[0,26,61,2.1],[3,29,61,1.9],[7,33,61,1.55],[12,36,60.8,1.25],[18,40,60.2,.9],[23,43.8,59.2,.65],[26,47,57.4,.45],[27.5,50,55.5,.25],[28,52.8,52.8,.05]];
    const p=[],uv=[],idx=[],n=32;
    for(const [y,lead,trail,width] of stations)for(let i=0;i<=n;i++){
      const angle=i/n*Math.PI*2,z=(lead+trail)/2+Math.cos(angle)*(trail-lead)/2;
      p.push(Math.sin(angle)*width,y,z);uv.push((z-27)/34,y/30);
    }
    for(let j=0;j<stations.length-1;j++)for(let i=0;i<n;i++){const a=j*(n+1)+i,b=a+n+1;idx.push(a,b,a+1,b,b+1,a+1);}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
  }
  function stencil(text,color='#e6e3ce'){return new T.MeshStandardMaterial({map:texture((c,w,h)=>{c.fillStyle=color;c.font='bold 175px monospace';c.textAlign='center';c.textBaseline='middle';c.fillText(text,w/2,h/2);},512,256),transparent:true,side:T.DoubleSide,depthWrite:false,roughness:.9});}
  function create(enemy=false){
    const m=getMaterials(),g=new T.Group();g.name=enemy?'Patrulha':'P-47D · B4 · Senta a Pua';
    const body=mesh(g,loft([[-48,.5,.5,0],[-47,10,10.5,-1],[-43,10.7,11.3,-1],[-31,10.8,11.9,-1.5],[-17,10.5,12.4,-2],[-3,9.4,11.8,-2],[12,7.7,9.1,-1],[29,5.2,5.9,0],[44,3.1,3.6,1],[56,1.4,1.8,2],[60,.1,.1,2]]),m.olive);
    body.material.side=T.DoubleSide;
    // Belly contour and broad, round cowling of the radial engine.
    ellipsoid(g,m.gray,0,-6,-8,8,7,34);
    const opening=mesh(g,new T.CylinderGeometry(9.4,9.4,.7,48),m.dark,0,-1,-47.5);opening.rotation.x=Math.PI/2;
    const lip=mesh(g,new T.TorusGeometry(9.6,.65,12,64),m.rim,0,-1,-47.9);
    for(let i=0;i<9;i++){const a=i*Math.PI*2/9;const c=mesh(g,new T.CylinderGeometry(1.2,1.6,4,8),m.gray,Math.cos(a)*5,Math.sin(a)*5-1,-48.1);c.rotation.z=-a+Math.PI/2;}
    for(const side of [-1,1]){
      const wing=mesh(g,wingGeometry(side),m.olive,0,-4,0);wing.material.side=T.DoubleSide;
      const tail=mesh(g,wingGeometry(side,true),m.olive,0,2,46);
      const emblemGeometry=new T.PlaneGeometry(18,8,12,8),ep=emblemGeometry.attributes.position;
      for(let i=0;i<ep.count;i++){const x=side*43+ep.getX(i),z=2-ep.getY(i),p=wingProfile(Math.abs(x)),chord=p.back-p.front,u=T.MathUtils.clamp((z-p.front)/chord,0,1);const thickness=5*.115*chord*(.2969*Math.sqrt(u)-.126*u-.3516*u*u+.2843*u*u*u-.1036*u*u*u*u);ep.setXYZ(i,x,-4+p.dihedral+thickness+.055,z);}
      emblemGeometry.computeVertexNormals();const emblem=mesh(g,emblemGeometry,m.roundel);emblem.visible=!enemy;emblem.castShadow=false;
      for(let n=0;n<4;n++){
        const x=side*(22+n*2.3),profile=wingProfile(Math.abs(x)),z=profile.front,y=-4+profile.dihedral;
        // Short exposed jackets, approximately 4 cm diameter; most of the gun is inside the wing.
        const exposed=1.9-n*.28;
        const barrel=mesh(g,new T.CylinderGeometry(.20,.20,exposed+.7,12),m.dark,x,y,z-(exposed-.7)/2);barrel.rotation.x=Math.PI/2;barrel.name='gun-jacket';
        const muzzle=mesh(g,new T.CircleGeometry(.14,12),m.dark,x,y,z-exposed-.015);muzzle.rotation.y=Math.PI;
      }
      tube(g,[13,30,54].map(x=>{const p=wingProfile(x);return [side*x,-3.5+p.dihedral,p.back-1.6];}),.05,m.dark);
      // Flap/aileron hinge follows the actual curved trailing edge.
      tube(g,[25,32,40,47,53,57].map(x=>{const p=wingProfile(x);return [side*x,-3.5+p.dihedral,p.front+(p.back-p.front)*.77];}),.045,m.dark);
      for(const x of [25,46]){const p=wingProfile(x);tube(g,[[side*x,-3.4+p.dihedral,p.front+(p.back-p.front)*.77],[side*x,-3.8+p.dihedral,p.back-.15]],.045,m.dark);}
      // Swept root fairing blends into the fuselage behind the main wing.
      const fp=[],fi=[];for(let j=0;j<=18;j++){const z=-10+j*1.75,bodyWidth=9.4-(z+3)*.105,flare=3.8*Math.sin(j/18*Math.PI);for(let k=0;k<=8;k++){const t=k/8;fp.push(side*(bodyWidth+flare*t),-1-3*t*t,z);}if(j<18)for(let k=0;k<8;k++){const q=j*9+k;fi.push(q,q+1,q+9,q+1,q+10,q+9);}}
      const fairing=new T.BufferGeometry();fairing.setAttribute('position',new T.Float32BufferAttribute(fp,3));fairing.setIndex(fi);fairing.computeVertexNormals();mesh(g,fairing,m.olive);
      // White bars and FAB star on both sides of the rear fuselage.
      const mark=mesh(g,new T.PlaneGeometry(18,9),m.roundel,side*5.8,1,24);mark.rotation.y=side*Math.PI/2;mark.visible=!enemy;
      const number=mesh(g,new T.PlaneGeometry(18,9),stencil(enemy?'17':'B4'),side*10.9,2,-32);number.rotation.y=side*Math.PI/2;
      if(!enemy){const badge=mesh(g,new T.CircleGeometry(4,48),m.badge,side*10.8,1,-20);badge.rotation.y=side*Math.PI/2;}
      for(let i=0;i<9;i++)tube(g,[[side*9.8,-3,-31+i*1.05],[side*10.3,4,-31+i*1.05]],.13,m.dark);
      // Small mission markings, inspired by the supplied photographs.
      for(let i=0;i<12;i++){const tick=mesh(g,new T.BoxGeometry(.13,.9,.25),m.yellow,side*9.2,5.5,-13+i*1.05);}
    }
    // Olive fixed fin with a distinct green/yellow rudder, blended into the tail.
    const tailPaint=texture((c,w,h)=>{c.fillStyle='#5e614b';c.fillRect(0,0,w,h);c.fillStyle='#416a48';c.fillRect(w*.73,0,w*.27,h);c.fillStyle='#c7a83f';c.fillRect(w*.88,0,w*.12,h);c.fillStyle='#272d2360';c.fillRect(w*.73,0,2,h);},512,512);
    const tailMat=new T.MeshStandardMaterial({map:tailPaint,roughness:.68,metalness:.25,side:T.DoubleSide});
    const vertical=mesh(g,finGeometry(),enemy?m.gray:tailMat,0,1,0);vertical.name='vertical-stabilizer';vertical.scale.y=.72;
    for(const side of [-1,1]){const serial=mesh(g,new T.PlaneGeometry(10,3),stencil('226766','#dfc054'),side*1.55,13,49);serial.rotation.y=side*Math.PI/2;serial.visible=!enemy;}
    // The bubble is a half-shell seated on a recessed cockpit, not a full sphere.
    ellipsoid(g,m.dark,0,9.8,-2,5.8,.7,11);
    ellipsoid(g,m.leather,0,11,1,3.2,3.9,3.1);
    ellipsoid(g,m.skin,0,14.4,-3,1.9,2.4,1.9);
    ellipsoid(g,m.leather,0,15.4,-2.6,2,1.7,1.9);
    const cp=[],cu=[],ci=[],sections=[[-18,.1,.1],[-15,3.6,4.5],[-11,5.2,6.7],[-5,5.9,7.4],[1,5.7,6.8],[7,4.6,4.3],[12,2.2,1.4],[14,.1,.1]],cn=24;
    for(let j=0;j<sections.length;j++)for(let i=0;i<=cn;i++){
      const [z,rx,ry]=sections[j],a=i/cn*Math.PI;cp.push(Math.cos(a)*rx,10.1+Math.sin(a)*ry,z);cu.push(i/cn,j/(sections.length-1));
      if(j<sections.length-1&&i<cn){const k=j*(cn+1)+i;ci.push(k,k+1,k+cn+1,k+1,k+cn+2,k+cn+1);}
    }
    const canopy=new T.BufferGeometry();canopy.setAttribute('position',new T.Float32BufferAttribute(cp,3));canopy.setAttribute('uv',new T.Float32BufferAttribute(cu,2));canopy.setIndex(ci);canopy.computeVertexNormals();mesh(g,canopy,m.glass);
    tube(g,[[-5.2,10.15,-11],[-4.5,14,-11],[0,16.8,-11],[4.5,14,-11],[5.2,10.15,-11]],.24,m.rim);
    tube(g,[[-.1,10.15,-18],[0,13.3,-16],[0,16.8,-11]],.22,m.rim);
    for(const side of [-1,1])tube(g,sections.map(([z,rx])=>[side*rx,10.15,z]),.22,m.rim);
    const antenna=mesh(g,new T.CylinderGeometry(.13,.3,11,6),m.dark,0,12,14);
    tube(g,[[0,17,14],[0,17,44]],.055,m.dark);
    // Four propeller blades, not rectangular bars.
    const prop=new T.Group();prop.name='propeller';prop.position.set(0,-1,-49.5);g.add(prop);
    ellipsoid(prop,m.gray,0,0,-1,2.1,2.1,3.5);
    for(let i=0;i<4;i++){const blade=new T.Group();blade.rotation.z=i*Math.PI/2;blade.scale.set(.9,.9,1);prop.add(blade);ellipsoid(blade,m.dark,0,11,0,2.8,11.3,.65);ellipsoid(blade,m.yellow,0,20.5,0,2,1.5,.7);}
    g.userData.prop=prop;g.userData.body=body;
    const model=new T.Group();model.name=g.name;g.scale.set(spanScale,1,lengthScale);model.add(g);
    model.userData.prop=prop;model.userData.body=body;model.userData.dimensions=dimensions;
    return model;
  }
  return {dimensions,create,texture,wingGeometry,wingProfile,finGeometry,loft};
})();
