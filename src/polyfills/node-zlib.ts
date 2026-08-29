import pako from 'pako';

export const constants = {
  Z_NO_FLUSH: 0,
  Z_PARTIAL_FLUSH: 1,
  Z_SYNC_FLUSH: 2,
  Z_FULL_FLUSH: 3,
  Z_FINISH: 4,
  Z_BLOCK: 5,
  Z_TREES: 6,
  Z_OK: 0,
  Z_STREAM_END: 1,
  Z_NEED_DICT: 2,
  Z_ERRNO: -1,
  Z_STREAM_ERROR: -2,
  Z_DATA_ERROR: -3,
  Z_MEM_ERROR: -4,
  Z_BUF_ERROR: -5,
  Z_VERSION_ERROR: -6,
  Z_NO_COMPRESSION: 0,
  Z_BEST_SPEED: 1,
  Z_BEST_COMPRESSION: 9,
  Z_DEFAULT_COMPRESSION: -1,
  Z_FILTERED: 1,
  Z_HUFFMAN_ONLY: 2,
  Z_RLE: 3,
  Z_FIXED: 4,
  Z_DEFAULT_STRATEGY: 0,
  Z_BINARY: 0,
  Z_TEXT: 1,
  Z_ASCII: 1,
  Z_UNKNOWN: 2,
  Z_DEFLATED: 8,
};

export function gunzipSync(data: Uint8Array | ArrayBuffer | string, options?: any): Uint8Array {
  const uint8 = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
  return pako.ungzip(uint8);
}

export function gzipSync(data: Uint8Array | ArrayBuffer | string, options?: any): Uint8Array {
  const uint8 = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
  return pako.gzip(uint8, { level: options?.level });
}

export default {
  constants,
  gunzipSync,
  gzipSync,
};
