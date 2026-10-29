import {expect,it} from "vitest";
import {z} from "zod";
import {formError,InputValidationError} from "./errors";
it("shows actionable validation/duplicate errors without exposing database details",()=>{
 expect(formError(new InputValidationError("Price: enter a valid value."))).toContain("Price:");
 const parsed=z.string().url().safeParse("invalid");if(!parsed.success)expect(formError(parsed.error)).toContain("Check the required fields");
 expect(formError({code:"P2002",message:"PRIVATE DATABASE DETAILS"})).toContain("already exists");
 expect(formError(new Error("PRIVATE DATABASE DETAILS"))).not.toContain("PRIVATE");
 expect(formError(new Error("commit uncertainty"))).toContain("Could not confirm");
});
