const CHUNK_SIZE = 0x8000;

export const encodeBase64 = (arg: Uint8Array): string => {
  let ret = "";

  for (let i = 0; i < arg.length; i += CHUNK_SIZE) {
    ret += String.fromCharCode(...arg.subarray(i, i + CHUNK_SIZE));
  }

  return btoa(ret);
};

export const decodeBase64 = (arg: string): Uint8Array => {
  const raw = atob(arg);
  const ret = new Uint8Array(raw.length);

  for (let i = 0; i < raw.length; i++) {
    ret[i] = raw.charCodeAt(i);
  }

  return ret;
};
