import React, { useRef, useEffect, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Map as MapIcon,
  Navigation,
  Compass,
  MapPin,
  Zap,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Crosshair,
  ExternalLink,
  Footprints,
  Bike,
  Layers,
  Info,
  X,
  ShieldAlert,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Check,
  Loader2,
  Search,
  Building2,
  GraduationCap,
  Palette,
  Edit3,
  Sparkles,
  Phone,
  MessageSquare,
  Award,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { GigEntity, UserEntity, formatVnd } from '../types';
import {
  calculateDistanceMeters,
  formatDistance,
  estimateTravelTime,
  getGoogleMapsDirUrl,
  generateRoutePoints,
  VIETNAM_HUBS,
  GeoLocation,
  DEFAULT_USER_LOCATION,
} from '../utils/geo';
import { inspectGpsIntegrity, resetMockGpsDetector, GpsIntegrityReport } from '../utils/mockGpsDetector';
import { resetAntiGpsCache } from '../utils/antiFakeGps';
import { triggerHaptic } from '../utils/haptics';
import { useGigMe } from '../context/GigMeContext';

interface InteractiveRadarProps {
  gigs: GigEntity[];
  selectedGigId: string | null;
  onSelectGig: (gigId: string) => void;
  radiusMeters: number;
  onRadiusChange: (meters: number) => void;
  isClientMode: boolean;
  userCoords?: GeoLocation;
  onUserCoordsChange?: (coords: GeoLocation) => void;
}

const PRIMARY_RADIUS_OPTIONS = [
  { label: '500m', value: 500 },
  { label: '1km', value: 1000 },
  { label: '3km', value: 3000 },
  { label: '5km', value: 5000 },
  { label: '15km', value: 15000 },
  { label: '🌐 Toàn quốc', value: 2500000 },
];

export type MapLayer = 'GOOGLE_STREETS' | 'GOOGLE_SATELLITE' | 'STREETS' | 'DARK_CYBER' | 'CARTO_VOYAGER';

const MAP_TILE_CONFIG: Record<
  MapLayer,
  { name: string; url: string; subdomains?: string[]; attribution: string }
> = {
  GOOGLE_STREETS: {
    name: 'Google Đường Phố (Chuẩn)',
    url: 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
    attribution: '&copy; Google Maps',
  },
  GOOGLE_SATELLITE: {
    name: 'Google Vệ Tinh (Lai)',
    url: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
    attribution: '&copy; Google Satellite',
  },
  STREETS: {
    name: 'Đường Phố (OpenStreetMap)',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    subdomains: ['a', 'b', 'c'],
    attribution: '&copy; OpenStreetMap contributors',
  },
  DARK_CYBER: {
    name: 'Cyber Dark Mode',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    subdomains: ['a', 'b', 'c', 'd'],
    attribution: '&copy; OpenStreetMap, &copy; CartoDB',
  },
  CARTO_VOYAGER: {
    name: 'Bản Đồ Màu Sáng (Voyager)',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    subdomains: ['a', 'b', 'c', 'd'],
    attribution: '&copy; OpenStreetMap, &copy; CartoDB',
  },
};

// Bảng màu ngẫu nhiên rực rỡ gán riêng cho từng tài khoản sinh viên trên bản đồ
export const VIBRANT_ACCOUNT_COLORS = [
  '#3B82F6', // Neon Blue
  '#10B981', // Emerald Green
  '#EC4899', // Hot Pink
  '#8B5CF6', // Purple
  '#F59E0B', // Amber Gold
  '#06B6D4', // Cyan
  '#EF4444', // Crimson Red
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#A855F7', // Violet
  '#6366F1', // Indigo
  '#22C55E', // Lime Green
  '#D946EF', // Fuchsia Neon
  '#E11D48', // Rose
];

export function getAccountColor(idOrName: string): string {
  if (!idOrName) return '#3B82F6';
  let hash = 0;
  for (let i = 0; i < idOrName.length; i++) {
    hash = (hash << 5) - hash + idOrName.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % VIBRANT_ACCOUNT_COLORS.length;
  return VIBRANT_ACCOUNT_COLORS[index];
}

// Bảng màu ngẫu nhiên rực rỡ riêng biệt cho các vị trí công việc đang chờ sinh viên
export function getGigLocationColor(idOrTitle: string): string {
  if (!idOrTitle) return '#F59E0B';
  let hash = 0;
  for (let i = 0; i < idOrTitle.length; i++) {
    hash = (hash << 5) - hash + idOrTitle.charCodeAt(i);
    hash |= 0;
  }
  // Offset to ensure gig colors distribute nicely even if sharing IDs
  const index = Math.abs((hash ^ 0x5a5a5a)) % VIBRANT_ACCOUNT_COLORS.length;
  return VIBRANT_ACCOUNT_COLORS[index];
}

export interface CategoryInfo {
  icon: string;
  label: string;
}

export function getCategoryDetails(category?: string, title?: string, isFlash?: boolean): CategoryInfo {
  const combined = `${category || ''} ${title || ''}`.toLowerCase().trim();
  if (isFlash) return { icon: '⚡', label: 'Hỏa Tốc' };

  if (combined.includes('đồ ăn') || combined.includes('cà phê') || combined.includes('trà sữa') || combined.includes('bánh mì') || combined.includes('cơm')) {
    return { icon: '🧋', label: 'Ăn Uống' };
  }
  if (combined.includes('giao nhận') || combined.includes('ship') || combined.includes('gói đồ') || combined.includes('bưu phẩm')) {
    return { icon: '📦', label: 'Ship KTX' };
  }
  if (combined.includes('giặt ủi') || combined.includes('phơi') || combined.includes('quần áo')) {
    return { icon: '🧺', label: 'Giặt Ủi' };
  }
  if (combined.includes('dọn phòng') || combined.includes('vệ sinh')) {
    return { icon: '🧹', label: 'Dọn Phòng' };
  }
  if (combined.includes('thư viện') || combined.includes('xếp hàng') || combined.includes('giữ chỗ')) {
    return { icon: '🪑', label: 'Giữ Chỗ' };
  }
  if (combined.includes('gia sư') || combined.includes('toán') || combined.includes('lý') || combined.includes('đại cương') || combined.includes('kèm')) {
    return { icon: '📐', label: 'Gia Sư' };
  }
  if (combined.includes('ngoại ngữ') || combined.includes('ielts') || combined.includes('toeic') || combined.includes('hsk') || combined.includes('tiếng anh')) {
    return { icon: '🗣️', label: 'Ngoại Ngữ' };
  }
  if (combined.includes('đồ án') || combined.includes('khóa luận') || combined.includes('bài tập lớn')) {
    return { icon: '🎓', label: 'Đồ Án' };
  }
  if (combined.includes('powerpoint') || combined.includes('slide') || combined.includes('thuyết trình')) {
    return { icon: '📊', label: 'Slide' };
  }
  if (combined.includes('soạn thảo') || combined.includes('định dạng') || combined.includes('văn bản') || combined.includes('in ấn')) {
    return { icon: '📄', label: 'Văn Bản' };
  }
  if (combined.includes('capcut') || combined.includes('video') || combined.includes('tiktok') || combined.includes('reels')) {
    return { icon: '🎬', label: 'Video' };
  }
  if (combined.includes('poster') || combined.includes('banner') || combined.includes('canva') || combined.includes('photoshop')) {
    return { icon: '🎨', label: 'Design' };
  }
  if (combined.includes('lập trình') || combined.includes('code') || combined.includes('web') || combined.includes('mobile') || combined.includes('fix bug')) {
    return { icon: '💻', label: 'Coding' };
  }
  if (combined.includes('cài win') || combined.includes('laptop') || combined.includes('máy tính') || combined.includes('phần mềm')) {
    return { icon: '🔧', label: 'Laptop' };
  }
  if (combined.includes('kỷ yếu') || combined.includes('chụp ảnh') || combined.includes('quay phim')) {
    return { icon: '📸', label: 'Chụp Ảnh' };
  }
  if (combined.includes('rank') || combined.includes('game') || combined.includes('liên quân') || combined.includes('valorant')) {
    return { icon: '🎮', label: 'Cày Game' };
  }
  if (combined.includes('thú cưng') || combined.includes('chó') || combined.includes('mèo') || combined.includes('cún')) {
    return { icon: '🐶', label: 'Thú Cưng' };
  }
  if (combined.includes('xe máy') || combined.includes('chở') || combined.includes('đi chung') || combined.includes('về quê')) {
    return { icon: '🛵', label: 'Chở Xe' };
  }
  if (combined.includes('khảo sát') || combined.includes('nghiên cứu') || combined.includes('nckh')) {
    return { icon: '🧪', label: 'Khảo Sát' };
  }
  if (combined.includes('sự kiện') || combined.includes('tiếp tân') || combined.includes('hậu cần') || combined.includes('clb')) {
    return { icon: '🎪', label: 'Sự Kiện' };
  }
  if (combined.includes('dịch thuật') || combined.includes('dịch')) {
    return { icon: '🌐', label: 'Dịch Thuật' };
  }
  return { icon: '📌', label: 'Nhiệm Vụ' };
}

/**
 * Reverse geocode coordinate to human-readable address in Vietnam
 */
async function reverseGeocodeAddress(lat: number, lng: number): Promise<string> {
  // 1. Check nearest Vietnam campus hub within 400m
  for (const [, hub] of Object.entries(VIETNAM_HUBS)) {
    if (calculateDistanceMeters(lat, lng, hub.latitude, hub.longitude) <= 400) {
      return hub.label || 'Khuôn viên trường';
    }
  }

  // 2. Fetch OpenStreetMap reverse geocode
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { signal: AbortSignal.timeout(2500) }
    );
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const primary =
        addr.amenity ||
        addr.building ||
        addr.road ||
        addr.suburb ||
        addr.quarter ||
        addr.residential ||
        addr.neighbourhood;
      const district = addr.city_district || addr.district || addr.suburb || '';
      const city = addr.city || addr.state || 'Việt Nam';
      if (primary) {
        return [primary, district, city].filter(Boolean).join(', ');
      }
      if (data.display_name) {
        return data.display_name.split(',').slice(0, 3).join(', ').trim();
      }
    }
  } catch {}

  return `Tọa độ: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

export const InteractiveRadar: React.FC<InteractiveRadarProps> = ({
  gigs,
  selectedGigId,
  onSelectGig,
  radiusMeters,
  onRadiusChange,
  isClientMode,
  userCoords: propUserCoords,
  onUserCoordsChange,
}) => {
  const { language, showNotification, currentUser, users } = useGigMe();

  // Current user GPS coordinates
  const [currentUserCoords, setCurrentUserCoords] = useState<GeoLocation>(
    propUserCoords || DEFAULT_USER_LOCATION
  );

  // Map state & Compact view toggles - Default to high-reliability Google Streets
  const [mapLayer, setMapLayer] = useState<MapLayer>('GOOGLE_STREETS');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showHubModal, setShowHubModal] = useState(false);
  const [hubSearchTerm, setHubSearchTerm] = useState('');
  const [selectedCityTab, setSelectedCityTab] = useState<'ALL' | 'TPHCM' | 'HANOI' | 'OTHER'>('ALL');
  const [showLayerDropdown, setShowLayerDropdown] = useState(false);

  // GPS state & Manual positioning mode
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsReport, setGpsReport] = useState<GpsIntegrityReport | null>(null);
  const [showMockDetectorDialog, setShowMockDetectorDialog] = useState<boolean>(false);

  // Location permission & sharing state (Chỉ khi người dùng truy cập web/app và cho phép xem vị trí mới hiển thị)
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('gigme_radar_location_permission');
      if (saved !== null) return saved === 'true';
    }
    return currentUser?.hasLocationPermission ?? true;
  });

  // Account random color beacon broadcast toggle
  const [showAccountColors, setShowAccountColors] = useState<boolean>(true);
  const [selectedStudent, setSelectedStudent] = useState<UserEntity | null>(null);

  // Lọc người dùng: Chỉ hiện khi người khác truy cập website hoặc app VÀ cho phép xem vị trí họ ở đâu
  const permittedOnlinePeers = useMemo(() => {
    if (!users || users.length === 0) return [];
    return users.filter((u) => {
      if (u.id === currentUser?.id) return false;
      // 1. Phải đang truy cập website hoặc app (hoạt động trong vòng 15 phút)
      const isVisiting = Boolean(u.lastActiveAt && (Date.now() - u.lastActiveAt < 15 * 60 * 1000));
      // 2. Phải cho phép xem/chia sẻ vị trí họ ở đâu
      const hasPermitted = Boolean(u.hasLocationPermission);
      return isVisiting && hasPermitted;
    });
  }, [users, currentUser?.id]);

  // Leaflet Map refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const studentMarkersLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const workerMarkerRef = useRef<L.Marker | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const radiusCircleRef = useRef<L.Circle | null>(null);
  const layerDropdownRef = useRef<HTMLDivElement | null>(null);

  // Live Tracking & OSRM Routing states
  const [isLiveTracking, setIsLiveTracking] = useState<boolean>(true);
  const [trackingProgress, setTrackingProgress] = useState<number>(0.15);
  const [osrmRoutePoints, setOsrmRoutePoints] = useState<[number, number][] | null>(null);
  const [osrmRouteDetails, setOsrmRouteDetails] = useState<{
    motoMinutes: number;
    walkMinutes: number;
    distanceMeters: number;
    routeSource: 'OSRM_REAL_ROAD' | 'LOCAL_CAMPUS';
  } | null>(null);

  // Synchronize internal coords when prop changes
  useEffect(() => {
    if (propUserCoords) {
      setCurrentUserCoords(propUserCoords);
    }
  }, [propUserCoords]);

  // Selected gig calculation
  const selectedGig = useMemo(() => {
    return gigs.find((g) => g.id === selectedGigId) || null;
  }, [gigs, selectedGigId]);

  // Route statistics
  const routeStats = useMemo(() => {
    if (!selectedGig) return null;
    const gigLat = selectedGig.latitude || currentUserCoords.latitude;
    const gigLng = selectedGig.longitude || currentUserCoords.longitude;
    const distanceMeters = calculateDistanceMeters(
      currentUserCoords.latitude,
      currentUserCoords.longitude,
      gigLat,
      gigLng
    );
    const times = estimateTravelTime(distanceMeters);
    const googleDirUrl = getGoogleMapsDirUrl(
      currentUserCoords.latitude,
      currentUserCoords.longitude,
      gigLat,
      gigLng,
      'two-wheeler'
    );

    return {
      distanceMeters,
      formattedDistance: formatDistance(distanceMeters),
      walkMinutes: times.walkMinutes,
      motoMinutes: times.motoMinutes,
      googleDirUrl,
      gigLat,
      gigLng,
    };
  }, [selectedGig, currentUserCoords]);

  // Current active Hub identifier
  const currentHubEntry = useMemo(() => {
    const found = Object.entries(VIETNAM_HUBS).find(
      ([, hub]) =>
        (currentUserCoords.label && currentUserCoords.label === hub.label) ||
        (Math.abs(hub.latitude - currentUserCoords.latitude) < 0.005 &&
          Math.abs(hub.longitude - currentUserCoords.longitude) < 0.005)
    );
    return found ? { key: found[0], hub: found[1] } : null;
  }, [currentUserCoords]);

  // Filtered hub entries for the Campus Hub Modal
  const filteredHubEntries = useMemo(() => {
    const term = hubSearchTerm.trim().toLowerCase();
    return Object.entries(VIETNAM_HUBS).filter(([key, hub]) => {
      const label = (hub.label || '').toLowerCase();
      const matchesSearch = !term || label.includes(term) || key.toLowerCase().includes(term);
      if (!matchesSearch) return false;

      if (selectedCityTab === 'TPHCM') {
        return (
          key.includes('TPHCM') ||
          key.includes('Q7') ||
          key.includes('Q1') ||
          key.includes('THUDUC') ||
          key.includes('DHQG')
        );
      }
      if (selectedCityTab === 'HANOI') {
        return key.includes('HANOI');
      }
      if (selectedCityTab === 'OTHER') {
        return key.includes('DANANG') || key.includes('CANTHO');
      }
      return true;
    });
  }, [hubSearchTerm, selectedCityTab]);

  // Fetch authentic route from OSRM Routing Engine
  useEffect(() => {
    if (!selectedGig || !selectedGig.latitude || !selectedGig.longitude) {
      setOsrmRoutePoints(null);
      setOsrmRouteDetails(null);
      return;
    }

    const fromLat = currentUserCoords.latitude;
    const fromLng = currentUserCoords.longitude;
    const toLat = selectedGig.latitude;
    const toLng = selectedGig.longitude;

    let isMounted = true;
    const fetchOsrmRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
        const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
          const data = await res.json();
          if (data.routes && data.routes[0]) {
            const rawPoints = data.routes[0].geometry.coordinates.map(
              ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
            );
            const dist = data.routes[0].distance || calculateDistanceMeters(fromLat, fromLng, toLat, toLng);
            const moto = Math.max(1, Math.ceil(dist / 450));
            const walk = Math.max(1, Math.ceil(dist / 75));
            if (isMounted) {
              setOsrmRoutePoints(rawPoints);
              setOsrmRouteDetails({
                motoMinutes: moto,
                walkMinutes: walk,
                distanceMeters: Math.round(dist),
                routeSource: 'OSRM_REAL_ROAD',
              });
              return;
            }
          }
        }
      } catch {
        // Fallback gracefully to campus curve waypoints
      }

      if (isMounted) {
        const fallback = generateRoutePoints(fromLat, fromLng, toLat, toLng);
        const dist = calculateDistanceMeters(fromLat, fromLng, toLat, toLng);
        const times = estimateTravelTime(dist);
        setOsrmRoutePoints(fallback);
        setOsrmRouteDetails({
          motoMinutes: times.motoMinutes,
          walkMinutes: times.walkMinutes,
          distanceMeters: dist,
          routeSource: 'LOCAL_CAMPUS',
        });
      }
    };

    fetchOsrmRoute();
    return () => {
      isMounted = false;
    };
  }, [selectedGig, currentUserCoords]);

  // Live worker movement along route simulation
  useEffect(() => {
    if (!isLiveTracking || !selectedGig || !osrmRoutePoints || osrmRoutePoints.length < 2) return;
    const interval = setInterval(() => {
      setTrackingProgress((prev) => {
        if (prev >= 0.95) return 0.08;
        return prev + 0.04;
      });
    }, 1200);

    return () => clearInterval(interval);
  }, [isLiveTracking, selectedGig, osrmRoutePoints]);

  // Request actual real GPS location with resilient high accuracy -> network fallback
  const handleGetLiveGps = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGpsError(language === 'vi' ? 'Thiết bị không hỗ trợ định vị GPS' : 'Device does not support GPS geolocation');
      return;
    }
    setIsGpsLoading(true);
    setGpsError(null);
    resetMockGpsDetector();
    resetAntiGpsCache();

    const onGpsSuccess = async (pos: GeolocationPosition) => {
      setIsGpsLoading(false);
      const report = inspectGpsIntegrity(pos);
      setGpsReport(report);

      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const addressLabel = await reverseGeocodeAddress(lat, lng);

      const newCoords: GeoLocation = {
        latitude: lat,
        longitude: lng,
        label: report.isMock
          ? (language === 'vi' ? 'Cảnh báo: GPS có dấu hiệu giả lập' : 'Warning: Mock GPS detected')
          : addressLabel,
      };
      setCurrentUserCoords(newCoords);
      if (onUserCoordsChange) {
        onUserCoordsChange(newCoords);
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([newCoords.latitude, newCoords.longitude], 16, {
          animate: true,
        });
      }
      triggerHaptic('success');
      showNotification(
        language === 'vi' ? '📍 GPS Đã Cập Nhật' : '📍 GPS Located',
        language === 'vi' ? `Vị trí thực của bạn: ${addressLabel}` : `Your location: ${addressLabel}`,
        true
      );
    };

    const onGpsFallback = () => {
      // Fallback to network/coarse position if satellite GPS times out
      navigator.geolocation.getCurrentPosition(
        onGpsSuccess,
        (err) => {
          setIsGpsLoading(false);
          console.warn('GPS location access notice:', err?.message);
          setGpsError(
            language === 'vi'
              ? 'Không thể lấy GPS (vui lòng bật quyền vị trí hoặc chọn điểm trường campus)'
              : 'Could not obtain GPS (please allow location access or select a campus hub)'
          );
          setTimeout(() => setGpsError(null), 4000);
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
      );
    };

    // Phase 1: Try high accuracy first
    navigator.geolocation.getCurrentPosition(
      onGpsSuccess,
      onGpsFallback,
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 30000 }
    );
  };

  // Quick select campus location
  const handleSelectCampus = (hubKey: string) => {
    triggerHaptic('medium');
    const hub = VIETNAM_HUBS[hubKey];
    if (!hub) return;
    resetMockGpsDetector();
    resetAntiGpsCache();
    setCurrentUserCoords(hub);
    setShowHubModal(false);
    if (onUserCoordsChange) {
      onUserCoordsChange(hub);
    }
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.setView([hub.latitude, hub.longitude], 15, { animate: true });
        mapInstanceRef.current.invalidateSize({ pan: false });
      } catch (e) {}
    }
    showNotification(
      language === 'vi' ? '🏛️ Đã Đổi Khu Vực Campus' : '🏛️ Campus Hub Updated',
      language === 'vi'
        ? `Đã cập nhật vị trí radar sang: ${hub.label}`
        : `Map radar location set to: ${hub.label}`,
      true,
      false
    );
  };

  // Cleanup Leaflet Map on Unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Invalidate map size whenever size-affecting states change
  useEffect(() => {
    if (!mapInstanceRef.current || isCollapsed) return;

    const triggerInvalidate = () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.invalidateSize({ pan: false });
        } catch (e) {}
      }
    };

    triggerInvalidate();
    const f1 = requestAnimationFrame(triggerInvalidate);
    const t1 = setTimeout(triggerInvalidate, 50);
    const t2 = setTimeout(triggerInvalidate, 150);
    const t3 = setTimeout(triggerInvalidate, 350);
    const t4 = setTimeout(triggerInvalidate, 600);

    return () => {
      cancelAnimationFrame(f1);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [isFullscreen, isExpanded, isCollapsed, mapLayer]);

  // ==========================================
  // LEAFLET MAP INITIALIZATION & EVENT HOOKS
  // ==========================================
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      if ((mapContainerRef.current as any)._leaflet_id) {
        (mapContainerRef.current as any)._leaflet_id = null;
      }

      const map = L.map(mapContainerRef.current, {
        center: [currentUserCoords.latitude, currentUserCoords.longitude],
        zoom: 15,
        zoomControl: false,
        attributionControl: false,
        tap: false,
        touchZoom: true,
        scrollWheelZoom: false,
        bounceAtZoomLimits: false,
      } as any);

      // Default reliable tile layer
      const initialConfig = MAP_TILE_CONFIG[mapLayer] || MAP_TILE_CONFIG.GOOGLE_STREETS;
      const tileLayer = L.tileLayer(initialConfig.url, {
        subdomains: initialConfig.subdomains || ['0', '1', '2', '3'],
        maxZoom: 20,
        keepBuffer: 12,
        updateWhenIdle: false,
        updateWhenZooming: true,
      });

      // Self-healing: if current tile server fails, auto-fallback to Google Streets
      tileLayer.on('tileerror', () => {
        if (mapLayer !== 'GOOGLE_STREETS' && mapInstanceRef.current) {
          console.warn('Map tile failed to load, switching to Google Streets');
          setMapLayer('GOOGLE_STREETS');
        }
      });

      tileLayer.addTo(map);
      tileLayerRef.current = tileLayer;

      // Layer groups for markers
      markersLayerRef.current = L.layerGroup().addTo(map);
      studentMarkersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;

      // Resilient sizing sequence
      setTimeout(() => {
        try {
          map.invalidateSize({ pan: false });
        } catch (e) {}
      }, 60);
      setTimeout(() => {
        try {
          map.invalidateSize({ pan: false });
        } catch (e) {}
      }, 250);
    }

    // Adaptive ResizeObserver
    let resizeTimer: any = null;
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          if (mapInstanceRef.current) {
            try {
              mapInstanceRef.current.invalidateSize({ pan: false });
            } catch (e) {}
          }
        }, 50);
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    // IntersectionObserver: trigger invalidateSize when map scrolls into view
    let intersectionObserver: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined' && mapContainerRef.current) {
      intersectionObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && mapInstanceRef.current) {
              mapInstanceRef.current.invalidateSize({ pan: false });
            }
          });
        },
        { threshold: 0.1 }
      );
      intersectionObserver.observe(mapContainerRef.current);
    }

    return () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      if (resizeObserver) resizeObserver.disconnect();
      if (intersectionObserver) intersectionObserver.disconnect();
    };
  }, []);

  // Update Tile Layer when user switches style
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }
    const config = MAP_TILE_CONFIG[mapLayer] || MAP_TILE_CONFIG.GOOGLE_STREETS;
    const newTileLayer = L.tileLayer(config.url, {
      subdomains: config.subdomains || ['0', '1', '2', '3'],
      maxZoom: 20,
      keepBuffer: 12,
      updateWhenIdle: false,
      updateWhenZooming: true,
    });

    newTileLayer.on('tileerror', () => {
      if (mapLayer !== 'GOOGLE_STREETS' && mapInstanceRef.current) {
        setMapLayer('GOOGLE_STREETS');
      }
    });

    newTileLayer.addTo(mapInstanceRef.current);
    tileLayerRef.current = newTileLayer;
    newTileLayer.bringToBack();
  }, [mapLayer]);

  // ==========================================
  // UPDATE MARKERS (USER, PEERS, GIGS, ROUTES)
  // ==========================================
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // 1. Update User Marker & Radius Circle
    if (userMarkerRef.current) {
      map.removeLayer(userMarkerRef.current);
    }
    if (radiusCircleRef.current) {
      map.removeLayer(radiusCircleRef.current);
    }

    const userName = currentUser?.name ? currentUser.name.split(' ').slice(-2).join(' ') : (language === 'vi' ? 'Bạn' : 'You');
    const userIconHtml = `
      <div class="relative flex flex-col items-center cursor-default group">
        <!-- Floating Name Tag always visible -->
        <div class="px-2 py-0.5 rounded-full text-[10px] font-black text-white bg-gradient-to-r from-[#1D4ED8] to-[#3B82F6] shadow-lg border border-white whitespace-nowrap flex items-center space-x-1">
          <span>📍</span>
          <span>${userName} (${language === 'vi' ? 'GPS Chính Xác' : 'Exact GPS'})</span>
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
        </div>
        <!-- Pulsing beacon -->
        <div class="relative flex items-center justify-center mt-0.5">
          <div class="absolute w-8 h-8 rounded-full bg-blue-500/40 animate-ping"></div>
          <div class="w-7 h-7 rounded-full bg-gradient-to-tr from-[#1D4ED8] to-[#60A5FA] border-2 border-white flex items-center justify-center text-white font-black text-xs shadow-xl">
            📍
          </div>
        </div>
      </div>
    `;

    const userIcon = L.divIcon({
      html: userIconHtml,
      className: 'custom-user-marker',
      iconSize: [140, 52],
      iconAnchor: [70, 48],
    });

    const userMarker = L.marker(
      [currentUserCoords.latitude, currentUserCoords.longitude],
      {
        icon: userIcon,
        zIndexOffset: 1200,
        draggable: false, // Vị trí GPS chính xác xác định tự động - Không chỉnh sửa thủ công
      }
    ).addTo(map);

    userMarker.bindPopup(
      `<div class="text-black font-sans text-xs p-1">
        <strong class="text-[#1D4ED8] font-black">${language === 'vi' ? 'Vị trí GPS của bạn (Đã khóa)' : 'Your Exact GPS (Locked)'}</strong><br/>
        ${currentUserCoords.label || (language === 'vi' ? 'Tọa độ GPS chuẩn xác định từ thiết bị' : 'Accurate device GPS coordinates')}
      </div>`
    );

    userMarkerRef.current = userMarker;

    // Geofence Radius Circle
    radiusCircleRef.current = L.circle(
      [currentUserCoords.latitude, currentUserCoords.longitude],
      {
        radius: radiusMeters,
        color: isClientMode ? '#3B82F6' : '#10B981',
        weight: 1.5,
        fillColor: '#3B82F6',
        fillOpacity: 0.08,
        dashArray: '6, 6',
      }
    ).addTo(map);

    // 2. Update Student Account Markers (Chỉ hiện khi người khác truy cập website/app và cho phép xem vị trí)
    if (studentMarkersLayerRef.current) {
      studentMarkersLayerRef.current.clearLayers();

      if (showAccountColors && permittedOnlinePeers && permittedOnlinePeers.length > 0) {
        permittedOnlinePeers.forEach((peer, idx) => {
          const accountColor = getAccountColor(peer.id || peer.name);
          const peerNameShort = peer.name ? peer.name.split(' ').slice(-2).join(' ') : 'Sinh viên';
          const schoolTag = peer.studentSchool
            ? peer.studentSchool.replace('Đại Học ', 'ĐH ').split(' ')[0]
            : (peer.tier === 'PRO' ? 'VIP' : 'SV');

          // Deterministic campus coordinate offset around user's radar
          let hash = 0;
          const str = peer.id + peer.name;
          for (let i = 0; i < str.length; i++) {
            hash = (hash << 5) - hash + str.charCodeAt(i);
            hash |= 0;
          }
          const angle = ((Math.abs(hash) % 360) + idx * 45) * (Math.PI / 180);
          const distanceScale = 0.0012 + ((Math.abs(hash >> 3) % 100) / 100) * 0.0035; // 120m - 500m
          const peerLat = currentUserCoords.latitude + Math.sin(angle) * distanceScale;
          const peerLng = currentUserCoords.longitude + Math.cos(angle) * distanceScale;

          const avatarInitial = (peer.name || 'S').trim().charAt(0).toUpperCase();

          const studentIconHtml = `
            <div class="cursor-pointer transition-transform duration-200 transform hover:scale-110 flex flex-col items-center group">
              <!-- Name Badge of the user (Luôn hiển thị tên icon vị trí + Màu ngẫu nhiên) -->
              <div class="px-2 py-0.5 rounded-full text-[9px] font-black text-white shadow-lg border border-white/90 whitespace-nowrap flex items-center space-x-1" style="background-color: ${accountColor}; box-shadow: 0 4px 12px ${accountColor}80;">
                <span>🎓 ${peerNameShort}</span>
                <span class="opacity-90 font-medium">(${schoolTag})</span>
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse"></span>
              </div>

              <!-- Animated Vibrating Random Color Wave Beacon (Sóng phát ra màu ngẫu nhiên) -->
              <div class="relative flex items-center justify-center mt-0.5">
                <div class="absolute w-7 h-7 rounded-full animate-ping opacity-75" style="background-color: ${accountColor};"></div>
                <div class="w-6 h-6 rounded-full border-2 border-white shadow-xl flex items-center justify-center text-white text-[10px] font-black relative z-10" style="background-color: ${accountColor};">
                  ${avatarInitial}
                </div>
              </div>
            </div>
          `;

          const studentIcon = L.divIcon({
            html: studentIconHtml,
            className: 'custom-student-pin',
            iconSize: [120, 46],
            iconAnchor: [60, 42],
          });

          const studentMarker = L.marker([peerLat, peerLng], {
            icon: studentIcon,
            zIndexOffset: 300,
          });

          studentMarker.on('click', () => {
            triggerHaptic('light');
            setSelectedStudent(peer);
          });

          studentMarkersLayerRef.current?.addLayer(studentMarker);
        });
      }
    }

    // 3. Update Gig Task Markers (Hiện tên nhiệm vụ + Giá + Icon trên bản đồ khi có người đăng kèo + Màu ngẫu nhiên riêng biệt)
    if (markersLayerRef.current) {
      markersLayerRef.current.clearLayers();

      gigs.forEach((gig) => {
        if (!gig.latitude || !gig.longitude) return;

        const isSelected = gig.id === selectedGigId;
        // Màu sắc ngẫu nhiên rực rỡ riêng biệt của từng vị trí đăng công việc đang chờ sinh viên
        const gigColor = isSelected ? '#3B82F6' : getGigLocationColor(gig.id || gig.title);
        const categoryDetails = getCategoryDetails(gig.category, gig.title, gig.isFlash);
        const titleShort = gig.title.length > 20 ? gig.title.slice(0, 18) + '...' : gig.title;

        const gigIconHtml = `
          <div class="cursor-pointer transition-transform duration-200 transform hover:scale-115 flex flex-col items-center">
            <!-- Task Badge (Hiện nhiệm vụ trên bản đồ + Icon tương ứng loại việc + Màu sắc ngẫu nhiên) -->
            <div class="px-2.5 py-1 rounded-xl text-[10px] font-black text-white shadow-2xl border-2 whitespace-nowrap flex items-center space-x-1.5 backdrop-blur-md" style="background-color: ${gigColor}; border-color: rgba(255,255,255,0.9); box-shadow: 0 4px 14px ${gigColor}66;">
              <span class="text-xs">${categoryDetails.icon}</span>
              <span class="max-w-[110px] sm:max-w-[130px] truncate font-black">${titleShort}</span>
              <span class="px-1.5 py-0.2 rounded-md bg-black/40 text-[#E0FAEB] font-mono text-[9px] font-black">${formatVnd(gig.price)}</span>
            </div>
            <!-- Pointer pin dot với hào quang phát ra cùng màu rực rỡ -->
            <div class="relative flex items-center justify-center -mt-1">
              <div class="absolute w-5 h-5 rounded-full animate-ping opacity-60" style="background-color: ${gigColor};"></div>
              <div class="w-4 h-4 rounded-full border-2 border-white shadow-xl flex items-center justify-center relative z-10" style="background-color: ${gigColor};">
                <span class="text-[8px] text-white font-black">${categoryDetails.icon}</span>
              </div>
            </div>
          </div>
        `;

        const gigIcon = L.divIcon({
          html: gigIconHtml,
          className: 'custom-gig-pin',
          iconSize: [160, 44],
          iconAnchor: [80, 38],
        });

        const marker = L.marker([gig.latitude, gig.longitude], {
          icon: gigIcon,
          zIndexOffset: isSelected ? 800 : 400,
        });

        marker.on('click', () => {
          triggerHaptic('selection');
          onSelectGig(gig.id);
        });

        markersLayerRef.current?.addLayer(marker);
      });
    }

    // 4. Update Route Polyline & Live Tracking Worker Marker
    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }
    if (workerMarkerRef.current) {
      map.removeLayer(workerMarkerRef.current);
      workerMarkerRef.current = null;
    }

    if (selectedGig && selectedGig.latitude && selectedGig.longitude) {
      const activePoints: [number, number][] =
        osrmRoutePoints && osrmRoutePoints.length >= 2
          ? osrmRoutePoints
          : generateRoutePoints(
              currentUserCoords.latitude,
              currentUserCoords.longitude,
              selectedGig.latitude,
              selectedGig.longitude
            );

      const polyline = L.polyline(activePoints, {
        color: '#3B82F6',
        weight: 4,
        opacity: 0.9,
        dashArray: '8, 8',
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      routeLayerRef.current = polyline;

      // Live Tracking Worker Marker
      if (isLiveTracking && activePoints.length >= 2) {
        const totalSegments = activePoints.length - 1;
        const targetIndexFloat = trackingProgress * totalSegments;
        const segIndex = Math.min(Math.floor(targetIndexFloat), totalSegments - 1);
        const segRatio = targetIndexFloat - segIndex;

        const p1 = activePoints[segIndex];
        const p2 = activePoints[segIndex + 1];
        const workerLat = p1[0] + (p2[0] - p1[0]) * segRatio;
        const workerLng = p1[1] + (p2[1] - p1[1]) * segRatio;

        const isEscort = selectedGig.category === 'Đưa đón sinh viên';
        const isDelivery = selectedGig.category === 'Giao đồ ăn & KTX' || selectedGig.isFlash;
        const iconEmoji = isEscort ? '🚶‍♂️' : isDelivery ? '🛵' : '🚴‍♂️';
        const roleTitle = isEscort ? 'Bạn đồng hành' : isDelivery ? 'Shipper KTX' : 'Freelancer';

        const workerIconHtml = `
          <div class="relative flex flex-col items-center">
            <div class="px-2 py-0.5 rounded-full bg-emerald-500 text-black text-[9px] font-black shadow-lg border border-white whitespace-nowrap flex items-center space-x-1 animate-bounce">
              <span class="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
              <span>${iconEmoji} ${roleTitle}</span>
            </div>
            <div class="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-400 to-[#C5E5EC] border-2 border-white shadow-xl flex items-center justify-center text-sm">
              ${iconEmoji}
            </div>
          </div>
        `;

        const workerDivIcon = L.divIcon({
          html: workerIconHtml,
          className: 'custom-live-worker-marker',
          iconSize: [110, 48],
          iconAnchor: [55, 46],
        });

        workerMarkerRef.current = L.marker([workerLat, workerLng], {
          icon: workerDivIcon,
          zIndexOffset: 990,
        }).addTo(map);
      }

      // Center bounds smoothly
      const bounds = L.latLngBounds([
        [currentUserCoords.latitude, currentUserCoords.longitude],
        [selectedGig.latitude, selectedGig.longitude],
      ]);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16, animate: true });
    } else if (radiusMeters >= 2000000 && !selectedGig) {
      const validPoints: [number, number][] = gigs
        .filter((g) => g.latitude && g.longitude)
        .map((g) => [g.latitude, g.longitude] as [number, number]);
      validPoints.push([currentUserCoords.latitude, currentUserCoords.longitude]);
      if (validPoints.length > 1) {
        const nationalBounds = L.latLngBounds(validPoints);
        map.fitBounds(nationalBounds, { padding: [40, 40], maxZoom: 9, animate: true });
      } else {
        map.setView([16.0471, 108.2068], 6, { animate: true });
      }
    }
  }, [
    gigs,
    selectedGigId,
    currentUserCoords,
    radiusMeters,
    isClientMode,
    selectedGig,
    osrmRoutePoints,
    trackingProgress,
    isLiveTracking,
    showAccountColors,
    users,
    permittedOnlinePeers,
    hasLocationPermission,
    currentUser,
    language,
    onUserCoordsChange,
    onSelectGig,
    showNotification,
  ]);

  // Zoom map handlers
  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(
        [currentUserCoords.latitude, currentUserCoords.longitude],
        16,
        { animate: true }
      );
      mapInstanceRef.current.invalidateSize({ pan: false });
    }
  };

  // Close layer dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (layerDropdownRef.current && !layerDropdownRef.current.contains(target)) {
        setShowLayerDropdown(false);
      }
    };
    if (showLayerDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }
  }, [showLayerDropdown]);

  // Compact layout heights
  const mapAreaHeight = isFullscreen
    ? 'flex-1 min-h-[420px]'
    : isExpanded
    ? 'h-[380px] sm:h-[450px]'
    : 'h-[230px] sm:h-[280px]';

  const heightClass = isFullscreen
    ? 'fixed inset-0 z-50 p-4 bg-[#0A1424] flex flex-col'
    : 'relative rounded-3xl bg-[#0E1B2E] border border-[#C5E5EC]/25 p-3 sm:p-4 shadow-xl';

  return (
    <>
      {/* Collapsed Bar Mode */}
      {isCollapsed && (
        <div className="relative rounded-2xl bg-[#0E1B2E] border border-[#C5E5EC]/25 p-3 sm:p-3.5 shadow-xl overflow-hidden flex items-center justify-between gap-3 animate-fadeIn">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-tri-gradient pointer-events-none" />
          <div className="flex items-center space-x-2.5 min-w-0 pl-1">
            <div className="p-2 rounded-xl bg-gradient-to-br from-[#3064AE] to-[#255294] text-white border border-[#C5E5EC]/30 shadow-xs shrink-0">
              <MapIcon className="w-4 h-4 text-[#E0FAEB]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <h4 className="text-xs sm:text-sm font-black text-white truncate">
                  {language === 'vi' ? 'Bản Đồ Radar Campus' : 'Campus Radar Map'}
                </h4>
                <span className="w-2 h-2 rounded-full bg-[#E0FAEB] animate-ping shrink-0" />
              </div>
              <p className="text-[10px] sm:text-[11px] text-[#C5E5EC]/80 font-medium truncate">
                {gigs.length} {language === 'vi' ? 'kèo trên bản đồ' : 'gigs on map'} • {formatDistance(radiusMeters)} •{' '}
                {currentHubEntry ? currentHubEntry.hub.label?.split('(')[0].trim() : (language === 'vi' ? 'Vị trí hiện tại' : 'Current location')}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => setIsCollapsed(false)}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#3064AE] to-[#255294] hover:brightness-110 text-white font-black text-xs border border-[#C5E5EC]/30 shadow-xs flex items-center space-x-1.5 transition active:scale-95 cursor-pointer"
            >
              <MapIcon className="w-3.5 h-3.5 text-[#E0FAEB]" />
              <span>{language === 'vi' ? 'Mở Bản Đồ' : 'Open Map'}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Map Card */}
      <div
        className={`${heightClass} w-full max-w-full transition-all duration-300 ${
          isCollapsed ? 'hidden' : ''
        }`}
      >
        {/* Top Decorative Gradient */}
        <div className="absolute left-0 top-0 right-0 h-1 bg-brand-tri-gradient pointer-events-none" />

        {/* Header Bar */}
        <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-[#C5E5EC]/15">
          <div className="flex items-center space-x-2 min-w-0">
            <div className="p-1.5 rounded-xl shrink-0 bg-gradient-to-br from-[#3064AE] to-[#255294] text-white border border-[#C5E5EC]/30 shadow-xs">
              <MapIcon className="w-4 h-4 text-[#E0FAEB]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <h3 className="text-xs sm:text-sm font-black text-white tracking-wide truncate">
                  {language === 'vi' ? 'Bản Đồ Campus Radar' : 'Campus Radar Map'}
                </h3>
                <span className="w-2 h-2 rounded-full bg-[#E0FAEB] animate-ping shrink-0" />
              </div>
              <p className="text-[10px] text-[#C5E5EC]/80 font-medium truncate">
                {currentUserCoords.label?.split('(')[0].trim() || (language === 'vi' ? 'Vị trí hiện tại' : 'Current location')} •{' '}
                <strong className="text-white">{gigs.length}</strong> {language === 'vi' ? 'kèo hiển thị' : 'gigs shown'}
              </p>
            </div>
          </div>

          {/* Action Controls Right: Sóng Màu Tài Khoản + Chỉnh Vị Trí + GPS + Expand + Fullscreen + Fold */}
          <div className="flex items-center space-x-1 sm:space-x-1.5 shrink-0">
            {/* Nút phát ra màu ngẫu nhiên các tài khoản */}
            <button
              onClick={() => {
                triggerHaptic('light');
                setShowAccountColors((p) => !p);
              }}
              className={`p-1.5 sm:px-2.5 sm:py-1 rounded-xl border text-[10px] font-black transition active:scale-95 shadow-2xs cursor-pointer flex items-center space-x-1 ${
                showAccountColors
                  ? 'bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white border-white/40 shadow-sm ring-1 ring-purple-400/50'
                  : 'bg-[#12233B] text-[#C5E5EC]/70 border-[#C5E5EC]/25 hover:text-white hover:bg-[#162B48]'
              }`}
              title={language === 'vi' ? 'Bật/Tắt phát sóng màu ngẫu nhiên các tài khoản' : 'Toggle vibrant account colors'}
            >
              <Palette className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {showAccountColors ? (language === 'vi' ? 'Màu SV' : 'Peers') : (language === 'vi' ? 'Ẩn SV' : 'Off')}
              </span>
            </button>

            {/* Nút bật/tắt quyền chia sẻ vị trí của mình trên Campus Radar */}
            <button
              onClick={() => {
                triggerHaptic('light');
                const next = !hasLocationPermission;
                setHasLocationPermission(next);
                try {
                  localStorage.setItem('gigme_radar_location_permission', String(next));
                } catch {}
                showNotification(
                  next
                    ? (language === 'vi' ? '🟢 Đã Bật Chia Sẻ Vị Trí' : '🟢 Location Sharing Enabled')
                    : (language === 'vi' ? '⚪ Đã Ẩn Vị Trí Radar' : '⚪ Location Hidden'),
                  next
                    ? (language === 'vi' ? 'Vị trí GPS của bạn đang hiển thị cho các sinh viên đang truy cập app xung quanh.' : 'Your GPS is visible to active campus peers.')
                    : (language === 'vi' ? 'Vị trí của bạn đã ẩn. Người khác sẽ không thấy bạn trên bản đồ radar.' : 'Your position is hidden from radar map.'),
                  next
                );
              }}
              className={`p-1.5 sm:px-2.5 sm:py-1 rounded-xl border text-[10px] font-black transition active:scale-95 shadow-2xs cursor-pointer flex items-center space-x-1 ${
                hasLocationPermission
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40 ring-1 ring-emerald-400/30'
                  : 'bg-[#12233B] text-[#C5E5EC]/60 border-[#C5E5EC]/20 hover:text-white'
              }`}
              title={language === 'vi' ? 'Cho phép xem/chia sẻ vị trí của bạn trên Campus Radar' : 'Toggle location sharing permission'}
            >
              <Navigation className={`w-3.5 h-3.5 ${hasLocationPermission ? 'text-emerald-400' : 'text-[#C5E5EC]/40'}`} />
              <span className="hidden sm:inline">
                {hasLocationPermission
                  ? (language === 'vi' ? 'Chia Sẻ: Bật' : 'Sharing: On')
                  : (language === 'vi' ? 'Chia Sẻ: Tắt' : 'Sharing: Off')}
              </span>
            </button>

            {/* GPS Locate Button */}
            <button
              onClick={handleGetLiveGps}
              disabled={isGpsLoading}
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-[#12233B] hover:bg-[#162B48] border border-[#C5E5EC]/25 text-[#E0FAEB] transition active:scale-95 shadow-2xs cursor-pointer flex items-center space-x-1"
              title={language === 'vi' ? 'Quét GPS thực tế của tôi' : 'Locate my real GPS'}
            >
              {isGpsLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C5E5EC]" />
              ) : (
                <Crosshair className="w-3.5 h-3.5" />
              )}
              <span className="hidden md:inline text-[10px] font-bold">GPS</span>
            </button>

            {/* Toggle Expand */}
            {!isFullscreen && (
              <button
                onClick={() => setIsExpanded((prev) => !prev)}
                className="p-1.5 rounded-xl bg-[#12233B] hover:bg-[#162B48] border border-[#C5E5EC]/25 text-[#C5E5EC] transition active:scale-95 shadow-2xs cursor-pointer"
                title={isExpanded ? (language === 'vi' ? 'Thu gọn chiều cao' : 'Compact') : (language === 'vi' ? 'Mở rộng bản đồ' : 'Expand')}
              >
                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}

            {/* Fullscreen Button */}
            <button
              onClick={() => setIsFullscreen((prev) => !prev)}
              className="p-1.5 rounded-xl bg-[#12233B] hover:bg-[#162B48] border border-[#C5E5EC]/25 text-[#C5E5EC] transition active:scale-95 shadow-2xs cursor-pointer"
              title={isFullscreen ? (language === 'vi' ? 'Thu nhỏ' : 'Exit fullscreen') : (language === 'vi' ? 'Toàn màn hình' : 'Fullscreen')}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            {/* Hide/Fold Map to Mini Bar */}
            {!isFullscreen && (
              <button
                onClick={() => setIsCollapsed(true)}
                className="p-1.5 rounded-xl bg-[#12233B] hover:bg-[#162B48] border border-[#C5E5EC]/25 text-[#C5E5EC]/70 hover:text-white transition active:scale-95 shadow-2xs cursor-pointer"
                title={language === 'vi' ? 'Thu gọn hẳn bản đồ' : 'Minimize radar bar'}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Live Active Campus Peers Status Bar */}
        <div className="mb-2 px-3 py-1.5 rounded-xl bg-[#12233B] border border-[#C5E5EC]/20 flex items-center justify-between gap-2 text-[10px] shadow-sm">
          <div className="flex items-center space-x-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span className="text-[#C5E5EC] truncate font-medium">
              {language === 'vi'
                ? `Campus Radar: Hiện có ${permittedOnlinePeers.length} sinh viên đang truy cập web/app & cho phép xem vị trí quanh bạn`
                : `Campus Radar: ${permittedOnlinePeers.length} active students currently accessing app & sharing location`}
            </span>
          </div>
          <span className={`px-2 py-0.5 rounded-full font-mono font-bold text-[9px] shrink-0 border ${
            hasLocationPermission
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
              : 'bg-amber-500/20 text-amber-300 border-amber-400/30'
          }`}>
            {hasLocationPermission
              ? (language === 'vi' ? '✓ Vị trí của bạn đang bật' : '✓ Sharing Active')
              : (language === 'vi' ? '○ Vị trí của bạn đang ẩn' : '○ Sharing Hidden')}
          </span>
        </div>

        {/* Control Bar: Radius Chips + Hub Dropdown + Layer Switcher */}
        <div className="flex items-center justify-between gap-1.5 pb-2 mb-1.5 text-xs w-full relative z-30">
          {/* Radius Chips */}
          <div className="flex items-center space-x-1 shrink overflow-x-auto scrollbar-none py-0.5 min-w-0 pr-1">
            {PRIMARY_RADIUS_OPTIONS.map((opt) => {
              const isActive = radiusMeters === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onRadiusChange(opt.value)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-extrabold transition whitespace-nowrap border active:scale-95 cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-gradient-to-r from-[#3064AE] to-[#255294] text-white border-[#C5E5EC]/50 shadow-xs'
                      : 'bg-[#12233B] text-[#C5E5EC]/80 border-[#C5E5EC]/20 hover:bg-[#162B48] hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Right Dropdowns: Campus Hub Modal Button + Map Layer */}
          <div className="flex items-center space-x-1.5 shrink-0 ml-auto relative">
            {/* Campus Hub Selector Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic('light');
                setShowHubModal(true);
                setShowLayerDropdown(false);
              }}
              className="px-2 sm:px-2.5 py-1 rounded-lg bg-[#12233B] hover:bg-[#162B48] text-[#C5E5EC] hover:text-white border border-[#C5E5EC]/25 hover:border-[#C5E5EC]/45 text-[10px] font-black transition flex items-center space-x-1 cursor-pointer active:scale-95 shadow-xs"
              title={language === 'vi' ? 'Chọn Khu Vực / Trường Campus' : 'Select Campus Hub'}
            >
              <span className="truncate max-w-[85px] sm:max-w-[130px]">
                🏛️ {currentHubEntry ? currentHubEntry.hub.label?.split('(')[0].trim() : (language === 'vi' ? 'Khu vực' : 'Hub')}
              </span>
              <ChevronDown className="w-3 h-3 text-[#C5E5EC]/70 shrink-0" />
            </button>

            {/* Map Layer Selector Dropdown */}
            <div className="relative" ref={layerDropdownRef}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowLayerDropdown((prev) => !prev);
                }}
                className="p-1 sm:px-2 sm:py-1 rounded-lg bg-[#12233B] hover:bg-[#162B48] text-[#C5E5EC] border border-[#C5E5EC]/25 text-[10px] font-bold transition flex items-center space-x-1 cursor-pointer active:scale-95 shadow-xs"
                title={language === 'vi' ? 'Lớp bản đồ' : 'Map layer'}
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {mapLayer === 'GOOGLE_STREETS'
                    ? 'Chuẩn'
                    : mapLayer === 'GOOGLE_SATELLITE'
                    ? 'Vệ Tinh'
                    : mapLayer === 'STREETS'
                    ? 'OSM'
                    : 'Cyber'}
                </span>
              </button>

              {showLayerDropdown && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-full mt-1.5 z-50 w-44 rounded-2xl bg-[#0E1B2E]/98 backdrop-blur-xl border border-[#C5E5EC]/35 shadow-[0_16px_50px_rgba(0,0,0,0.85)] p-1.5 space-y-0.5 animate-fadeIn"
                >
                  {[
                    { key: 'GOOGLE_STREETS', label: language === 'vi' ? 'Google Chuẩn (Street)' : 'Google Standard' },
                    { key: 'GOOGLE_SATELLITE', label: language === 'vi' ? 'Google Vệ Tinh' : 'Google Satellite' },
                    { key: 'STREETS', label: 'OpenStreetMap' },
                    { key: 'DARK_CYBER', label: 'Cyber Dark Mode' },
                    { key: 'CARTO_VOYAGER', label: 'Carto Sáng (Voyager)' },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        setMapLayer(item.key as MapLayer);
                        setShowLayerDropdown(false);
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded-xl text-[10px] font-bold flex items-center justify-between transition cursor-pointer ${
                        mapLayer === item.key
                          ? 'bg-[#3064AE] text-white font-black'
                          : 'text-[#C5E5EC] hover:bg-[#12233B] hover:text-white'
                      }`}
                    >
                      <span>{item.label}</span>
                      {mapLayer === item.key && <Check className="w-3 h-3 text-[#E0FAEB]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Fake GPS Alert */}
        {gpsReport?.isMock && (
          <div className="mb-2 p-2 rounded-xl bg-red-500/20 border border-red-500/50 text-red-200 text-xs flex items-center justify-between animate-fade-in shadow-md">
            <div className="flex items-center space-x-1.5">
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 animate-bounce" />
              <span className="text-[11px] truncate">
                {gpsReport.reason || (language === 'vi' ? 'Phát hiện Mock Location' : 'Mock GPS detected')}
              </span>
            </div>
            <button
              onClick={() => setShowMockDetectorDialog(true)}
              className="px-2 py-0.5 rounded-lg bg-red-500/30 hover:bg-red-500/40 text-white font-bold text-[10px] shrink-0"
            >
              {language === 'vi' ? 'Chi tiết' : 'Details'}
            </button>
          </div>
        )}

        {/* GPS Error Alert */}
        {gpsError && (
          <div className="mb-2 p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs flex items-center space-x-2 animate-fade-in">
            <Info className="w-4 h-4 shrink-0" />
            <span className="text-[11px]">{gpsError}</span>
          </div>
        )}

        {/* LEAFLET CANVAS DISPLAY */}
        <div className={`relative w-full ${mapAreaHeight} min-h-[240px] rounded-2xl overflow-hidden border border-[#C5E5EC]/25 shadow-xl bg-[#0A1424] transition-all duration-200`}>
          {/* Subtle Radar Scanner Grid Layer */}
          <div className="absolute inset-0 bg-[radial-gradient(#3064AE_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none z-0" />

          {/* LEAFLET CONTAINER */}
          <div ref={mapContainerRef} className="w-full h-full absolute inset-0 z-10 min-h-[240px]" />

          {/* Floating Zoom Controls */}
          <div className="absolute top-3 right-3 z-20 flex flex-col space-y-1">
            <button
              onClick={handleZoomIn}
              className="p-2 rounded-xl bg-[#0E1B2E]/95 hover:bg-[#13243C] text-[#C5E5EC] hover:text-white border border-[#C5E5EC]/30 shadow-lg transition backdrop-blur-sm active:scale-95 cursor-pointer"
              title={language === 'vi' ? 'Phóng to' : 'Zoom in'}
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-2 rounded-xl bg-[#0E1B2E]/95 hover:bg-[#13243C] text-[#C5E5EC] hover:text-white border border-[#C5E5EC]/30 shadow-lg transition backdrop-blur-sm active:scale-95 cursor-pointer"
              title={language === 'vi' ? 'Thu nhỏ' : 'Zoom out'}
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleRecenter}
              className="p-2 rounded-xl bg-[#0E1B2E]/95 hover:bg-[#13243C] text-[#E0FAEB] border border-[#C5E5EC]/30 shadow-lg transition backdrop-blur-sm active:scale-95 cursor-pointer"
              title={language === 'vi' ? 'Tâm vị trí của tôi' : 'Recenter my location'}
            >
              <Crosshair className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Compass & Radar Tag */}
          <div className="absolute top-3 left-3 z-20 pointer-events-none flex items-center space-x-1.5 bg-[#0E1B2E]/90 backdrop-blur-md px-2.5 py-1 rounded-xl text-[9px] text-[#C5E5EC] border border-[#C5E5EC]/30 shadow-md">
            <Compass className="w-3 h-3 text-[#E0FAEB] animate-spin-slow" />
            <span className="font-extrabold">RADAR ONLINE ({gigs.length} VIỆC)</span>
          </div>

          {/* Peer Beacon Count Indicator */}
          {showAccountColors && (
            <div className="absolute bottom-3 left-3 z-20 pointer-events-none flex items-center space-x-1.5 bg-[#0E1B2E]/90 backdrop-blur-md px-2.5 py-1 rounded-xl text-[9px] text-pink-300 border border-pink-500/30 shadow-md">
              <span className="w-2 h-2 rounded-full bg-pink-400 animate-ping" />
              <span className="font-bold">
                {language === 'vi' ? 'Sóng sinh viên: Bật' : 'Student colors: ON'}
              </span>
            </div>
          )}
        </div>

        {/* SELECTED GIG NAVIGATION DRAWER */}
        {selectedGig && routeStats && (
          <div className="mt-2.5 p-3 rounded-2xl bg-[#0E1B2E] border border-[#C5E5EC]/25 shadow-xl animate-fade-in text-xs space-y-2 text-white">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start space-x-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-[#3064AE]/30 text-[#C5E5EC] font-black shrink-0 mt-0.5 border border-[#C5E5EC]/25">
                  <MapPin className="w-4 h-4 text-[#C5E5EC]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-1.5 flex-wrap gap-y-0.5">
                    {selectedGig.isFlash && (
                      <span className="flex items-center text-[9px] font-black text-amber-200 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-400/30">
                        <Zap className="w-2.5 h-2.5 mr-0.5 fill-current text-amber-300" />
                        {language === 'vi' ? 'HỎA TỐC' : 'FLASH'}
                      </span>
                    )}
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#3064AE]/30 text-[#C5E5EC] font-bold border border-[#C5E5EC]/25">
                      {selectedGig.category}
                    </span>
                  </div>
                  <h4 className="font-extrabold text-white text-xs mt-0.5 truncate">
                    {selectedGig.title}
                  </h4>
                  <p className="text-[#C5E5EC]/70 text-[10px] truncate">
                    {selectedGig.locationName}
                  </p>
                </div>
              </div>

              {/* Price & Dismiss Close Button */}
              <div className="flex items-center space-x-2 shrink-0">
                <div className="text-right">
                  <span className="text-sm font-black text-[#E0FAEB] font-mono block">
                    {formatVnd(selectedGig.price)}
                  </span>
                  <span className="text-[9px] text-[#C5E5EC]/60">Escrow</span>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectGig('')}
                  className="p-1.5 rounded-xl bg-[#12233B] hover:bg-[#162B48] text-[#C5E5EC] hover:text-white transition active:scale-95 cursor-pointer border border-[#C5E5EC]/20 shadow-xs"
                  title={language === 'vi' ? 'Bỏ chọn / Đóng lộ trình' : 'Deselect / Close route'}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Compact Telemetry & Action Row */}
            <div className="p-2 rounded-xl bg-[#12233B] border border-[#C5E5EC]/20 flex flex-wrap items-center justify-between gap-2 text-[10px]">
              <div className="flex items-center space-x-2.5 text-[#C5E5EC]">
                <div className="flex items-center space-x-1 font-bold text-white">
                  <Navigation className="w-3.5 h-3.5 text-[#C5E5EC]" />
                  <span>
                    {osrmRouteDetails
                      ? osrmRouteDetails.distanceMeters >= 1000
                        ? `${(osrmRouteDetails.distanceMeters / 1000).toFixed(1)} km`
                        : `${osrmRouteDetails.distanceMeters}m`
                      : routeStats.formattedDistance}
                  </span>
                </div>

                <div className="flex items-center space-x-1 text-[#C5E5EC]/80">
                  <Footprints className="w-3 h-3 text-[#E0FAEB]" />
                  <span>~{osrmRouteDetails?.walkMinutes ?? routeStats.walkMinutes}p</span>
                </div>

                <div className="flex items-center space-x-1 text-[#C5E5EC]/80">
                  <Bike className="w-3 h-3 text-amber-300" />
                  <span>~{osrmRouteDetails?.motoMinutes ?? routeStats.motoMinutes}p</span>
                </div>
              </div>

              <div className="flex items-center space-x-1.5 ml-auto">
                <button
                  type="button"
                  onClick={() => setIsLiveTracking((p) => !p)}
                  className={`px-2 py-1 rounded-lg font-bold text-[10px] transition flex items-center space-x-1 active:scale-95 cursor-pointer ${
                    isLiveTracking
                      ? 'bg-[#3064AE]/40 text-[#E0FAEB] border border-[#E0FAEB]/40'
                      : 'bg-[#162B48] text-[#C5E5EC] border border-[#C5E5EC]/25'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isLiveTracking ? 'bg-[#E0FAEB] animate-ping' : 'bg-slate-400'}`} />
                  <span>{isLiveTracking ? 'Live 🛵' : 'Track'}</span>
                </button>

                <a
                  href={routeStats.googleDirUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#3064AE] to-[#417AC6] text-white font-extrabold text-[10px] hover:brightness-110 shadow-xs transition flex items-center space-x-1 active:scale-95 border border-[#E0FAEB]/30"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Google Maps</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* STUDENT PEER DETAIL MODAL (Khi nhấp vào tài khoản sinh viên trên bản đồ) */}
        {selectedStudent && (
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fadeIn"
            onClick={() => setSelectedStudent(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0E1B2E] border border-[#C5E5EC]/30 rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl relative text-xs text-white"
            >
              <button
                onClick={() => setSelectedStudent(null)}
                className="absolute top-4 right-4 p-1.5 rounded-xl bg-[#12233B] hover:bg-[#162B48] text-[#C5E5EC] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center space-x-3.5">
                <div
                  className="w-14 h-14 rounded-2xl border-2 border-white flex items-center justify-center text-white text-xl font-black shadow-xl"
                  style={{ backgroundColor: getAccountColor(selectedStudent.id || selectedStudent.name) }}
                >
                  {selectedStudent.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <h3 className="text-sm font-black text-white truncate">{selectedStudent.name}</h3>
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  </div>
                  <p className="text-[11px] text-[#C5E5EC]/80 mt-0.5 truncate">
                    🎓 {selectedStudent.studentSchool || (language === 'vi' ? 'Sinh viên Campus' : 'Campus Student')}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold border border-blue-400/30">
                      {selectedStudent.tier}
                    </span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-400/30">
                      ⭐ ELO {selectedStudent.eloRating || 1200}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#12233B] border border-[#C5E5EC]/20 space-y-1.5 text-[11px]">
                <div className="flex justify-between text-[#C5E5EC]/70">
                  <span>{language === 'vi' ? 'Điểm uy tín:' : 'Trust score:'}</span>
                  <span className="text-white font-bold">{selectedStudent.trustScore || 100}/100</span>
                </div>
                <div className="flex justify-between text-[#C5E5EC]/70">
                  <span>{language === 'vi' ? 'Hoàn thành:' : 'Completed gigs:'}</span>
                  <span className="text-white font-bold">{selectedStudent.completedGigs || 0} việc</span>
                </div>
                <div className="flex justify-between text-[#C5E5EC]/70">
                  <span>{language === 'vi' ? 'Trạng thái:' : 'Status:'}</span>
                  <span className="text-emerald-400 font-bold">🟢 Đang sẵn sàng nhận việc</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedStudent(null);
                    showNotification(
                      language === 'vi' ? '💬 Kết Nối Thành Công' : '💬 Connected',
                      language === 'vi' ? `Đã mở kết nối với ${selectedStudent.name}` : `Connected with ${selectedStudent.name}`,
                      true
                    );
                  }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#3064AE] via-[#417AC6] to-[#C5E5EC] hover:brightness-110 text-white font-extrabold transition flex items-center justify-center space-x-1.5 shadow-md active:scale-95 border border-[#E0FAEB]/30 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{language === 'vi' ? 'Nhắn Tin / Bắt Kèo' : 'Message'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Anti-Mock GPS Inspection Modal */}
        {showMockDetectorDialog && (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowMockDetectorDialog(false);
            }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0E1B2E] border border-[#C5E5EC]/30 rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl relative text-xs animate-scale-up text-white"
            >
              <button
                onClick={() => setShowMockDetectorDialog(false)}
                className="absolute top-4 right-4 p-1.5 rounded-xl bg-[#12233B] hover:bg-[#162B48] text-[#C5E5EC] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center space-x-3">
                <div
                  className={`p-3 rounded-2xl ${
                    gpsReport?.isMock
                      ? 'bg-red-950/60 text-red-400 border border-red-500/30'
                      : 'bg-[#162B48] text-[#E0FAEB] border border-[#E0FAEB]/30'
                  }`}
                >
                  {gpsReport?.isMock ? (
                    <ShieldAlert className="w-6 h-6 animate-pulse" />
                  ) : (
                    <CheckCircle2 className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">
                    {language === 'vi' ? 'Kiểm Định Chống Fake GPS' : 'Anti-Mock GPS Check'}
                  </h3>
                  <p className="text-[#C5E5EC]/70 text-[11px]">
                    {language === 'vi'
                      ? 'Bảo vệ xác thực vị trí nhận việc và check-in Escrow'
                      : 'Validating real location for gig claims'}
                  </p>
                </div>
              </div>

              <div
                className={`p-3 rounded-2xl border ${
                  gpsReport?.isMock
                    ? 'bg-red-950/40 border-red-500/40 text-red-300'
                    : 'bg-[#12233B] border-[#E0FAEB]/30 text-[#E0FAEB]'
                }`}
              >
                <div className="flex items-center justify-between font-bold mb-1">
                  <span>{language === 'vi' ? 'Trạng thái:' : 'Status:'}</span>
                  <span className="uppercase font-black tracking-wider">
                    {gpsReport?.isMock
                      ? (language === 'vi' ? 'PHÁT HIỆN FAKE GPS' : 'MOCK GPS DETECTED')
                      : (language === 'vi' ? 'VỊ TRÍ THỰC HỢP LỆ' : 'VALID REAL LOCATION')}
                  </span>
                </div>
                <p className="text-[11px] text-[#C5E5EC]/80">
                  {gpsReport?.reason ||
                    (language === 'vi'
                      ? 'Tín hiệu GPS có độ dao động tự nhiên, không phát hiện phần mềm giả lập.'
                      : 'GPS signal exhibits natural variance; no mock provider detected.')}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowMockDetectorDialog(false);
                    handleGetLiveGps();
                  }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#3064AE] via-[#417AC6] to-[#C5E5EC] hover:brightness-110 text-white font-extrabold transition flex items-center justify-center space-x-1.5 shadow-md active:scale-95 border border-[#E0FAEB]/30 cursor-pointer"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>
                    {language === 'vi' ? 'Quét Cập Nhật Tọa Độ GPS' : 'Scan & Update GPS'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CAMPUS HUB SELECTION MODAL */}
        {showHubModal && (
          <div
            className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
            onClick={() => setShowHubModal(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg rounded-3xl bg-[#0E1B2E] border border-[#C5E5EC]/30 shadow-[0_20px_60px_rgba(0,0,0,0.85)] flex flex-col max-h-[85vh] overflow-hidden text-white"
            >
              <div className="h-1.5 w-full bg-brand-tri-gradient shrink-0" />

              <div className="p-4 pb-3 border-b border-[#C5E5EC]/15 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-[#3064AE] to-[#255294] text-white border border-[#C5E5EC]/30 shadow-xs shrink-0">
                    <Building2 className="w-5 h-5 text-[#E0FAEB]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-black text-white truncate">
                      {language === 'vi' ? 'Chọn Khu Vực / Trường Campus' : 'Select Campus Hub'}
                    </h3>
                    <p className="text-[11px] text-[#C5E5EC]/75 truncate">
                      {language === 'vi' ? 'Đổi vị trí Radar tìm việc quanh các trường' : 'Change radar location to explore jobs'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHubModal(false)}
                  className="p-1.5 rounded-xl bg-[#12233B] hover:bg-[#162B48] text-[#C5E5EC]/70 hover:text-white border border-[#C5E5EC]/20 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search Input & Live GPS Option */}
              <div className="p-3 sm:p-4 space-y-2.5 border-b border-[#C5E5EC]/15 shrink-0 bg-[#0B1524]">
                <div className="relative">
                  <Search className="w-4 h-4 text-[#C5E5EC]/60 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={hubSearchTerm}
                    onChange={(e) => setHubSearchTerm(e.target.value)}
                    placeholder={language === 'vi' ? 'Tìm tên trường, ký túc xá, quận...' : 'Search campus, dorm, city...'}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#0E1B2E] border border-[#C5E5EC]/25 text-xs text-white placeholder-[#C5E5EC]/40 focus:outline-hidden focus:border-[#C5E5EC]"
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={handleGetLiveGps}
                    className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-extrabold text-xs transition flex items-center justify-center space-x-1.5 shadow-sm active:scale-95 cursor-pointer"
                  >
                    <Crosshair className="w-3.5 h-3.5" />
                    <span>{language === 'vi' ? 'Định vị GPS thực của tôi' : 'Locate My Real GPS'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-1">
                  {[
                    { key: 'ALL', label: language === 'vi' ? 'Tất cả (12)' : 'All (12)' },
                    { key: 'TPHCM', label: 'TP.HCM (6)' },
                    { key: 'HANOI', label: 'Hà Nội (4)' },
                    { key: 'OTHER', label: language === 'vi' ? 'Đà Nẵng & Cần Thơ' : 'Other (2)' },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setSelectedCityTab(tab.key as any)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
                        selectedCityTab === tab.key
                          ? 'bg-[#3064AE] text-white shadow-xs font-black'
                          : 'bg-[#12233B] text-[#C5E5EC]/70 hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hub List */}
              <div className="p-3 sm:p-4 overflow-y-auto space-y-1.5 max-h-[50vh]">
                {filteredHubEntries.length === 0 ? (
                  <div className="text-center py-8 text-xs text-[#C5E5EC]/60">
                    {language === 'vi' ? 'Không tìm thấy điểm trường phù hợp.' : 'No matching campus hubs found.'}
                  </div>
                ) : (
                  filteredHubEntries.map(([key, hub]) => {
                    const isCurrent =
                      (currentUserCoords.label && currentUserCoords.label === hub.label) ||
                      (Math.abs(hub.latitude - currentUserCoords.latitude) < 0.005 &&
                        Math.abs(hub.longitude - currentUserCoords.longitude) < 0.005);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleSelectCampus(key)}
                        className={`w-full p-2.5 sm:p-3 rounded-2xl text-left border transition flex items-center justify-between gap-2.5 active:scale-98 cursor-pointer ${
                          isCurrent
                            ? 'bg-gradient-to-r from-[#3064AE] to-[#255294] text-white border-[#E0FAEB]/40 shadow-md ring-1 ring-[#E0FAEB]/30'
                            : 'bg-[#12233B]/80 hover:bg-[#162B48] text-[#C5E5EC] border-[#C5E5EC]/15 hover:border-[#C5E5EC]/35'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div
                            className={`p-2 rounded-xl shrink-0 ${
                              isCurrent
                                ? 'bg-white/20 text-white'
                                : 'bg-[#0E1B2E] text-[#C5E5EC] border border-[#C5E5EC]/20'
                            }`}
                          >
                            <GraduationCap className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <h4
                              className={`text-xs font-black truncate ${
                                isCurrent ? 'text-white' : 'text-white group-hover:text-[#E0FAEB]'
                              }`}
                            >
                              {hub.label}
                            </h4>
                            <p className="text-[10px] text-[#C5E5EC]/70 truncate mt-0.5">
                              {hub.latitude.toFixed(4)}, {hub.longitude.toFixed(4)}
                            </p>
                          </div>
                        </div>
                        {isCurrent ? (
                          <span className="shrink-0 flex items-center space-x-1 px-2 py-0.5 rounded-full bg-[#E0FAEB] text-[#09111D] text-[10px] font-black shadow-2xs">
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>{language === 'vi' ? 'Đang chọn' : 'Active'}</span>
                          </span>
                        ) : (
                          <span className="shrink-0 text-[10px] text-[#C5E5EC]/60 font-semibold px-2 py-0.5 rounded-md bg-[#0E1B2E]">
                            {language === 'vi' ? 'Chọn' : 'Select'}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-3 bg-[#0B1524] border-t border-[#C5E5EC]/15 flex items-center justify-between text-[11px] text-[#C5E5EC]/70 shrink-0">
                <span>{language === 'vi' ? 'Hỗ trợ 12 trường & khu KTX trọng điểm' : '12 Campus hubs supported'}</span>
                <button
                  type="button"
                  onClick={() => setShowHubModal(false)}
                  className="px-3 py-1 rounded-xl bg-[#12233B] text-white font-bold hover:bg-[#162B48] transition cursor-pointer"
                >
                  {language === 'vi' ? 'Đóng' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
