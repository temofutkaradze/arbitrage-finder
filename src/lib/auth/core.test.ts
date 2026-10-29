import {expect,it} from "vitest";
import {hashPassword,verifyPassword,newSession,sessionId} from "./core";
it("uses salted password hashes and rejects mismatches and malformed hashes",()=>{
 const a=hashPassword("test-only owner password"),b=hashPassword("test-only owner password");expect(a).not.toBe(b);
 expect(verifyPassword("test-only owner password",a)).toBe(true);expect(verifyPassword("wrong",a)).toBe(false);expect(verifyPassword("x","invalid")).toBe(false);
});
it("stores only digests of high-entropy, finite-lifetime session tokens",()=>{
 const a=newSession(),b=newSession();expect(a.token).not.toBe(b.token);expect(a.id).toBe(sessionId(a.token));expect(a.id).not.toBe(a.token);expect(a.expiresAt.getTime()-Date.now()).toBeLessThanOrEqual(8*3600000);
});
