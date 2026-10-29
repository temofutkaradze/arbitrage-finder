import { expect, it } from "vitest";
import { expectedVersion, EditConflictError } from "./editing";
import { formError } from "./errors";
it("requires an explicit nonnegative bounded edit version; missing is not version zero",()=>{
 for(const v of [null,"","-1","1.5","1e3","2147483647"]){const fd=new FormData();if(v!==null)fd.set("expectedVersion",v);expect(()=>expectedVersion(fd)).toThrow("version");}
 const fd=new FormData();fd.set("expectedVersion","0");expect(expectedVersion(fd)).toBe(0);
});
it("returns an actionable conflict without suggesting that old fields can overwrite the record",()=>{const message=formError(new EditConflictError());expect(message).toContain("another window");expect(message).toContain("entries are kept");});
