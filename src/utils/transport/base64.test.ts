import { expect, test } from "vitest";

import { decodeBase64, encodeBase64 } from "./base64";

test("encodeBase64", () => {
  {
    expect(encodeBase64(new Uint8Array([]))).toEqual("");
  }
  {
    expect(encodeBase64(new Uint8Array([0x0a, 0x03, 0x61, 0x62, 0x63]))).toEqual(
      "CgNhYmM=",
    );
  }
  {
    expect(encodeBase64(new Uint8Array([0xff, 0xfe, 0xfd]))).toEqual("//79");
  }
});

test("decodeBase64", () => {
  {
    expect(decodeBase64("")).toEqual(new Uint8Array([]));
  }
  {
    expect(decodeBase64("CgNhYmM=")).toEqual(
      new Uint8Array([0x0a, 0x03, 0x61, 0x62, 0x63]),
    );
  }
});

test("encodeBase64 roundtrip", () => {
  {
    const arg = new Uint8Array(1024);
    for (let i = 0; i < arg.length; i++) {
      arg[i] = i % 256;
    }
    expect(decodeBase64(encodeBase64(arg))).toEqual(arg);
  }
  {
    const arg = new Uint8Array(0x8000 * 3 + 7);
    for (let i = 0; i < arg.length; i++) {
      arg[i] = (i * 7) % 256;
    }
    expect(decodeBase64(encodeBase64(arg))).toEqual(arg);
  }
});
