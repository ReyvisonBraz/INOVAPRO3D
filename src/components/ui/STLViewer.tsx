import React, { Suspense, useRef, useEffect, useState } from "react";
import { Canvas, useLoader } from "@react-three/fiber";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { 
  OrbitControls, 
  PerspectiveCamera, 
  ContactShadows,
  Environment,
  Float,
  Html,
  Grid,
  Center
} from "@react-three/drei";
import * as THREE from "three";
import { Maximize2 } from "lucide-react";
import { modelCache } from "../../lib/modelCache";

interface STLViewerProps {
  url: string;
  color?: string;
  scale?: number;
  showControls?: boolean;
}

function Loader() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-[10px] text-primary font-black uppercase tracking-widest whitespace-nowrap">
          Carregando Modelo 3D...
        </span>
      </div>
    </Html>
  );
}

function Model({ url, color = "#2563EB", scale = 1 }: STLViewerProps) {
  const geom = useLoader(STLLoader, url);
  const meshRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    if (geom) {
      geom.center();
    }
  }, [geom]);

  return (
    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.5}>
      <Center>
        <mesh ref={meshRef} geometry={geom} castShadow receiveShadow scale={[scale, scale, scale]}>
          <meshStandardMaterial 
            color={color} 
            roughness={0.2} 
            metalness={0.8}
            emissive={color}
            emissiveIntensity={0.05}
          />
        </mesh>
      </Center>
    </Float>
  );
}

export function STLViewer({ url, color, scale }: STLViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [cachedUrl, setCachedUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadModel() {
      try {
        const result = await modelCache.getModel(url);
        if (isMounted) {
          setCachedUrl(result);
        }
      } catch (err) {
        console.error("Error loading model for viewer:", err);
        if (isMounted) setCachedUrl(url);
      }
    }

    if (url) {
      loadModel();
    }

    return () => {
      isMounted = false;
    };
  }, [url]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div 
      ref={containerRef}
      className="w-full h-full bg-[#050505] rounded-[32px] overflow-hidden border border-white/5 relative group"
    >
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[50, 50, 50]} fov={40} />
        <OrbitControls 
          enablePan={true} 
          enableDamping={true}
          dampingFactor={0.05}
          minDistance={10} 
          maxDistance={300} 
          autoRotate={autoRotate} 
          autoRotateSpeed={0.5}
          makeDefault
        />
        
        <ambientLight intensity={0.5} />
        <spotLight position={[50, 50, 50]} angle={0.15} penumbra={1} intensity={2} castShadow />
        <pointLight position={[-50, -50, -50]} intensity={1} color={color || "#2563EB"} />

        <Suspense fallback={<Loader />}>
          {cachedUrl ? (
            <Model url={cachedUrl} color={color} scale={scale} />
          ) : (
            <Loader />
          )}
          
          <ContactShadows 
            position={[0, -10, 0]} 
            opacity={0.4} 
            scale={100} 
            blur={2} 
            far={20} 
          />
          
          {showGrid && (
            <Grid 
              infiniteGrid 
              fadeDistance={100} 
              fadeStrength={2} 
              cellSize={5} 
              sectionSize={25} 
              sectionColor={color || "#2563EB"} 
              cellColor="#333" 
              position={[0, -10.1, 0]}
            />
          )}
        </Suspense>

        <Environment preset="city" />
      </Canvas>
      
      {/* UI Overlay */}
      <div className="absolute top-6 left-6 flex flex-col gap-1 pointer-events-none">
        <p className="text-[10px] font-black text-white/30 uppercase tracking-widest leading-none">Previsão 3D</p>
        <p className="text-xs font-mono text-primary font-bold">INTERAÇÃO ATIVA</p>
      </div>

      <div className="absolute top-6 right-6 flex items-center gap-2">
        <button 
          onClick={toggleFullscreen}
          className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:bg-white/10 hover:text-white transition-all backdrop-blur-sm pointer-events-auto"
          title="Tela Cheia"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
      
      <div className="absolute bottom-6 left-6 right-6 flex flex-wrap items-center justify-between gap-4 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
           <button 
             onClick={() => setAutoRotate(!autoRotate)}
             className={`px-3 py-1.5 rounded-lg border text-[8px] font-black uppercase tracking-widest transition-all ${
               autoRotate ? 'bg-primary/20 border-primary/40 text-primary' : 'bg-white/5 border-white/10 text-white/40'
             }`}
           >
             Giro: {autoRotate ? 'ON' : 'OFF'}
           </button>
           <button 
             onClick={() => setShowGrid(!showGrid)}
             className={`px-3 py-1.5 rounded-lg border text-[8px] font-black uppercase tracking-widest transition-all ${
               showGrid ? 'bg-primary/20 border-primary/40 text-primary' : 'bg-white/5 border-white/10 text-white/40'
             }`}
           >
               Grade: {showGrid ? 'ON' : 'OFF'}
           </button>
        </div>

        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
           <div className="px-3 py-1.5 bg-black/40 backdrop-blur-sm border border-white/10 rounded-lg text-[8px] font-mono text-white/30 uppercase tracking-widest">
               LMB: Rotacionar • RMB: Arrastar • Scroll: Zoom
           </div>
        </div>
      </div>
    </div>
  );
}
