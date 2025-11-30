import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Truck, Package, MapPin, Fuel, DollarSign, Gauge } from 'lucide-react';

const EuroTruckSimulator = () => {
  const containerRef = useRef(null);
  const [gameState, setGameState] = useState({
    money: 5000,
    fuel: 100,
    speed: 0,
    gear: 1,
    damage: 0,
    currentJob: null,
    distance: 0,
    jobDistance: 0
  });
  const [showJobBoard, setShowJobBoard] = useState(true);
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Generate random jobs
    const cities = ['Берлин', 'Париж', 'Амстердам', 'Прага', 'Варшава', 'Вена'];
    const cargos = ['Электроника', 'Продукты', 'Мебель', 'Автозапчасти', 'Стройматериалы'];
    const generatedJobs = Array(6).fill(0).map((_, i) => ({
      id: i,
      from: cities[Math.floor(Math.random() * cities.length)],
      to: cities[Math.floor(Math.random() * cities.length)],
      cargo: cargos[Math.floor(Math.random() * cargos.length)],
      distance: Math.floor(Math.random() * 400 + 100),
      reward: Math.floor(Math.random() * 3000 + 1000),
      weight: Math.floor(Math.random() * 15 + 10) + 'т'
    }));
    setJobs(generatedJobs);

    // Scene setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x87ceeb, 100, 500);

    // Camera - First person view
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 2.5, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
    sunLight.position.set(50, 100, 50);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.far = 500;
    sunLight.shadow.camera.left = -100;
    sunLight.shadow.camera.right = 100;
    sunLight.shadow.camera.top = 100;
    sunLight.shadow.camera.bottom = -100;
    scene.add(sunLight);

    // Sky
    const skyGeo = new THREE.SphereGeometry(400, 32, 32);
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0x87ceeb,
      side: THREE.BackSide
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    scene.add(sky);

    // Ground
    const groundGeo = new THREE.PlaneGeometry(2000, 2000, 50, 50);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x2d5016,
      roughness: 0.9
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Road texture
    const roadGeo = new THREE.PlaneGeometry(12, 2000);
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 0.8
    });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.y = 0.01;
    road.receiveShadow = true;
    scene.add(road);

    // Road markings
    const markingGeo = new THREE.PlaneGeometry(0.3, 8);
    const markingMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let i = -50; i < 50; i++) {
      const marking = new THREE.Mesh(markingGeo, markingMat);
      marking.rotation.x = -Math.PI / 2;
      marking.position.set(0, 0.02, i * 20);
      scene.add(marking);
    }

    // Side lines
    const sideLineGeo = new THREE.PlaneGeometry(0.2, 2000);
    const leftLine = new THREE.Mesh(sideLineGeo, markingMat);
    leftLine.rotation.x = -Math.PI / 2;
    leftLine.position.set(-6, 0.02, 0);
    scene.add(leftLine);
    
    const rightLine = new THREE.Mesh(sideLineGeo, markingMat);
    rightLine.rotation.x = -Math.PI / 2;
    rightLine.position.set(6, 0.02, 0);
    scene.add(rightLine);

    // Trees alongside road
    const createTree = (x, z) => {
      const trunkGeo = new THREE.CylinderGeometry(0.3, 0.4, 4, 8);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a2511 });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.set(x, 2, z);
      trunk.castShadow = true;
      scene.add(trunk);

      const foliageGeo = new THREE.SphereGeometry(2, 8, 8);
      const foliageMat = new THREE.MeshStandardMaterial({ color: 0x0d4d0d });
      const foliage = new THREE.Mesh(foliageGeo, foliageMat);
      foliage.position.set(x, 5, z);
      foliage.castShadow = true;
      scene.add(foliage);
    };

    for (let i = -50; i < 50; i++) {
      if (Math.random() > 0.3) {
        createTree(-15 - Math.random() * 10, i * 20);
        createTree(15 + Math.random() * 10, i * 20);
      }
    }

    // Traffic cars
    const trafficCars = [];
    const createTrafficCar = (lane, zOffset) => {
      const carGroup = new THREE.Group();
      
      const bodyGeo = new THREE.BoxGeometry(2, 1.2, 4);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: Math.random() * 0xffffff,
        metalness: 0.6,
        roughness: 0.4
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 1;
      body.castShadow = true;
      carGroup.add(body);

      const roofGeo = new THREE.BoxGeometry(1.8, 0.8, 2);
      const roof = new THREE.Mesh(roofGeo, bodyMat);
      roof.position.set(0, 1.8, -0.3);
      roof.castShadow = true;
      carGroup.add(roof);

      const windowMat = new THREE.MeshStandardMaterial({
        color: 0x333333,
        transparent: true,
        opacity: 0.5
      });
      const windshieldGeo = new THREE.BoxGeometry(1.7, 0.7, 0.1);
      const windshield = new THREE.Mesh(windshieldGeo, windowMat);
      windshield.position.set(0, 1.8, 1);
      carGroup.add(windshield);

      const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16);
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a });
      const positions = [[-0.8, 0.4, 1.3], [0.8, 0.4, 1.3], [-0.8, 0.4, -1.3], [0.8, 0.4, -1.3]];
      positions.forEach(pos => {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(...pos);
        wheel.castShadow = true;
        carGroup.add(wheel);
      });

      carGroup.position.set(lane, 0, zOffset);
      scene.add(carGroup);
      return { group: carGroup, speed: 15 + Math.random() * 10 };
    };

    for (let i = 0; i < 8; i++) {
      const lane = Math.random() > 0.5 ? -3 : 3;
      trafficCars.push(createTrafficCar(lane, -100 - i * 60));
    }

    // Truck cabin interior
    const cabinGroup = new THREE.Group();

    // Dashboard
    const dashGeo = new THREE.BoxGeometry(3, 0.5, 1);
    const dashMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.7
    });
    const dashboard = new THREE.Mesh(dashGeo, dashMat);
    dashboard.position.set(0, 1.5, 1.5);
    cabinGroup.add(dashboard);

    // Steering wheel
    const steeringRingGeo = new THREE.TorusGeometry(0.4, 0.05, 16, 32);
    const steeringMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a0a,
      roughness: 0.3
    });
    const steeringWheel = new THREE.Mesh(steeringRingGeo, steeringMat);
    steeringWheel.position.set(0, 1.8, 1.2);
    steeringWheel.rotation.x = Math.PI / 6;
    cabinGroup.add(steeringWheel);

    const steeringCenterGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.05, 16);
    const steeringCenter = new THREE.Mesh(steeringCenterGeo, steeringMat);
    steeringCenter.position.set(0, 1.8, 1.25);
    steeringCenter.rotation.x = Math.PI / 2;
    cabinGroup.add(steeringCenter);

    // Instrument cluster
    const gaugeGeo = new THREE.CircleGeometry(0.15, 32);
    const gaugeMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const speedGauge = new THREE.Mesh(gaugeGeo, gaugeMat);
    speedGauge.position.set(-0.4, 1.7, 1.49);
    cabinGroup.add(speedGauge);

    const rpmGauge = new THREE.Mesh(gaugeGeo, gaugeMat);
    rpmGauge.position.set(0.4, 1.7, 1.49);
    cabinGroup.add(rpmGauge);

    // Windshield
    const windshieldGeo = new THREE.PlaneGeometry(2.5, 1.5);
    const windshieldMat = new THREE.MeshPhysicalMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.3,
      transmission: 0.9,
      roughness: 0.1
    });
    const windshield = new THREE.Mesh(windshieldGeo, windshieldMat);
    windshield.position.set(0, 2.5, 2.5);
    cabinGroup.add(windshield);

    // Side windows
    const sideWindowGeo = new THREE.PlaneGeometry(1, 1.2);
    const leftWindow = new THREE.Mesh(sideWindowGeo, windshieldMat);
    leftWindow.position.set(-1.5, 2.2, 1);
    leftWindow.rotation.y = Math.PI / 2;
    cabinGroup.add(leftWindow);

    const rightWindow = new THREE.Mesh(sideWindowGeo, windshieldMat);
    rightWindow.position.set(1.5, 2.2, 1);
    rightWindow.rotation.y = -Math.PI / 2;
    cabinGroup.add(rightWindow);

    // Mirrors
    const mirrorGeo = new THREE.BoxGeometry(0.3, 0.2, 0.05);
    const mirrorMat = new THREE.MeshStandardMaterial({
      color: 0x666666,
      metalness: 0.9,
      roughness: 0.1
    });
    const leftMirror = new THREE.Mesh(mirrorGeo, mirrorMat);
    leftMirror.position.set(-1.8, 2.5, 1.8);
    leftMirror.rotation.y = -Math.PI / 6;
    cabinGroup.add(leftMirror);

    const rightMirror = new THREE.Mesh(mirrorGeo, mirrorMat);
    rightMirror.position.set(1.8, 2.5, 1.8);
    rightMirror.rotation.y = Math.PI / 6;
    cabinGroup.add(rightMirror);

    // Roof
    const roofGeo = new THREE.PlaneGeometry(2.5, 2);
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      side: THREE.BackSide
    });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 3.2, 1.5);
    roof.rotation.x = Math.PI / 2;
    cabinGroup.add(roof);

    // Cabin walls
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x3a3a3a,
      side: THREE.BackSide
    });
    const leftWallGeo = new THREE.PlaneGeometry(2, 2);
    const leftWall = new THREE.Mesh(leftWallGeo, wallMat);
    leftWall.position.set(-1.5, 2.2, 1);
    leftWall.rotation.y = -Math.PI / 2;
    cabinGroup.add(leftWall);

    const rightWall = new THREE.Mesh(leftWallGeo, wallMat);
    rightWall.position.set(1.5, 2.2, 1);
    rightWall.rotation.y = Math.PI / 2;
    cabinGroup.add(rightWall);

    camera.add(cabinGroup);
    scene.add(camera);

    // Game variables
    let speed = 0;
    let roadOffset = 0;
    let fuel = 100;
    let currentGear = 1;
    let engineRPM = 800;
    let distance = 0;

    const keys = {
      w: false,
      s: false,
      a: false,
      d: false,
      shift: false,
      space: false
    };

    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      if (key in keys) keys[key] = true;
      if (e.key === 'Shift') keys.shift = true;
      if (e.key === ' ') keys.space = true;
      
      // Gear shifting
      if (key === 'e' && currentGear < 6) currentGear++;
      if (key === 'q' && currentGear > 1) currentGear--;
    };

    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase();
      if (key in keys) keys[key] = false;
      if (e.key === 'Shift') keys.shift = false;
      if (e.key === ' ') keys.space = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Animation loop
    const clock = new THREE.Clock();
    
    const animate = () => {
      requestAnimationFrame(animate);
      const delta = clock.getDelta();

      // Acceleration and braking
      if (keys.w && speed < 30) {
        speed += 0.3 * delta * 60;
        fuel -= 0.01 * delta;
      }
      if (keys.s && speed > 0) {
        speed -= 0.5 * delta * 60;
      }
      if (keys.space && speed > 0) {
        speed -= 0.8 * delta * 60;
      }
      if (!keys.w && !keys.s && !keys.space) {
        speed *= 0.98;
      }

      speed = Math.max(0, Math.min(speed, 30));
      fuel = Math.max(0, fuel);

      // Steering
      let steering = 0;
      if (keys.a) steering = 0.02;
      if (keys.d) steering = -0.02;
      
      camera.rotation.y += steering * (speed / 30);
      steeringWheel.rotation.z = -steering * 5;

      // Move world
      roadOffset += speed * delta * 3;
      distance += speed * delta * 0.1;

      // Update road position
      road.position.z = (roadOffset % 20);
      
      // Update markings
      scene.children.forEach(child => {
        if (child.geometry && child.geometry.type === 'PlaneGeometry' && 
            child.material.color.getHex() === 0xffffff) {
          child.position.z = ((child.position.z + roadOffset * 0.1) % 1000) - 500;
        }
      });

      // Update traffic
      trafficCars.forEach(car => {
        car.group.position.z += (speed + car.speed) * delta;
        if (car.group.position.z > 100) {
          car.group.position.z = -200;
          car.group.position.x = Math.random() > 0.5 ? -3 : 3;
        }
      });

      // Update trees
      scene.children.forEach(child => {
        if (child.type === 'Group' || (child.geometry && 
            (child.geometry.type === 'CylinderGeometry' || 
             child.geometry.type === 'SphereGeometry'))) {
          if (child.position.x < -10 || child.position.x > 10) {
            child.position.z += speed * delta * 3;
            if (child.position.z > 100) {
              child.position.z = -100;
            }
          }
        }
      });

      // Engine RPM simulation
      engineRPM = 800 + (speed / 30) * 2000 * (7 - currentGear) / 6;

      // Update game state
      setGameState(prev => ({
        ...prev,
        speed: Math.round(speed * 10) / 10,
        fuel: Math.round(fuel * 10) / 10,
        gear: currentGear,
        distance: Math.round(distance)
      }));

      renderer.render(scene, camera);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  const selectJob = (job) => {
    setGameState(prev => ({
      ...prev,
      currentJob: job,
      jobDistance: job.distance,
      distance: 0
    }));
    setShowJobBoard(false);
  };

  return (
    <div className="w-full h-screen relative bg-black">
      <div ref={containerRef} className="w-full h-full" />
      
      {/* HUD */}
      <div className="absolute top-4 left-4 space-y-2">
        {/* Speedometer */}
        <div className="bg-black bg-opacity-70 text-white p-3 rounded-lg border-2 border-green-500">
          <div className="flex items-center gap-2">
            <Gauge className="w-6 h-6 text-green-400" />
            <div>
              <div className="text-3xl font-bold">{gameState.speed}</div>
              <div className="text-xs text-gray-400">км/ч</div>
            </div>
          </div>
        </div>

        {/* Gear */}
        <div className="bg-black bg-opacity-70 text-white p-3 rounded-lg border-2 border-blue-500">
          <div className="text-center">
            <div className="text-xs text-gray-400">Передача</div>
            <div className="text-2xl font-bold text-blue-400">{gameState.gear}</div>
          </div>
        </div>

        {/* Fuel */}
        <div className="bg-black bg-opacity-70 text-white p-3 rounded-lg border-2 border-yellow-500">
          <div className="flex items-center gap-2">
            <Fuel className="w-5 h-5 text-yellow-400" />
            <div>
              <div className="text-xl font-bold">{gameState.fuel}%</div>
              <div className="text-xs text-gray-400">Топливо</div>
            </div>
          </div>
        </div>
      </div>

      {/* Top right info */}
      <div className="absolute top-4 right-4 space-y-2">
        <div className="bg-black bg-opacity-70 text-white p-3 rounded-lg border-2 border-green-500">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-400" />
            <div className="text-xl font-bold">{gameState.money}€</div>
          </div>
        </div>

        {gameState.currentJob && (
          <div className="bg-black bg-opacity-70 text-white p-3 rounded-lg border-2 border-purple-500 w-64">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-5 h-5 text-purple-400" />
              <div className="font-bold">Текущий заказ</div>
            </div>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-400">Груз:</span>
                <span>{gameState.currentJob.cargo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Откуда:</span>
                <span>{gameState.currentJob.from}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Куда:</span>
                <span>{gameState.currentJob.to}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Пройдено:</span>
                <span className="text-green-400">{gameState.distance}/{gameState.jobDistance} км</span>
              </div>
              <div className="mt-2 bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{width: `${(gameState.distance / gameState.jobDistance) * 100}%`}}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white p-3 rounded-lg">
        <div className="text-xs space-y-1">
          <div><span className="text-green-400">W</span> - Газ</div>
          <div><span className="text-red-400">S</span> - Тормоз</div>
          <div><span className="text-blue-400">A/D</span> - Руль</div>
          <div><span className="text-yellow-400">Q/E</span> - Передачи</div>
          <div><span className="text-purple-400">SPACE</span> - Ручной тормоз</div>
        </div>
      </div>

      {/* Job Board */}
      {showJobBoard && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80">
          <div className="bg-gray-900 p-6 rounded-xl border-2 border-green-500 max-w-4xl w-full mx-4">
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
              <Truck className="w-8 h-8 text-green-400" />
              Доска заказов
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
              {jobs.map(job => (
                <div 
                  key={job.id}
                  onClick={() => selectJob(job)}
                  className="bg-gray-800 p-4 rounded-lg border border-gray-700 hover:border-green-500 cursor-pointer transition-all hover:scale-105"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <Package className="w-5 h-5 text-purple-400" />
                      <span className="font-bold text-white">{job.cargo}</span>
                    </div>
                    <div className="text-green-400 font-bold text-xl">{job.reward}€</div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-300">
                      <MapPin className="w-4 h-4 text-blue-400" />
                      <span>{job.from} → {job.to}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Расстояние: {job.distance} км</span>
                      <span>Вес: {job.weight}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EuroTruckSimulator;