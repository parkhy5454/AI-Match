/**
 * 위치 기반 거리 계산 및 필터링 유틸리티
 */

interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Haversine 공식으로 두 좌표 간 거리 계산 (km)
 */
export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371; // 지구 반지름 (km)
  const dLat = (coord2.latitude - coord1.latitude) * (Math.PI / 180);
  const dLon = (coord2.longitude - coord1.longitude) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coord1.latitude * (Math.PI / 180)) *
      Math.cos(coord2.latitude * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * 좌표 유효성 검사
 */
export function isValidCoordinates(lat: number, lon: number): boolean {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

/**
 * 반경 내의 사용자 필터링
 */
export async function filterUsersByDistance(
  myCoords: Coordinates,
  maxDistance: number, // km
  candidates: Array<{ id: string; latitude: number; longitude: number }>
): Promise<string[]> {
  return candidates
    .filter((user) => {
      const distance = calculateDistance(myCoords, {
        latitude: user.latitude,
        longitude: user.longitude,
      });
      return distance <= maxDistance;
    })
    .map((user) => user.id);
}

/**
 * 지역명으로 좌표 변환 (시뮬레이션 - 실제로는 지오코딩 API 사용)
 */
export const regionCoordinates: Record<string, Coordinates> = {
  '서울': { latitude: 37.5665, longitude: 126.978 },
  '강남': { latitude: 37.4979, longitude: 127.0276 },
  '강북': { latitude: 37.6484, longitude: 127.0426 },
  '강서': { latitude: 37.5486, longitude: 126.8325 },
  '강동': { latitude: 37.5518, longitude: 127.1405 },
  '부산': { latitude: 35.1796, longitude: 129.0756 },
  '대구': { latitude: 35.8714, longitude: 128.5941 },
  '인천': { latitude: 37.456, longitude: 126.7052 },
  '대전': { latitude: 36.3504, longitude: 127.3845 },
  '광주': { latitude: 35.1595, longitude: 126.8526 },
  '울산': { latitude: 35.5394, longitude: 129.3114 },
  '경기': { latitude: 37.2756, longitude: 127.0093 },
  '강원': { latitude: 37.8228, longitude: 128.1555 },
  '충북': { latitude: 36.6362, longitude: 127.4928 },
  '충남': { latitude: 36.6584, longitude: 126.6729 },
  '전북': { latitude: 35.7175, longitude: 127.1529 },
  '전남': { latitude: 34.8160, longitude: 126.4628 },
  '경북': { latitude: 36.4919, longitude: 128.8889 },
  '경남': { latitude: 35.2383, longitude: 128.6923 },
  '제주': { latitude: 33.4996, longitude: 126.5312 },
};

export function getRegionCoordinates(region: string): Coordinates | null {
  return regionCoordinates[region] || null;
}
