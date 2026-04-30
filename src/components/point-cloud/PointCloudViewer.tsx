import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { PointCloudSummary } from "../../types/dashboard";

type ViewerStatus = "idle" | "loading" | "ready" | "error" | "empty";
type ColorMode = "label" | "rgb" | "height";
type FieldName = PointCloudSummary["fieldSchema"][number];

interface ParsedPointCloud {
  positions: Float32Array;
  colors: Float32Array;
  bounds: THREE.Box3;
  colorMode: ColorMode;
  schemaText: string;
  pointCount: number;
  skippedRows: number;
}

interface ViewerState {
  status: ViewerStatus;
  message: string;
  meta?: {
    colorMode: ColorMode;
    schemaText: string;
    pointCount: number;
    skippedRows: number;
  };
}

const labelPalette = [
  new THREE.Color("#4e79ff"),
  new THREE.Color("#ff5370"),
  new THREE.Color("#59d67d"),
  new THREE.Color("#ffc84d"),
  new THREE.Color("#9d6bff"),
  new THREE.Color("#ff8a37"),
  new THREE.Color("#22c7e8"),
  new THREE.Color("#eb4fa4"),
  new THREE.Color("#62dfc2"),
  new THREE.Color("#d96d2f"),
];

const colorModeText: Record<ColorMode, string> = {
  label: "按 label 上色",
  rgb: "按 RGB 上色",
  height: "按高度渐变",
};

