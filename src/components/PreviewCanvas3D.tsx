import { useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { PatternParams, Polyline } from '../types/tile';

interface Props {
  params: PatternParams;
  polylines: Polyline[];
}

const PANEL_THICKNESS = 18; // 合板厚 mm
const GROOVE_DEPTH = 2; // 目地彫り込み深さ mm（バンプマップで擬似表現）
const GROOVE_WIDTH = 6; // 目地幅 mm（3D プレビューでは固定）
const TEX_RESOLUTION = 4; // 1 mm あたり何 px でテクスチャを描くか

/**
 * 目地パターンをオフスクリーン canvas に描き、これをパネル天面の
 * カラーマップ兼バンプマップとして使う。穴抜き ExtrudeGeometry より
 * パターン複雑度に強く、目地色も正確に出る。
 */
function buildPanelTexture(
  polylines: Polyline[],
  pw: number,
  ph: number,
  tileColor: string,
  groutColor: string,
): { color: HTMLCanvasElement; bump: HTMLCanvasElement } {
  const w = Math.round(pw * TEX_RESOLUTION);
  const h = Math.round(ph * TEX_RESOLUTION);

  const color = document.createElement('canvas');
  color.width = w;
  color.height = h;
  const cctx = color.getContext('2d')!;
  cctx.fillStyle = tileColor;
  cctx.fillRect(0, 0, w, h);
  cctx.strokeStyle = groutColor;
  cctx.lineWidth = GROOVE_WIDTH * TEX_RESOLUTION;
  cctx.lineCap = 'butt';
  cctx.lineJoin = 'miter';
  for (const pl of polylines) {
    if (pl.points.length < 2) continue;
    cctx.beginPath();
    pl.points.forEach((p, i) => {
      const x = p.x * TEX_RESOLUTION;
      const y = p.y * TEX_RESOLUTION;
      if (i === 0) cctx.moveTo(x, y);
      else cctx.lineTo(x, y);
    });
    if (pl.closed) cctx.closePath();
    cctx.stroke();
  }

  // バンプ：白 = タイル面（高い）、黒 = 目地（低い）
  const bump = document.createElement('canvas');
  bump.width = w;
  bump.height = h;
  const bctx = bump.getContext('2d')!;
  bctx.fillStyle = '#ffffff';
  bctx.fillRect(0, 0, w, h);
  bctx.strokeStyle = '#000000';
  bctx.lineWidth = GROOVE_WIDTH * TEX_RESOLUTION;
  bctx.lineCap = 'butt';
  bctx.lineJoin = 'miter';
  for (const pl of polylines) {
    if (pl.points.length < 2) continue;
    bctx.beginPath();
    pl.points.forEach((p, i) => {
      const x = p.x * TEX_RESOLUTION;
      const y = p.y * TEX_RESOLUTION;
      if (i === 0) bctx.moveTo(x, y);
      else bctx.lineTo(x, y);
    });
    if (pl.closed) bctx.closePath();
    bctx.stroke();
  }

  return { color, bump };
}

export default function PreviewCanvas3D({ params, polylines }: Props) {
  const { panelWidth: pw, panelHeight: ph, tileColor, groutColor } = params;
  const cameraDistance = Math.max(pw, ph) * 1.4;

  const { colorMap, bumpMap } = useMemo(() => {
    const { color, bump } = buildPanelTexture(polylines, pw, ph, tileColor, groutColor);
    const colorTex = new THREE.CanvasTexture(color);
    colorTex.colorSpace = THREE.SRGBColorSpace;
    colorTex.anisotropy = 8;
    const bumpTex = new THREE.CanvasTexture(bump);
    bumpTex.anisotropy = 8;
    return { colorMap: colorTex, bumpMap: bumpTex };
  }, [polylines, pw, ph, tileColor, groutColor]);

  // テクスチャは生成のたびに新しい THREE.Texture を作るので、unmount/差し替え時に破棄
  useEffect(() => {
    return () => {
      colorMap.dispose();
      bumpMap.dispose();
    };
  }, [colorMap, bumpMap]);

  return (
    <section>
      <h2 className="mb-3 text-sm font-bold tracking-widest">3D プレビュー</h2>
      <div className="aspect-[3/2] w-full border border-black bg-neutral-100">
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{
            position: [cameraDistance * 0.6, cameraDistance * 0.7, cameraDistance * 0.8],
            fov: 35,
            near: 1,
            far: cameraDistance * 10,
          }}
        >
          <color attach="background" args={['#f5f5f5']} />
          <ambientLight intensity={0.45} />
          <directionalLight
            position={[pw, pw * 1.5, ph]}
            intensity={1.0}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          <directionalLight position={[-pw, pw, -ph]} intensity={0.3} />

          {/* パネル substrate：側面と底はタイル色の単色 */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[pw, PANEL_THICKNESS, ph]} />
            <meshStandardMaterial color={tileColor} roughness={0.85} metalness={0} />
          </mesh>

          {/* 天面：テクスチャ + バンプマップで目地と彫り込みを表現 */}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, PANEL_THICKNESS / 2 + 0.05, 0]}
            receiveShadow
          >
            <planeGeometry args={[pw, ph]} />
            <meshStandardMaterial
              map={colorMap}
              bumpMap={bumpMap}
              bumpScale={GROOVE_DEPTH * 1.5}
              roughness={0.8}
              metalness={0}
            />
          </mesh>

          {/* 床（影受け） */}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, -PANEL_THICKNESS / 2 - 0.1, 0]}
            receiveShadow
          >
            <planeGeometry args={[pw * 4, ph * 4]} />
            <shadowMaterial opacity={0.18} />
          </mesh>

          <OrbitControls
            target={[0, 0, 0]}
            enableDamping
            minDistance={Math.max(pw, ph) * 0.4}
            maxDistance={Math.max(pw, ph) * 4}
            maxPolarAngle={Math.PI / 2 - 0.05}
          />
        </Canvas>
      </div>
      <p className="mt-2 text-xs text-neutral-500">
        ドラッグで回転 / ホイールでズーム / 右ドラッグで平行移動（目地：6 mm 幅 × 2 mm 彫り込み）
      </p>
    </section>
  );
}
