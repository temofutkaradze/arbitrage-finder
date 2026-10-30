import {requireOwner} from "@/lib/auth/server";
import {signOut} from "@/app/login/actions";
import {WorkspaceShell} from "@/components/WorkspaceShell";
export default async function ProtectedLayout({children}:{children:React.ReactNode}){
 await requireOwner(false);
 return <WorkspaceShell signOut={<form action={signOut}><button className="sign-out">Sign out</button></form>}>{children}</WorkspaceShell>;
}