export function PointCloudViewer({ pointCloud }: { pointCloud: PointCloudSummary }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const frameRef = useRef<number | null>(null);
  const initialViewRef = useRef<{ cameraPosition: THREE.Vector3; target: THREE.Vector3 } | null>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [viewerState, setViewerState] = useState<ViewerState>({
    status: "idle",
    message: "点云预览进入视口后加载",
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container || shouldLoad) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "180px" },
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [shouldLoad]);

  useEffect(() => {
    if (!shouldLoad || !pointCloud.fileUrl) {
      if (shouldLoad && !pointCloud.fileUrl) {
        setViewerState({ status: "error", message: "缺少点云文件访问地址" });
      }
      return;
    }

    const container = containerRef.current;
    if (!container) {
      return;
    }

    const viewerContainer = container;
    const abortController = new AbortController();
    let disposed = false;
    setViewerState({ status: "loading", message: "正在加载点云文件" });

    async function loadPointCloud() {
      const response = await fetch(pointCloud.fileUrl as string, { signal: abortController.signal });
      if (!response.ok) {
        throw new Error(`文件加载失败（HTTP ${response.status}）`);
      }

      const text = await response.text();
      if (disposed) {
        return;
      }

      const parsed = parsePointCloudText(text, pointCloud.fieldSchema);
      if (parsed.pointCount === 0) {
        setViewerState({ status: "empty", message: "文件中没有可渲染的点" });
        return;
      }

      mountScene(viewerContainer, parsed);
      setViewerState({
        status: "ready",
        message: "点云加载完成",
        meta: {
          colorMode: parsed.colorMode,
          schemaText: parsed.schemaText,
          pointCount: parsed.pointCount,
          skippedRows: parsed.skippedRows,
        },
      });
    }

    loadPointCloud().catch((error: unknown) => {
      if (abortController.signal.aborted) {
        return;
      }
      setViewerState({
        status: "error",
        message: error instanceof Error ? error.message : "点云解析失败",
      });
    });

    return () => {
      disposed = true;
      abortController.abort();
      disposeScene();
    };
  }, [pointCloud.fieldSchema, pointCloud.fileUrl, shouldLoad]);

  const resetView = useCallback(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const initialView = initialViewRef.current;
    if (!camera || !controls || !initialView) {
      return;
    }

    camera.position.copy(initialView.cameraPosition);
    controls.target.copy(initialView.target);
    controls.update();
  }, []);

  function mountScene(container: HTMLDivElement, parsed: ParsedPointCloud) {
    disposeScene();

    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#f8faf8");

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(parsed.positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(parsed.colors, 3));
    geometry.computeBoundingSphere();

    const size = parsed.bounds.getSize(new THREE.Vector3());
    const maxSize = Math.max(size.x, size.y, size.z, 1);
    const material = new THREE.PointsMaterial({
      size: Math.max(maxSize / 420, 1.6),
      sizeAttenuation: true,
      vertexColors: true,
    });
    const points = new THREE.Points(geometry, material);
    scene.add(points);

    const grid = new THREE.GridHelper(maxSize * 1.2, 8, "#bdc9c8", "#e1e7e5");
    grid.position.y = -size.y / 2;
    scene.add(grid);

    const axes = new THREE.AxesHelper(maxSize * 0.28);
    axes.position.set(-size.x / 2, -size.y / 2, -size.z / 2);
    scene.add(axes);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, maxSize * 12);
    const cameraPosition = new THREE.Vector3(maxSize * 0.95, maxSize * 0.78, maxSize * 1.2);
    camera.position.copy(cameraPosition);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = true;
    controls.minDistance = maxSize * 0.12;
    controls.maxDistance = maxSize * 5;
    controls.target.set(0, 0, 0);
    controls.update();

    const resizeObserver = new ResizeObserver(() => {
      const nextWidth = Math.max(container.clientWidth, 1);
      const nextHeight = Math.max(container.clientHeight, 1);
      renderer.setSize(nextWidth, nextHeight);
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
    });
    resizeObserver.observe(container);

    rendererRef.current = renderer;
    sceneRef.current = scene;
    cameraRef.current = camera;
    controlsRef.current = controls;
    initialViewRef.current = {
      cameraPosition: cameraPosition.clone(),
      target: new THREE.Vector3(0, 0, 0),
    };

    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      frameRef.current = window.requestAnimationFrame(animate);
    };
    animate();

    renderer.domElement.dataset.resizeObserver = "active";
    cleanupResizeObserverRef.current = resizeObserver;
  }

  const cleanupResizeObserverRef = useRef<ResizeObserver | null>(null);

  function disposeScene() {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    cleanupResizeObserverRef.current?.disconnect();
    cleanupResizeObserverRef.current = null;
    controlsRef.current?.dispose();
    controlsRef.current = null;

    const scene = sceneRef.current;
    if (scene) {
      scene.traverse((object: THREE.Object3D) => {
        const mesh = object as THREE.Points<THREE.BufferGeometry, THREE.Material> | THREE.LineSegments;
        if ("geometry" in mesh) {
          mesh.geometry.dispose();
        }
        if ("material" in mesh) {
          const material = mesh.material;
          if (Array.isArray(material)) {
            material.forEach((item) => item.dispose());
          } else {
            material.dispose();
          }
        }
      });
    }

    const renderer = rendererRef.current;
    if (renderer) {
      renderer.dispose();
      renderer.domElement.remove();
    }

    rendererRef.current = null;
    sceneRef.current = null;
    cameraRef.current = null;
    initialViewRef.current = null;
  }

  const isReady = viewerState.status === "ready";

  return (
    <div className="point-viewer-shell">
      <div className="point-viewer-canvas" ref={containerRef}>
        {!isReady && (
          <div className={`point-viewer-state point-viewer-state-${viewerState.status}`}>
            <strong>{viewerState.message}</strong>
            <span>{pointCloud.fileName}</span>
          </div>
        )}
      </div>
      <div className="point-viewer-footer">
        <div>
          {viewerState.meta ? (
            <>
              <strong>{viewerState.meta.pointCount.toLocaleString()} 点</strong>
              <span>
                {colorModeText[viewerState.meta.colorMode]} / {viewerState.meta.schemaText}
                {viewerState.meta.skippedRows > 0 ? ` / 跳过 ${viewerState.meta.skippedRows} 行` : ""}
              </span>
            </>
          ) : (
            <>
              <strong>三维预览</strong>
              <span>{viewerState.message}</span>
            </>
          )}
        </div>
        <button className="viewer-reset-button" type="button" onClick={resetView} disabled={!isReady}>
          重置视角
        </button>
      </div>
    </div>
  );
}

