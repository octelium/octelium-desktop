import { Service, Service_Spec_Type } from "@octelium/apis/main/userv1";
import { expect, test } from "vitest";

import { getServiceCommands } from "./commands";

const service = (type: Service_Spec_Type, port: number, isTLS = false) =>
  Service.create({
    metadata: { name: "demo.default" },
    spec: { type, port, isTLS },
    status: { primaryHostname: "demo" },
  });

test("getServiceCommands omits the default port of a protocol", () => {
  expect(
    getServiceCommands(service(Service_Spec_Type.SSH, 22), "example.com"),
  ).toEqual(["ssh demo"]);
  expect(
    getServiceCommands(service(Service_Spec_Type.POSTGRES, 5433), "example.com"),
  ).toEqual(["psql -h demo -p 5433"]);
});

test("getServiceCommands uses the private FQDN for TLS Services", () => {
  expect(
    getServiceCommands(service(Service_Spec_Type.HTTP, 8443, true), "example.com"),
  ).toEqual(["curl -i https://demo.local.example.com:8443/"]);
});

test("getServiceCommands has no command for unsupported types", () => {
  expect(
    getServiceCommands(service(Service_Spec_Type.TCP, 4000), "example.com"),
  ).toEqual([]);
});
