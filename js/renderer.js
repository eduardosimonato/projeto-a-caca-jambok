/* Cena Three.js com geometria compartilhada, terreno contínuo e luz de fim de tarde. */
Aurora.Renderer = class {
  constructor(canvas) {
    const T=THREE;this.T=T;this.canvas=canvas;this.bank=0;this.time=0;
    this.renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));this.renderer.setSize(720,760,false);
    this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.15;
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
    this.scene=new T.Scene();this.scene.background=new T.Color('#9eaaa0');this.scene.fog=new T.Fog('#aab4a5',1800,3100);
    this.camera=new T.OrthographicCamera(-360,360,380,-380,1,4000);
    this.camera.position.set(360,1252,1400);this.camera.lookAt(360,0,400);this.camera.updateMatrixWorld();
    this.scene.add(new T.HemisphereLight(0xc8deed,0x50543a,2.2));
    const sun=new T.DirectionalLight(0xffe2af,3.1);sun.position.set(-360,1100,250);sun.target.position.set(360,0,400);sun.castShadow=true;
    Object.assign(sun.shadow.camera,{left:-900,right:900,top:1100,bottom:-1000,near:10,far:2500});sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.0002;sun.shadow.normalBias=.5;
    this.scene.add(sun,sun.target);
    this.player=Aurora.Aircraft.create();this.player.scale.setScalar(1.05);this.scene.add(this.player);
    this.enemyTemplates={fw190a8:Aurora.Fw190.create(),bf109:Aurora.AxisAircraft.create('bf109'),me262:Aurora.AxisAircraft.create('me262')};for(const model of Object.values(this.enemyTemplates))model.scale.setScalar(1.05);
    this.jetWarning=new T.Mesh(new T.PlaneGeometry(46,1200),new T.MeshBasicMaterial({color:0xffb154,transparent:true,opacity:.22,depthWrite:false,side:T.DoubleSide}));this.jetWarning.rotation.x=-Math.PI/2;this.jetWarning.visible=false;this.scene.add(this.jetWarning);
    this.items=new Map();this.shared={box:new T.BoxGeometry(1,1,1),ball:new T.SphereGeometry(1,12,8)};
    this.mats={ground:new T.MeshStandardMaterial({map:this.groundTexture(),roughness:1}),wall:new T.MeshStandardMaterial({color:0xc5b79b,roughness:.95}),roof:new T.MeshStandardMaterial({color:0x7f5945,roughness:.92}),dark:new T.MeshStandardMaterial({color:0x373b30,roughness:.8}),yellow:new T.MeshBasicMaterial({color:0xe5bf69}),bullet:new T.MeshBasicMaterial({color:0xffefb2}),enemyBullet:new T.MeshBasicMaterial({color:0xff986d}),pickup:new T.MeshStandardMaterial({color:0xa2bb82,roughness:.8}),balloon:new T.MeshStandardMaterial({color:0x9d9d86,roughness:.85})};
    this.land=[];const landTemplate=this.createLand();for(let i=0;i<3;i++){const land=i?landTemplate.clone(true):landTemplate;this.scene.add(land);this.land.push(land);}
    this.landscapes={farmland:this.land};this.currentLandscape='farmland';this.sun=sun;
    this.particleMeshes=[];for(let i=0;i<120;i++){const m=new T.Mesh(this.shared.ball,new T.MeshBasicMaterial({color:0xffc96d,transparent:true,depthWrite:false}));m.visible=false;this.scene.add(m);this.particleMeshes.push(m);}
    this.ray=new T.Raycaster();this.plane=new T.Plane(new T.Vector3(0,1,0),-95);this.pointer=new T.Vector2();
    this.inspection=false;this.waterClock=0;this.lastWaterFrame=performance.now();
    this.preview=this.makePreview();
    const resize=()=>{const width=canvas.clientWidth,height=canvas.clientHeight;if(!width||!height)return;this.renderer.setSize(width,height,false);this.camera.left=-380*width/height;this.camera.right=380*width/height;this.camera.updateProjectionMatrix();};
    this.resizeObserver=new ResizeObserver(resize);this.resizeObserver.observe(canvas);resize();
  }
  stitchTerrainNormals(geometry){
    const positions=geometry.attributes.position,normals=geometry.attributes.normal,edges=new Map();
    for(let i=0;i<positions.count;i++)if(Math.abs(positions.getZ(i))<.001||Math.abs(positions.getZ(i)-1600)<.001){const key=positions.getX(i).toFixed(3);if(!edges.has(key))edges.set(key,[]);edges.get(key).push(i);}
    for(const indices of edges.values())if(indices.length===2){const [a,b]=indices,n=new this.T.Vector3(normals.getX(a)+normals.getX(b),normals.getY(a)+normals.getY(b),normals.getZ(a)+normals.getZ(b)).normalize();for(const i of indices)normals.setXYZ(i,n.x,n.y,n.z);}
    normals.needsUpdate=true;
  }
  groundTexture(){
    const T=this.T,tx=new T.TextureLoader().load(AuroraMedia.terrain);
    tx.colorSpace=T.SRGBColorSpace;tx.wrapS=tx.wrapT=T.MirroredRepeatWrapping;
    tx.repeat.set(1,2);tx.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());return tx;
  }

  riverX(z){return 420+65*Math.sin(z*Math.PI*2/1600)+25*Math.sin(z*Math.PI*4/1600);}
  terrainHeight(x,z){const edge=Math.max(0,Math.abs(x-360)-285)/260;return Math.pow(edge,1.3)*(36+28*Math.sin(z*Math.PI*4/1600)+19*Math.sin(z*Math.PI*8/1600+x*.012))+2*Math.sin(x*.014)*Math.sin(z*Math.PI*8/1600);}
  riverWidth(z){return 35+5*Math.sin(z*Math.PI*6/1600)+2*Math.sin(z*Math.PI*22/1600);}
  height(x,z){const distance=Math.abs(x-this.riverX(z)),width=this.riverWidth(z);const original=this.terrainHeight(x,z);if(distance<width)return -5;const blend=Math.min(1,(distance-width)/13);return -3*(1-blend)+original*blend;}
  createRiver(parent){
    const T=this.T,positions=[],uv=[],indices=[],rows=320,cols=18;
    for(let i=0;i<=rows;i++)for(let j=0;j<=cols;j++){
      const z=i/rows*1600,u=j/cols;positions.push(this.riverX(z)+(u*2-1)*this.riverWidth(z),2,z);uv.push(u,i/rows);
      if(i<rows&&j<cols){const a=i*(cols+1)+j,b=a+cols+1;indices.push(a,b,a+1,a+1,b,b+1);}
    }
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
    this.waterTime={value:0};
    const material=new T.MeshStandardMaterial({color:0xffffff,roughness:.28,metalness:.15});
    material.onBeforeCompile=shader=>{
      shader.uniforms.riverTime=this.waterTime;
      const common='uniform float riverTime; varying vec2 riverUV;\n';
      shader.vertexShader=common+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        riverUV=uv;
        transformed.y += sin(uv.y*6.283185*60.0-riverTime*2.3+uv.x*8.0)*0.22*sin(uv.x*3.14159);
      `);
      shader.fragmentShader=common+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        float edge=abs(riverUV.x*2.0-1.0);
        float phase=riverUV.y*6.283185*110.0-riverTime*2.8;
        float ripple=sin(phase+sin(riverUV.x*27.0+riverTime*.4)*1.3);
        float crossWave=sin(riverUV.y*6.283185*63.0+riverUV.x*46.0-riverTime*1.7);
        vec3 deep=vec3(.055,.16,.18),shallow=vec3(.24,.33,.26);
        diffuseColor.rgb=mix(deep,shallow,smoothstep(.45,1.0,edge));
        diffuseColor.rgb+=vec3(.10,.16,.17)*pow(max(0.0,ripple*crossWave),5.0);
        float foam=smoothstep(.91,.995,edge)*smoothstep(.25,.9,sin(phase*.7+riverUV.x*31.0));
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.48,.55,.46),foam*.45);
      `);
      shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>',`#include <normal_fragment_begin>
        normal=normalize(normal+vec3(ripple*.13,crossWave*.16,0.0));
      `);
    };
    const water=new T.Mesh(geometry,material);water.receiveShadow=true;parent.add(water);
    // Raised irregular banks with visible sloped faces, instead of a flat border.
    const bankMaterial=new T.MeshStandardMaterial({color:0x727454,roughness:1,vertexColors:true});
    for(const side of [-1,1]){
      const p=[],c=[],idx=[];
      for(let i=0;i<=rows;i++){
        const z=i/rows*1600,w=this.riverWidth(z),extra=7+2*Math.sin(z*Math.PI*34/1600);
        p.push(this.riverX(z)+side*(w-.4),1.7,z,this.riverX(z)+side*(w+extra),5+Math.sin(z*Math.PI*18/1600),z,this.riverX(z)+side*(w+extra+8),this.height(this.riverX(z)+side*(w+extra+8),z)+.15,z);
        c.push(.7,.68,.51,1,.98,.78,.7,.8,.58);
        if(i<rows)for(let j=0;j<2;j++){const a=i*3+j,b=a+3;idx.push(...(side>0?[a,a+1,b,a+1,b+1,b]:[a,b,a+1,a+1,b,b+1]));}
      }
      const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.setAttribute('color',new T.Float32BufferAttribute(c,3));geo.setIndex(idx);geo.computeVertexNormals();const bank=new T.Mesh(geo,bankMaterial);bank.receiveShadow=true;bank.castShadow=true;parent.add(bank);
    }
    const rocks=new T.InstancedMesh(new T.DodecahedronGeometry(1,1),new T.MeshStandardMaterial({color:0x858675,roughness:1}),80),dummy=new T.Object3D();
    for(let i=0;i<80;i++){const z=10+(i*137.3)%1580,side=i%2?1:-1;dummy.position.set(this.riverX(z)+side*(this.riverWidth(z)+2),2.5,z);dummy.scale.set(1.2+i%3,1+i%2,2+i%4);dummy.rotation.set(i*.4,i*.7,0);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);}rocks.castShadow=true;rocks.receiveShadow=true;parent.add(rocks);
  }
  primitive(parent,material,x,y,z,sx,sy,sz,shape='box') {const m=new this.T.Mesh(this.shared[shape],material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  ribbon(parent,center,width,material,height=2){
    const T=this.T,p=[],uv=[],idx=[];
    for(let i=0;i<=120;i++){const z=i/120*1600;const x=center(z);p.push(x-width/2,height,z,x+width/2,height,z);uv.push(0,i/120,1,i/120);if(i<120){const a=i*2;idx.push(a,a+2,a+1,a+1,a+2,a+3);}}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.computeVertexNormals();const mesh=new T.Mesh(geo,material);mesh.receiveShadow=true;parent.add(mesh);
  }
  createLand(){
    const T=this.T,g=new T.Group(),geo=new T.PlaneGeometry(1500,1600,65,85);geo.rotateX(-Math.PI/2);geo.translate(360,0,800);
    const p=geo.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,this.height(p.getX(i),p.getZ(i)));geo.computeVertexNormals();this.stitchTerrainNormals(geo);
    const ground=new T.Mesh(geo,this.mats.ground);ground.receiveShadow=true;g.add(ground);
    this.createRiver(g);
    this.ribbon(g,z=>115+28*Math.sin(z*Math.PI*2/1600),13,new T.MeshStandardMaterial({color:0xb6aa87,roughness:1}),4);
    let seed=913;const rand=()=>((seed=seed*16807%2147483647)/2147483647);
    const foliageGeometry=new T.SphereGeometry(1,9,7),foliageMaterial=new T.MeshStandardMaterial({color:0x5c7543,roughness:1});
    const trees=new T.InstancedMesh(foliageGeometry,foliageMaterial,330);trees.castShadow=true;trees.receiveShadow=true;
    const dummy=new T.Object3D(),color=new T.Color();let count=0;
    for(let i=0;i<150;i++){
      const x=rand()*1200-240,z=30+rand()*1540;if(Math.abs(x-this.riverX(z))<60||Math.abs(x-(115+28*Math.sin(z*Math.PI*2/1600)))<17)continue;
      const size=5+rand()*8,h=this.height(x,z);
      for(let j=0;j<3&&count<330;j++){dummy.position.set(x+(j-1)*size*.5,h+size*(.8+j*.2),z+(j%2)*size*.5);dummy.scale.set(size*.8,size*(.9+j*.12),size*.9);dummy.rotation.set(rand()*.4,rand()*6,rand()*.4);dummy.updateMatrix();trees.setMatrixAt(count,dummy.matrix);color.setHSL(.23+rand()*.06,.16+rand()*.13,.18+rand()*.09);trees.setColorAt(count,color);count++;}
    }
    trees.count=count;g.add(trees);
    // Pequenos povoados de telhas, em escala menor que os alvos da missão.
    for(let i=0;i<20;i++){
      const x=200+(i%4)*24+rand()*8,z=260+Math.floor(i/4)*35+rand()*10;
      const house=Aurora.Architecture.building({variant:i%2});house.position.set(x,this.height(x,z),z);house.rotation.y=(i%3-1)*.12;house.scale.setScalar(.85);g.add(house);
    }
    const bridgeZ=1070,bx=this.riverX(bridgeZ),bridge=Aurora.Architecture.bridge();bridge.position.set(bx,0,bridgeZ);g.add(bridge);
    return g;
  }
  mountainTexture(){
    const tx=Aurora.Aircraft.texture((c,w,h)=>{c.fillStyle='#bcbdb2';c.fillRect(0,0,w,h);let seed=951;const rand=()=>((seed=seed*16807%2147483647)/2147483647);for(let i=0;i<45000;i++){const shade=125+Math.floor(rand()*110);c.fillStyle=`rgba(${shade},${shade},${shade},.24)`;const r=1+rand()*7;c.fillRect(rand()*w,rand()*h,r,r*.6);}for(let i=0;i<600;i++){c.fillStyle='rgba(40,48,35,.035)';c.beginPath();c.ellipse(rand()*w,rand()*h,4+rand()*25,3+rand()*14,rand()*6,0,Math.PI*2);c.fill();}},1024,1024);
    tx.wrapS=tx.wrapT=this.T.MirroredRepeatWrapping;tx.repeat.set(2,2);return tx;
  }
  mountainHeight(x,z){
    const edge=Math.max(0,Math.abs(x-360)-270)/210;
    return Math.pow(edge,1.25)*(95+38*Math.sin(z*Math.PI*4/1600)+22*Math.cos(z*Math.PI*10/1600+x*.018))+Math.sin(x*.03)*Math.sin(z*Math.PI*8/1600)*2;
  }
  flightHeight(){
    if(this.currentLandscape!=='mountains')return 95;
    // The orthographic camera has no yaw. Cover the complete visible width plus
    // wingspan, and bound EVERY scrolling terrain phase rather than one point.
    const left=this.camera.position.x+this.camera.left-80,right=this.camera.position.x+this.camera.right+80;
    const edge=Math.max(0,Math.max(Math.abs(left-360),Math.abs(right-360))-270)/210;
    // Maximum relief + trees, banking wings and interpolation margin.
    return Math.max(95,Math.pow(edge,1.25)*(95+38+22)+2+80);
  }
  createMountainLand(){
    const T=this.T,g=new T.Group(),geo=new T.PlaneGeometry(1500,1600,100,110);geo.rotateX(-Math.PI/2);geo.translate(360,0,800);
    const elevation=(x,z)=>this.mountainHeight(x,z);
    const p=geo.attributes.position,colors=[];
    for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),h=elevation(x,z);p.setY(i,h);const grain=.025*Math.sin(x*.027+Math.sin(z*Math.PI*10/1600));const c=new T.Color(0x65715c).lerp(new T.Color(0x777d73),Math.min(1,h/75));const snowline=100+12*Math.sin(z*Math.PI*6/1600+x*.018);c.lerp(new T.Color(0xd9ded8),T.MathUtils.smoothstep(h,snowline-22,snowline+24));c.offsetHSL(0,0,grain);colors.push(c.r,c.g,c.b);}
    geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.computeVertexNormals();this.stitchTerrainNormals(geo);const terrain=new T.Mesh(geo,new T.MeshStandardMaterial({vertexColors:true,roughness:1,map:this.mountainTexture()}));terrain.receiveShadow=true;g.add(terrain);
    const railX=z=>300+42*Math.sin(z*Math.PI*2/1600);
    this.ribbon(g,railX,20,new T.MeshStandardMaterial({color:0x77776c,roughness:1}),3);
    for(const dx of [-5,5])this.ribbon(g,z=>railX(z)+dx,.8,new T.MeshStandardMaterial({color:0x454b4b,metalness:.65,roughness:.4}),4.2);
    const ties=new T.InstancedMesh(this.shared.box,this.mats.dark,200),dummy=new T.Object3D();
    for(let i=0;i<200;i++){const z=i*8;dummy.position.set(railX(z),3.8,z);dummy.rotation.set(0,0,0);dummy.scale.set(15,1,1.5);dummy.updateMatrix();ties.setMatrixAt(i,dummy.matrix);}g.add(ties);
    const pineGeo=new T.ConeGeometry(1,1,9),pineMat=new T.MeshStandardMaterial({color:0x304638,roughness:1});const trees=new T.InstancedMesh(pineGeo,pineMat,420);trees.castShadow=true;trees.receiveShadow=true;
    let seed=735,count=0;const rand=()=>((seed=seed*16807%2147483647)/2147483647);
    for(let i=0;i<210;i++){const x=-150+rand()*1020,z=30+rand()*1540;if(Math.abs(x-railX(z))<23)continue;const h=elevation(x,z),size=5+rand()*7;for(let k=0;k<2;k++){dummy.position.set(x,h+size*(1+k*.55),z);dummy.scale.set(size*(1-k*.3),size*2,size*(1-k*.3));dummy.updateMatrix();trees.setMatrixAt(count++,dummy.matrix);}}
    trees.count=count;g.add(trees);
    // A stone hamlet and freight wagons: no modern roads or buildings.
    const snow=new T.MeshStandardMaterial({color:0xcbd2ca,roughness:1});
    for(let i=0;i<12;i++){const x=440+(i%3)*27,z=420+Math.floor(i/3)*38,house=Aurora.Architecture.building({snow:true,variant:i%2});house.position.set(x,elevation(x,z),z);house.rotation.y=(i%2)*.12;g.add(house);}
    for(let i=0;i<7;i++){const z=920+i*30,x=railX(z);this.primitive(g,this.mats.dark,x,8,z,12,12,24);this.primitive(g,this.mats.roof,x,15,z,12,2,24);}
    return g;
  }
  setLandscape(key){
    if(key===this.currentLandscape)return;
    if(!this.landscapes[key]){const template=this.createMountainLand();this.landscapes[key]=[template,template.clone(true),template.clone(true)];for(const land of this.landscapes[key])this.scene.add(land);}
    for(const landscape of Object.values(this.landscapes))for(const land of landscape)land.visible=false;
    this.land=this.landscapes[key];for(const land of this.land)land.visible=true;this.currentLandscape=key;
    this.scene.background.set(key==='mountains'?'#a7b7be':'#9eaaa0');this.scene.fog.color.set(key==='mountains'?'#b4c0c5':'#aab4a5');this.sun.color.set(key==='mountains'?0xe3edff:0xffe2af);this.sun.intensity=key==='mountains'?2.5:3.1;
  }
  world(x,y,h=95){this.pointer.set(x/360-1,1-y/380);this.ray.setFromCamera(this.pointer,this.camera);this.plane.constant=-h;return this.ray.ray.intersectPlane(this.plane,new this.T.Vector3());}
  makeTarget(){
    const T=this.T,g=Aurora.Architecture.building({warehouse:true});
    for(const side of [-1,1]){this.primitive(g,this.mats.yellow,side*39,1,0,1,1,67);this.primitive(g,this.mats.yellow,0,1,side*33,78,1,1);}
    const health=this.primitive(g,this.mats.yellow,0,42,0,46,2,2);g.userData.health=health;return g;
  }
  sync(items,kind){
    for(const item of items){
      let obj=this.items.get(item);
      if(!obj){
        if(kind==='enemy'){obj=(this.enemyTemplates[item.model]||this.enemyTemplates.fw190a8).clone(true);obj.rotation.y=Math.PI;}
        else if(kind==='target')obj=this.makeTarget();
        else if(kind==='obstacle'){obj=new this.T.Group();this.primitive(obj,this.mats.balloon,0,0,0,19,15,29,'ball');this.primitive(obj,this.mats.dark,0,-45,0,.3,90,.3);}
        else if(kind==='pickup'){obj=new this.T.Group();this.primitive(obj,this.mats.pickup,0,0,0,18,15,18);this.primitive(obj,this.mats.wall,0,8,0,13,1,4);this.primitive(obj,this.mats.wall,0,8,0,4,1,13);}
        else if(kind==='bullet'&&item.owner==='enemy'){
          // Two MG 131 tracers; one logical shot preserves the arcade damage/collision rules.
          obj=new this.T.Group();
          for(const side of (item.weapon==='mk108'?[-1.5,-.5,.5,1.5]:item.weapon==='bf109'?[-1,0,1]:[-1,1])){const tracer=new this.T.Mesh(this.shared.box,this.mats.enemyBullet);tracer.position.x=side*2.85;tracer.scale.set(2.2,2.2,8);obj.add(tracer);}
        }
        else obj=new this.T.Mesh(this.shared.box,this.mats.bullet);
        this.scene.add(obj);this.items.set(item,obj);
      }
      obj.userData.seen=true;obj.position.copy(this.world(item.x,item.y,kind==='target'?15:this.airAltitude));
      if(kind==='target'){obj.position.y=0;obj.userData.health.scale.x=46*item.hp/6;}
      if(kind==='enemy'){obj.rotation.z=item.jet?0:Math.sin(this.time*2+item.phase)*.13;const prop=obj.getObjectByName('propeller');if(prop)prop.rotation.z=this.time*50;}
      if(kind==='bullet'&&item.owner==='player')obj.scale.set(2.2,2.2,14);
      if(kind==='pickup')obj.rotation.y=this.time*.7;
    }
  }
  makePreview(){
    const canvas=document.getElementById('aircraft-preview');if(!canvas)return null;
    const T=this.T,r=new T.WebGLRenderer({canvas,antialias:true,alpha:true});r.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));r.setSize(580,320,false);r.outputColorSpace=T.SRGBColorSpace;r.toneMapping=T.ACESFilmicToneMapping;r.toneMappingExposure=1.3;
    const scene=new T.Scene(),camera=new T.PerspectiveCamera(28,580/320,1,1000);camera.position.set(-125,52,-140);camera.lookAt(0,0,0);
    scene.add(new T.HemisphereLight(0xdde9ef,0x77735c,2.4));const light=new T.DirectionalLight(0xffe6b8,4);light.position.set(-80,140,-90);scene.add(light);
    const models={player:Aurora.Aircraft.create(),enemy:Aurora.Fw190.create(),bf109:Aurora.AxisAircraft.create('bf109'),me262:Aurora.AxisAircraft.create('me262')};let model=models.player;
    for(const item of Object.values(models)){scene.add(item);item.rotation.y=-.25;}for(const key of ['enemy','bf109','me262'])models[key].visible=false;
    const preview={renderer:r,scene,camera,model};
    const details={player:['Republic P-47D','THUNDERBOLT · CABINE EM BOLHA','B4','Oliva / cinza inferior','Marcas brasileiras'],enemy:['Focke-Wulf Fw 190A-8','BMW 801 · RADIAL · HÉLICE DE TRÊS PÁS','A-8','Cinza / verde / azul-claro','Patrulhas inimigas'],bf109:['Messerschmitt Bf 109G-10','DB 605D · HÉLICE DE TRÊS PÁS · REF. 686 KM/H','G-10','Verde / cinza inferior','Patrulhas da missão 2'],me262:['Messerschmitt Me 262A-1a','2 × JUMO 004 · 4 CANHÕES MK 108 · REF. 869 KM/H','A-1a','Verde / cinza inferior','Passagens rápidas · missão 2']};
    const select=key=>{model.visible=false;model=models[key];model.visible=true;preview.model=model;
      ['aircraft-name','aircraft-description','aircraft-code','aircraft-paint','aircraft-identity'].forEach((id,i)=>document.getElementById(id).textContent=details[key][i]);
      for(const id of Object.keys(models))document.getElementById('inspect-'+id)?.setAttribute('aria-pressed',String(id===key));
      canvas.setAttribute('aria-label',`Modelo ${details[key][0]}. Arraste para girar.`);
    };
    for(const key of Object.keys(models))document.getElementById('inspect-'+key)?.addEventListener('click',()=>select(key));
    let dragging=false,last=0;canvas.addEventListener('pointerdown',e=>{dragging=true;last=e.clientX;canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointermove',e=>{if(dragging){model.rotation.y+=(e.clientX-last)*.012;last=e.clientX;}});const release=()=>dragging=false;canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
    document.getElementById('rotate-aircraft')?.addEventListener('click',()=>{model.rotation.y+=Math.PI/4;});
    const card=canvas.closest('.aircraft'),expand=document.getElementById('expand-aircraft');
    expand?.addEventListener('click',()=>{const open=card.classList.toggle('expanded');expand.textContent=open?'Fechar ampliação':'Ampliar';expand.setAttribute('aria-expanded',String(open));if(open)document.dispatchEvent(new Event('inspectionopen'));});
    const previewResize=()=>{const w=canvas.clientWidth,h=canvas.clientHeight;if(w&&h){r.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}};
    preview.resizeObserver=new ResizeObserver(previewResize);preview.resizeObserver.observe(canvas);previewResize();
    return preview;
  }
  draw(game){
    this.setLandscape(game.mission.landscape);
    this.time=game.elapsed;
    const now=performance.now(),delta=Math.min(.05,(now-this.lastWaterFrame)/1000);this.lastWaterFrame=now;
    if(game.state!=='paused')this.waterClock+=delta;
    if(this.waterTime)this.waterTime.value=this.waterClock;
    this.airAltitude=this.flightHeight();
    const offset=(game.scroll/(1252/Math.hypot(1252,1000)))%1600;
    for(let i=0;i<3;i++)this.land[i].position.z=offset-3200+i*1600;
    for(const obj of this.items.values())obj.userData.seen=false;
    this.jetWarning.visible=Boolean(game.pendingJet);if(game.pendingJet){this.jetWarning.position.copy(this.world(game.pendingJet.x,380,this.airAltitude+1));this.jetWarning.material.opacity=.16+.12*Math.sin(game.elapsed*12)**2;}
    this.sync(game.targets,'target');this.sync(game.enemies,'enemy');this.sync(game.obstacles,'obstacle');this.sync(game.pickups,'pickup');this.sync(game.bullets,'bullet');
    for(const [key,obj] of this.items)if(!obj.userData.seen){this.scene.remove(obj);this.items.delete(key);}
    const ready=game.state==='ready';
    this.bank+=(game.bank-this.bank)*.16;
    this.player.position.copy(this.world(ready?400:game.player.x,ready?255:game.player.y,ready?220:this.airAltitude));
    this.player.scale.setScalar(ready?3.6:1.05);this.player.rotation.set(0,ready?-.55:0,ready?-.22:-this.bank*.34);
    this.player.visible=ready||game.player.invincible<=0||Math.floor(game.player.invincible*12)%2===0;
    this.player.userData.prop.rotation.z=this.time*(game.boosting?70:48);
    for(let i=0;i<this.particleMeshes.length;i++){const mesh=this.particleMeshes[i],p=game.particles[i];mesh.visible=!!p;if(p){mesh.position.copy(this.world(p.x,p.y,this.airAltitude+(1-p.life/p.maxLife)*25));mesh.scale.setScalar(Math.max(.1,p.size*p.life/p.maxLife));mesh.material.opacity=p.life/p.maxLife;mesh.material.color.set(p.color);}}
    this.renderer.render(this.scene,this.camera);
    if(this.preview){const prop=this.preview.model.getObjectByName('propeller');if(prop)prop.rotation.z=this.time*35;this.preview.renderer.render(this.preview.scene,this.preview.camera);}
  }
};