function parsePointCloudText(text: string, fieldSchema?: FieldName[]): ParsedPointCloud {
  const rows = text.split(/\r?\n/);
  const positions: number[] = [];
  const labels: string[] = [];
  const rgbValues: number[] = [];
  let skippedRows = 0;
  let schema: ReturnType<typeof inferSchema> | null = null;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  for (const row of rows) {
    const trimmed = row.trim();
    if (!trimmed) {
      continue;
    }

    const columns = trimmed.split(/[\s,]+/);
    schema ??= inferSchema(columns.length, fieldSchema);
    if (!schema || columns.length <= Math.max(schema.x, schema.y, schema.z)) {
      skippedRows += 1;
      continue;
    }

    const x = Number(columns[schema.x]);
    const y = Number(columns[schema.y]);
    const z = Number(columns[schema.z]);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
      skippedRows += 1;
      continue;
    }

    positions.push(x, y, z);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);

    if (schema.label !== undefined && columns[schema.label] !== undefined) {
      labels.push(columns[schema.label]);
    }

    if (schema.r !== undefined && schema.g !== undefined && schema.b !== undefined) {
      rgbValues.push(Number(columns[schema.r]), Number(columns[schema.g]), Number(columns[schema.b]));
    }
  }

  const pointCount = positions.length / 3;
  const centeredPositions = new Float32Array(positions.length);
  const colors = new Float32Array(positions.length);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const hasLabel = labels.length === pointCount;
  const hasRgb = rgbValues.length === pointCount * 3;
  const colorMode: ColorMode = hasLabel ? "label" : hasRgb ? "rgb" : "height";
  const labelIndex = new Map<string, number>();
  const zRange = Math.max(maxZ - minZ, 1);

  for (let index = 0; index < pointCount; index += 1) {
    const positionIndex = index * 3;
    const x = positions[positionIndex];
    const y = positions[positionIndex + 1];
    const z = positions[positionIndex + 2];
    centeredPositions[positionIndex] = x - centerX;
    centeredPositions[positionIndex + 1] = z - centerZ;
    centeredPositions[positionIndex + 2] = -(y - centerY);

    if (colorMode === "label") {
      const label = labels[index];
      if (!labelIndex.has(label)) {
        labelIndex.set(label, labelIndex.size);
      }
      const color = labelPalette[(labelIndex.get(label) ?? 0) % labelPalette.length];
      colors[positionIndex] = color.r;
      colors[positionIndex + 1] = color.g;
      colors[positionIndex + 2] = color.b;
    } else if (colorMode === "rgb") {
      colors[positionIndex] = normalizeRgb(rgbValues[positionIndex]);
      colors[positionIndex + 1] = normalizeRgb(rgbValues[positionIndex + 1]);
      colors[positionIndex + 2] = normalizeRgb(rgbValues[positionIndex + 2]);
    } else {
      const color = heightGradient((z - minZ) / zRange);
      colors[positionIndex] = color.r;
      colors[positionIndex + 1] = color.g;
      colors[positionIndex + 2] = color.b;
    }
  }

  return {
    positions: centeredPositions,
    colors,
    bounds: new THREE.Box3(
      new THREE.Vector3(minX - centerX, minZ - centerZ, -(maxY - centerY)),
      new THREE.Vector3(maxX - centerX, maxZ - centerZ, -(minY - centerY)),
    ),
    colorMode,
    schemaText: schema?.schemaText ?? "x y z",
    pointCount,
    skippedRows,
  };
}

function inferSchema(columnCount: number, fieldSchema?: FieldName[]) {
  if (fieldSchema?.length) {
    const x = fieldSchema.indexOf("x");
    const y = fieldSchema.indexOf("y");
    const z = fieldSchema.indexOf("z");
    if (x >= 0 && y >= 0 && z >= 0 && Math.max(x, y, z) < columnCount) {
      const r = fieldSchema.indexOf("r");
      const g = fieldSchema.indexOf("g");
      const b = fieldSchema.indexOf("b");
      const label = fieldSchema.indexOf("label");
      return {
        x,
        y,
        z,
        r: r >= 0 && r < columnCount ? r : undefined,
        g: g >= 0 && g < columnCount ? g : undefined,
        b: b >= 0 && b < columnCount ? b : undefined,
        label: label >= 0 && label < columnCount ? label : undefined,
        schemaText: fieldSchema.filter((_, index) => index < columnCount).join(" "),
      };
    }
  }

  if (columnCount >= 7) {
    return { x: 0, y: 1, z: 2, r: 3, g: 4, b: 5, label: 6, schemaText: "x y z r g b label" };
  }
  if (columnCount === 6) {
    return { x: 0, y: 1, z: 2, r: 3, g: 4, b: 5, schemaText: "x y z r g b" };
  }
  if (columnCount === 4) {
    return { x: 0, y: 1, z: 2, label: 3, schemaText: "x y z label" };
  }
  if (columnCount === 3) {
    return { x: 0, y: 1, z: 2, schemaText: "x y z" };
  }
  return null;
}

function normalizeRgb(value: number) {
  if (!Number.isFinite(value)) {
    return 0.62;
  }
  return THREE.MathUtils.clamp(value / 255, 0, 1);
}

function heightGradient(ratio: number) {
  const low = new THREE.Color("#315f90");
  const mid = new THREE.Color("#2a8a74");
  const high = new THREE.Color("#c49a3a");
  const color = ratio < 0.5 ? low.lerp(mid, ratio * 2) : mid.lerp(high, (ratio - 0.5) * 2);
  return color;
}
