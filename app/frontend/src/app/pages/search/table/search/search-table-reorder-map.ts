export type SearchTableReorderMap = number[];

let reorderMap: SearchTableReorderMap = [];

export function setSearchTableReorderMap(map: SearchTableReorderMap): void {
  if (Array.isArray(map) && map.length > 0) {
    reorderMap = map.slice();
  } else {
    reorderMap = [];
  }
}

export function getSearchTableReorderMap(): SearchTableReorderMap {
  return reorderMap.slice();
}
