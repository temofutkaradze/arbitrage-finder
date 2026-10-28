import { DiscoveryClient } from "./DiscoveryClient";
export const dynamic = "force-dynamic";
export default function DiscoveryPage() {
  return (
    <>
      <h1>Product discovery</h1>
      <p className="mut">Find candidates in CJ or load a CSV. Nothing is saved until you create an opportunity. Supplier prices are not confirmed landed costs.</p>
      <DiscoveryClient />
    </>
  );
}
