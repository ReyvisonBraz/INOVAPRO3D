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
import { Maximize2, AlertTriangle, Box } from "lucide-react";
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

function ModelError() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-3 text-center px-4">
        <AlertTriangle className="w-6 h-6 text-red-400" />
        <span className="text-[10px] text-red-400/80 font-black uppercase tracking-widest whitespace-nowrap">
          Erro ao carregar modelo
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
      try {
        geom.center();
      } catch (e) {
        // geometry may be invalid
      }
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
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadModel() {
      if (!url) return;

      setIsLoading(true);
      setHasError(false);

      try {
        const result = await modelCache.getModel(url);
        if (isMounted) {
          setCachedUrl(result);
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Error loading model for viewer:", err);
        if (isMounted) {
          setHasError(true);
          setIsLoading(false);
        }
      }
    }

    loadModel();

    return () => {
      isMounted = false;
    };
  }, [url]);

  const handleCanvasError = (err: Error) => {
    console.error("[STLViewer] Canvas error:", err);
    setHasError(true);
    setIsLoading(false);
  };

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

  if (hasError) {
    return (
      <div className="w-full h-full bg-[#050505] rounded-[32px] overflow-hidden border border-white/5 flex items-center justify-center">
        <div className="text-center px-6">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-red-400/80 mb-1">
            Modelo 3D Indisponível
          </p>
          <p className="text-[9px] text-white/20 font-medium">
            O arquivo STL não pôde ser carregado
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="w-full h-full bg-[#050505] rounded-[32px] overflow-hidden border border-white/5 relative group"
    >
      <Canvas 
        shadows 
        dpr={[1, 2]}
        onCreated={() => {
          setIsLoading(false);
        }}
      >
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

        <ErrorCatcher onError={handleCanvasError}>
          <Suspense fallback={<Loader />}>
            {cachedUrl ? (
              <Model url={cachedUrl} color={color} scale={scale} />
            ) : isLoading ? (
              <Loader />
            ) : null}
            
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
        </ErrorCatcher>

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

function ErrorCatcher({ children, onError }: { children: React.ReactNode; onError: (err: Error) => void }) {
  useEffect(() => {
    const handler = (event: ErrorEvent) => {
      if (event.error instanceof Error) {
        onError(event.error);
      }
    };
    window.addEventListener('error', handler);
    return () => window.removeEventListener('error', handler);
  }, [onError]);

  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    if (event.reason instanceof Error) {
      onError(event.reason);
    }
  };

  useEffect(() => {
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  }, [onError]);

  return <>{children}</>;
}
