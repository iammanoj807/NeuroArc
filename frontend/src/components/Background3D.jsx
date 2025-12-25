import { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { Points, PointMaterial, Sphere } from '@react-three/drei';
import * as THREE from 'three';




function Moon({ earthRadius }) {
    const moonRef = useRef();
    const distance = 8;
    const [colorMap, bumpMap] = useLoader(THREE.TextureLoader, [
        '/textures/moon_map.jpg',
        '/textures/moon_bump.jpg'
    ]);

    useFrame(({ clock }) => {
        const t = clock.getElapsedTime() * 0.05; // Orbital speed

        // Orbit
        moonRef.current.position.x = Math.cos(t) * distance;
        moonRef.current.position.z = Math.sin(t) * distance;

        // Tidal locking (rotation matches orbit)
        moonRef.current.rotation.y = -t;
    });

    return (
        <mesh ref={moonRef} position={[distance, 0, 0]}>
            <sphereGeometry args={[0.8, 32, 32]} />
            <meshStandardMaterial
                map={colorMap}
                bumpMap={bumpMap}
                bumpScale={0.02}
                metalness={0.1}
                roughness={0.8}
                emissive="#666666"
                emissiveIntensity={0.4}
            />
        </mesh>
    );
}

function Earth() {
    const earthRef = useRef();
    const cloudsRef = useRef();
    const groupRef = useRef();

    const [colorMap, normalMap, specularMap, cloudsMap] = useLoader(THREE.TextureLoader, [
        '/textures/earth_daymap.jpg',
        '/textures/earth_normal.jpg',
        '/textures/earth_specular.jpg',
        '/textures/earth_clouds.png'
    ]);

    useFrame(({ clock }) => {
        const t = clock.getElapsedTime();
        // Earth rotation
        earthRef.current.rotation.y = t * 0.05;
        // Clouds rotation (slightly faster)
        cloudsRef.current.rotation.y = t * 0.055;
    });

    return (
        <group ref={groupRef} position={[0, 4, -30]} rotation={[0, 0, 23.5 * Math.PI / 180]}>
            {/* Main Earth Sphere */}
            <mesh ref={earthRef}>
                <sphereGeometry args={[3, 64, 64]} />
                <meshStandardMaterial
                    map={colorMap}
                    normalMap={normalMap}
                    roughnessMap={specularMap}
                    metalness={0.1}
                    roughness={0.7}
                    emissive={new THREE.Color('#2060c0')}
                    emissiveIntensity={0.3}
                />
            </mesh>

            {/* Clouds Layer */}
            <mesh ref={cloudsRef}>
                <sphereGeometry args={[3.05, 64, 64]} />
                <meshPhongMaterial
                    map={cloudsMap}
                    transparent
                    opacity={0.8}
                    blending={THREE.AdditiveBlending}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                />
            </mesh>

            <ISS />
            <Moon earthRadius={3} />
        </group>
    );
}

function SpaceDebris() {
    const count = 80;
    const meshRef = useRef();
    const [texture] = useLoader(THREE.TextureLoader, ['/textures/moon_map.jpg']);

    const particles = useMemo(() => {
        const temp = [];
        for (let i = 0; i < count; i++) {
            const time = Math.random() * 100;
            const factor = 15 + Math.random() * 30; // Radius spread
            const speed = 0.01 + Math.random() / 200;
            // Restrict Y to above (5 to 15) or below (-15 to -5)
            const isUpper = Math.random() > 0.5;
            const y = isUpper ? (5 + Math.random() * 10) : (-15 + Math.random() * 10);

            // Random x, z based on factor
            const x = Math.cos(time) * factor;
            const z = Math.sin(time) * factor;

            const scale = 0.15 + Math.random() * 0.3; // Small size
            const rotationSpeed = Math.random() * 0.02;

            temp.push({ time, factor, speed, x, y, z, scale, rotationSpeed });
        }
        return temp;
    }, []);

    const dummy = useMemo(() => new THREE.Object3D(), []);

    useFrame((state) => {
        particles.forEach((particle, i) => {
            // Update rotation (orbit around Y)
            const t = particle.time + state.clock.getElapsedTime() * particle.speed;
            const x = Math.cos(t) * particle.factor;
            const z = Math.sin(t) * particle.factor;

            // Apply slight vertical "falling" / drift for dynamic feel
            // We'll just make them rotate for now as 'falling' usually implies moving down which clears screen.
            // Orbiting covers "flying/moving".

            dummy.position.set(x, particle.y, z);

            // Random tumbling
            dummy.rotation.x += particle.rotationSpeed;
            dummy.rotation.y += particle.rotationSpeed;
            dummy.scale.set(particle.scale, particle.scale, particle.scale);

            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={meshRef} args={[null, null, count]}>
            <dodecahedronGeometry args={[0.2, 0]} />
            <meshStandardMaterial map={texture} color="#666666" roughness={0.8} />
        </instancedMesh>
    );
}

function GalaxyBackground() {
    const [texture] = useLoader(THREE.TextureLoader, ['/textures/galaxy_bg.jpg']);
    return (
        <mesh position={[0, 0, -100]}>
            <planeGeometry args={[200, 100]} />
            <meshBasicMaterial map={texture} transparent opacity={0.6} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
    );
}

const MOBILE_BREAKPOINT = 1140;

function Sun({ isMobile }) {
    const sunRef = useRef();
    const [texture] = useLoader(THREE.TextureLoader, ['/textures/sun_map.jpg']);

    useFrame(() => {
        // Sun rotation (very slow)
        if (sunRef.current) {
            sunRef.current.rotation.y += 0.0005;
        }
    });

    // Desktop: [-80, 40, -150], Mobile: Center, higher up, further back
    const position = isMobile ? [-50, 60, -250] : [-80, 40, -150];
    const scale = isMobile ? 0.6 : 1;

    return (
        <group position={position} scale={scale}>
            {/* Sun sphere */}
            <mesh ref={sunRef}>
                <sphereGeometry args={[2.5, 64, 64]} />
                <meshBasicMaterial map={texture} color="#ffffff" toneMapped={false} fog={false} />
            </mesh>

            <pointLight intensity={2} distance={500} decay={1} color="#ffffff" />
        </group>
    );
}

function ISS() {
    const issRef = useRef();
    const [texture] = useLoader(THREE.TextureLoader, ['/textures/iss_clean_texture.png']);

    useFrame((state) => {
        const t = state.clock.getElapsedTime() * 0.1;
        const radius = 4.2;
        const inclination = 51.6 * (Math.PI / 180);

        // Calculate position in tilted orbit
        const x = Math.cos(t) * radius;
        const y = Math.sin(t) * Math.sin(inclination) * radius;
        const z = Math.sin(t) * Math.cos(inclination) * radius;

        if (issRef.current) {
            issRef.current.position.set(x, y, z);
            // Billboard effect: Make visible side always face the camera
            issRef.current.lookAt(state.camera.position);
        }
    });

    return (
        <mesh ref={issRef}>
            <planeGeometry args={[1.2, 1.2]} />
            <meshBasicMaterial
                map={texture}
                transparent
                opacity={1}
                blending={THREE.AdditiveBlending}
                side={THREE.DoubleSide}
                depthWrite={false}
                toneMapped={false}
                color="#ffffff"
            />
        </mesh>
    );
}

function Lights({ isMobile }) {
    const sunPosition = isMobile ? [-50, 60, -250] : [-80, 40, -150];

    return (
        <>
            <ambientLight intensity={0.7} color="#ffffff" />
            <directionalLight
                position={sunPosition}
                intensity={5}
                castShadow
                color="#ffffff"
            />
            <spotLight position={[10, 0, -20]} intensity={2} color="#0099ff" angle={0.5} />
        </>
    );
}

export default function Background3D() {
    const [isMobile, setIsMobile] = useState(false);

    // Track window resize to update Sun position
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
        };

        // Initial check
        handleResize();

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="background-3d">
            <Canvas camera={{ position: [0, 0, 10], fov: 45 }}>
                <Lights isMobile={isMobile} />
                <GalaxyBackground />
                <SpaceDebris />

                <Sun isMobile={isMobile} />
                <Earth />
                <fog attach="fog" args={['#050b14', 10, 60]} />
            </Canvas>
        </div>
    );
}
